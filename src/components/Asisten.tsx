import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RefreshCw, AlertCircle, Bookmark, CheckCircle2, MessageSquare } from 'lucide-react';
import { ChatMessage, KlimatologiRecord } from '../types';

interface AsistenProps {
  records?: KlimatologiRecord[];
  isSyncing?: boolean;
  onSyncNow?: () => void;
  dataSource?: 'sheets' | 'cache' | null;
  syncError?: string | null;
}

export default function Asisten({
  records = [],
  isSyncing = false,
  onSyncNow,
  dataSource,
  syncError,
}: AsistenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean typing interval on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (e?: React.FormEvent, presetText?: string) => {
    if (e) e.preventDefault();
    const promptToSend = (presetText || userInput).trim();
    if (!promptToSend || loading) return;

    // Stop and clear any ongoing typing effect preceding this
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setTypingMessageId(null);

    // Clear main input
    if (!presetText) setUserInput('');
    setError(null);

    // Append user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: promptToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build previous history structure for backend
      // Map back to simplified turn structure: { role: 'user'|'model', text: string }
      const historyPayload = messages.slice(1).map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptToSend,
          history: historyPayload,
          records: records.slice(0, 14),
        })
      });

      if (!res.ok) {
        let errText = 'Gagal menghubungi asisten kecerdasan buatan Gemini.';
        try {
          const errorData = await res.json();
          if (errorData?.error) {
            errText = typeof errorData.error === 'object' ? JSON.stringify(errorData.error) : String(errorData.error);
          }
        } catch {
          // fallback to default error
        }
        throw new Error(errText);
      }

      const data = await res.json();
      const rawText = data.text || 'Maaf, saya tidak memperoleh respon dari Gemini.';
      
      const assistantMessageId = (Date.now() + 1).toString();
      
      // Stop the waiting loader
      setLoading(false);

      // Initialize the assistant message with empty text, then stream it
      setMessages(prev => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          text: '',
          timestamp: new Date()
        }
      ]);

      setTypingMessageId(assistantMessageId);

      // Start typewriter typing effect
      let typedText = '';
      let currentIndex = 0;
      
      // Speed up typing dynamically: longer responses print more chars per block so the user isn't kept waiting.
      const stepSize = rawText.length > 800 ? 5 : rawText.length > 400 ? 3 : 1;
      const speed = 15; // Natural human feeling typing interval

      typingIntervalRef.current = setInterval(() => {
        if (currentIndex < rawText.length) {
          typedText += rawText.slice(currentIndex, currentIndex + stepSize);
          currentIndex += stepSize;
          
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId ? { ...m, text: typedText } : m
          ));
        } else {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          setTypingMessageId(null);
        }
      }, speed);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Koneksi ke asisten terputus. Silakan coba kembali.');
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setShowConfirmReset(true);
  };

  const confirmResetChat = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setTypingMessageId(null);

    setMessages([]);
    setError(null);
    setShowConfirmReset(false);
  };

  // Preset suggestions targeting rubber agronomy climatology
  const suggestions = [
    'Rekomendasi sadap karet berdasarkan cuaca 7 hari terakhir?',
    'Apa risiko penyakit daun karet berkait kelembaban tinggi?',
    'Bagaimana rumus perhitungan BMKG untuk evaporasi panci kelas A?',
    'Suhu ideal terbaik untuk sadap karet getah maksimal jam berapa?'
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      
      {/* Bot Chat Header */}
      <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-950 px-6 py-4 text-white border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold tracking-tight">Climatology AI Assistant</h3>
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Google Gemini Powered (Active Engine)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSyncNow && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-slate-700 hover:text-emerald-200 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Sinkronkan data Google Sheets terbaru"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
            </button>
          )}
          <button
            onClick={handleResetChat}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95 cursor-pointer"
            title="Atur ulang percakapan"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset Sesi</span>
          </button>
        </div>
      </div>

      {/* Syncing / Cache Status Strip */}
      {isSyncing && (
        <div className="flex items-center gap-2 border-b border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 px-6 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Menyinkronkan data pengamatan terbaru dari Google Sheets untuk analisis Asisten...</span>
        </div>
      )}

      {!isSyncing && syncError && dataSource === 'cache' && (
        <div className="flex items-center justify-between gap-2 border-b border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-6 py-2 text-[11px] text-amber-800 dark:text-amber-300">
          <span>
            <strong>Mode Cache Offline:</strong> Asisten menggunakan {records.length} data tersimpan dari localStorage.
          </span>
          {onSyncNow && (
            <button
              type="button"
              onClick={onSyncNow}
              className="font-bold underline hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer"
            >
              Sinkronkan Ulang
            </button>
          )}
        </div>
      )}

      {/* Main Chat Messages List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
        
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[85%] max-w-lg mx-auto text-center space-y-6 py-4 animate-in fade-in duration-300">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg">
              <Sparkles className="h-7 w-7 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h4 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">
                Sapa Asisten Climatology AI
              </h4>
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Asisten AI Sembawa siap membantu Anda. Kirim pesan sapaan hangat atau klik rekomendasi pertanyaan agroklimatologi tanaman karet berikut untuk memulai:
              </p>
            </div>
            
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(undefined, s)}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 p-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-800 dark:hover:text-emerald-300 shadow-xs cursor-pointer transition-all duration-150 active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isBot = m.role === 'assistant';
          return (
            <div
              key={m.id}
              className={`flex w-full ${isBot ? 'justify-start' : 'justify-end'} animate-in fade-in duration-150`}
            >
              <div className={`flex max-w-[85%] items-start gap-3 ${!isBot && 'flex-row-reverse'}`}>
                {/* Avatar */}
                <div 
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold leading-none ${
                    isBot 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-800 text-white'
                  }`}
                >
                  {isBot ? 'AI' : 'US'}
                </div>

                {/* Bubble */}
                <div className="space-y-1">
                  <div 
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                      isBot 
                        ? 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none' 
                        : 'bg-emerald-600 text-white rounded-tr-none'
                    }`}
                  >
                    {/* Preserve line breaks and render simple markdown styling blocks */}
                    <p className="whitespace-pre-wrap">
                      {m.text.split('\n').map((line, idx) => {
                        // Very simple parser for Bold **text**
                        let content: React.ReactNode = line;
                        const boldPattern = /\*\*(.*?)\*\*/g;
                        
                        if (line.match(boldPattern)) {
                          const parts = line.split(boldPattern);
                          content = parts.map((part, pIdx) => {
                            // Even indexes are text, odd indexes are bold matches
                            return pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-slate-950 dark:text-white">{part}</strong> : part;
                          });
                        }

                        // Very simple italic bullet formatting: - *text*
                        return (
                          <span key={idx} className="block mt-1 first:mt-0">
                            {content}
                          </span>
                        );
                      })}
                      {m.id === typingMessageId && (
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-600 animate-pulse align-middle" />
                      )}
                    </p>
                  </div>
                  <span className={`block text-[9px] text-slate-400 ${!isBot && 'text-right'}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading placeholder */}
        {loading && (
          <div className="flex w-full justify-start animate-pulse">
            <div className="flex max-w-[70%] items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                AI
              </div>
              <div className="rounded-2xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-bounce"></span>
                  <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-1 text-[10px] tracking-wider uppercase font-bold text-slate-400">Gemini sedang menganalisis klimatologi karet...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2 max-w-lg mx-auto">
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gagal memproses pesan</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Message Form */}
      <form onSubmit={handleSendMessage} className="border-t border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 flex items-center gap-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Tanyakan analisis klimatologi karet kepada Asisten Sembawa..."
          disabled={loading}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 px-4 py-3 text-xs focus:border-emerald-500 focus:outline-hidden disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!userInput.trim() || loading}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-700 hover:shadow-md transition active:scale-95 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {/* Custom Confirmation Modal: Reset Chat */}
      {showConfirmReset && (
        <div id="reset-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-4">
              <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 p-2.5 border border-emerald-100 dark:border-emerald-900/40">
                <RefreshCw className="h-5 w-5 animate-spin" />
              </div>
              <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Atur Ulang Obrolan
              </h4>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Apakah Anda yakin ingin mengatur ulang percakapan dengan asisten harian? Ini akan membersihkan seluruh pesan obrolan saat ini.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmResetChat}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white transition shadow-md cursor-pointer"
              >
                Atur Ulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
