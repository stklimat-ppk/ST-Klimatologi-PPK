import React, { useState } from 'react';
import { X, Mail, User, Building, FileText, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, MailWarning } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (email: string, isAdmin: boolean, nama: string, instansi?: string) => void;
}

type AuthMode = 'login' | 'signup' | 'success';

export default function AuthModal({ onClose, onLoginSuccess }: AuthModalProps) {
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
          setMode('success'); // Show a specialized pending state screen!
        } else {
          setError(data.message || data.error || 'Gagal login.');
        }
        return;
      }

      // Successful login
      onLoginSuccess(data.email, data.isAdmin, data.nama, data.instansi);
      onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-505 transition active:scale-95 cursor-pointer"
          title="Tutup dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Branding Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md mb-3">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="font-display text-lg font-bold text-slate-800 dark:text-white leading-tight">
            Sistem Keamanan &amp; Autentikasi
          </h2>
          <p className="font-sans text-xs text-slate-505 dark:text-slate-400 mt-1">
            Stasiun Klimatologi Sembawa • Pusat Penelitian Karet
          </p>
        </div>

        {/* Display System Error Notification */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/25 dark:border-rose-900/30 p-3.5 text-xs text-rose-800 dark:text-rose-450 animate-in shake">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="leading-snug">{error}</div>
          </div>
        )}

        {/* MAIN VIEWS */}

        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-350">
                Alamat Email Pengguna
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4.5 w-4.5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="stklimat.ppk@gmail.com atau email tamu..."
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm font-medium focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal mt-1">
                Gunakan <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">stklimat.ppk@gmail.com</span> untuk masuk langsung sebagai Administrator.
              </p>
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
                  <span>Memeriksa Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk Sistem</span>
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
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Belum Terdaftar? Klik di Sini untuk Registrasi Tamu
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-3.5">
            <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-400 leading-normal">
              👋 <strong>Pendaftaran Tamu:</strong> Masukkan data diri Anda lengkap. Registrasi tamu membutuhkan verifikasi manual oleh Admin sebelum dapat digunakan.
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-350">
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
                  placeholder="budi@gmail.com, citra@univ.ac.id..."
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9 pr-4 text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-350">
                Nama Lengkap Penerima Akses <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama Lengkap sesuai Tanda Pengenal..."
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9 pr-4 text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-350">
                Nama Instansi / Perusahaan / Lembaga <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Building className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={instansi}
                  onChange={(e) => setInstansi(e.target.value)}
                  placeholder="cth: Universitas Sriwijaya, Kelompok Tani..."
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9 pr-4 text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-350">
                Tujuan Akses Data Lapangan <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <FileText className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={tujuan}
                  onChange={(e) => setTujuan(e.target.value)}
                  placeholder="cth: Riset skripsi tentang evaporasi BMKG Sembawa"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9 pr-4 text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
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
                  <span>Mengirim Pengajuan...</span>
                </>
              ) : (
                <span>Ajukan Registrasi Keamanan Tamu</span>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition underline cursor-pointer"
              >
                Kembali ke Menu Masuk
              </button>
            </div>
          </form>
        )}

        {mode === 'success' && (
          <div className="text-center space-y-4 py-3 animate-in fade-in duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-500 border border-amber-200 dark:border-amber-900/30">
              <MailWarning className="h-8 w-8 text-amber-600 dark:text-amber-400 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-bold text-slate-800 dark:text-white text-base">
                Menunggu Verifikasi Admin
              </h3>
              <p className="text-xs text-slate-505 dark:text-slate-400 leading-relaxed px-5">
                Registrasi permohonan akses Anda telah berhasil diajukan dan sedang menunggu persetujuan.
              </p>
            </div>

            <button
              onClick={() => {
                setMode('login');
                setError(null);
                setStatusMessage(null);
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-805 transition cursor-pointer"
            >
              <span>Kembali &amp; Masuk</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
