import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

interface ParsedChoice {
  choice_text: string
  is_correct: boolean
}

interface ParsedQuestion {
  question_text: string
  choices: ParsedChoice[]
  explanation?: string
}

class HttpError extends Error {
  status: number
  stage: string
  debug?: unknown
  constructor(status: number, message: string, stage = "unknown", debug?: unknown) {
    super(message)
    this.status = status
    this.stage = stage
    this.debug = debug
  }
}

const MAX_FILE_SIZE = 20 * 1024 * 1024
const IMPORT_BUCKET = "pdf-imports"
const MAX_QUESTIONS = Number.MAX_SAFE_INTEGER
const AI_TIMEOUT_MS = 110000
const PRIMARY_MODEL = "google/gemini-2.0-flash"
const FALLBACK_MODEL = "google/gemini-1.5-flash"

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

const log = (stage: string, msg: string, extra?: unknown) => {
  const line = `[parse-pdf-to-test][${stage}] ${msg}`
  if (extra !== undefined) console.log(line, extra)
  else console.log(line)
}

function encodeBase64Chunked(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function parseAnswerKeys(input: string | null): Map<number, string> {
  const map = new Map<number, string>()
  if (!input?.trim()) return map
  const normalized = input.replace(/[，؛]/g, ",")
  const regex = /(\d{1,3})\s*[\)\].:\-]?\s*([A-Da-d]|[1-4])/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(normalized)) !== null) {
    const questionNumber = Number(match[1])
    const key = match[2].toUpperCase()
    if (questionNumber > 0) {
      map.set(questionNumber, key)
    }
  }
  return map
}

function getForcedCorrectIndex(key: string, choicesCount: number): number | null {
  if (/^[1-4]$/.test(key)) {
    const index = Number(key) - 1
    return index < choicesCount ? index : null
  }
  if (/^[A-D]$/.test(key)) {
    const index = key.charCodeAt(0) - 65
    return index < choicesCount ? index : null
  }
  return null
}

function normalizeQuestions(rawQuestions: ParsedQuestion[], answerKeyMap: Map<number, string>): ParsedQuestion[] {
  const normalized: ParsedQuestion[] = []
  for (let i = 0; i < rawQuestions.length; i++) {
    const raw = rawQuestions[i]
    const questionText = typeof raw?.question_text === "string" ? raw.question_text.trim() : ""
    if (questionText.length < 3) continue

    let choices = Array.isArray(raw?.choices)
      ? raw.choices
          .map((choice) => ({
            choice_text: typeof choice?.choice_text === "string" ? choice.choice_text.trim() : "",
            is_correct: Boolean(choice?.is_correct),
          }))
          .filter((choice) => choice.choice_text.length > 0)
      : []

    if (choices.length < 2) continue
    if (choices.length > 4) choices = choices.slice(0, 4)

    const forcedKey = answerKeyMap.get(i + 1)
    const forcedIndex = forcedKey ? getForcedCorrectIndex(forcedKey, choices.length) : null
    const aiCorrectIndex = choices.findIndex((choice) => choice.is_correct)
    const finalCorrectIndex = forcedIndex ?? (aiCorrectIndex >= 0 ? aiCorrectIndex : 0)

    const normalizedChoices = choices.map((choice, idx) => ({
      choice_text: choice.choice_text,
      is_correct: idx === finalCorrectIndex,
    }))

    normalized.push({
      question_text: questionText,
      choices: normalizedChoices,
      explanation: typeof raw?.explanation === "string" ? raw.explanation.trim().slice(0, 500) : undefined,
    })

    if (normalized.length >= MAX_QUESTIONS) break
  }
  return normalized
}

function extractQuestionsFromToolCall(aiData: any): ParsedQuestion[] {
  const toolCalls = aiData?.choices?.[0]?.message?.tool_calls
  if (!Array.isArray(toolCalls)) return []
  for (const call of toolCalls) {
    const args = call?.function?.arguments
    if (typeof args !== "string") continue
    try {
      const parsed = JSON.parse(args)
      if (Array.isArray(parsed?.questions)) return parsed.questions
    } catch { continue }
  }
  return []
}

function extractQuestionsFromTextContent(content: unknown): ParsedQuestion[] {
  if (!content) return []
  let text = ""
  if (typeof content === "string") {
    text = content.trim()
  } else if (Array.isArray(content)) {
    text = content.map((part) => (typeof part?.text === "string" ? part.text : "")).join("\n").trim()
  }
  if (!text) return []
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "")
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return []
  let jsonStr = jsonMatch[0]
  try {
    const parsed = JSON.parse(jsonStr)
    return Array.isArray(parsed?.questions) ? parsed.questions : []
  } catch {
    const lastCompleteQuestion = jsonStr.lastIndexOf("},")
    if (lastCompleteQuestion <= 0) return []
    try {
      jsonStr = jsonStr.substring(0, lastCompleteQuestion + 1) + "]}"
      const recovered = JSON.parse(jsonStr)
      return Array.isArray(recovered?.questions) ? recovered.questions : []
    } catch { return [] }
  }
}

async function extractAnswerKeysFromImage(
  base64Image: string,
  mimeType: string,
  lovableApiKey: string
): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: PRIMARY_MODEL,
        messages: [
          {
            role: "system",
            content: `Rasmdagi javoblar kalitini (answer key) aniq o'qi va quyidagi formatda qaytar:
1-A
2-B
3-C
...
Faqat raqam va harf formatida yoz, boshqa hech narsa qo'shma. Har bir javob alohida qatorda bo'lsin.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Rasmdagi javoblar kalitini o'qib, formatlab ber." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      console.error("Answer key image AI error:", response.status)
      return ""
    }

    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content || ""
    return typeof text === "string" ? text.trim() : ""
  } catch (e) {
    console.error("Answer key image extraction error:", e)
    return ""
  } finally {
    clearTimeout(timeoutId)
  }
}

async function callAiGateway(params: {
  model: string
  lovableApiKey: string
  base64Pdf: string
  filename: string
  answerKeys: string | null
}): Promise<ParsedQuestion[]> {
  const answerKeyInstruction = params.answerKeys?.trim()
    ? `\n\nMUHIM: Quyidagi javoblar kaliti berilgan. Shu bo'yicha to'g'ri javoblarni belgilang:\n${params.answerKeys}`
    : ""

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

  try {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${params.lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          {
            role: "system",
            content: `Sen PDF fayllardan test savollarini TO'LIQ va ANIQ ajratib oluvchi AI san.

MUHIM QOIDALAR:
1. PDF dagi BARCHA savollarni birma-bir to'liq nusxalab ol - HECH BIRINI tashlab ketma
2. Har bir savolning MATNINI TO'LIQ yoz - matematika formulalari, sonlar, tenglama, ifoda, misol - hammasini aniq ko'chir
3. Agar savolda raqamlar, tenglamalar, formulalar bo'lsa - ularni AYNAN PDF dagi ko'rinishda yoz
   - Masalan: "2x² + 3x - 5 = 0 tenglamaning ildizlari yig'indisini toping"
   - Masalan: "√(16) + 3² = ?" 
   - Masalan: "log₂(8) qiymatini toping"
4. Har bir savolda 2-4 ta javob varianti bo'lsin, faqat 1 ta TO'G'RI javob
5. Javob variantlarini ham TO'LIQ va ANIQ yoz - formulalar, sonlar bilan
6. Savollar va javoblar asl tilda saqlansin (o'zbek, rus, ingliz - qaysi tilda bo'lsa)
7. Explanation (tushuntirish) qisqa - 1-2 jumla
8. Keraksiz sarlavha, izoh, sahifa raqamlari va boshqa shovqinni olib tashla
9. Agar savol rasmi/chizmasi bo'lsa - uni matn shaklida tasvirlab yoz (masalan: "Chizmada ABC uchburchak berilgan, AB=5, BC=3")${answerKeyInstruction}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "PDF dagi BARCHA test savollarini birma-bir TO'LIQ nusxalab ol. Hech bir savolni tashlab ketma. Formulalar, sonlar, tenglamalar - hammasini AYNAN ko'chir. Tool orqali questions massivida qaytar.",
              },
              {
                type: "file",
                file: {
                  filename: params.filename || "test.pdf",
                  file_data: `data:application/pdf;base64,${params.base64Pdf}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_questions",
              description: "PDF dan test savollarini structured ko'rinishda qaytaradi",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string", description: "Savolning TO'LIQ matni - formulalar, sonlar, tenglamalar bilan" },
                        explanation: { type: "string", description: "Qisqa tushuntirish - 1-2 jumla" },
                        choices: {
                          type: "array",
                          minItems: 2,
                          maxItems: 4,
                          items: {
                            type: "object",
                            properties: {
                              choice_text: { type: "string", description: "Javob varianti - formulalar/sonlar bilan to'liq" },
                              is_correct: { type: "boolean" },
                            },
                            required: ["choice_text", "is_correct"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["question_text", "choices"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_questions" } },
        temperature: 0.1,
        max_tokens: 32000,
      }),
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      log("ai-call", `AI HTTP ${aiResponse.status}`, errorText.slice(0, 500))
      if (aiResponse.status === 429) throw new HttpError(429, "AI band: juda ko'p so'rov. 30 sekunddan keyin qayta urinib ko'ring.", "ai-rate-limit", { model: params.model, body: errorText.slice(0, 300) })
      if (aiResponse.status === 402) throw new HttpError(402, "AI krediti tugadi. Workspace billing ni tekshiring.", "ai-credits", { model: params.model })
      if (aiResponse.status === 413) throw new HttpError(413, "PDF AI uchun juda katta.", "ai-payload", { model: params.model })
      throw new HttpError(502, `AI xatolik (${aiResponse.status}): ${errorText.slice(0, 200)}`, "ai-call", { model: params.model, status: aiResponse.status })
    }

    const aiData = await aiResponse.json()
    const toolQuestions = extractQuestionsFromToolCall(aiData)
    if (toolQuestions.length > 0) return toolQuestions

    const fallbackQuestions = extractQuestionsFromTextContent(aiData?.choices?.[0]?.message?.content)
    return fallbackQuestions
  } catch (error: unknown) {
    if ((error as Error)?.name === "AbortError") {
      throw new HttpError(504, "AI javobi juda sekin (timeout). Kichikroq PDF bilan urinib ko'ring.", "ai-timeout", { model: params.model, timeoutMs: AI_TIMEOUT_MS })
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

type AdminClient = ReturnType<typeof createClient>

declare const EdgeRuntime: { waitUntil?: (promise: Promise<unknown>) => void } | undefined

const updateJob = async (adminClient: AdminClient, jobId: string, patch: Record<string, unknown>) => {
  const { error } = await adminClient.from("pdf_import_jobs").update(patch).eq("id", jobId)
  if (error) log("job-update", `job=${jobId} failed: ${error.message}`)
}

const isTransientImportError = (error: unknown) => {
  if (error instanceof HttpError) return [429, 502, 503, 504].includes(error.status) || error.stage === "ai-empty"
  return (error as Error)?.name === "AbortError"
}

async function processImportJob(params: {
  adminClient: AdminClient
  job: Record<string, any>
  pdfBytes: Uint8Array
  pageCount: number
  lovableApiKey: string
  answerKeyImageBase64: string | null
  answerKeyImageMime: string | null
}) {
  const { adminClient, job, pdfBytes, pageCount, lovableApiKey } = params
  const jobId = job.id as string
  const base64Content = encodeBase64Chunked(pdfBytes)
  let lastError: unknown = null

  for (let attempt = 1; attempt <= Number(job.max_attempts || 2); attempt++) {
    try {
      await updateJob(adminClient, jobId, {
        status: "running",
        stage: attempt > 1 ? "retrying" : "running",
        progress: 18,
        attempt_count: attempt,
        error_message: null,
        error_stage: null,
        debug: { attempt, pageCount, fileSize: pdfBytes.length },
        started_at: new Date().toISOString(),
      })

      let answerKeys = typeof job.answer_keys === "string" ? job.answer_keys : ""
      if (params.answerKeyImageBase64 && params.answerKeyImageMime) {
        await updateJob(adminClient, jobId, { stage: "answer-key-image", progress: 26 })
        const extractedKeys = await extractAnswerKeysFromImage(params.answerKeyImageBase64, params.answerKeyImageMime, lovableApiKey)
        if (extractedKeys) answerKeys = answerKeys.trim() ? `${answerKeys}\n${extractedKeys}` : extractedKeys
      }

      const answerKeyMap = parseAnswerKeys(answerKeys)
      const startedAt = Date.now()
      await updateJob(adminClient, jobId, { stage: "ai", progress: 42, debug: { attempt, model: PRIMARY_MODEL, pageCount } })
      log("ai", `job=${jobId} attempt=${attempt} primary=${PRIMARY_MODEL}`)
      let aiQuestions = await callAiGateway({
        model: PRIMARY_MODEL,
        lovableApiKey,
        base64Pdf: base64Content,
        filename: job.file_name,
        answerKeys,
      })

      const elapsed = Date.now() - startedAt
      if (aiQuestions.length === 0 && elapsed < 55000) {
        await updateJob(adminClient, jobId, { stage: "ai-fallback", progress: 54, debug: { attempt, model: FALLBACK_MODEL, elapsed, pageCount } })
        aiQuestions = await callAiGateway({
          model: FALLBACK_MODEL,
          lovableApiKey,
          base64Pdf: base64Content,
          filename: job.file_name,
          answerKeys,
        })
      }

      const parsedQuestions = normalizeQuestions(aiQuestions, answerKeyMap)
      if (parsedQuestions.length === 0) {
        throw new HttpError(422, "AI savollarni ajrata olmadi. PDF matnli bo‘lishi va savollarda javob variantlari bo‘lishi kerak.", "ai-empty", { rawQuestions: aiQuestions.length, pageCount })
      }

      await updateJob(adminClient, jobId, { stage: "db-test", progress: 68, questions_count: parsedQuestions.length })
      const { data: testData, error: testError } = await adminClient
        .from("tests")
        .insert({
          title: String(job.title).trim(),
          description: `PDF dan import - ${parsedQuestions.length} ta savol`,
          subject: job.subject,
          duration_minutes: job.duration_minutes,
          created_by: job.user_id,
          is_published: false,
          access_code: job.access_code?.trim() || null,
        })
        .select("id")
        .single()

      if (testError || !testData) throw new HttpError(500, `Test yaratishda DB xatolik: ${testError?.message ?? "noma'lum"}`, "db-test", testError)

      const insertedQuestions: Array<{ id: string; order_index: number }> = []
      for (let i = 0; i < parsedQuestions.length; i += 500) {
        const chunk = parsedQuestions.slice(i, i + 500).map((q, offset) => ({
          test_id: testData.id,
          question_text: q.question_text,
          order_index: i + offset,
        }))
        const { data, error } = await adminClient.from("questions").insert(chunk).select("id, order_index")
        if (error || !data?.length) throw new HttpError(500, `Savollarni saqlashda xatolik: ${error?.message ?? "noma'lum"}`, "db-questions", error)
        insertedQuestions.push(...data)
        await updateJob(adminClient, jobId, { stage: "db-questions", progress: Math.min(82, 70 + Math.round((insertedQuestions.length / parsedQuestions.length) * 12)) })
      }

      const questionIdByOrder = new Map<number, string>(insertedQuestions.map((q) => [q.order_index, q.id]))
      const choicesPayload = parsedQuestions.flatMap((q, qi) => {
        const questionId = questionIdByOrder.get(qi)
        if (!questionId) return []
        return q.choices.map((c, ci) => ({ question_id: questionId, choice_text: c.choice_text, is_correct: c.is_correct, order_index: ci }))
      })

      for (let i = 0; i < choicesPayload.length; i += 500) {
        const { error } = await adminClient.from("choices").insert(choicesPayload.slice(i, i + 500))
        if (error) throw new HttpError(500, `Javob variantlarini saqlashda xatolik: ${error.message}`, "db-choices", error)
        await updateJob(adminClient, jobId, { stage: "db-choices", progress: Math.min(96, 84 + Math.round(((i + 500) / Math.max(choicesPayload.length, 1)) * 12)) })
      }

      await updateJob(adminClient, jobId, {
        status: "done",
        stage: "done",
        progress: 100,
        result_test_id: testData.id,
        questions_count: insertedQuestions.length,
        completed_at: new Date().toISOString(),
        debug: { attempts: attempt, pageCount, elapsedMs: Date.now() - startedAt },
      })
      log("done", `job=${jobId} test=${testData.id} questions=${insertedQuestions.length}`)
      return
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : "Noma'lum xatolik"
      const stage = error instanceof HttpError ? error.stage : "fatal"
      const debug = error instanceof HttpError ? error.debug : (error instanceof Error ? error.stack?.split("\n").slice(0, 3).join(" | ") : undefined)
      log("job-error", `job=${jobId} attempt=${attempt} stage=${stage} ${message}`, debug)
      if (attempt < Number(job.max_attempts || 2) && isTransientImportError(error)) {
        await updateJob(adminClient, jobId, { status: "queued", stage: "retry-wait", progress: 12, error_message: message, error_stage: stage, debug: { attempt, retrying: true, debug } })
        await new Promise((resolve) => setTimeout(resolve, 2500))
        continue
      }
      await updateJob(adminClient, jobId, { status: "failed", stage: "failed", progress: 100, error_message: message, error_stage: stage, debug: { attempt, debug }, completed_at: new Date().toISOString() })
      return
    }
  }

  await updateJob(adminClient, jobId, { status: "failed", stage: "failed", progress: 100, error_message: lastError instanceof Error ? lastError.message : "Import yakunlanmadi", completed_at: new Date().toISOString() })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")
    if (!supabaseUrl || !serviceRoleKey || !anonKey || !lovableApiKey) throw new HttpError(500, "Server sozlamalari to'liq emas", "config")

    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Avtorizatsiya kerak", stage: "auth" }, 401)

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await authClient.auth.getUser()
    const userId = userData?.user?.id
    if (userError || !userId) return jsonResponse({ error: "Foydalanuvchi topilmadi yoki sessiya tugagan", stage: "auth", debug: userError?.message }, 401)

    const { data: isSuperAdmin, error: roleError } = await adminClient.rpc("has_role", { _user_id: userId, _role: "super_admin" })
    if (roleError || !isSuperAdmin) return jsonResponse({ error: "Super Admin huquqi kerak", stage: "auth", debug: roleError?.message }, 403)

    if (req.method === "GET") {
      const jobId = new URL(req.url).searchParams.get("job_id")
      if (!jobId) return jsonResponse({ error: "job_id kerak", stage: "validate-input" }, 400)
      const { data, error } = await adminClient.from("pdf_import_jobs").select("*").eq("id", jobId).single()
      if (error || !data) return jsonResponse({ error: "Import ishi topilmadi", stage: "job-status", debug: error?.message }, 404)
      return jsonResponse({ job: data })
    }

    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405)

    log("start", `method=${req.method} ct=${req.headers.get("content-type") ?? ""}`)
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const subject = formData.get("subject") as string
    const title = String(formData.get("title") || "")
    const duration_minutes = parseInt((formData.get("duration_minutes") as string) || "30")
    const access_code = formData.get("access_code") as string | null
    const answer_keys = formData.get("answer_keys") as string | null
    const answer_key_image = formData.get("answer_key_image") as File | null

    if (!file || !subject || !title) return jsonResponse({ error: "Fayl, fan va sarlavha majburiy", stage: "validate-input" }, 400)
    if (title.length < 3 || title.length > 200) return jsonResponse({ error: "Test nomi 3-200 belgi orasida bo'lishi kerak", stage: "validate-input" }, 400)
    if (isNaN(duration_minutes) || duration_minutes < 5 || duration_minutes > 240) return jsonResponse({ error: "Davomiyligi 5-240 daqiqa orasida bo'lishi kerak", stage: "validate-input" }, 400)
    if (access_code && (access_code.length < 4 || access_code.length > 20)) return jsonResponse({ error: "Kirish kodi 4-20 belgi orasida bo'lishi kerak", stage: "validate-input" }, 400)
    if (!file.name.toLowerCase().endsWith(".pdf") || file.type && !["application/pdf", "application/x-pdf"].includes(file.type)) return jsonResponse({ error: "Faqat PDF formatdagi fayl yuklash mumkin", stage: "validate-format" }, 400)
    if (file.size > MAX_FILE_SIZE) return jsonResponse({ error: `Fayl juda katta (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal hajm: ${MAX_FILE_SIZE / 1024 / 1024}MB`, stage: "validate-size" }, 400)
    if (file.size < 1024) return jsonResponse({ error: "PDF juda kichik yoki bo'sh ko'rinadi", stage: "validate-size" }, 400)

    const uint8Array = new Uint8Array(await file.arrayBuffer())
    if (uint8Array.length < 4 || uint8Array[0] !== 0x25 || uint8Array[1] !== 0x50 || uint8Array[2] !== 0x44 || uint8Array[3] !== 0x46) {
      return jsonResponse({ error: "Fayl haqiqiy PDF formatida emas", stage: "validate-format" }, 400)
    }

    let pageCount = 0
    try {
      const text = new TextDecoder("latin1").decode(uint8Array.subarray(0, Math.min(uint8Array.length, 5_000_000)))
      pageCount = (text.match(/\/Type\s*\/Page[^s]/g) || []).length
    } catch { /* ignore */ }
    if (pageCount > 100) return jsonResponse({ error: `PDF juda ko'p sahifali (~${pageCount}). 100 sahifagacha qo'llab-quvvatlanadi.`, stage: "validate-pages", debug: { pageCount } }, 400)

    let answerKeyImageBase64: string | null = null
    let answerKeyImageMime: string | null = null
    if (answer_key_image && answer_key_image.size > 0) {
      if (!answer_key_image.type.startsWith("image/")) return jsonResponse({ error: "Javoblar kaliti rasmi image formatida bo'lishi kerak", stage: "validate-answer-image" }, 400)
      answerKeyImageBase64 = encodeBase64Chunked(new Uint8Array(await answer_key_image.arrayBuffer()))
      answerKeyImageMime = answer_key_image.type || "image/png"
    }

    const { data: job, error: jobError } = await adminClient.from("pdf_import_jobs").insert({
      user_id: userId,
      title: title.trim(),
      subject,
      duration_minutes,
      access_code: access_code?.trim() || null,
      file_name: file.name,
      file_size_bytes: file.size,
      page_count: pageCount || null,
      answer_keys: answer_keys?.trim() || null,
      status: "queued",
      stage: "queued",
      progress: 8,
      max_attempts: 2,
      debug: { pageCount, fileType: file.type || "application/pdf" },
    }).select("*").single()

    if (jobError || !job) throw new HttpError(500, `Import navbatini yaratishda xatolik: ${jobError?.message ?? "noma'lum"}`, "job-create", jobError)

    const backgroundTask = processImportJob({ adminClient, job, pdfBytes: uint8Array, pageCount, lovableApiKey, answerKeyImageBase64, answerKeyImageMime })
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(backgroundTask)
    else backgroundTask.catch((error) => console.error("[parse-pdf-to-test] background failed", error))

    return jsonResponse({ success: true, accepted: true, job_id: job.id, status: "queued", message: "PDF qabul qilindi, AI savollarni fonda yaratmoqda." }, 202)
  } catch (error: unknown) {
    console.error("[parse-pdf-to-test] FATAL:", error)
    if (error instanceof HttpError) return jsonResponse({ error: error.message, stage: error.stage, debug: error.debug }, error.status)
    const errorMessage = error instanceof Error ? error.message : "Noma'lum xatolik"
    const stack = error instanceof Error ? error.stack?.split("\n").slice(0, 3).join(" | ") : undefined
    return jsonResponse({ error: errorMessage, stage: "fatal", debug: stack }, 500)
  }
})
