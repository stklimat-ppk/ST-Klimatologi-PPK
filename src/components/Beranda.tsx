import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Sun, Thermometer, Wind, Droplets, CloudRain, ShieldAlert, Eye, Edit2, Trash2, Calendar, FileText, RefreshCw, Cloud, WifiOff } from 'lucide-react';
import { KlimatologiRecord } from '../types';

interface BerandaProps {
  records: KlimatologiRecord[];
  isAdmin: boolean;
  onEdit: (record: KlimatologiRecord) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  isSyncing?: boolean;
  onSyncNow?: () => void;
  lastSyncAt?: string | null;
  dataSource?: 'sheets' | 'cache' | null;
  syncError?: string | null;
}

export default function Beranda({
  records,
  isAdmin,
  onEdit,
  onDelete,
  onDeleteAll,
  isSyncing = false,
  onSyncNow,
  lastSyncAt,
  dataSource,
  syncError,
}: BerandaProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<KlimatologiRecord | null>(null);
  const [currentTime, setCurrentTime] = useState('');

  // Custom confirmation modal states for iframe security compatibility
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmTanggal, setDeleteConfirmTanggal] = useState<string>('');
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };
    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Sorting
  const [sortField, setSortField] = useState<keyof KlimatologiRecord>('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof KlimatologiRecord) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedRecords = [...records].sort((a, b) => {
    let comparison = 0;
    const valA = a[sortField];
    const valB = b[sortField];

    if (valA !== undefined && valB !== undefined) {
      if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      }
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Get the latest date string from the records (based on station dating)
  const latestDateStr = records.reduce((max, r) => r.tanggal > max ? r.tanggal : max, '');

  const filteredRecords = sortedRecords.filter((rec) => {
    // 1. Filter to only show records within the last 7 days from the latest station date
    if (latestDateStr) {
      const latestTime = new Date(latestDateStr + 'T00:00:00').getTime();
      const recTime = new Date(rec.tanggal + 'T00:00:00').getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if ((latestTime - recTime) < 0 || (latestTime - recTime) >= sevenDaysMs) {
        return false;
      }
    }

    // 2. Filter based on search term
    return rec.tanggal.includes(searchTerm) || (rec.catatan && rec.catatan.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const latestRecord = records[0];

  const isBlank = (val: any) => {
    return val === undefined || val === null || val === '' || val === '-' || val === 'null' || val === 'undefined';
  };

  const formatCardVal = (val: any, unit?: string, unitClass = "text-xs font-semibold text-slate-500", isTempOrRH = false) => {
    if (isBlank(val) || (isTempOrRH && (val === 0 || val === '0'))) {
      return <span className="text-slate-400 font-normal">-</span>;
    }
    return (
      <>
        {val}
        {unit && <span className={unitClass}> {unit}</span>}
      </>
    );
  };

  const formatValueWithUnit = (val: any, unit?: string, isTempOrRH = false) => {
    if (isBlank(val) || (isTempOrRH && (val === 0 || val === '0'))) {
      return <span className="text-slate-400 font-normal">-</span>;
    }
    return (
      <>
        {val}{unit ? ` ${unit}` : ''}
      </>
    );
  };

  const formatTempMinMax = (min: any, max: any) => {
    const minIsBlank = isBlank(min) || min === 0 || min === '0';
    const maxIsBlank = isBlank(max) || max === 0 || max === '0';
    if (minIsBlank && maxIsBlank) {
      return <span className="text-slate-400 font-normal">-</span>;
    }
    const minStr = minIsBlank ? '-' : `${min}°C`;
    const maxStr = maxIsBlank ? '-' : `${max}°C`;
    return `${minStr} / ${maxStr}`;
  };

  const getTappingAdvice = (r: KlimatologiRecord | undefined) => {
    const ch = typeof r?.curahHujan === 'number' ? r.curahHujan : (r?.curahHujan && r.curahHujan !== '-' ? parseFloat(String(r.curahHujan)) : NaN);
    if (!r || isBlank(r.curahHujan) || isNaN(ch)) {
      return {
        badge: 'Pengamatan Lapangan Belum Ada (-)',
        color: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200',
        recommendation: 'Data curah hujan ditandai (-) atau belum ada observasi lapangan. Rekomendasi sadap akan aktif otomatis setelah ada observasi lapangan.'
      };
    }
    if (ch > 10) {
      return {
        badge: 'Tunda Sadap / Bidang Sadap Basah',
        color: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300',
        recommendation: 'Hujan deras terdeteksi. Jangan lakukan penyadapan pagi hari untuk menghindari infeksi penyakit bidang sadap (Mati Alur Sadap / MAS) dan pengenceran lateks.'
      };
    } else if (ch > 0 && ch <= 10) {
      return {
        badge: 'Pengawasan Sadap (Rentan Air)',
        color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-300',
        recommendation: 'Hujan ringan terdeteksi. Gunakan pelindung corong getah (rain guard) jika penyadapan tetap dilakukan, pastikan alur sadap kering sebelum memulai.'
      };
    } else {
      return {
        badge: 'Sangat Baik Untuk Penyadapan',
        color: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300',
        recommendation: 'Kondisi kering dan optimal. Penyadapan pagi hari disarankan dimulai pada pukul 05:00 - 06:00 pagi demi turgor optimal dan aliran lateks maksimal.'
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* Syncing / Cache Status Banner */}
      {isSyncing && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Menyinkronkan data pengamatan terbaru dari Google Sheets...</span>
          </div>
          <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            GET Web App
          </span>
        </div>
      )}

      {!isSyncing && syncError && dataSource === 'cache' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300 shadow-2xs">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Mode Cache Offline:</strong> Menampilkan salinan data dari localStorage ({syncError}).
            </span>
          </div>
          {onSyncNow && (
            <button
              type="button"
              onClick={onSyncNow}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-200 transition cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {/* Overview Cards (Bento Grid of Latest Observation) */}
      <section className="space-y-3.5">
        <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-base font-bold text-slate-800 dark:text-slate-100 md:text-lg">
              Kondisi Klimatologi Lapangan Terbaru
            </h2>
            <div className="font-sans text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
              <span>Pengamatan stasiun tanggal:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{latestRecord?.tanggal || "-"}</span>
              {currentTime && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 font-mono border border-emerald-200 dark:border-emerald-900/30 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {currentTime}
                </span>
              )}
              {lastSyncAt && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <Cloud className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  Sinkron: {new Date(lastSyncAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* Rubber agronomy advice badge */}
          <div className={`p-2.5 rounded-xl border text-xs font-semibold ${getTappingAdvice(latestRecord).color} sm:max-w-md`}>
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Rekomendasi Sadap Karet: {getTappingAdvice(latestRecord).badge}</span>
            </div>
            <p className="mt-1 text-[10px] font-normal leading-normal text-slate-600 dark:text-slate-300">
              {getTappingAdvice(latestRecord).recommendation}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
          {/* 1. Lama Penyinaran */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <Sun className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Penyinaran</span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {formatCardVal(latestRecord?.lamaPenyinaran, "jam", "text-xs font-semibold text-slate-500 dark:text-slate-400")}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Durasi sinar matahari</p>
          </div>

          {/* 2. Suhu Max */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-rose-500 dark:text-rose-400">
              <Thermometer className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Suhu Max</span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {formatCardVal(latestRecord?.suhuMax, "°C", "text-sm font-semibold text-slate-500 dark:text-slate-400", true)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Suhu ekstrem siang</p>
          </div>

          {/* 3. Suhu Min */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-blue-500 dark:text-blue-400">
              <Thermometer className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Suhu Min</span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {formatCardVal(latestRecord?.suhuMin, "°C", "text-sm font-semibold text-slate-500 dark:text-slate-400", true)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Suhu dingin dini hari</p>
          </div>

          {/* 4. Suhu Rerata */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <Thermometer className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Rerata Suhu</span>
            </div>
            <p className="mt-2 text-xl font-bold text-emerald-900 dark:text-emerald-300 tabular-nums">
              {formatCardVal(latestRecord?.suhuRerata, "°C", "text-sm font-semibold text-emerald-700 dark:text-emerald-400", true)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Kombinasi temperatur rata</p>
          </div>

          {/* 5. Kelembaban */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-teal-500 dark:text-teal-400">
              <Droplets className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Kelembaban</span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {formatCardVal(latestRecord?.kelembaban, "%", "text-xs font-semibold text-slate-500 dark:text-slate-400", true)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Kandungan uap udara</p>
          </div>

          {/* 6. Angin */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <Wind className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Angin</span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {formatCardVal(latestRecord?.kecepatanAngin, "km/j", "text-[10px] font-normal text-slate-500 dark:text-slate-400")}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Laju sirkulasi udara</p>
          </div>

          {/* 7. Curah Hujan */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-indigo-500 dark:text-indigo-400">
              <CloudRain className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Curah Hujan</span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {(() => {
                if (isBlank(latestRecord?.curahHujan)) {
                  return <span className="text-slate-400 font-normal">-</span>;
                }
                const chNum = Number(latestRecord?.curahHujan);
                if (!isNaN(chNum) && chNum > 0) {
                  return (
                    <>
                      {latestRecord?.curahHujan}
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400"> mm</span>
                    </>
                  );
                }
                if (latestRecord?.curahHujan === 0 || latestRecord?.curahHujan === '0') {
                  return (
                    <>
                      0
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400"> mm</span>
                    </>
                  );
                }
                return <span className="text-slate-400 font-normal">{latestRecord?.curahHujan}</span>;
              })()}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Volume presipitasi</p>
          </div>

          {/* 8. Evaporasi */}
          <div className="rounded-xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/30 dark:bg-teal-950/20 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
              <FileText className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Evaporasi</span>
            </div>
            <p className="mt-2 text-xl font-bold text-teal-900 dark:text-teal-300 tabular-nums">
              {formatCardVal(latestRecord?.evaporasi, "mm", "text-xs font-semibold text-teal-700 dark:text-teal-400")}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Panci Kelas A BMKG</p>
          </div>
        </div>
      </section>

      {/* Main Historical Table with Search */}
      <section className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100 md:text-base">
              Riwayat Hasil Pengamatan Lapangan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan data komprehensif berdasarkan penanggalan stasiun: Hanya menampilkan data 7 hari terakhir saja.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search bar */}
            <div className="relative w-full max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Cari tanggal atau catatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 pl-9 pr-4 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {isAdmin && records.length > 0 && (
              <button
                type="button"
                onClick={() => setDeleteAllConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:text-rose-800 rounded-lg transition-all shadow-xs cursor-pointer self-start sm:self-auto"
                title="Hapus Seluruh Data"
              >
                <Trash2 className="h-4 w-4" />
                Hapus Semua Data
              </button>
            )}
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
          <table className="w-full border-collapse text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th onClick={() => handleSort('tanggal')} className="cursor-pointer px-4 py-3 text-emerald-800 dark:text-emerald-400 select-none hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-1">Tanggal {sortField === 'tanggal' && (sortOrder === 'desc' ? '▼' : '▲')}</span>
                </th>
                <th onClick={() => handleSort('lamaPenyinaran')} className="cursor-pointer px-3 py-3 select-none hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-1">Penyinaran (jam) {sortField === 'lamaPenyinaran' && (sortOrder === 'desc' ? '▼' : '▲')}</span>
                </th>
                <th onClick={() => handleSort('suhuMax')} className="cursor-pointer px-3 py-3 select-none hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-1">Suhu Max (°C) {sortField === 'suhuMax' && (sortOrder === 'desc' ? '▼' : '▲')}</span>
                </th>
                <th onClick={() => handleSort('suhuMin')} className="cursor-pointer px-3 py-3 select-none hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-1">Suhu Min (°C) {sortField === 'suhuMin' && (sortOrder === 'desc' ? '▼' : '▲')}</span>
                </th>
                <th onClick={() => handleSort('suhuRerata')} className="cursor-pointer px-3 py-3 text-emerald-800 dark:text-emerald-400 select-none hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-1">Suhu Rerata (°C) {sortField === 'suhuRerata' && (sortOrder === 'desc' ? '▼' : '▲')}</span>
                </th>
                <th onClick={() => handleSort('kelembaban')} className="cursor-pointer px-3 py-3 select-none hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-1">Kelembaban (%) {sortField === 'kelembaban' && (sortOrder === 'desc' ? '▼' : '▲')}</span>
                </th>
                <th onClick={() => handleSort('kecepatanAngin')} className="cursor-pointer px-3 py-3 select-none hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-1">Angin (km/j) {sortField === 'kecepatanAngin' && (sortOrder === 'desc' ? '▼' : '▲')}</span>
                </th>
                <th onClick={() => handleSort('curahHujan')} className="cursor-pointer px-3 py-3 select-none hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-1">Hujan (mm) {sortField === 'curahHujan' && (sortOrder === 'desc' ? '▼' : '▲')}</span>
                </th>
                <th onClick={() => handleSort('evaporasi')} className="cursor-pointer px-3 py-3 text-teal-800 dark:text-teal-400 select-none hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="flex items-center gap-1">Evaporasi (mm) {sortField === 'evaporasi' && (sortOrder === 'desc' ? '▼' : '▲')}</span>
                </th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {rec.tanggal}
                    </td>
                    <td className="px-3 py-3">{formatValueWithUnit(rec.lamaPenyinaran)}</td>
                    <td className="px-3 py-3 text-rose-600 dark:text-rose-400 font-medium">{formatValueWithUnit(rec.suhuMax, undefined, true)}</td>
                    <td className="px-3 py-3 text-blue-600 dark:text-blue-400 font-medium">{formatValueWithUnit(rec.suhuMin, undefined, true)}</td>
                    <td className="px-3 py-3 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold">{formatValueWithUnit(rec.suhuRerata, undefined, true)}</td>
                    <td className="px-3 py-3">{formatValueWithUnit(rec.kelembaban, "%", true)}</td>
                    <td className="px-3 py-3">{formatValueWithUnit(rec.kecepatanAngin)}</td>
                    <td className="px-3 py-3 font-semibold">
                      {(() => {
                        if (isBlank(rec.curahHujan)) {
                          return <span className="text-slate-400 font-normal">-</span>;
                        }
                        const chVal = Number(rec.curahHujan);
                        if (!isNaN(chVal) && chVal > 0) {
                          return (
                            <span className="rounded bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 text-indigo-700 dark:text-indigo-300">
                              {rec.curahHujan} mm
                            </span>
                          );
                        }
                        if (rec.curahHujan === 0 || rec.curahHujan === '0') {
                          return <span className="text-slate-400 font-normal">0</span>;
                        }
                        return <span className="text-slate-400 font-normal">{rec.curahHujan}</span>;
                      })()}
                    </td>
                    <td className="px-3 py-3 bg-teal-50/20 dark:bg-teal-950/20 text-teal-900 dark:text-teal-300 font-bold">{formatValueWithUnit(rec.evaporasi)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => onEdit(rec)}
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition"
                              title="Edit Data"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteConfirmId(rec.id);
                                setDeleteConfirmTanggal(rec.tanggal);
                              }}
                              className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition"
                              title="Hapus Data"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400 font-medium">
                    Tidak melacak hasil penemuan yang sesuai dengan kata kunci pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail Record Modal Panel */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-700 dark:text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-4">
              <h4 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">
                Detail Observasi Lapangan
              </h4>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-semibold text-slate-400">Tanggal Pengamatan</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{selectedRecord.tanggal || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-semibold text-slate-400">Lama Penyinaran (jam)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatValueWithUnit(selectedRecord.lamaPenyinaran, "jam")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-semibold text-slate-400">Suhu Udara (Min / Max)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatTempMinMax(selectedRecord.suhuMin, selectedRecord.suhuMax)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2 bg-emerald-50/20 dark:bg-emerald-950/20 px-1">
                <span className="font-bold text-emerald-800 dark:text-emerald-400">Rerata Suhu (Hitungan)</span>
                <span className="font-bold text-emerald-900 dark:text-emerald-300">{formatValueWithUnit(selectedRecord.suhuRerata, "°C", true)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-semibold text-slate-400">Kelembaban Nisbi Udara</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatValueWithUnit(selectedRecord.kelembaban, "%", true)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-semibold text-slate-400">Kecepatan Angin</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatValueWithUnit(selectedRecord.kecepatanAngin, "km/jam")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-semibold text-slate-400">Arah Angin</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{!isBlank(selectedRecord.arahAngin) ? selectedRecord.arahAngin : '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-semibold text-slate-400">Curah Hujan Harian</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-400">
                  {(() => {
                    if (isBlank(selectedRecord.curahHujan)) {
                      return <span className="text-slate-400 font-normal">-</span>;
                    }
                    const ch = Number(selectedRecord.curahHujan);
                    if (!isNaN(ch) && ch > 0) {
                      return `${selectedRecord.curahHujan} mm`;
                    }
                    if (selectedRecord.curahHujan === 0 || selectedRecord.curahHujan === '0') {
                      return '0 mm';
                    }
                    return <span className="text-slate-400 font-normal">{selectedRecord.curahHujan}</span>;
                  })()}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2 bg-teal-50/20 dark:bg-teal-950/20 px-1">
                <span className="font-bold text-teal-800 dark:text-teal-400">Evaporasi Panci Kelas A</span>
                <span className="font-bold text-teal-900 dark:text-teal-300">{formatValueWithUnit(selectedRecord.evaporasi, "mm")}</span>
              </div>
              {isAdmin && (selectedRecord.kelembabanPagi !== undefined || selectedRecord.kelembabanSiang !== undefined || selectedRecord.kelembabanSore !== undefined || selectedRecord.bolaKeringPagi !== undefined) && (
                <div className="rounded-lg bg-indigo-50/40 dark:bg-indigo-950/30 p-2 text-[10px] text-indigo-800 dark:text-indigo-300 space-y-1">
                  <p className="font-semibold text-indigo-900 dark:text-indigo-200 border-b border-indigo-100/50 dark:border-indigo-900/50 pb-1 uppercase tracking-wider text-[9px]">Sistem Pengamatan Kelembaban BMKG (3 Waktu):</p>
                  <p>
                    <span className="font-bold">Pagi (07:00):</span> {formatValueWithUnit(selectedRecord.kelembabanPagi, "%", true)} 
                    {!isBlank(selectedRecord.bolaKeringPagi) && Number(selectedRecord.bolaKeringPagi) > 0 && ` (BK: ${selectedRecord.bolaKeringPagi}°C, BB: ${selectedRecord.bolaBasahPagi}°C)`}
                  </p>
                  <p>
                    <span className="font-bold">Siang (13:00):</span> {formatValueWithUnit(selectedRecord.kelembabanSiang, "%", true)} 
                    {!isBlank(selectedRecord.bolaKeringSiang) && Number(selectedRecord.bolaKeringSiang) > 0 && ` (BK: ${selectedRecord.bolaKeringSiang}°C, BB: ${selectedRecord.bolaBasahSiang}°C)`}
                  </p>
                  <p>
                    <span className="font-bold">Sore (18:00):</span> {formatValueWithUnit(selectedRecord.kelembabanSore, "%", true)} 
                    {!isBlank(selectedRecord.bolaKeringSore) && Number(selectedRecord.bolaKeringSore) > 0 && ` (BK: ${selectedRecord.bolaKeringSore}°C, BB: ${selectedRecord.bolaBasahSore}°C)`}
                  </p>
                </div>
              )}
              {isAdmin && selectedRecord.bolaKering !== undefined && selectedRecord.bolaBasah !== undefined && selectedRecord.bolaKeringPagi === undefined && (
                <div className="rounded-lg bg-indigo-50/40 dark:bg-indigo-950/30 p-2 text-[10px] text-indigo-800 dark:text-indigo-300">
                  <p className="font-semibold">Sistem Hitung Psikrometer BMKG (Tunggal):</p>
                  <p>Suhu Bola Kering (BK): {formatValueWithUnit(selectedRecord.bolaKering, "°C", true)} | Bola Basah (BB): {formatValueWithUnit(selectedRecord.bolaBasah, "°C", true)}</p>
                </div>
              )}
              {isAdmin && selectedRecord.hookAwal !== undefined && (
                <div className="rounded-lg bg-teal-50/40 dark:bg-teal-950/30 p-2 text-[10px] text-teal-800 dark:text-teal-300">
                  <p className="font-semibold">Sistem Hitung Hook Gauge BMKG:</p>
                  <p>Hook Awal: {formatValueWithUnit(selectedRecord.hookAwal, "mm")} | Hook Akhir: {formatValueWithUnit(selectedRecord.hookAkhir, "mm")}</p>
                  <p>Keadaan Hujan: {formatValueWithUnit(selectedRecord.curahHujan, "mm")}</p>
                </div>
              )}
              {isAdmin && (
                <div className="pt-2">
                  <span className="font-semibold text-slate-400 block mb-1">Catatan Staf Lapangan / Dampak Karet:</span>
                  <p className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 italic text-slate-600 dark:text-slate-300 leading-relaxed">
                    "{!isBlank(selectedRecord.catatan) && selectedRecord.catatan !== '-' ? selectedRecord.catatan : '-'}"
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedRecord(null)}
              className="mt-5 w-full rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Tutup Detail
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal: Delete Single Record */}
      {deleteConfirmId && (
        <div id="delete-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <div className="rounded-full bg-rose-50 dark:bg-rose-950/30 p-2.5 border border-rose-100 dark:border-rose-900/40 animate-pulse">
                <Trash2 className="h-5 w-5" />
              </div>
              <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Konfirmasi Hapus Data
              </h4>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Apakah Anda yakin ingin menghapus data klimatologi tanggal <strong className="text-slate-800 dark:text-slate-200">{deleteConfirmTanggal}</strong>? Tindakan ini bersifat permanen dan tidak dapat dipulihkan.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmId(null);
                  setDeleteConfirmTanggal('');
                }}
                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmId) {
                    onDelete(deleteConfirmId);
                  }
                  setDeleteConfirmId(null);
                  setDeleteConfirmTanggal('');
                }}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-bold text-white transition shadow-md cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal: Delete All Records */}
      {deleteAllConfirm && (
        <div id="delete-all-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4 items-start">
              <div className="rounded-full bg-rose-50 dark:bg-rose-950/30 p-2.5 border border-rose-100 dark:border-rose-900/40 animate-pulse">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-slate-950 dark:text-white">
                  Hapus Seluruh Data
                </h4>
                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase mt-0.5 tracking-wider">Tindakan Irreversibel</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              ⚠️ <strong className="text-rose-600">Peringatan Keras:</strong> Apakah Anda yakin ingin menghapus <strong className="text-slate-800 dark:text-slate-200">SEMUA</strong> data klimatologi dari Beranda? Tindakan ini akan mengosongkan seluruh riwayat pengamatan secara permanen di database.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteAllConfirm(false)}
                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAll();
                  setDeleteAllConfirm(false);
                }}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-bold text-white transition shadow-md cursor-pointer"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple absolute closing x icon component
function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
