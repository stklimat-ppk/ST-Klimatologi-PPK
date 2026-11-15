import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CloudRain,
  Droplets,
  Eye,
  FileText,
  Pen,
  Search,
  ShieldAlert,
  Sun,
  Thermometer,
  Trash2,
  Wind,
  X,
} from 'lucide-react';
import { PengamatanHarian } from '../types/klimatologi';
import { hitungRekomendasiSadap } from '../data/initialPengamatan';

type SortKey =
  | 'tanggal'
  | 'penyinaran'
  | 'suhuMax'
  | 'suhuMin'
  | 'suhuRerata'
  | 'kelembaban'
  | 'angin'
  | 'hujan'
  | 'evaporasi';

interface BerandaViewProps {
  data: PengamatanHarian[];
  onOpenInputDate: (tanggal?: string) => void;
  onDeleteRow?: (id: string) => void;
  onClearAllData: () => void;
}

export function BerandaView({
  data,
  onOpenInputDate,
  onDeleteRow,
  onClearAllData,
}: BerandaViewProps) {
  const [searchDate, setSearchDate] = useState('');
  const [currentTime, setCurrentTime] = useState('20:18:47');
  const [detailRow, setDetailRow] = useState<PengamatanHarian | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('tanggal');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().slice(0, 8));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const latest = data[0];
  const rekomendasi = hitungRekomendasiSadap(latest);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const displayedData = useMemo(() => {
    const filtered = data.filter((item) => {
      if (!searchDate.trim()) return true;
      const q = searchDate.trim().toLowerCase();
      return (
        item.tanggal.toLowerCase().includes(q) ||
        (item.catatan && item.catatan.toLowerCase().includes(q))
      );
    });

    const sevenLatest = filtered.slice(0, 7);

    return [...sevenLatest].sort((a, b) => {
      if (sortKey === 'tanggal') {
        return sortDir === 'desc'
          ? b.tanggal.localeCompare(a.tanggal)
          : a.tanggal.localeCompare(b.tanggal);
      }
      const valA = a[sortKey] ?? -Infinity;
      const valB = b[sortKey] ?? -Infinity;
      return sortDir === 'desc' ? Number(valB) - Number(valA) : Number(valA) - Number(valB);
    });
  }, [data, searchDate, sortKey, sortDir]);

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'desc' ? ' ▼' : ' ▲';
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3.5">
        {/* Top Row: Heading & Rubber Tapping Recommendation */}
        <div className="flex flex-col justify-between gap-1.5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white md:text-lg">
              Kondisi Klimatologi Lapangan Terbaru
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
              <span>Pengamatan stasiun tanggal:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {latest ? latest.tanggal : '-'}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 font-mono border border-emerald-200 dark:border-emerald-900/30 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {currentTime}
              </span>
            </div>
          </div>

          {/* Rekomendasi Sadap Karet Card */}
          <div
            className={`p-2.5 rounded-xl border text-xs font-semibold sm:max-w-md ${
              rekomendasi.status === 'AMAN'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : rekomendasi.status === 'TUNDA'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{rekomendasi.title}</span>
            </div>
            <p className="mt-1 text-[10px] font-normal leading-normal text-slate-600 dark:text-slate-400">
              {rekomendasi.description}
            </p>
          </div>
        </div>

        {/* 8 KPI Cards Grid: 2 cols mobile, 4 cols sm/md/lg, 8 cols xl */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
          {/* 1. Penyinaran */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-amber-600">
              <Sun className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Penyinaran
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800 dark:text-white font-mono-tabular">
              {latest?.penyinaran !== null && latest?.penyinaran !== undefined ? (
                <>
                  {latest.penyinaran}
                  <span className="text-xs font-semibold text-slate-500"> jam</span>
                </>
              ) : (
                <span className="text-slate-400 font-normal">-</span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Durasi sinar matahari
            </p>
          </div>

          {/* 2. Suhu Max */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-rose-500">
              <Thermometer className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Suhu Max
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800 dark:text-white font-mono-tabular">
              {latest?.suhuMax !== null && latest?.suhuMax !== undefined ? (
                <>
                  {latest.suhuMax}
                  <span className="text-sm font-semibold text-slate-500"> °C</span>
                </>
              ) : (
                <span className="text-slate-400 font-normal">-</span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Suhu ekstrem siang
            </p>
          </div>

          {/* 3. Suhu Min */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-blue-500">
              <Thermometer className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Suhu Min
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800 dark:text-white font-mono-tabular">
              {latest?.suhuMin !== null && latest?.suhuMin !== undefined ? (
                <>
                  {latest.suhuMin}
                  <span className="text-sm font-semibold text-slate-500"> °C</span>
                </>
              ) : (
                <span className="text-slate-400 font-normal">-</span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Suhu dingin dini hari
            </p>
          </div>

          {/* 4. Rerata Suhu */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/20 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600">
              <Thermometer className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Rerata Suhu
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-emerald-900 dark:text-emerald-300 font-mono-tabular">
              {latest?.suhuRerata !== null && latest?.suhuRerata !== undefined ? (
                <>
                  {latest.suhuRerata}
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {' '}
                    °C
                  </span>
                </>
              ) : (
                <span className="text-slate-400 font-normal">-</span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Kombinasi temperatur rata
            </p>
          </div>

          {/* 5. Kelembaban */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-teal-500">
              <Droplets className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Kelembaban
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800 dark:text-white font-mono-tabular">
              {latest?.kelembaban !== null && latest?.kelembaban !== undefined ? (
                <>
                  {latest.kelembaban}
                  <span className="text-xs font-semibold text-slate-500"> %</span>
                </>
              ) : (
                <span className="text-slate-400 font-normal">-</span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Kandungan uap udara
            </p>
          </div>

          {/* 6. Angin */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <Wind className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Angin
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800 dark:text-white font-mono-tabular">
              {latest?.angin !== null && latest?.angin !== undefined ? (
                <>
                  {latest.angin}
                  <span className="text-[10px] font-normal text-slate-500"> km/j</span>
                </>
              ) : (
                <span className="text-slate-400 font-normal">-</span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Laju sirkulasi udara
            </p>
          </div>

          {/* 7. Curah Hujan */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-indigo-500">
              <CloudRain className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Curah Hujan
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800 dark:text-white font-mono-tabular">
              {latest?.hujan !== null && latest?.hujan !== undefined ? (
                <>
                  {latest.hujan}
                  <span className="text-xs font-semibold text-slate-500"> mm</span>
                </>
              ) : (
                <span className="text-slate-400 font-normal">-</span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Volume presipitasi
            </p>
          </div>

          {/* 8. Evaporasi */}
          <div className="rounded-xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/20 dark:bg-teal-950/20 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-teal-600">
              <FileText className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Evaporasi
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-teal-900 dark:text-teal-300 font-mono-tabular">
              {latest?.evaporasi !== null && latest?.evaporasi !== undefined ? (
                <>
                  {latest.evaporasi}
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                    {' '}
                    mm
                  </span>
                </>
              ) : (
                <span className="text-slate-400 font-normal">-</span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Panci Kelas A BMKG
            </p>
          </div>
        </div>
      </section>

      {/* Riwayat Hasil Pengamatan Lapangan Section */}
      <section className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white md:text-base">
              Riwayat Hasil Pengamatan Lapangan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan data komprehensif berdasarkan penanggalan stasiun: Hanya menampilkan data 7 hari terakhir saja.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center shrink-0">
            <div className="relative w-full max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                placeholder="Cari tanggal atau catatan..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={onClearAllData}
              title="Hapus Seluruh Data"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 hover:text-rose-800 rounded-lg transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
            >
              <Trash2 className="h-4 w-4" />
              Hapus Semua Data
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
          <table className="w-full border-collapse text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th
                  onClick={() => handleSort('tanggal')}
                  className="cursor-pointer px-4 py-3 text-emerald-800 dark:text-emerald-400 select-none hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <span className="flex items-center gap-1">
                    Tanggal{sortIndicator('tanggal')}
                  </span>
                </th>
                <th
                  onClick={() => handleSort('penyinaran')}
                  className="cursor-pointer px-3 py-3 select-none hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Penyinaran (jam){sortIndicator('penyinaran')}
                </th>
                <th
                  onClick={() => handleSort('suhuMax')}
                  className="cursor-pointer px-3 py-3 select-none hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Suhu Max (°C){sortIndicator('suhuMax')}
                </th>
                <th
                  onClick={() => handleSort('suhuMin')}
                  className="cursor-pointer px-3 py-3 select-none hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Suhu Min (°C){sortIndicator('suhuMin')}
                </th>
                <th
                  onClick={() => handleSort('suhuRerata')}
                  className="cursor-pointer px-3 py-3 text-emerald-800 dark:text-emerald-400 select-none hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Suhu Rerata (°C){sortIndicator('suhuRerata')}
                </th>
                <th
                  onClick={() => handleSort('kelembaban')}
                  className="cursor-pointer px-3 py-3 select-none hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Kelembaban (%){sortIndicator('kelembaban')}
                </th>
                <th
                  onClick={() => handleSort('angin')}
                  className="cursor-pointer px-3 py-3 select-none hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Angin (km/j){sortIndicator('angin')}
                </th>
                <th
                  onClick={() => handleSort('hujan')}
                  className="cursor-pointer px-3 py-3 select-none hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Hujan (mm){sortIndicator('hujan')}
                </th>
                <th
                  onClick={() => handleSort('evaporasi')}
                  className="cursor-pointer px-3 py-3 text-teal-800 dark:text-teal-400 select-none hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Evaporasi (mm){sortIndicator('evaporasi')}
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data pengamatan lapangan. Klik tombol <strong>+ Input</strong> untuk menambahkan data.
                  </td>
                </tr>
              ) : (
                displayedData.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {row.tanggal}
                    </td>
                    <td className="px-3 py-3 font-mono-tabular">
                      {row.penyinaran !== null ? (
                        row.penyinaran
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-rose-600 dark:text-rose-400 font-medium font-mono-tabular">
                      {row.suhuMax ?? <span className="text-slate-400 font-normal">-</span>}
                    </td>
                    <td className="px-3 py-3 text-blue-600 dark:text-blue-400 font-medium font-mono-tabular">
                      {row.suhuMin ?? <span className="text-slate-400 font-normal">-</span>}
                    </td>
                    <td className="px-3 py-3 bg-emerald-50/10 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 font-bold font-mono-tabular">
                      {row.suhuRerata ?? <span className="text-slate-400 font-normal">-</span>}
                    </td>
                    <td className="px-3 py-3 font-mono-tabular">
                      {row.kelembaban !== null ? (
                        `${row.kelembaban} %`
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono-tabular">
                      {row.angin ?? <span className="text-slate-400 font-normal">-</span>}
                    </td>
                    <td className="px-3 py-3 font-semibold font-mono-tabular">
                      {row.hujan !== null ? (
                        <span className={row.hujan === 0 ? 'text-slate-400 font-normal' : ''}>
                          {row.hujan}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 bg-teal-50/10 dark:bg-teal-950/20 text-teal-900 dark:text-teal-300 font-bold font-mono-tabular">
                      {row.evaporasi ?? <span className="text-slate-400 font-normal">-</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailRow(row)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenInputDate(row.tanggal)}
                          className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                          title="Edit Data"
                        >
                          <Pen className="h-4 w-4" />
                        </button>
                        {onDeleteRow && (
                          <button
                            type="button"
                            onClick={() => onDeleteRow(row.id)}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Hapus Data"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Detail Pengamatan */}
      {detailRow && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Detail Pengamatan Stasiun
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tanggal: <strong className="text-slate-800 dark:text-slate-200">{detailRow.tanggal}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block">Penyinaran</span>
                <span className="font-bold">{detailRow.penyinaran ?? '-'} jam</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block">Suhu Max / Min</span>
                <span className="font-bold">
                  {detailRow.suhuMax ?? '-'}°C / {detailRow.suhuMin ?? '-'}°C
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block">Suhu Rerata</span>
                <span className="font-bold text-emerald-600">{detailRow.suhuRerata ?? '-'} °C</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block">Kelembaban</span>
                <span className="font-bold">{detailRow.kelembaban ?? '-'} %</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block">Angin</span>
                <span className="font-bold">{detailRow.angin ?? '-'} km/j</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block">Curah Hujan / Evaporasi</span>
                <span className="font-bold">
                  {detailRow.hujan ?? '-'} mm / {detailRow.evaporasi ?? '-'} mm
                </span>
              </div>
            </div>

            <div className="text-xs space-y-1 pt-1">
              <span className="text-slate-400 block">Catatan Pengamatan:</span>
              <p className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
                {detailRow.catatan || 'Tidak ada catatan khusus untuk tanggal ini.'}
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Pengamat: <strong>{detailRow.pengamat || 'Arifin, S.P'}</strong>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const t = detailRow.tanggal;
                  setDetailRow(null);
                  onOpenInputDate(t);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
              >
                Edit Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
