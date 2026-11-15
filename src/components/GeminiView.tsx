import { useState } from 'react';
import { Bot, Send, Sparkles, User } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { PengamatanHarian } from '../types/klimatologi';

interface Message {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  time: string;
}

interface GeminiViewProps {
  data: PengamatanHarian[];
}

export function GeminiView({ data }: GeminiViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      sender: 'gemini',
      text: 'Halo! Saya Asisten Gemini Agroklimatologi Stasiun Puslit Karet Sembawa. Saya dapat membantu menganalisis pengaruh cuaca terhadap penyadapan karet (Hevea brasiliensis), risiko penyakit jamur bidang sadap, rekomendasi waktu sadap optimal, dan pengoperasian instrumen BMKG. Ada yang ingin ditanyakan?',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickPrompts = [
    'Apakah cuaca saat ini aman untuk penyadapan karet besok pagi?',
    'Berapa batas curah hujan yang mengharuskan penundaan sadap?',
    'Bagaimana hubungan kelembaban tinggi dengan penyakit bidang sadap?',
    'Kapan waktu paling efektif mengukur panci evaporasi Kelas A?',
  ];

  const handleSend = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Coba panggil Gemini SDK jika ada API key
      const apiKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const summaryData = data.slice(0, 5).map((d) =>
          `Tanggal: ${d.tanggal}, SuhuMax: ${d.suhuMax}°C, SuhuMin: ${d.suhuMin}°C, Hujan: ${d.hujan}mm, RH: ${d.kelembaban}%, Angin: ${d.angin}km/j`
        ).join('\n');

        const systemInstruction = `Anda adalah Ahli Agroklimatologi dan Pakar Perkebunan Karet di Stasiun Klimatologi Puslit Karet Sembawa (Banyuasin, Sumatera Selatan). Jawablah pertanyaan pengguna secara profesional, ilmiah namun praktis bagi petani karet dan staf stasiun. Gunakan data observasi terbaru berikut jika relevan:\n${summaryData}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userText,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        const reply = response.text || 'Maaf, saya tidak dapat memproses jawaban saat ini.';
        setMessages((prev) => [
          ...prev,
          {
            id: `g-${Date.now()}`,
            sender: 'gemini',
            text: reply,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        return;
      }

      // Domain Fallback Engine jika API key belum dikonfigurasi
      await new Promise((r) => setTimeout(r, 800));
      let fallbackAnswer = '';
      const lower = userText.toLowerCase();

      if (lower.includes('aman') || lower.includes('sadap besok') || lower.includes('waktu sadap')) {
        const latest = data[0];
        if (latest && latest.hujan !== null) {
          if (latest.hujan > 0) {
            fallbackAnswer = `Berdasarkan data observasi ${latest.tanggal}, terdapat curah hujan sebesar ${latest.hujan} mm. Penyadapan sebaiknya DITUNDA jika kulit batang masih basah, guna mencegah lateks tercecer dan infeksi jamur garis hitam (Ceratocystis). Waktu sadap terbaik adalah saat alur sadap telah kering, umumnya pukul 05.00–07.00 WIB.`;
          } else {
            fallbackAnswer = `Berdasarkan data observasi ${latest.tanggal}, kondisi AMAN untuk disadap (Hujan: 0 mm, Suhu Rerata: ${latest.suhuRerata ?? 29.5}°C, RH: ${latest.kelembaban ?? 71}%). Dianjurkan mulai menyadap pukul 05.00–06.30 WIB ketika tekanan turgor pohon paling tinggi.`;
          }
        } else {
          fallbackAnswer = `Kondisi penyadapan sangat bergantung pada kondisi basah kulit pohon karet. Jika malam hari atau dini hari terjadi hujan di atas 5 mm, tunda penyadapan sampai bidang sadap kering. Waktu sadap optimal di Sembawa adalah pukul 05.00 - 07.00 WIB.`;
        }
      } else if (lower.includes('batas curah hujan') || lower.includes('tunda')) {
        fallbackAnswer = `Standar baku di perkebunan karet (Puslit Karet Indonesia): Curah hujan harian > 5 mm atau hujan yang terjadi sesaat sebelum/selama jam penyadapan mengharuskan penundaan sadap. Air hujan yang mengalir di alur sadap akan mencuci lateks keluar dari mangkok dan memicu penyakit bidang sadap (Mouldy Rot).`;
      } else if (lower.includes('kelembaban') || lower.includes('penyakit') || lower.includes('jamur')) {
        fallbackAnswer = `Kelembaban relatif (RH) tinggi di atas 90% yang disertai suhu sejuk (23–26°C) dan angin tenang menciptakan mikroklimat ideal bagi perkembangan spora jamur *Colletotrichum gloeosporioides*, *Oidium heveae*, dan *Ceratocystis fimbriata*. Dianjurkan melakukan penyiangan gulma piringan pohon untuk memperlancar aerasi udara di kebun.`;
      } else if (lower.includes('evaporasi') || lower.includes('panci')) {
        fallbackAnswer = `Pengukuran Panci Evaporasi Kelas A BMKG di Stasiun Sembawa dilakukan setiap pukul 07.30 WIB bersamaan dengan pembacaan hook gauge, termometer apung (suhu air maks & min), serta anemometer ketinggian 0.5 meter. Pastikan air panci tetap jernih dan bebas sampah dedaunan kebun.`;
      } else {
        fallbackAnswer = `Terima kasih atas pertanyaannya mengenai agroklimatologi tanaman karet di Stasiun Sembawa. Parameter iklim mikro seperti suhu ekstrem (max 35°C), kelembaban (71%), dan curah hujan sangat menentukan fisiologi pembuluh lateks dan produktivitas lateks mingguan. Apakah ada parameter spesifik yang ingin dianalisis lebih lanjut?`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `g-${Date.now()}`,
          sender: 'gemini',
          text: fallbackAnswer,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `g-${Date.now()}`,
          sender: 'gemini',
          text: `Gagal memproses jawaban: ${err instanceof Error ? err.message : 'Kesalahan jaringan'}.`,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Asisten Gemini Agroklimatologi
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Konsultasi cerdas analisis cuaca mikroklimat, manajemen perkebunan karet, dan instrumen BMKG Stasiun Sembawa.
        </p>
      </div>

      {/* Chat Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col h-[560px] overflow-hidden">
        {/* Messages List */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs ${
                  msg.sender === 'user' ? 'bg-slate-800' : 'bg-emerald-600'
                }`}
              >
                {msg.sender === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#009b5a] text-white rounded-tr-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
                <span
                  className={`block text-[10px] mt-1.5 ${
                    msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  {msg.time}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3 text-xs text-slate-500 rounded-tl-none flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Asisten Gemini sedang menganalisis data klimatologi...
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(prompt)}
              className="text-[11px] whitespace-nowrap px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend(inputPrompt);
            }}
            placeholder="Ketik pertanyaan terkait agroklimatologi karet atau data cuaca..."
            className="flex-1 px-4 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <button
            type="button"
            onClick={() => handleSend(inputPrompt)}
            disabled={!inputPrompt.trim() || isLoading}
            className="p-2.5 rounded-xl bg-[#009b5a] hover:bg-[#00854d] text-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
