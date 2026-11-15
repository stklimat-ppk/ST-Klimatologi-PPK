import React, { useState, useEffect } from 'react';
import { BookOpen, Info, CheckCircle2, Link2, RefreshCw, RotateCcw, Save, AlertCircle, Database, ShieldCheck } from 'lucide-react';
import { DEFAULT_GAS_WEB_APP_URL } from '../lib/gasService';

interface PengaturanProps {
  isAdmin?: boolean;
  gasUrl?: string;
  onSaveGasUrl?: (url: string) => void;
  onResetGasUrl?: () => void;
  onSyncNow?: () => Promise<void> | void;
  isSyncing?: boolean;
  lastSyncAt?: string | null;
  syncError?: string | null;
  dataSource?: 'sheets' | 'cache' | null;
  recordsCount?: number;
}

export default function Pengaturan({
  isAdmin = false,
  gasUrl = DEFAULT_GAS_WEB_APP_URL,
  onSaveGasUrl,
  onResetGasUrl,
  onSyncNow,
  isSyncing = false,
  lastSyncAt,
  syncError,
  dataSource,
  recordsCount = 0,
}: PengaturanProps) {
  const [urlInput, setUrlInput] = useState(gasUrl);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    setUrlInput(gasUrl);
  }, [gasUrl]);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    setSaveMessage(null);

    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError('URL Google Apps Script Web App tidak boleh kosong.');
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        setUrlError('URL harus menggunakan protokol https:// atau http://.');
        return;
      }
    } catch {
      setUrlError('Format URL tidak valid. Pastikan URL diawali dengan https://');
      return;
    }

    if (onSaveGasUrl) {
      try {
        onSaveGasUrl(trimmed);
        setSaveMessage('URL Google Apps Script Web App berhasil disimpan dan diterapkan.');
        setTimeout(() => setSaveMessage(null), 5000);
      } catch (err: any) {
        setUrlError(err.message || 'Gagal menyimpan URL backend.');
      }
    }
  };

  const handleResetUrl = () => {
    setUrlError(null);
    setSaveMessage(null);
    if (onResetGasUrl) {
      onResetGasUrl();
      setUrlInput(DEFAULT_GAS_WEB_APP_URL);
      setSaveMessage('URL dikembalikan ke endpoint Google Apps Script default.');
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const parametersInfo = [
    {
      name: 'Lama Penyinaran (jam)',
      method: 'Kartu Campbell Stokes',
      formula: 'Panjang kartu hangus terbakar sinar surya diukur dalam pecahan desimal jam.',
      agronomy: 'Lama penyinaran minimal harian yang stabil diperlukan tumbuhan karet untuk melangsungkan fotosintesis guna menghasilkan glukosa penyusun utama sel lateks.'
    },
    {
      name: 'Suhu Udara (°C)',
      method: 'Termometer Bola Kering & Bola Basah',
      formula: 'Pengukuran ekstrem harian tertinggi, terendah, dan formula rerata otomatis.',
      agronomy: 'Suhu lingkungan optimal berkisar antara 24°C - 28°C. Suhu dingin di pagi hari (~22°C) mengoptimalkan turgor pembuluh lateks, memberikan curahan getah maksimal saat disadap pukul 5-6 pagi.'
    },
    {
      name: 'Kelembaban Nisbi (%)',
      method: 'Psikrometer Assmann / Sangkar Meteorologi',
      formula: 'Rasio uap air udara dihitung otomatis dalam persentase (%).',
      agronomy: 'Kelembaban tinggi (>85%) yang disertai kabut rentan memicu penyakit gugur daun karet akibat jamur Colletotrichum gloeosporioides atau penyakit bidang sadap basah.'
    },
    {
      name: 'Kecepatan Angin (km/jam)',
      method: 'Cup Anemometer',
      formula: 'Laju putaran mangkuk angin dikonversi menjadi satuan kilometer per jam.',
      agronomy: 'Kecepatan angin tinggi berisiko mematahkan dahan rentan klon karet tertentu, serta mempercepat penguapan tanah.'
    },
    {
      name: 'Curah Hujan (mm)',
      method: 'Penakar Hujan Observatorium (Ombrometer)',
      formula: 'Volume air hujan yang tertampung dibagi luas corong penangkar (ukur air dalam gelas ukur).',
      agronomy: 'Hujan >10 mm membasahi kulit sadap (batang basah), sehingga dilarang menyadap agar tidak memicu infeksi penyakit kulit kayu (Bark rot) atau mengencerkan lateks.'
    },
    {
      name: 'Evaporasi (mm)',
      method: 'Hook Gauge Pancuran Evaporimeter Kelas A',
      formula: 'Selisih ketinggian jarum Hook Gauge harian disesuaikan dengan curah hujan hari yang bersangkutan.',
      agronomy: 'Nilai evaporasi krusial untuk menghitung neraca air tanah perkebunan rubber demi menghindari cekaman stres air.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Admin-only Google Apps Script Backend Settings */}
      {isAdmin && (
        <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-slate-900 p-5 md:p-6 shadow-sm space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Khusus Admin
                </span>
                <h2 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">
                  Pengaturan Backend Google Apps Script Web App
                </h2>
              </div>
              <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">
                Ubah URL endpoint Google Apps Script Web App untuk sinkronisasi data Google Sheets tanpa mengedit kode sumber.
              </p>
            </div>

            {onSyncNow && (
              <button
                type="button"
                onClick={onSyncNow}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95 disabled:opacity-60 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
              </button>
            )}
          </div>

          <form onSubmit={handleSaveUrl} className="space-y-4">
            <div>
              <label htmlFor="gas-webapp-url" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                <Link2 className="h-3.5 w-3.5 text-emerald-600" />
                URL Google Apps Script Web App (/exec)
              </label>
              <input
                id="gas-webapp-url"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
              />
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                Permintaan POST dikirim menggunakan header <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[10px]">Content-Type: text/plain;charset=utf-8</code> agar bebas preflight CORS.
              </p>
            </div>

            {urlError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/40 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{urlError}</span>
              </div>
            )}

            {saveMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/40 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{saveMessage}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-600 dark:hover:bg-emerald-700 transition cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                Simpan URL Backend
              </button>
              <button
                type="button"
                onClick={handleResetUrl}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset URL Default
              </button>
            </div>
          </form>

          {/* Sync & Offline Cache Telemetry */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3 border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Sumber Data Aktif</span>
              <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                <Database className="h-3.5 w-3.5 text-emerald-600" />
                {dataSource === 'cache' ? 'Cache Offline (localStorage)' : 'Google Sheets (Live Web App)'}
              </span>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3 border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Cache Tersimpan</span>
              <span className="mt-1 block text-xs font-bold text-slate-800 dark:text-slate-100">
                {recordsCount} baris pengamatan
              </span>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3 border border-slate-100 dark:border-slate-800">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Sinkronisasi Terakhir</span>
              <span className="mt-1 block text-xs font-bold text-slate-800 dark:text-slate-100">
                {lastSyncAt ? new Date(lastSyncAt).toLocaleString('id-ID') : 'Belum tersinkron'}
              </span>
            </div>
          </div>

          {syncError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300">
              <strong>Status Sinkronisasi Terakhir:</strong> {syncError}
            </div>
          )}
        </section>
      )}

      {/* Title */}
      <div>
        <h2 className="font-display text-base font-bold text-slate-800 dark:text-slate-100 md:text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          Metodologi Pengamatan Parameter Lapangan
        </h2>
        <p className="font-sans text-xs text-slate-500 dark:text-slate-400">
          Spesifikasi parameter klimatologi Sembawa dan agronomis komoditi tanaman karet (Hevea brasiliensis)
        </p>
      </div>

      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6 shadow-sm space-y-5">
        <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 dark:border-slate-800 pb-2.5 flex items-center gap-1.5">
          <Info className="h-4.5 w-4.5 text-slate-500" />
          Metode &amp; Instrumen Pengamatan Parameter Klimatologi
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parametersInfo.map((p, idx) => (
            <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3 leading-normal flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-display text-xs font-bold text-slate-800 dark:text-slate-100">{p.name}</span>
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-400 self-start sm:self-auto uppercase tracking-wide">
                    Alat: {p.method}
                  </span>
                </div>
                
                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <p>
                    <span className="font-bold text-slate-500 dark:text-slate-400">Metode &amp; Rumus:</span> {p.formula}
                  </p>
                </div>
              </div>

              <div className="italic bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-3 text-emerald-900 dark:text-emerald-300 border-l-3 border-l-emerald-600 mt-2 text-[11px] leading-relaxed">
                <span className="font-semibold not-italic text-slate-500 dark:text-slate-400 block mb-0.5 font-sans">Dampak bagi Tanaman Karet:</span>
                "{p.agronomy}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
