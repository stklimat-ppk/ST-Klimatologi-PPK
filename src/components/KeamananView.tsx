import { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Lock,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { PengamatanHarian, TamuLog } from '../types/klimatologi';
import { exportPengamatanToJson, parsePengamatanJson } from '../lib/excelExport';

interface KeamananViewProps {
  records: PengamatanHarian[];
  onReplaceRecords: (newRecords: PengamatanHarian[]) => void;
  onResetDefault: () => void;
}

const INITIAL_TAMU_LOGS: TamuLog[] = [
  {
    id: 'tamu-1',
    nama: 'Dr. Hendra Wijaya',
    instansi: 'Pusat Penelitian Bioteknologi & Perkebunan',
    tujuan: 'Validasi data mikroklimat kebun karet klon PB 260 & IRR 112',
    tanggal: '2026-09-02',
    jam: '09:30 WIB',
    kontak: '0812-7890-1122',
    status: 'Disetujui',
  },
  {
    id: 'tamu-2',
    nama: 'Siti Rahmawati, M.Si',
    instansi: 'Fakultas Pertanian Universitas Sriwijaya (UNSRI)',
    tujuan: 'Pengambilan data sekunder evaporasi panci kelas A untuk skripsi mahasiswa',
    tanggal: '2026-09-01',
    jam: '10:15 WIB',
    kontak: '0821-3456-7890',
    status: 'Selesai',
  },
  {
    id: 'tamu-3',
    nama: 'Bambang Irawan',
    instansi: 'Stasiun Klimatologi BMKG Kenten Palembang',
    tujuan: 'Kalibrasi rutin termometer maksimum sangkar meteorologi',
    tanggal: '2026-08-28',
    jam: '14:00 WIB',
    kontak: '0813-9988-7766',
    status: 'Selesai',
  },
];

export function KeamananView({
  records,
  onReplaceRecords,
  onResetDefault,
}: KeamananViewProps) {
  const [tamuLogs, setTamuLogs] = useState<TamuLog[]>(() => {
    try {
      const saved = localStorage.getItem('klimatologi_sembawa_tamu_logs');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_TAMU_LOGS;
  });

  const [searchTamu, setSearchTamu] = useState('');
  const [isAddTamuOpen, setIsAddTamuOpen] = useState(false);
  const [newNama, setNewNama] = useState('');
  const [newInstansi, setNewInstansi] = useState('');
  const [newTujuan, setNewTujuan] = useState('');
  const [newKontak, setNewKontak] = useState('');

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const saveTamuToStorage = (list: TamuLog[]) => {
    setTamuLogs(list);
    try {
      localStorage.setItem('klimatologi_sembawa_tamu_logs', JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const handleAddTamu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) return;

    const newLog: TamuLog = {
      id: `tamu-${Date.now()}`,
      nama: newNama.trim(),
      instansi: newInstansi.trim() || 'Umum / Mandiri',
      tujuan: newTujuan.trim() || 'Konsultasi Agroklimatologi Karet',
      tanggal: new Date().toISOString().slice(0, 10),
      jam: `${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
      kontak: newKontak.trim() || '-',
      status: 'Disetujui',
    };

    saveTamuToStorage([newLog, ...tamuLogs]);
    setNewNama('');
    setNewInstansi('');
    setNewTujuan('');
    setNewKontak('');
    setIsAddTamuOpen(false);
    setNotification({
      type: 'success',
      msg: `Data kunjungan tamu ${newLog.nama} berhasil didaftarkan dan diverifikasi.`,
    });
  };

  const handleToggleStatus = (id: string) => {
    const next = tamuLogs.map((t) => {
      if (t.id === id) {
        const nextStatus: TamuLog['status'] =
          t.status === 'Disetujui' ? 'Selesai' : t.status === 'Selesai' ? 'Menunggu' : 'Disetujui';
        return { ...t, status: nextStatus };
      }
      return t;
    });
    saveTamuToStorage(next);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parsePengamatanJson(text);
      if (parsed.length === 0) {
        setNotification({
          type: 'error',
          msg: 'Berkas JSON tidak memuat data pengamatan yang valid.',
        });
        return;
      }
      onReplaceRecords(parsed);
      setNotification({
        type: 'success',
        msg: `Berhasil memulihkan ${parsed.length} data pengamatan dari berkas "${file.name}".`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        msg: `Gagal membaca berkas JSON: ${err instanceof Error ? err.message : 'Format tidak sesuai'}`,
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredTamu = tamuLogs.filter(
    (t) =>
      t.nama.toLowerCase().includes(searchTamu.toLowerCase()) ||
      t.instansi.toLowerCase().includes(searchTamu.toLowerCase()) ||
      t.tujuan.toLowerCase().includes(searchTamu.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Administrasi Keamanan, Verifikasi &amp; Log Tamu
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pusat otorisasi akun pengamat stasiun, buku tamu penelitian lapangan, serta cadangan basis data klimatologi.
        </p>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p>{notification.msg}</p>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Grid: Admin Verification Card & Database Backup Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Verifikasi Hak Akses Stasiun */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Otorisasi Administrator Lapangan
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <UserCheck className="w-3.5 h-3.5" />
                    Terverifikasi Aktif
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    stklimat.ppk@gmail.com
                  </span>
                </div>
              </div>
            </div>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-slate-400 block mb-0.5">Penanggung Jawab</span>
              <span className="font-bold text-slate-900 dark:text-white">Arifin, S.P</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-slate-400 block mb-0.5">Izin Operasional</span>
              <span className="font-bold text-emerald-600">Full Access (Read / Write)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-slate-400 block mb-0.5">Data Terproteksi</span>
              <span className="font-bold text-slate-900 dark:text-white">{records.length} Hari Pengamatan</span>
            </div>
          </div>
        </div>

        {/* Card 2: Backup & Restore */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Cadangan &amp; Pemulihan
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Amankan seluruh riwayat pengamatan iklim ke berkas cadangan offline atau pulihkan data sebelumnya.
            </p>
          </div>

          <div className="space-y-2 mt-4">
            <button
              type="button"
              onClick={() => exportPengamatanToJson(records)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>Unduh Cadangan JSON</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pulihkan dari Berkas JSON</span>
            </button>

            <button
              type="button"
              onClick={onResetDefault}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Data Default</span>
            </button>
          </div>
        </div>
      </div>

      {/* Log Tamu & Pengunjung Stasiun Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Buku Log Tamu &amp; Kunjungan Riset Stasiun
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pencatatan resmi peneliti, mahasiswa, praktisi, dan instansi BMKG yang mengakses taman alat Puslit Karet Sembawa.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTamu}
                onChange={(e) => setSearchTamu(e.target.value)}
                placeholder="Cari tamu / instansi..."
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none w-48"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAddTamuOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#009b5a] hover:bg-[#00854d] rounded-lg transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Tamu</span>
            </button>
          </div>
        </div>

        {/* Tabel Tamu */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Tanggal &amp; Waktu</th>
                <th className="py-2.5 px-3">Nama Tamu</th>
                <th className="py-2.5 px-3">Instansi / Asal</th>
                <th className="py-2.5 px-3">Tujuan Kunjungan</th>
                <th className="py-2.5 px-3">Kontak</th>
                <th className="py-2.5 px-3 text-center">Status Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTamu.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono-tabular whitespace-nowrap text-slate-500">
                    <div>{row.tanggal}</div>
                    <div className="text-[11px] text-slate-400">{row.jam}</div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                    {row.nama}
                  </td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                    {row.instansi}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs">
                    {row.tujuan}
                  </td>
                  <td className="py-3 px-3 font-mono-tabular text-slate-500">
                    {row.kontak}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(row.id)}
                      title="Klik untuk mengubah status verifikasi"
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                        row.status === 'Disetujui'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : row.status === 'Selesai'
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {row.status}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Tamu */}
      {isAddTamuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pendaftaran Tamu / Peneliti Baru
            </h2>
            <form onSubmit={handleAddTamu} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: Dr. Ir. Budi Santoso"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Instansi / Universitas / Lembaga
                </label>
                <input
                  type="text"
                  required
                  value={newInstansi}
                  onChange={(e) => setNewInstansi(e.target.value)}
                  placeholder="Contoh: Balai Penelitian Tanaman Karet"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tujuan Kunjungan Lapangan
                </label>
                <textarea
                  rows={2}
                  required
                  value={newTujuan}
                  onChange={(e) => setNewTujuan(e.target.value)}
                  placeholder="Contoh: Pengamatan data curah hujan & suhu untuk evaluasi lateks"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="text"
                  value={newKontak}
                  onChange={(e) => setNewKontak(e.target.value)}
                  placeholder="Contoh: 0812-xxxx-xxxx"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddTamuOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-semibold text-white bg-[#009b5a] hover:bg-[#00854d]"
                >
                  Simpan Log Tamu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
