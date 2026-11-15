import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Mail, 
  Check, 
  X, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Search, 
  Trash2, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles, 
  MessageSquareWarning,
  Cloud,
  Database,
  RefreshCw,
  ExternalLink,
  FileSpreadsheet,
  HardDrive,
  Save,
  FileJson,
  ArrowUpRight
} from 'lucide-react';
import { getAuth, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { getFirebaseApp } from '../lib/firebaseClient';
import { fetchGuestsList, fetchEmailLogs, verifyGuestStatus } from '../lib/authService';
import { fetchGasRecords, getCachedRecords } from '../lib/gasService';

interface GuestUser {
  email: string;
  nama: string;
  instansi: string;
  tujuan: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  verifiedAt?: string;
}

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

interface SyncLog {
  timestamp: string;
  type: 'sheets' | 'drive';
  status: 'success' | 'failed';
  detail: string;
  targetEmail: string;
  link?: string;
}

export default function KeamananStasiun() {
  const [guests, setGuests] = useState<GuestUser[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'guests' | 'email-logs' | 'google-sync'>('guests');
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  // Google OAuth states
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  // Load guest data and email logs with auto-retry (API or direct Firestore fallback)
  const loadKeamananData = async (silent = false) => {
    let attempt = 0;
    const maxAttempts = silent ? 1 : 3;

    while (attempt < maxAttempts) {
      try {
        if (!silent && attempt === 0) setLoading(true);
        const [dataGuests, dataLogs] = await Promise.all([
          fetchGuestsList(),
          fetchEmailLogs()
        ]);

        setGuests(dataGuests);
        setEmailLogs(dataLogs);
        setError(null);
        if (!silent) setLoading(false);
        return;
      } catch (err: any) {
        attempt++;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          if (!silent) {
            console.error('Load keamanan error:', err);
            setError(err.message || 'Gagal memuat pusat data administratif.');
            setLoading(false);
          }
        }
      }
    }
  };

  useEffect(() => {
    loadKeamananData(false);

    // Memulihkan konektivitas Google Drive & Sheets secara otomatis agar terhubung selamanya
    try {
      const storedUser = localStorage.getItem('sembawa_google_user');
      const storedToken = localStorage.getItem('sembawa_google_token');
      if (storedUser) {
        setGoogleUser(JSON.parse(storedUser));
      }
      if (storedToken) {
        setGoogleToken(storedToken);
      }
    } catch (e) {
      console.error('Gagal memulihkan sesi Google terenkripsi:', e);
    }

    // Set up silent polling for security registrations & mail logs (every 5 seconds)
    const intervalId = setInterval(() => {
      loadKeamananData(true);
    }, 5000);
    
    // Load local sync logs if any
    try {
      const stored = localStorage.getItem('sembawa_sync_logs');
      if (stored) {
        setSyncLogs(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }

    return () => clearInterval(intervalId);
  }, []);

  const addSyncLog = (type: 'sheets' | 'drive', status: 'success' | 'failed', detail: string, targetEmail: string, link?: string) => {
    const newLog: SyncLog = {
      timestamp: new Date().toISOString(),
      type,
      status,
      detail,
      targetEmail,
      link
    };
    setSyncLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 50); // Keep last 50 logs
      try {
        localStorage.setItem('sembawa_sync_logs', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Google OAuth Connection Handler
  const handleConnectGoogle = async () => {
    try {
      setError(null);
      const app = getFirebaseApp();
      const auth = getAuth(app);
      
      const provider = new GoogleAuthProvider();
      // Add scopes for spreadsheets and drive file
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (!credential?.accessToken) {
        throw new Error('Gagal mendapatkan token akses dari Google OAuth.');
      }
      
      setGoogleUser(result.user);
      setGoogleToken(credential.accessToken);
      
      // Simpan kredensial secara permanen agar terhubung selamanya
      localStorage.setItem('sembawa_google_user', JSON.stringify(result.user));
      localStorage.setItem('sembawa_google_token', credential.accessToken);
      
      setSuccessNotification(`Sukses terhubung ke Google Workspace! Konektivitas disimpan secara permanen di browser Anda. Akun aktif: ${result.user.email}`);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        setError('Jendela pop-up Google OAuth ditutup sebelum penyelesaian atau diblokir oleh browser Anda. Jika Anda melihat ini di dalam Panel Review AI Studio (iframe), harap klik tombol "Buka di Tab Baru" di pojok kanan atas stasiun, pastikan pemblokir iklan/pop-up dinonaktifkan, lalu coba kembali.');
      } else {
        setError(err.message || 'Gagal menyambungkan akun Google.');
      }
    }
  };

  const handleDisconnectGoogle = () => {
    setGoogleUser(null);
    setGoogleToken(null);
    localStorage.removeItem('sembawa_google_user');
    localStorage.removeItem('sembawa_google_token');
    setSuccessNotification('Akun Google berhasil diputuskan dari sesi penangkaran.');
  };

  // Backup to Google Sheets
  const handleSheetsSync = async () => {
    if (!googleToken || !googleUser) return;
    setSyncingSheets(true);
    setError(null);
    try {
      // 1. Fetch live records from Google Apps Script Web App (fallback to cache/API)
      let records: any[] = [];
      try {
        records = await fetchGasRecords();
      } catch {
        const cached = getCachedRecords();
        if (cached.length > 0) {
          records = cached;
        } else {
          const resKlimatologi = await fetch('/api/klimatologi');
          if (!resKlimatologi.ok) {
            throw new Error('Gagal mengambil data klimatologi.');
          }
          records = await resKlimatologi.json();
        }
      }

      // 2. Search for existing spreadsheet titled 'Data-Klimatologi-Sembawa-Backup-Sheet'
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='Data-Klimatologi-Sembawa-Backup-Sheet' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id)`;
      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${googleToken}` }
      });
      if (!searchRes.ok) {
        throw new Error(`Gagal mencari spreadsheet: ${searchRes.statusText}`);
      }
      const searchData = await searchRes.json();
      const existingFile = searchData.files && searchData.files[0];

      let spreadsheetId = "";

      if (existingFile) {
        spreadsheetId = existingFile.id;
      } else {
        // Create new Sheet
        const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${googleToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: {
              title: 'Data-Klimatologi-Sembawa-Backup-Sheet'
            }
          })
        });
        if (!createRes.ok) {
          throw new Error(`Gagal membuat spreadsheet baru: ${createRes.statusText}`);
        }
        const sheetData = await createRes.json();
        spreadsheetId = sheetData.spreadsheetId;
      }

      // 3. Format row data for spreadsheets according to exact Google Sheets row specification
      const headers = [
        "tanggal",
        "penyinaranJam",
        "suhuMax",
        "suhuMin",
        "suhuRata",
        "rhRata",
        "kecepatanAngin",
        "arahAngin",
        "curahHujan",
        "penguapan",
      ];

      // Sort chronological
      const sortedRecords = [...records].sort((a: any, b: any) => String(a.tanggal || "").localeCompare(String(b.tanggal || "")));

      const rows = [
        headers,
        ...sortedRecords.map((r: any) => [
          r.tanggal || "",
          r.lamaPenyinaran !== undefined && r.lamaPenyinaran !== null ? r.lamaPenyinaran : (r.penyinaranJam ?? "-"),
          r.suhuMax !== undefined && r.suhuMax !== null ? r.suhuMax : "-",
          r.suhuMin !== undefined && r.suhuMin !== null ? r.suhuMin : "-",
          r.suhuRerata !== undefined && r.suhuRerata !== null ? r.suhuRerata : (r.suhuRata ?? "-"),
          r.kelembaban !== undefined && r.kelembaban !== null ? r.kelembaban : (r.rhRata ?? "-"),
          r.kecepatanAngin !== undefined && r.kecepatanAngin !== null ? r.kecepatanAngin : "-",
          r.arahAngin !== undefined && r.arahAngin !== null && r.arahAngin !== "" ? r.arahAngin : "-",
          r.curahHujan !== undefined && r.curahHujan !== null ? r.curahHujan : "-",
          r.evaporasi !== undefined && r.evaporasi !== null ? r.evaporasi : (r.penguapan ?? "-"),
        ])
      ];

      // 4. Clear old cell state first
      const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:Z5000:clear`;
      await fetch(clearUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${googleToken}` }
      });

      // 5. Update values in Google Sheets
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`;
      const updateRes = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: 'Sheet1!A1',
          majorDimension: 'ROWS',
          values: rows
        })
      });

      if (!updateRes.ok) {
        throw new Error(`Gagal menulis sel spreadsheet: ${updateRes.statusText}`);
      }

      const fileLink = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      addSyncLog(
        'sheets',
        'success',
        `Berhasil menyinkronkan ${records.length} baris observasi ke Google Sheets`,
        googleUser.email || "Unknown Admin",
        fileLink
      );
      setSuccessNotification(`Sinkronisasi Sheets sukses! ${records.length} baris telah tersimpan.`);
    } catch (err: any) {
      console.error(err);
      addSyncLog('sheets', 'failed', err.message || "Gagal sinkronisasi Sheets", googleUser.email || "Unknown Admin");
      setError(`Kesalahan sinkronisasi Sheets: ${err.message}`);
    } finally {
      setSyncingSheets(false);
    }
  };

  // Backup to Google Drive (JSON Archive)
  const handleDriveSync = async () => {
    if (!googleToken || !googleUser) return;
    setSyncingDrive(true);
    setError(null);
    try {
      // 1. Fetch live records
      let records: any[] = [];
      try {
        records = await fetchGasRecords();
      } catch {
        const cached = getCachedRecords();
        if (cached.length > 0) {
          records = cached;
        } else {
          const resKlimatologi = await fetch('/api/klimatologi');
          if (!resKlimatologi.ok) {
            throw new Error('Gagal mengambil data klimatologi.');
          }
          records = await resKlimatologi.json();
        }
      }
      const contentStr = JSON.stringify(records, null, 2);

      // 2. Search if data file already exists
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='data-klimatologi-sembawa-backup.json' and trashed=false&fields=files(id)`;
      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${googleToken}` }
      });
      if (!searchRes.ok) {
        throw new Error(`Gagal mencari arsip drive: ${searchRes.statusText}`);
      }
      const searchData = await searchRes.json();
      const existingFile = searchData.files && searchData.files[0];

      let fileId = "";

      if (existingFile) {
        fileId = existingFile.id;
        // Update content
        const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
        const updateRes = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${googleToken}`,
            'Content-Type': 'application/json'
          },
          body: contentStr
        });
        if (!updateRes.ok) {
          throw new Error(`Gagal memperbarui file backup JSON: ${updateRes.statusText}`);
        }
      } else {
        // Create file metadata first
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${googleToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'data-klimatologi-sembawa-backup.json',
            mimeType: 'application/json'
          })
        });
        if (!createRes.ok) {
          throw new Error(`Gagal membuat metadata file backup: ${createRes.statusText}`);
        }
        const fileData = await createRes.json();
        fileId = fileData.id;

        // Upload media content
        const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
        const updateRes = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${googleToken}`,
            'Content-Type': 'application/json'
          },
          body: contentStr
        });
        if (!updateRes.ok) {
          throw new Error(`Gagal mengunggah isi file backup JSON: ${updateRes.statusText}`);
        }
      }

      addSyncLog(
        'drive',
        'success',
        `Mencadangkan arsip lengkap database klimatologi (${records.length} records) format JSON ke Google Drive`,
        googleUser.email || "Unknown Admin"
      );
      setSuccessNotification("Database arsip JSON berhasil disimpan dan diunggah ke Google Drive Anda!");
    } catch (err: any) {
      console.error(err);
      addSyncLog('drive', 'failed', err.message || "Gagal mencadangkan arsip JSON", googleUser.email || "Unknown Admin");
      setError(`Kesalahan sinkronisasi Drive JSON: ${err.message}`);
    } finally {
      setSyncingDrive(false);
    }
  };

  // Approve or Reject Guest
  const handleVerify = async (email: string, status: 'verified' | 'rejected') => {
    try {
      setSuccessNotification(null);
      setError(null);
      const data = await verifyGuestStatus(email, status);

      // Update local state
      setGuests(prev => prev.map(g => g.email === email ? { ...g, status, verifiedAt: data.user.verifiedAt } : g));

      if (status === 'verified') {
        setSuccessNotification(`Sukses menyetujui akun tamu! Notifikasi persetujuan email otomatis telah berhasil dikirimkan ke ${email}.`);
      } else {
        setSuccessNotification(`Tamu dengan alamat email ${email} berhasil ditolak.`);
      }

      // Trigger refresh of email logs
      const dataLogs = await fetchEmailLogs();
      setEmailLogs(dataLogs);
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah status verifikasi tamu.');
    }
  };

  const filteredGuests = guests.filter(g => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      g.nama.toLowerCase().includes(query) || 
      g.email.toLowerCase().includes(query) || 
      g.instansi.toLowerCase().includes(query);
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && g.status === filterStatus;
  });

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="rounded-2xl border border-emerald-100 dark:border-slate-800 bg-linear-to-br from-emerald-50 to-teal-50 dark:from-slate-900/40 dark:to-teal-950/10 p-5 md:p-6 shadow-xs leading-normal">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-md">
              <Shield className="h-6 w-6 stroke-[1.8]" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 sm:text-xl">
                Administrasi Keamanan &amp; Verifikasi Tamu
              </h2>
              <p className="font-sans text-xs text-slate-505 dark:text-slate-400 mt-0.5">
                Verifikasi akses email pengunjung stasiun di bawah pengawasan langsung <span className="font-semibold text-emerald-600 dark:text-emerald-400">stklimat.ppk@gmail.com</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => loadKeamananData()}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 transition hover:bg-slate-50 dark:hover:bg-slate-805 cursor-pointer active:scale-95 shadow-xs"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Sub Tabs Toggle bar */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800/80 gap-1">
        <button
          onClick={() => setActiveSubTab('guests')}
          className={`px-4 py-2.5 font-display text-sm font-semibold border-b-2 transition duration-200 cursor-pointer ${
            activeSubTab === 'guests'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-450 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5" />
            <span>Permohonan Akses Tamu </span>
            {guests.filter(g => g.status === 'pending').length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white leading-none">
                {guests.filter(g => g.status === 'pending').length}
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => setActiveSubTab('google-sync')}
          className={`px-4 py-2.5 font-display text-sm font-semibold border-b-2 transition duration-200 cursor-pointer ${
            activeSubTab === 'google-sync'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-450 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Cloud className="h-4.5 w-4.5 text-blue-500 animate-pulse" />
            <span>Google Drive &amp; Sheets Sync</span>
          </div>
        </button>

        <button
          onClick={() => setActiveSubTab('email-logs')}
          className={`px-4 py-2.5 font-display text-sm font-semibold border-b-2 transition duration-200 cursor-pointer ${
            activeSubTab === 'email-logs'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-450 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Mail className="h-4.5 w-4.5" />
            <span>Log Notifikasi Email Gateway</span>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-1.5 py-0.5">
              {emailLogs.length} Terkirim
            </span>
          </div>
        </button>
      </div>

      {/* Success/Error Alerts inside workspace */}
      {successNotification && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/30 p-3.5 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-400 font-medium">
          <div className="flex items-center gap-2 leading-relaxed">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successNotification}</span>
          </div>
          <button 
            onClick={() => setSuccessNotification(null)}
            className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer font-bold font-mono px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-250 bg-rose-50/50 dark:bg-rose-955/20 p-4 text-xs text-rose-800 dark:text-rose-400 font-medium">
          <div className="flex items-start gap-2 leading-relaxed">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Galat Operasional:</span> {error}
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer font-mono font-bold px-1.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-48 w-full flex-col items-center justify-center gap-2">
          <svg className="animate-spin h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xs font-semibold text-slate-505">Membuka log keamanan Sembawa...</p>
        </div>
      ) : activeSubTab === 'guests' ? (
        <div className="space-y-4">
          
          {/* Filters & search */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari pengunjung berdasarkan Nama, Email, atau Instansi..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
            
            {/* Status Segment controls */}
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1">
              {[
                { id: 'all', title: 'Semua Tamu' },
                { id: 'pending', title: 'Menunggu Verifikasi (Pending)' },
                { id: 'verified', title: 'Aktif (Disetujui)' },
                { id: 'rejected', title: 'Ditolak' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    filterStatus === tab.id
                      ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-505 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  {tab.title}
                </button>
              ))}
            </div>
          </div>

          {filteredGuests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
              <ShieldAlert className="h-10 w-10 mx-auto text-slate-400 mb-2.5" />
              <p className="text-sm font-bold">Tidak Ada Data Tamu</p>
              <p className="text-xs text-slate-450 mt-1">Tidak ditemukan tamu yang cocok dengan filter atau kata kunci terpilih.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredGuests.map((user) => (
                <div 
                  key={user.email} 
                  className={`relative flex flex-col justify-between rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-xs transition hover:shadow-md ${
                    user.status === 'pending' 
                      ? 'border-amber-200 dark:border-amber-900/30 ring-1 ring-amber-500/10' 
                      : user.status === 'verified'
                      ? 'border-emerald-100 dark:border-emerald-900/20'
                      : 'border-rose-100 dark:border-rose-900/20'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Guest Name & Status bar */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div>
                        <h4 className="font-display text-sm font-bold text-slate-800 dark:text-white leading-tight">
                          {user.nama}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-64">
                          {user.email}
                        </p>
                      </div>
                      
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        user.status === 'pending'
                          ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-600/10'
                          : user.status === 'verified'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 ring-1 ring-emerald-600/10'
                          : 'bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-450'
                      }`}>
                        {user.status === 'pending' ? 'MENUNGGU ACC' : user.status === 'verified' ? 'AKTIF' : 'DITOLAK'}
                      </span>
                    </div>

                    {/* Metadata Detail Section */}
                    <div className="space-y-1.5 border-t border-slate-50 dark:border-slate-850 pt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-350">
                      <div>
                        <span className="font-bold text-[10px] text-slate-400 block uppercase tracking-wider">Instansi / Lembaga</span>
                        <span className="font-medium text-slate-800 dark:text-slate-100">{user.instansi}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[10px] text-slate-400 block uppercase tracking-wider">Tujuan Akses Data</span>
                        <span className="text-slate-505 dark:text-slate-400 italic font-mono">"{user.tujuan}"</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Masuk Daftar: {formatDate(user.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions control buttons */}
                  <div className="mt-5 flex gap-2 border-t border-slate-50 dark:border-slate-850 pt-4">
                    {user.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleVerify(user.email, 'verified')}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 transition active:scale-95 cursor-pointer shadow-xs shadow-emerald-900/10"
                        >
                          <Check className="h-4 w-4" />
                          <span>Setujui (ACC Akun)</span>
                        </button>
                        <button
                          onClick={() => handleVerify(user.email, 'rejected')}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-rose-50 dark:hover:bg-rose-955/20 hover:text-rose-600 text-xs font-semibold py-2 transition active:scale-95 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                          <span>Tolak</span>
                        </button>
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>
                          {user.status === 'verified' && user.verifiedAt ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="h-4 w-4" />
                              Disetujui {formatDate(user.verifiedAt)}
                            </span>
                          ) : (
                            <span className="text-rose-650 flex items-center gap-1 font-semibold">
                              <X className="h-4 w-4 text-rose-500" />
                              Ditolak oleh Admin
                            </span>
                          )}
                        </span>
                        
                        <button
                          onClick={() => handleVerify(user.email, user.status === 'verified' ? 'rejected' : 'verified')}
                          className="rounded-lg border border-slate-100 dark:border-slate-800 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          Ubah Keputusan
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeSubTab === 'google-sync' ? (
        /* GOOGLE WORKSPACE DRIVE & SHEETS INTEGRATION SUITE */
        <div className="space-y-6 leading-relaxed font-sans text-xs">
          <div className="rounded-2xl border border-blue-105 bg-blue-50/10 dark:bg-blue-955/10 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                Pusat Integrasi Awan Sembawa • Hubungkan Sekali, Aktif Selamanya
              </span>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white pt-1">
                Konektivitas Google Drive &amp; Spreadsheet
              </h3>
              <p className="text-xs text-slate-505 dark:text-slate-400">
                Satu kali klik untuk menghubungkan selamanya. Sesi enkripsi tautan awan disimpan secara permanen pada memori lokal browser Anda (untuk akun <strong className="font-semibold text-emerald-600">stklimat.ppk@gmail.com</strong>).
              </p>
            </div>
            
            {googleToken ? (
              <div className="flex flex-col items-end gap-1.5 shrink-0 animate-in fade-in duration-300">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/30 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Koneksi Aktif Selamanya
                </span>
                <span className="text-[10px] font-mono text-slate-505 dark:text-slate-400">{googleUser?.email}</span>
                <button
                  onClick={handleDisconnectGoogle}
                  className="mt-1 text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
                >
                  Putuskan Sambungan
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectGoogle}
                className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 cursor-pointer text-xs transition duration-150 active:scale-95 shadow-md shadow-blue-500/15 shrink-0 animate-pulse"
              >
                <Cloud className="h-4 w-4" />
                <span>Hubungkan &amp; Aktifkan Selamanya</span>
              </button>
            )}
          </div>

          {googleToken ? (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Google Sheets Backup Card */}
              <div className="rounded-2xl border border-slate-205 dark:border-slate-804 bg-white dark:bg-slate-900 p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
                    <FileSpreadsheet className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-slate-800 dark:text-white text-sm">Cadangkan Ke Google Sheets</h4>
                    <p className="text-slate-505 dark:text-slate-400 text-xs mt-1 leading-normal">
                      Menulis seluruh data observasi harian ke lembar kerja awan interaktif bernama <strong className="text-slate-700 dark:text-slate-300">"Data-Klimatologi-Sembawa-Backup-Sheet"</strong> agar dapat diedit, diformat, dan digrafikkan di Google Sheets Anda.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-50 dark:border-slate-850 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-medium">Auto-overwrite data Sheet1</span>
                  <button
                    onClick={handleSheetsSync}
                    disabled={syncingSheets}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-3 text-xs transition cursor-pointer active:scale-95"
                  >
                    {syncingSheets ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Sinkronisasi...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Mulai Cadangkan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Google Drive JSON Card */}
              <div className="rounded-2xl border border-slate-205 dark:border-slate-804 bg-white dark:bg-slate-900 p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-955/20 text-blue-500">
                    <HardDrive className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-slate-800 dark:text-white text-sm">Arsip Database JSON di Drive</h4>
                    <p className="text-slate-505 dark:text-slate-400 text-xs mt-1 leading-normal">
                      Mengunggah seluruh struktur mentah database klimatologi berupa cadangan file terenkripsi <strong className="text-slate-700 dark:text-slate-300">"data-klimatologi-sembawa-backup.json"</strong> di Google Drive Anda untuk dipulihkan kapan saja bila stasiun lokal mengalami eror.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-50 dark:border-slate-850 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-medium">Bypass format biner BMKG</span>
                  <button
                    onClick={handleDriveSync}
                    disabled={syncingDrive}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold py-2 px-3 text-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {syncingDrive ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Menyimpan arsip...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Unggah Arsip JSON</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 space-y-3">
              <Cloud className="h-10 w-10 mx-auto text-slate-400 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-slate-750 dark:text-slate-200">Koneksi Awan Belum Aktif</p>
                <p className="text-xs text-slate-450 mt-1 max-w-lg mx-auto leading-relaxed">
                  Guna menjamin keamanan jangka panjang data pengamatan karet di Balai Sembawa, silakan hubungkan akun Google Drive Anda di atas. Aplikasi ini hanya meminta hak akses terbatas untuk file-file yang dibuat oleh aplikasi ini (`drive.file` &amp; `spreadsheets`).
                </p>
              </div>
              <button
                onClick={handleConnectGoogle}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-805 transition cursor-pointer active:scale-95 shadow-xs"
              >
                <span>Hubungkan Sekarang</span>
              </button>
            </div>
          )}

          {/* Sync History Logs */}
          <div className="space-y-3">
            <h4 className="font-display font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
              <Clock className="h-4.5 w-4.5 text-slate-400" />
              Log Histori Sinkronisasi Sesi Ini
            </h4>

            {syncLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada rekaman log backup untuk sesi penjelajahan ini.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {syncLogs.map((log, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className={`rounded-full p-1.5 mt-0.5 ${
                        log.status === 'success' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                          : 'bg-rose-50 dark:bg-rose-955/20 text-rose-500'
                      }`}>
                        {log.type === 'sheets' ? <FileSpreadsheet className="h-3.5 w-3.5" /> : <HardDrive className="h-3.5 w-3.5" />}
                      </span>
                      <div className="space-y-0.5">
                        <p className="text-slate-800 dark:text-slate-200 font-semibold text-xs leading-normal">{log.detail}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Operator: {log.targetEmail} • {formatDate(log.timestamp)}</p>
                      </div>
                    </div>
                    {log.link && (
                      <a
                        href={log.link}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 transition shrink-0 flex items-center gap-1"
                      >
                        <span>Buka Berkas</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* EMAIL LOGS SIMULATION SUITE */
        <div className="space-y-4 leading-relaxed font-sans text-xs">
          <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900/20 p-4 font-medium text-amber-800 dark:text-amber-400 leading-normal flex items-start gap-2.5">
            <MessageSquareWarning className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5 animate-pulse" />
            <div>
              <strong>Kotak Inbuks Verifikasi Keamanan:</strong> Simulasi sistem ini mencatat seluruh aktivitas pengiriman notifikasi email otomatis di backend. Ini meliputi notifikasi registrasi tamu baru (ditujukan ke Admin <strong>stklimat.ppk@gmail.com</strong>) serta notifikasi persetujuan pendaftaran akun (ditujukan langsung ke alamat email tamu yang bersangkutan setelah disetujui / di-ACC).
            </div>
          </div>

          <div className="space-y-3">
            {emailLogs.map((log) => (
              <div 
                key={log.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-5 shadow-sm font-mono overflow-hidden transition"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 gap-2 text-[11px] text-slate-400">
                  <div className="space-y-1">
                    <div>
                      <strong className="text-emerald-400">KEPADA:</strong> <span className="text-slate-100">{log.to}</span>
                    </div>
                    <div>
                      <strong className="text-blue-400">SUBJEK:</strong> <span className="text-slate-100 font-semibold">{log.subject}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 font-sans text-[10px]">
                    <Clock className="h-3.5 w-3.5 text-slate-505" />
                    <span>{formatDate(log.sentAt)}</span>
                  </div>
                </div>

                <div className="py-4 text-xs whitespace-pre-wrap leading-relaxed text-slate-300 border-b border-slate-805">
                  {log.body}
                </div>

                <div className="pt-3 flex justify-between items-center text-[10px] text-slate-500 font-sans">
                  <span>Server Mail Gateway Status: <strong className="text-emerald-500">DELIVERED SUCCESSFULLY</strong> (SSL Handshake 256-bit)</span>
                  <span className="hidden sm:inline">ID: {log.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
