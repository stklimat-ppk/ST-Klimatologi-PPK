import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PengamatanHarian } from '../types/klimatologi';

interface GrafikViewProps {
  data: PengamatanHarian[];
}

export function GrafikView({ data }: GrafikViewProps) {
  // Urutkan dari tanggal terlama ke terbaru untuk grafik time-series
  const chartData = [...data]
    .filter((d) => d.suhuMax !== null || d.hujan !== null || d.kelembaban !== null)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .map((d) => ({
      tanggal: d.tanggal.slice(5), // MM-DD
      suhuMax: d.suhuMax,
      suhuMin: d.suhuMin,
      suhuRerata: d.suhuRerata,
      hujan: d.hujan,
      evaporasi: d.evaporasi,
      kelembaban: d.kelembaban,
      penyinaran: d.penyinaran,
      statusSadap: (d.hujan ?? 0) > 0 ? 0 : 1, // 1 = Aman sadap, 0 = Tunda
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Grafik Analisis Tren Klimatologi
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Visualisasi parameter cuaca harian dan evaluasi kecocokan mikroklimat penyadapan karet di Stasiun Sembawa.
        </p>
      </div>

      {/* Grid 2 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik 1: Tren Suhu */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Fluktuasi Suhu Maksimum, Minimum &amp; Rerata
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Suhu (°C) harian stasiun pengamatan</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                <YAxis domain={[18, 40]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    borderColor: '#e2e8f0',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="suhuMax"
                  name="Suhu Max (°C)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="suhuRerata"
                  name="Suhu Rerata (°C)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="suhuMin"
                  name="Suhu Min (°C)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik 2: Curah Hujan & Evaporasi */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Curah Hujan &amp; Evaporasi Panci Kelas A
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Presipitasi dan penguapan air (milimeter)
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    borderColor: '#e2e8f0',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar
                  dataKey="hujan"
                  name="Curah Hujan (mm)"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="evaporasi"
                  name="Evaporasi (mm)"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik 3: Kelembaban & Penyinaran Matahari */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Kelembaban Relatif (RH) &amp; Penyinaran Matahari
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Kandungan uap air (%) vs durasi sinar (jam)</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rhColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    borderColor: '#e2e8f0',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="kelembaban"
                  name="Kelembaban (%)"
                  stroke="#06b6d4"
                  fillOpacity={1}
                  fill="url(#rhColor)"
                />
                <Line
                  type="monotone"
                  dataKey="penyinaran"
                  name="Penyinaran (Jam)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Info Agroklimat Karet */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Analisis Agroklimat Penyadapan Karet (Hevea brasiliensis)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Klimatologi mikro di kebun karet Sembawa menentukan kelancaran lateks dan kesehatan kulit pulihan:
            </p>
            <div className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">
                  Kondisi Sadap Prima:
                </span>{' '}
                Hujan 0 mm, suhu dini hari 22–25°C, kelembaban 70–85%. Tekanan turgor sel lateks maksimal.
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                <span className="font-bold text-amber-800 dark:text-amber-300">
                  Kondisi Waspada:
                </span>{' '}
                Kelembaban &gt; 90% berkepanjangan dengan angin lemah mempercepat penyebaran spora jamur bidang sadap (Ceratocystis fimbriata).
              </div>
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                <span className="font-bold text-red-800 dark:text-red-300">
                  Larangan Sadap:
                </span>{' '}
                Alur sadap terkena air hujan (hujan &gt; 5 mm) menyebabkan lateks mengalir meleber dan merusak bidang sadap.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
