import React, { useState } from 'react';
import { 
  Mail, 
  User, 
  Building, 
  FileText, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  CloudSun, 
  Wind, 
  Droplets, 
  Thermometer, 
  Sun, 
  Moon,
  Lock,
  MailWarning,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginPageProps {
  onLoginSuccess: (email: string, isAdmin: boolean, nama: string, instansi?: string) => void;
  isDarkMode: boolean;
  onDarkModeToggle: () => void;
}

type AuthMode = 'login' | 'signup' | 'success';

export default function LoginPage({ onLoginSuccess, isDarkMode, onDarkModeToggle }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  
  // Signup fields
  const [nama, setNama] = useState('');
  const [instansi, setInstansi] = useState('');
  const [tujuan, setTujuan] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'pending') {
          setStatusMessage(data.message);
          setMode('success');
        } else {
          setError(data.message || data.error || 'Gagal login.');
        }
        return;
      }

      onLoginSuccess(data.email, data.isAdmin, data.nama, data.instansi);
    } catch (err) {
      console.error(err);
      setError('Kesalahan jaringan. Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !nama.trim() || !instansi.trim()) {
      setError('Harap isi semua kolom wajib (Email, Nama, dan Instansi).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          nama: nama.trim(),
          instansi: instansi.trim(),
          tujuan: tujuan.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'pending') {
          setStatusMessage(data.message);
          setMode('success');
        } else {
          setError(data.error || 'Registrasi gagal.');
        }
        return;
      }

      setStatusMessage(data.message);
      setMode('success');
    } catch (err) {
      console.error(err);
      setError('Kesalahan jaringan. Gagal mengirim permohonan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased">
      
      {/* LEFT SIDEBAR PANEL: Branded Information Pane (Visible on Medium screens and up) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 border-r border-slate-800 overflow-hidden flex-col justify-between p-12 leading-relaxed">
        
        {/* Background Gradients & Patterns */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950 via-slate-900 to-teal-950 opacity-90 z-0" />
        <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] rounded-full bg-emerald-500/10 blur-3xl z-0" />
        <div className="absolute bottom-[-10%] left-[-20%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-3xl z-0" />
        
        {/* Abstract Isometric Weather Isobars SVG Pattern overlay */}
        <div className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none z-0">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative shrink-0 select-none">
            <svg 
              viewBox="0 0 100 100" 
              className="h-12 w-12 drop-shadow-md transition transform hover:scale-105"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Blue Circle Ring */}
              <circle cx="50" cy="50" r="46" stroke="#0018f9" strokeWidth="5.5" fill="white" />
              
              {/* Center Blue Rectangle Column */}
              <rect x="36" y="12" width="28" height="76" fill="#0018f9" />
              
              {/* Stylized White Tapping Panels */}
              <g stroke="white" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
                <line x1="40" y1="27" x2="56" y2="41.5" />
                <line x1="40" y1="33" x2="56" y2="47.5" />
                <line x1="40" y1="39" x2="56" y2="53.5" />
                <line x1="40" y1="45" x2="56" y2="59.5" />
                <line x1="40" y1="51" x2="56" y2="65.5" />
                
                {/* Vertical Latex Canal */}
                <line x1="56" y1="65" x2="56" y2="72.5" />
              </g>
              
              {/* Latex Collection Cup */}
              <path 
                d="M 51 72.5 A 5 5 0 0 0 61 72.5 Z" 
                fill="white" 
              />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight text-white">
              SELAMAT DATANG
            </h1>
            <p className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-semibold">
              Klimatologi &amp; Agroklimatologi
            </p>
          </div>
        </div>

        {/* Feature / Informational Grid Card Slider */}
        <div className="relative z-10 my-auto max-w-md space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="space-y-3"
          >
            <span className="inline-flex rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
              Pusat Data Lapangan &amp; Evaporasi
            </span>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-white leading-tight">
              Sistem Pemantauan Terpadu Pusat Penelitian Karet Sembawa
            </h2>
            <p className="text-sm text-slate-300">
              Akses instan data pemantauan real-time stasiun klimatologi karet Sembawa. Membantu peneliti, dosen, mahasiswa, dan peninjau umum mengambil keputusan agroklimatologis yang akurat.
            </p>
          </motion.div>

          {/* Quick Metrics display widget in left column */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 backdrop-blur-xs p-4">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Thermometer className="h-4 w-4" />
                <span className="text-xs font-mono font-medium">Suhu Udara</span>
              </div>
              <p className="font-display text-lg font-bold text-white">Suhu Ekstrim &amp; Rata-Rata</p>
            </div>
            
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 backdrop-blur-xs p-4">
              <div className="flex items-center gap-2 text-teal-400 mb-1">
                <Droplets className="h-4 w-4" />
                <span className="text-xs font-mono font-medium">Kelembaban &amp; Evaporasi</span>
              </div>
              <p className="font-display text-lg font-bold text-white">Kajian Evaporasi Blok</p>
            </div>
          </div>
        </div>

        {/* Brand Footer Info */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between">
          <span>Stasiun Klimatologi Sembawa • Puslit Karet</span>
          <span className="font-mono text-[10px] text-emerald-500">v1.2.0-secure</span>
        </div>

      </div>

      {/* RIGHT PANEL: Interactive Form & Gate Controller (Full Width on mobile, 50% on desktop) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative">
        
        {/* Floating Utility Top bar: Darkmode Toggle & Backdoor Info */}
        <div className="flex items-center justify-between w-full">
          <div className="lg:hidden flex items-center gap-2">
            <div className="relative shrink-0 select-none">
              <svg 
                viewBox="0 0 100 100" 
                className="h-8 w-8 drop-shadow-xs"
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Outer Blue Circle Ring */}
                <circle cx="50" cy="50" r="46" stroke="#0018f9" strokeWidth="5.5" fill="white" />
                
                {/* Center Blue Rectangle Column */}
                <rect x="36" y="12" width="28" height="76" fill="#0018f9" />
                
                {/* Stylized White Tapping Panels */}
                <g stroke="white" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
                  <line x1="40" y1="27" x2="56" y2="41.5" />
                  <line x1="40" y1="33" x2="56" y2="47.5" />
                  <line x1="40" y1="39" x2="56" y2="53.5" />
                  <line x1="40" y1="45" x2="56" y2="59.5" />
                  <line x1="40" y1="51" x2="56" y2="65.5" />
                  
                  {/* Vertical Latex Canal */}
                  <line x1="56" y1="65" x2="56" y2="72.5" />
                </g>
                
                {/* Latex Collection Cup */}
                <path 
                  d="M 51 72.5 A 5 5 0 0 0 61 72.5 Z" 
                  fill="white" 
                />
              </svg>
            </div>
            <span className="font-display text-base font-extrabold tracking-tight text-slate-800 dark:text-white">SELAMAT DATANG</span>
          </div>
          <div className="hidden lg:block" /> {/* Spacing filler */}
          
          <button
            type="button"
            onClick={onDarkModeToggle}
            aria-label={isDarkMode ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition active:scale-95 cursor-pointer shadow-xs"
            title="Ubah Tema"
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Centered Form Wrapper Card */}
        <div className="my-auto mx-auto w-full max-w-sm py-8">
          
          {/* Header branding on mobile */}
          <div className="mb-6 lg:mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-md mb-3 border border-slate-100 dark:border-slate-800 p-1 select-none">
              <svg 
                viewBox="0 0 100 100" 
                className="h-full w-full drop-shadow-xs"
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Outer Blue Circle Ring */}
                <circle cx="50" cy="50" r="46" stroke="#0018f9" strokeWidth="5.5" fill="white" />
                
                {/* Center Blue Rectangle Column */}
                <rect x="36" y="12" width="28" height="76" fill="#0018f9" />
                
                {/* Stylized White Tapping Panels */}
                <g stroke="white" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
                  <line x1="40" y1="27" x2="56" y2="41.5" />
                  <line x1="40" y1="33" x2="56" y2="47.5" />
                  <line x1="40" y1="39" x2="56" y2="53.5" />
                  <line x1="40" y1="45" x2="56" y2="59.5" />
                  <line x1="40" y1="51" x2="56" y2="65.5" />
                  
                  {/* Vertical Latex Canal */}
                  <line x1="56" y1="65" x2="56" y2="72.5" />
                </g>
                
                {/* Latex Collection Cup */}
                <path 
                  d="M 51 72.5 A 5 5 0 0 0 61 72.5 Z" 
                  fill="white" 
                />
              </svg>
            </div>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Sistem Autentikasi Pengguna
            </h2>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Silakan mendaftar atau login dengan email Anda yang terverifikasi untuk mengakses database klimatologi.
            </p>
          </div>

          {/* Active Error Toast Inline */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/30 p-3.5 text-xs text-rose-800 dark:text-rose-400 animate-in shake">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="leading-snug">{error}</div>
            </div>
          )}

          <AnimatePresence mode="wait">
            
            {/* VIEW 1: Login Form */}
            {mode === 'login' && (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleLoginSubmit}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-350 tracking-wide uppercase">
                    Alamat Email Masuk <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Mail className="h-4.5 w-4.5" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Masukkan email Anda..."
                      required
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-10.5 pr-4 text-sm font-medium focus:border-emerald-500 focus:outline-hidden dark:text-white transition duration-150"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white py-2.5 text-sm font-bold shadow-md hover:bg-emerald-600 dark:hover:bg-emerald-700 hover:text-white transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                    }}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Belum Terdaftar? Daftar Tamu Baru Di Sini
                  </button>
                </div>
              </motion.form>
            )}

            {/* VIEW 2: Register Form */}
            {mode === 'signup' && (
              <motion.form
                key="signup-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleSignupSubmit}
                className="space-y-4"
              >
                <div className="rounded-xl bg-teal-50/50 dark:bg-emerald-950/10 border border-teal-100 dark:border-emerald-900/20 p-3 text-xs text-teal-800 dark:text-emerald-400 leading-normal">
                  📌 <strong>Memo Registrasi:</strong> Pendaftaran Pengunjung Umum / Peneliti memerlukan persetujuan dari Admin stasiun utama sebelum akses diberikan.
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-350 uppercase">
                    Alamat Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="budi.gunawan@gmail.com..."
                      required
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9.5 pr-4 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-350 uppercase">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Nama Lengkap sesuai KTP/ID..."
                      required
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9.5 pr-4 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-350 uppercase">
                    Instansi / Universitas <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Building className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={instansi}
                      onChange={(e) => setInstansi(e.target.value)}
                      placeholder="Universitas Sriwijaya (UNSRI)..."
                      required
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9.5 pr-4 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-350 uppercase">
                    Tujuan Penggunaan Data <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <FileText className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={tujuan}
                      onChange={(e) => setTujuan(e.target.value)}
                      placeholder="Penelitian evaporasi Balai Sembawa..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9.5 pr-4 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white py-2.5 text-xs font-bold shadow-md hover:bg-emerald-700 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Mengajukan Permohonan...</span>
                    </>
                  ) : (
                    <span>Kirim Pengajuan Akses Tamu</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition underline cursor-pointer"
                  >
                    Kembali ke Login Masuk
                  </button>
                </div>
              </motion.form>
            )}

            {/* VIEW 3: Pending Approval Banner */}
            {mode === 'success' && (
              <motion.div
                key="success-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-4 py-2"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-500 border border-amber-200 dark:border-amber-900/30">
                  <MailWarning className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-display font-bold text-slate-800 dark:text-white text-base">
                    Menunggu Verifikasi Admin
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Registrasi permohonan akses Anda telah berhasil diajukan dan sedang menunggu persetujuan.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setStatusMessage(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Kembali untuk Mencoba Masuk
                </button>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

        {/* Footnote copyright bar inside right panel */}
        <div className="text-center font-semibold text-[11px] text-slate-500 dark:text-slate-400">
          📍 Stasiun Klimatologi • Pusat Penelitian Karet • Sembawa
        </div>

      </div>

    </div>
  );
}
