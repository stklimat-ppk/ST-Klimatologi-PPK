import { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { PengamatanHarian } from '../types/klimatologi';
import { hitungRekomendasiSadap } from '../data/initialPengamatan';

interface InputModalProps {
  initialDate?: string;
  existingData?: PengamatanHarian;
  onClose: () => void;
  onSave: (record: PengamatanHarian) => void;
}

export function InputModal({
  initialDate,
  existingData,
  onClose,
  onSave,
}: InputModalProps) {
  const [tanggal, setTanggal] = useState(
    existingData?.tanggal || initialDate || new Date().toISOString().slice(0, 10)
  );
  const [penyinaran, setPenyinaran] = useState(
    existingData?.penyinaran !== null && existingData?.penyinaran !== undefined
      ? String(existingData.penyinaran)
      : ''
  );
  const [suhuMax, setSuhuMax] = useState(
    existingData?.suhuMax !== null && existingData?.suhuMax !== undefined
      ? String(existingData.suhuMax)
      : ''
  );
  const [suhuMin, setSuhuMin] = useState(
    existingData?.suhuMin !== null && existingData?.suhuMin !== undefined
      ? String(existingData.suhuMin)
      : ''
  );
  const [suhuRerata, setSuhuRerata] = useState(
    existingData?.suhuRerata !== null && existingData?.suhuRerata !== undefined
      ? String(existingData.suhuRerata)
      : ''
  );
  const [kelembaban, setKelembaban] = useState(
    existingData?.kelembaban !== null && existingData?.kelembaban !== undefined
      ? String(existingData.kelembaban)
      : ''
  );
  const [angin, setAngin] = useState(
    existingData?.angin !== null && existingData?.angin !== undefined
      ? String(existingData.angin)
      : ''
  );
  const [hujan, setHujan] = useState(
    existingData?.hujan !== null && existingData?.hujan !== undefined
      ? String(existingData.hujan)
      : ''
  );
  const [evaporasi, setEvaporasi] = useState(
    existingData?.evaporasi !== null && existingData?.evaporasi !== undefined
      ? String(existingData.evaporasi)
      : ''
  );
  const [catatan, setCatatan] = useState(existingData?.catatan || '');
  const [pengamat, setPengamat] = useState(existingData?.pengamat || 'Arifin, S.P');

  // Auto kalkulasi rerata suhu jika max dan min diisi
  const handleMaxChange = (val: string) => {
    setSuhuMax(val);
    const maxNum = parseFloat(val);
    const minNum = parseFloat(suhuMin);
    if (!isNaN(maxNum) && !isNaN(minNum) && (!suhuRerata || suhuRerata === '')) {
      setSuhuRerata(((maxNum + minNum) / 2).toFixed(1));
    }
  };

  const handleMinChange = (val: string) => {
    setSuhuMin(val);
    const maxNum = parseFloat(suhuMax);
    const minNum = parseFloat(val);
    if (!isNaN(maxNum) && !isNaN(minNum) && (!suhuRerata || suhuRerata === '')) {
      setSuhuRerata(((maxNum + minNum) / 2).toFixed(1));
    }
  };

  // Kalkulasi rekomendasi sadap sementara
  const tempPreviewRecord: PengamatanHarian = {
    id: 'temp',
    tanggal,
    penyinaran: penyinaran !== '' ? parseFloat(penyinaran) : null,
    suhuMax: suhuMax !== '' ? parseFloat(suhuMax) : null,
    suhuMin: suhuMin !== '' ? parseFloat(suhuMin) : null,
    suhuRerata: suhuRerata !== '' ? parseFloat(suhuRerata) : null,
    kelembaban: kelembaban !== '' ? parseFloat(kelembaban) : null,
    angin: angin !== '' ? parseFloat(angin) : null,
    hujan: hujan !== '' ? parseFloat(hujan) : null,
    evaporasi: evaporasi !== '' ? parseFloat(evaporasi) : null,
  };
  const previewRekomendasi = hitungRekomendasiSadap(tempPreviewRecord);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: PengamatanHarian = {
      id: existingData?.id || `obs-${tanggal}-${Date.now()}`,
      tanggal,
      penyinaran: penyinaran !== '' ? parseFloat(penyinaran) : null,
      suhuMax: suhuMax !== '' ? parseFloat(suhuMax) : null,
      suhuMin: suhuMin !== '' ? parseFloat(suhuMin) : null,
      suhuRerata: suhuRerata !== '' ? parseFloat(suhuRerata) : null,
      kelembaban: kelembaban !== '' ? parseFloat(kelembaban) : null,
      angin: angin !== '' ? parseFloat(angin) : null,
      hujan: hujan !== '' ? parseFloat(hujan) : null,
      evaporasi: evaporasi !== '' ? parseFloat(evaporasi) : null,
      catatan,
      pengamat,
    };
    onSave(newRecord);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {existingData ? 'Ubah Data Pengamatan Lapangan' : 'Input Data Pengamatan Lapangan'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Stasiun Klimatologi Puslit Karet Sembawa
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tanggal & Pengamat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Pengamatan
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Petugas / Pengamat
              </label>
              <input
                type="text"
                required
                value={pengamat}
                onChange={(e) => setPengamat(e.target.value)}
                placeholder="Nama Pengamat"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* Baris Suhu */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                Suhu Max (°C)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 35"
                value={suhuMax}
                onChange={(e) => handleMaxChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                Suhu Min (°C)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 24"
                value={suhuMin}
                onChange={(e) => handleMinChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                Suhu Rerata (°C)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 29.5"
                value={suhuRerata}
                onChange={(e) => setSuhuRerata(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono-tabular font-bold"
              />
            </div>
          </div>

          {/* Penyinaran & Kelembaban */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Penyinaran Matahari (Jam)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="12"
                placeholder="e.g. 9"
                value={penyinaran}
                onChange={(e) => setPenyinaran(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kelembaban Udara (%)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                placeholder="e.g. 71"
                value={kelembaban}
                onChange={(e) => setKelembaban(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono-tabular"
              />
            </div>
          </div>

          {/* Angin, Curah Hujan & Evaporasi */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Angin (km/j)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 3.75"
                value={angin}
                onChange={(e) => setAngin(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                Curah Hujan (mm)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 0"
                value={hujan}
                onChange={(e) => setHujan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Evaporasi (mm)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 4.5"
                value={evaporasi}
                onChange={(e) => setEvaporasi(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono-tabular"
              />
            </div>
          </div>

          {/* Catatan Lapangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Observasi Khusus
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Keterangan alur sadap, pertumbuhan jamur, intensitas hujan..."
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {/* Preview Rekomendasi Sadap Otomatis */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              previewRekomendasi.status === 'AMAN'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : previewRekomendasi.status === 'TUNDA'
                  ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">{previewRekomendasi.title}</strong>
              <span className="opacity-90">{previewRekomendasi.description}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#009b5a] hover:bg-[#00854d] rounded-lg transition-colors shadow-xs"
            >
              Simpan Data Observasi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
