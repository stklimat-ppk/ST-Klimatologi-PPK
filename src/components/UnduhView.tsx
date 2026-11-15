import { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Table,
} from 'lucide-react';
import { PengamatanHarian } from '../types/klimatologi';
import {
  exportPengamatanToCsv,
  exportPengamatanToExcel,
  exportPengamatanToJson,
} from '../lib/excelExport';

interface UnduhViewProps {
  data: PengamatanHarian[];
}

export function UnduhView({ data }: UnduhViewProps) {
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7days' | '30days'>('all');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const getFilteredData = () => {
    if (filterPeriod === '7days') return data.slice(0, 7);
    if (filterPeriod === '30days') return data.slice(0, 30);
    return data;
  };

  const filtered = getFilteredData();

  const handleExport = async (type: 'excel' | 'csv' | 'json') => {
    setIsExporting(type);
    try {
      if (type === 'excel') {
        await exportPengamatanToExcel(filtered);
        setSuccessNote(`Laporan Excel berhasil diunduh (${filtered.length} baris observasi).`);
      } else if (type === 'csv') {
        exportPengamatanToCsv(filtered);
        setSuccessNote(`Berkas CSV berhasil diekspor (${filtered.length} baris observasi).`);
      } else if (type === 'json') {
        exportPengamatanToJson(filtered);
        setSuccessNote(`Cadangan data JSON berhasil dibuat (${filtered.length} baris observasi).`);
      }
      setTimeout(() => setSuccessNote(null), 4000);
    } finally {
      setIsExporting(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Unduh Data Klimatologi Stasiun Sembawa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ekspor rekapitulasi data pengamatan agroklimatologi tanaman karet ke berbagai format standar BMKG.
          </p>
        </div>

        {/* Filter Period Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterPeriod('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              filterPeriod === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Semua ({data.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod('7days')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              filterPeriod === '7days'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod('30days')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              filterPeriod === '30days'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            30 Hari Terakhir
          </button>
        </div>
      </div>

      {successNote && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successNote}</span>
        </div>
      )}

      {/* 4 Export Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Excel Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-500/50 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Format Microsoft Excel</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Berkas .xlsx dengan header warna standar stasiun, pembekuan baris judul, dan lebar kolom otomatis.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleExport('excel')}
            disabled={isExporting !== null}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-[#009b5a] hover:bg-[#00854d] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting === 'excel' ? 'Mengunduh...' : 'Unduh Excel (.xlsx)'}</span>
          </button>
        </div>

        {/* CSV Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-500/50 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-3">
              <Table className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Format CSV</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Berkas teks berpemisah koma untuk analisis data statistik di R, Python, SPSS, atau GIS mikroklimat.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={isExporting !== null}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting === 'csv' ? 'Mengekspor...' : 'Unduh CSV (.csv)'}</span>
          </button>
        </div>

        {/* JSON Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-purple-500/50 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cadangan JSON</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Struktur data lengkap JSON beserta metadata stasiun untuk pemulihan atau sinkronisasi arsip web.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleExport('json')}
            disabled={isExporting !== null}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting === 'json' ? 'Menyiapkan...' : 'Unduh JSON (.json)'}</span>
          </button>
        </div>

        {/* Print Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-400/50 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3">
              <Printer className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cetak / Simpan PDF</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Mencetak lembar rekapitulasi data stasiun untuk arsip fisik atau tanda tangan laporan bulanan.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Preview Table of Download Data */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Pratinjau Berkas Ekspor ({filtered.length} Baris Data)
          </h2>
          <span className="text-xs text-slate-400">Pengamat: Arifin, S.P</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3 text-center">Penyinaran</th>
                <th className="py-2.5 px-3 text-center">Suhu Max</th>
                <th className="py-2.5 px-3 text-center">Suhu Min</th>
                <th className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                  Suhu Rerata
                </th>
                <th className="py-2.5 px-3 text-center">Kelembaban</th>
                <th className="py-2.5 px-3 text-center">Angin</th>
                <th className="py-2.5 px-3 text-center">Hujan</th>
                <th className="py-2.5 px-3 text-center">Evaporasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {row.tanggal}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono-tabular text-slate-700 dark:text-slate-300">
                    {row.penyinaran ? `${row.penyinaran} Jam` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono-tabular font-semibold text-red-500">
                    {row.suhuMax ? `${row.suhuMax} °C` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono-tabular font-semibold text-blue-500">
                    {row.suhuMin ? `${row.suhuMin} °C` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono-tabular font-bold text-slate-900 dark:text-white">
                    {row.suhuRerata ? `${row.suhuRerata} °C` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono-tabular text-slate-700 dark:text-slate-300">
                    {row.kelembaban !== null ? `${row.kelembaban} %` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono-tabular text-slate-700 dark:text-slate-300">
                    {row.angin ? `${row.angin} km/j` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono-tabular text-slate-700 dark:text-slate-300">
                    {row.hujan !== null ? `${row.hujan} mm` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono-tabular text-slate-700 dark:text-slate-300">
                    {row.evaporasi ? `${row.evaporasi} mm` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
