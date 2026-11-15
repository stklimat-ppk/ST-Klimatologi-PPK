import { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import FormInputData from './components/FormInputData';
import Beranda from './components/Beranda';
import Grafik from './components/Grafik';
import Asisten from './components/Asisten';
import UnduhData from './components/UnduhData';
import Pengaturan from './components/Pengaturan';
import KeamananStasiun from './components/KeamananStasiun';
import AuthModal from './components/AuthModal';
import LoginPage from './components/LoginPage';
import { KlimatologiRecord, ActiveTab } from './types';
import {
  fetchGasRecords,
  postGasAction,
  getCachedRecords,
  setCachedRecords,
  getGasWebAppUrl,
  setGasWebAppUrl,
  resetGasWebAppUrl,
  getLastSyncTime,
} from './lib/gasService';
import { Leaf, RefreshCw, AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function App() {
  const [records, setRecords] = useState<KlimatologiRecord[]>(() => getCachedRecords());
  const [activeTab, setActiveTab] = useState<ActiveTab>('beranda');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(() => getCachedRecords().length === 0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'sheets' | 'cache' | null>(() =>
    getCachedRecords().length > 0 ? 'cache' : null
  );
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => getLastSyncTime());
  const [gasUrl, setGasUrl] = useState<string>(() => getGasWebAppUrl());
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const lastSyncTimestampRef = useRef<number>(0);

  // Dark Mode State with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  // Apply dark mode class to documentElement
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Credentials & Permanent Session Persistence (Sekali Login Selamanya)
  const ADMIN_EMAIL = 'stklimat.ppk@gmail.com';
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('userEmail');
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('isAdmin') === 'true';
  });
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem('userName');
  });
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Modal State
  const [showInputModal, setShowInputModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<KlimatologiRecord | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setActionToast({ type, message });
    setTimeout(() => {
      setActionToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Fetch all observations from Google Apps Script Web App (GET) and save to localStorage offline cache
  const fetchRecords = useCallback(async (silent = false, customUrl?: string) => {
    const cached = getCachedRecords();
    if (!silent && cached.length === 0) {
      setLoading(true);
    }
    setIsSyncing(true);
    setSyncError(null);

    try {
      const freshData = await fetchGasRecords(customUrl);
      setRecords(freshData);
      setDataSource('sheets');
      setLastSyncAt(new Date().toISOString());
      lastSyncTimestampRef.current = Date.now();
      setError(null);
      setSyncError(null);
      if (!silent) {
        showToast('success', `Sinkronisasi Google Sheets berhasil (${freshData.length} data pengamatan).`);
      }
    } catch (err: any) {
      console.error('Fetch Google Apps Script error:', err);
      const errMsg = err?.message || 'Gagal terhubung ke Google Apps Script Web App.';
      setSyncError(errMsg);

      const fallbackCache = getCachedRecords();
      if (fallbackCache.length > 0) {
        setRecords(fallbackCache);
        setDataSource('cache');
        setError(null);
      } else if (!silent) {
        setError(errMsg);
      }
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  }, [showToast]);

  // Initial load: fetch GET from Google Apps Script Web App
  useEffect(() => {
    fetchRecords(true);
  }, [fetchRecords]);

  // Ensure Beranda, Grafik, Asisten, and Unduh Data stay synchronized when opened
  useEffect(() => {
    const dataTabs: ActiveTab[] = ['beranda', 'grafik', 'asisten', 'unduh'];
    if (dataTabs.includes(activeTab)) {
      const elapsed = Date.now() - lastSyncTimestampRef.current;
      // Avoid redundant back-to-back calls if already synced within last 10 seconds
      if (elapsed > 10000 && !isSyncing) {
        fetchRecords(true);
      }
    }
  }, [activeTab, fetchRecords]);

  // Handle Login/Logout Toggle or Auth Modal
  const handleLoginToggle = () => {
    if (userEmail) {
      // Logout - Clear permanent session from localStorage
      setIsAdmin(false);
      setUserEmail(null);
      setUserName(null);
      localStorage.removeItem('userEmail');
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('userName');
      localStorage.removeItem('userInstansi');
      if (activeTab === 'keamanan') {
        setActiveTab('beranda');
      }
    } else {
      // Trigger login dialog
      setShowAuthModal(true);
    }
  };

  const handleLoginSuccess = (email: string, isUserAdmin: boolean, nama: string, instansi?: string) => {
    setUserEmail(email);
    setIsAdmin(isUserAdmin);
    setUserName(nama);

    // Persist login credentials in localStorage for permanent session (sekali login selamanya)
    localStorage.setItem('userEmail', email);
    localStorage.setItem('isAdmin', isUserAdmin ? 'true' : 'false');
    if (nama) localStorage.setItem('userName', nama);
    if (instansi) localStorage.setItem('userInstansi', instansi);

    if (isUserAdmin) {
      setActiveTab('keamanan');
    } else {
      setActiveTab('beranda');
    }
  };

  // Add or Update success callback (updates UI state & localStorage offline cache)
  const handleSubmissionSuccess = (newRecord: KlimatologiRecord) => {
    const wasEditing = Boolean(editingRecord);
    const previousId = editingRecord?.id;
    setShowInputModal(false);
    setEditingRecord(null);

    setRecords((prev) => {
      const idx = prev.findIndex(
        (item) =>
          item.id === newRecord.id ||
          (previousId && item.id === previousId) ||
          (wasEditing && item.tanggal === newRecord.tanggal)
      );
      let updated: KlimatologiRecord[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = newRecord;
      } else {
        updated = [newRecord, ...prev];
      }
      updated.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
      setCachedRecords(updated);
      return updated;
    });

    setDataSource('sheets');
    setLastSyncAt(new Date().toISOString());
    showToast(
      'success',
      wasEditing
        ? `Data tanggal ${newRecord.tanggal} berhasil diperbarui di Google Sheets.`
        : `Data tanggal ${newRecord.tanggal} berhasil ditambahkan ke Google Sheets.`
    );
  };

  // Trigger editing record
  const handleStartEdit = (record: KlimatologiRecord) => {
    setEditingRecord(record);
    setShowInputModal(true);
  };

  // Delete observation record matching ID via GAS POST
  const handleDeleteRecord = async (id: string) => {
    if (!isAdmin) return;
    const targetRecord = records.find((item) => item.id === id);

    try {
      await postGasAction({
        action: 'delete',
        adminEmail: userEmail || ADMIN_EMAIL,
        data: targetRecord || { id },
        id,
      });

      setRecords((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        setCachedRecords(updated);
        return updated;
      });
      showToast('success', `Data pengamatan (${targetRecord?.tanggal || id}) berhasil dihapus dari Google Sheets.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Error saat menghapus data di Google Sheets.');
    }
  };

  // Delete all observation records via GAS POST
  const handleDeleteAllRecords = async () => {
    if (!isAdmin || records.length === 0) return;

    try {
      for (const rec of records) {
        await postGasAction({
          action: 'delete',
          adminEmail: userEmail || ADMIN_EMAIL,
          data: rec,
          id: rec.id,
        });
      }
      setRecords([]);
      setCachedRecords([]);
      showToast('success', 'Seluruh data pengamatan berhasil dihapus dari Google Sheets.');
    } catch (err: any) {
      showToast('error', err?.message || 'Error saat menghapus semua data di Google Sheets.');
    }
  };

  // Admin: Save custom GAS Web App URL
  const handleSaveGasUrl = (newUrl: string) => {
    const saved = setGasWebAppUrl(newUrl);
    setGasUrl(saved);
    fetchRecords(false, saved);
  };

  // Admin: Reset GAS Web App URL to default
  const handleResetGasUrl = () => {
    const defaultUrl = resetGasWebAppUrl();
    setGasUrl(defaultUrl);
    fetchRecords(false, defaultUrl);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'beranda':
        return (
          <Beranda
            records={records}
            isAdmin={isAdmin}
            onEdit={handleStartEdit}
            onDelete={handleDeleteRecord}
            onDeleteAll={handleDeleteAllRecords}
            isSyncing={isSyncing}
            onSyncNow={() => fetchRecords(false)}
            lastSyncAt={lastSyncAt}
            dataSource={dataSource}
            syncError={syncError}
          />
        );
      case 'grafik':
        return (
          <Grafik
            records={records}
            isSyncing={isSyncing}
            onSyncNow={() => fetchRecords(false)}
            dataSource={dataSource}
            syncError={syncError}
          />
        );
      case 'asisten':
        return (
          <Asisten
            records={records}
            isSyncing={isSyncing}
            onSyncNow={() => fetchRecords(false)}
            dataSource={dataSource}
            syncError={syncError}
          />
        );
      case 'unduh':
        return (
          <UnduhData
            records={records}
            isSyncing={isSyncing}
            onSyncNow={() => fetchRecords(false)}
            dataSource={dataSource}
            syncError={syncError}
          />
        );
      case 'pengaturan':
        return (
          <Pengaturan
            isAdmin={isAdmin}
            gasUrl={gasUrl}
            onSaveGasUrl={handleSaveGasUrl}
            onResetGasUrl={handleResetGasUrl}
            onSyncNow={() => fetchRecords(false)}
            isSyncing={isSyncing}
            lastSyncAt={lastSyncAt}
            syncError={syncError}
            dataSource={dataSource}
            recordsCount={records.length}
          />
        );
      case 'keamanan':
        return isAdmin ? <KeamananStasiun /> : null;
      default:
        return null;
    }
  };

  if (!userEmail) {
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess}
        isDarkMode={isDarkMode}
        onDarkModeToggle={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 antialiased">
      {/* Master Top Header */}
      <Header
        isAdmin={isAdmin}
        userEmail={userEmail}
        onLoginToggle={handleLoginToggle}
        onOpenInputModal={() => {
          setEditingRecord(null);
          setShowInputModal(true);
        }}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isDarkMode={isDarkMode}
        onDarkModeToggle={() => setIsDarkMode(!isDarkMode)}
        isSyncing={isSyncing}
        onSyncNow={() => fetchRecords(false)}
        dataSource={dataSource}
      />

      {/* Backdrop overlay layer for mobile sidebar drawer */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-y-16 right-0 left-0 z-20 bg-slate-950/50 backdrop-blur-xs transition-all duration-300 cursor-pointer md:hidden animate-in fade-in"
          title="Tutup Menu"
        />
      )}

      <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden">
        {/* Left Side Navigation bar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isMobileMenuOpen={isMobileMenuOpen}
          onItemClick={() => setIsMobileMenuOpen(false)}
          isAdmin={isAdmin}
        />

        {/* Master Right Panel Workspace */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8 flex flex-col justify-between">
          <div className="flex-1">
            {actionToast && (
              <div
                className={`mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-sm animate-in fade-in ${
                  actionToast.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {actionToast.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>{actionToast.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionToast(null)}
                  className="rounded p-0.5 hover:bg-black/5 cursor-pointer"
                  aria-label="Tutup notifikasi"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {(loading || isSyncing) && records.length === 0 ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg animate-bounce">
                  <Leaf className="h-8 w-8" />
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Menyinkronkan data klimatologi dari Google Sheets...</span>
                </div>
              </div>
            ) : error && records.length === 0 ? (
              <div className="mx-auto flex max-w-md h-full flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="rounded-full bg-rose-50 dark:bg-rose-950/20 p-4 border border-rose-100 dark:border-rose-900/30 text-rose-500 shadow-xs">
                  <AlertCircle className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">Gangguan Sinkronisasi Google Sheets</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {error}
                  </p>
                </div>
                <button 
                  onClick={() => fetchRecords(false)}
                  className="rounded-xl bg-slate-900 dark:bg-slate-800 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-600 dark:hover:bg-emerald-700 transition cursor-pointer"
                >
                  Sinkronkan Sekarang
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                {renderTabContent()}
              </div>
            )}
          </div>

          {/* Institutional Copyright & Attribution Footer */}
          <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-1.5 lg:gap-2 font-medium">
              <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-1.5 text-center">
                <span>© {new Date().getFullYear()} Stasiun Klimatologi Puslit Karet.</span>
                <span>Hak Cipta Dilindungi Undang-Undang.</span>
              </div>
              <span className="hidden lg:inline text-slate-300 dark:text-slate-800">|</span>
              <div className="flex items-center gap-1 text-center justify-center mt-1 lg:mt-0">
                Created by <span className="text-rose-500 animate-pulse">Arifin, S.P</span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Input / Edit Modal overlay layer */}
      {showInputModal && (
        <FormInputData
          onClose={() => {
            setShowInputModal(false);
            setEditingRecord(null);
          }}
          onSubmitSuccess={handleSubmissionSuccess}
          editingRecord={editingRecord}
          adminEmail={userEmail || ADMIN_EMAIL}
        />
      )}

      {/* Auth Modal overlay layer */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}
