import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Assalomu alaykum! Men **Al-Xorazmiy** — matematika bo'yicha AI yordamchingiz. Algebra, geometriya, trigonometriya yoki statistika haqida so'rang! 📐",
  timestamp: new Date(),
};

export function AlKhorazmiyChat() {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for API (skip welcome message)
      const history = [...messages.filter((m) => m.id !== 'welcome'), userMessage].map(
        (m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })
      );

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            mode: 'chat',
            messages: history,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Javob olishda xatolik yuz berdi.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          "Kechirasiz, hozirda javob berishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring. 🔄",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Simple markdown-like rendering for bold text
  const renderContent = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Handle line breaks
      return part.split('\n').map((line, li) => (
        <span key={`${i}-${li}`}>
          {li > 0 && <br />}
          {line}
        </span>
      ));
    });
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed z-50 flex items-center justify-center rounded-full shadow-2xl transition-all duration-500 ease-out',
          isOpen
            ? 'bottom-24 md:bottom-6 right-4 md:right-6 h-14 w-14 bg-gradient-to-br from-red-500 to-red-600 rotate-0 hover:from-red-600 hover:to-red-700'
            : 'bottom-24 md:bottom-6 right-4 md:right-6 h-14 w-14 sm:h-16 sm:w-16 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:scale-110 chat-fab-pulse'
        )}
        aria-label={isOpen ? 'Chatni yopish' : 'Al-Xorazmiy bilan suhbatlashish'}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageSquare className="h-7 w-7 text-white" />
        )}
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          'fixed z-50 flex flex-col rounded-2xl shadow-2xl border border-border/60 overflow-hidden transition-all duration-500 ease-out origin-bottom-right',
          isOpen
            ? 'bottom-[160px] md:bottom-24 right-4 md:right-6 w-[360px] sm:w-[380px] h-[500px] sm:h-[520px] opacity-100 scale-100 translate-y-0'
            : 'bottom-[160px] md:bottom-24 right-4 md:right-6 w-[360px] sm:w-[380px] h-[500px] sm:h-[520px] opacity-0 scale-75 translate-y-8 pointer-events-none'
        )}
        style={{
          maxHeight: 'calc(100vh - 140px)',
          maxWidth: 'calc(100vw - 48px)',
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-base leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Al-Xorazmiy
            </h3>
            <p className="text-emerald-100 text-xs">Matematik AI yordamchi</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/95 backdrop-blur-sm chat-messages-scrollbar">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-2.5 animate-fade-in',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  message.role === 'user'
                    ? 'bg-primary/10'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                )}
              >
                {message.role === 'user' ? (
                  <User className="h-4 w-4 text-primary" />
                ) : (
                  <Bot className="h-4 w-4 text-white" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-card border border-border/60 text-foreground rounded-bl-md shadow-sm'
                )}
              >
                {renderContent(message.content)}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-2.5 animate-fade-in">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-card border border-border/60 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border/60 bg-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Savolingizni yozing..."
              disabled={isLoading}
              className="flex-1 bg-muted/50 border border-border/40 rounded-full px-4 py-2.5 text-sm outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-muted-foreground/60 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300',
                input.trim() && !isLoading
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-emerald-500/30'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
