import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

async function callGemini(
  messages: ChatMessage[],
  systemInstruction: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in Supabase secrets");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: messages,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      topP: 0.95,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE",
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text || "Javob olishda xatolik.";
  return text;
}

// System prompt for test analysis
const ANALYZE_SYSTEM_PROMPT = `Sen matematika fani bo'yicha professional o'qituvchi va tahlilchisan. Sening vazifang test savollarini tahlil qilish.

Har bir savol uchun quyidagilarni batafsil tushuntir:
1. Savolning mohiyati va qaysi mavzuga tegishli ekanligi
2. To'g'ri javobning nima uchun to'g'ri ekanligini bosqichma-bosqich yechim bilan tushuntir
3. Agar foydalanuvchi noto'g'ri javob bergan bo'lsa, uning xatosi nimada ekanligini tushuntir
4. Savolni yechish uchun zarur formulalar yoki qoidalarni keltir

O'zbek tilida javob ber. Markdown formatida yoz, har bir savolni tartib raqami bilan ajrat. Tushuntirishni aniq va sodda qil.`;

// System prompt for Al-Khorazmiy chatbot
const ALKHORAZMIY_SYSTEM_PROMPT = `Sen Al-Xorazmiy — buyuk o'zbek matematigi Muhammad ibn Muso al-Xorazmiy sharafiga nomlangan sun'iy intellekt yordamchisisan.

Sen faqat matematika sohasiga ixtisoslashgansan. Sening mutaxassisliging:
- Algebra va arifmetika
- Geometriya va trigonometriya  
- Statistika va ehtimollar nazariyasi
- Sonlar nazariyasi
- Matematik mantiq
- Tenglamalar va tengsizliklar
- Funksiyalar va grafiklar
- Limitlar, hosilalar va integrallar (matematik analiz)
- Kombinatorika
- Matritsalar va determinantlar

Qoidalar:
1. Faqat O'zbek tilida javob ber
2. Agar savol matematikaga aloqasi bo'lmasa, muloyimlik bilan "Men faqat matematika bo'yicha yordam bera olaman" deb javob ber
3. Javoblarni bosqichma-bosqich tushuntir
4. Zarur bo'lsa formulalar va misollar keltir
5. Markdown formatida yoz
6. Do'stona va rag'batlantiruvchi ohangda suhbatlash
7. Murakkab tushunchalarni sodda tilda tushuntir
8. O'zingni "Al-Xorazmiy" deb tanishtir

Salom berganlarida o'zingni qisqa tanishtir va qanday yordam bera olishing haqida ayt.`;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mode, messages, questions } = await req.json();

    if (mode === "analyze") {
      // Test analysis mode
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return new Response(
          JSON.stringify({ error: "Savollar topilmadi" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build analysis prompt
      let prompt = "Quyidagi test savollarini tahlil qil:\n\n";
      questions.forEach(
        (
          q: {
            index: number;
            question_text: string;
            choices: { text: string; is_correct: boolean }[];
            user_choice: string | null;
            is_correct: boolean | null;
          },
          i: number
        ) => {
          prompt += `### ${i + 1}-savol: ${q.question_text}\n`;
          prompt += `Javob variantlari:\n`;
          q.choices.forEach(
            (c: { text: string; is_correct: boolean }, ci: number) => {
              const letter = String.fromCharCode(65 + ci);
              const marker = c.is_correct ? " ✅ (to'g'ri javob)" : "";
              prompt += `  ${letter}) ${c.text}${marker}\n`;
            }
          );
          if (q.user_choice) {
            prompt += `Foydalanuvchi javobi: ${q.user_choice}\n`;
            prompt += `Natija: ${q.is_correct ? "✅ To'g'ri" : "❌ Noto'g'ri"}\n`;
          } else {
            prompt += `Foydalanuvchi javob bermagan\n`;
          }
          prompt += "\n";
        }
      );

      const geminiMessages: ChatMessage[] = [
        { role: "user", parts: [{ text: prompt }] },
      ];

      const analysis = await callGemini(geminiMessages, ANALYZE_SYSTEM_PROMPT);

      return new Response(
        JSON.stringify({ analysis }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (mode === "chat") {
      // Chat mode for Al-Khorazmiy
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return new Response(
          JSON.stringify({ error: "Xabar topilmadi" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const geminiMessages: ChatMessage[] = messages.map(
        (m: { role: string; content: string }) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        })
      );

      const reply = await callGemini(geminiMessages, ALKHORAZMIY_SYSTEM_PROMPT);

      return new Response(
        JSON.stringify({ reply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Noto'g'ri rejim. 'analyze' yoki 'chat' dan foydalaning" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Noma'lum xatolik";
    console.error("AI function error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
