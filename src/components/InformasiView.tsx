import {
  Compass,
  FileCheck2,
  Gauge,
  Info,
  MapPin,
  Sun,
  Thermometer,
  TreeDeciduous,
  Wind,
} from 'lucide-react';

export function InformasiView() {
  const instruments = [
    {
      nama: 'Campbell Stokes',
      fungsi: 'Mengukur lama penyinaran matahari harian (durasi jam).',
      caraKerja: 'Lensa bola kaca membakar kertas pias surya saat tersinari matahari langsung. Pias diganti setiap pukul 18.00 WIB.',
      icon: Sun,
      warna: 'text-amber-500',
    },
    {
      nama: 'Sangkar Meteorologi',
      fungsi: 'Melindungi termometer agar terlindung dari radiasi matahari langsung dan hujan namun tetap terventilasi baik.',
      caraKerja: 'Memuat Termometer Bola Kering, Bola Basah, Termometer Maksimum (air raksa), dan Minimum (alkohol).',
      icon: Thermometer,
      warna: 'text-red-500',
    },
    {
      nama: 'Panci Penguapan Kelas A (BMKG)',
      fungsi: 'Mengukur jumlah evaporasi air permukaan bebas dalam satuan milimeter (mm).',
      caraKerja: 'Dilengkapi Hook Gauge, Still Well, Termometer Apung air, dan Cup Counter Anemometer ketinggian 0.5 meter.',
      icon: Gauge,
      warna: 'text-emerald-500',
    },
    {
      nama: 'Penakar Hujan Observatorium (Obs)',
      fungsi: 'Menakar volume presipitasi curah hujan harian secara akurat.',
      caraKerja: 'Mulut corong berluas 100 cm² dengan gelas ukur khusus skala 0.5–25 mm. Dibaca setiap pukul 07.00 WIB.',
      icon: Compass,
      warna: 'text-blue-500',
    },
    {
      nama: 'Cup Anemometer Ketinggian 10 Meter',
      fungsi: 'Mengukur kecepatan rata-rata angin dan arah tiupan angin permukaan.',
      caraKerja: 'Sensor tiga mangkok dan penunjuk arah mata angin yang terpasang di tiang terbuka bebas rintangan.',
      icon: Wind,
      warna: 'text-teal-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Informasi &amp; Panduan Stasiun Klimatologi
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Profil stasiun agroklimatologi perkebunan karet, instrumen standar BMKG, dan pedoman penyadapan karet Indonesia.
        </p>
      </div>

      {/* Grid: Profil Stasiun & SOP Penyadapan Karet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1 & 2: Profil & Standar Sadap */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profil Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Profil Lembaga
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Stasiun Klimatologi Puslit Karet • Sembawa
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Stasiun pengamatan agroklimatologi khusus penelitian tanaman karet di bawah naungan Pusat Penelitian Karet (Indonesian Rubber Research Institute). Data observasi harian digunakan untuk rekomendasi kultur teknis, peramalan produksi lateks, dan manajemen penyakit bidang sadap.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 shrink-0">
                <TreeDeciduous className="w-6 h-6" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Jl. Raya Palembang - Betung Km. 29, Banyuasin, Sumsel</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Compass className="w-4 h-4 text-slate-400 shrink-0" />
                <span>02°55&apos; LS, 104°32&apos; BT · Elevasi 24 mdpl</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <FileCheck2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Standar Mutu: BMKG &amp; Puslit Karet Indonesia</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Petugas / Penanggung Jawab: Arifin, S.P</span>
              </div>
            </div>
          </div>

          {/* Standar Agroklimatologi Penyadapan Karet */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pedoman Agroklimatologi Penyadapan Karet (Hevea brasiliensis)
            </h2>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60">
                <h3 className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                  1. Waktu Sadap Optimal (05:00 - 07:00 WIB)
                </h3>
                <p>
                  Pada dini hari menjelang subuh, tekanan turgor dalam pembuluh lateks mencapai puncaknya karena kelembaban tinggi dan suhu udara yang sejuk (22–25°C). Penyadapan pada jam ini menghasilkan debit lateks tertinggi dengan kecepatan aliran stabil.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/60">
                <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-1">
                  2. Dampak Hujan &amp; Penyakit Bidang Sadap
                </h3>
                <p>
                  Curah hujan &gt; 5 mm menyebabkan alur sadap basah. Jika dipaksakan disadap, getah lateks akan meluap (overflow) dari alur menuju mangkuk sadap dan tercecer ke tanah. Selain itu, kondisi basah sangat rawan infeksi jamur bidang sadap seperti <em>Ceratocystis fimbriata</em> (Mouldy Rot) dan <em>Phytophthora</em>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/60">
                <h3 className="font-bold text-sky-800 dark:text-sky-300 mb-1">
                  3. Pengaruh Kecepatan Angin &amp; Suhu Maksimum
                </h3>
                <p>
                  Suhu ekstrem siang hari (&gt; 34°C) dan angin kencang (&gt; 25 km/j) mempercepat proses penguapan dan koagulasi dini (pembekuan getah di alur sebelum masuk mangkuk). Kebun yang dirawat dengan tanaman pelindung angin (windbreak) memiliki mikroklimat lebih stabil.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom 3: Jam Pengamatan & Kontak Petugas */}
        <div className="space-y-6">
          {/* Jam Pengamatan Stasiun */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Jadwal Observasi Harian Stasiun
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span>Sesi 07:00 WIB</span>
                  <span className="text-emerald-600 font-mono-tabular">Pagi</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Pembacaan suhu minimum, penakar hujan obs, panci evaporasi kelas A, dan pemasangan pias Campbell Stokes.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span>Sesi 13:00 WIB</span>
                  <span className="text-amber-600 font-mono-tabular">Siang</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Pengukuran suhu maksimum siang, kelembaban udara bola basah/kering, dan kecepatan angin run-of-wind.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span>Sesi 18:00 WIB</span>
                  <span className="text-indigo-600 font-mono-tabular">Sore</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Pengambilan kartu pias surya Campbell Stokes, pembacaan termometer bola kering, dan penutupan observasi harian.
                </p>
              </div>
            </div>
          </div>

          {/* Kontak & Bantuan */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs text-xs space-y-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Kontak Stasiun
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Email Stasiun: <span className="font-semibold text-slate-800 dark:text-slate-200">stklimat.ppk@gmail.com</span>
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              Koordinator Stasiun: <span className="font-semibold text-slate-800 dark:text-slate-200">Arifin, S.P</span>
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              Situs Resmi: Pusat Penelitian Karet Indonesia
            </p>
          </div>
        </div>
      </div>

      {/* Instrumen Stasiun BMKG */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Instrumen Klimatologi di Taman Alat Stasiun Sembawa
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instruments.map((inst, idx) => {
            const Icon = inst.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg bg-white dark:bg-slate-800 shadow-2xs ${inst.warna}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">{inst.nama}</h3>
                </div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {inst.fungsi}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {inst.caraKerja}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
