import { PengamatanHarian, SadapRecommendation } from '../types/klimatologi';

export const INITIAL_PENGAMATAN_DATA: PengamatanHarian[] = [
  {
    id: 'obs-2026-09-10',
    tanggal: '2026-09-10',
    penyinaran: null,
    suhuMax: 35,
    suhuMin: 25,
    suhuRerata: 30,
    kelembaban: 100,
    angin: 3.42,
    hujan: 0,
    evaporasi: 4.92,
    catatan: 'Kondisi pagi cerah berembun, bidang sadap kering dan optimal.',
    pengamat: 'Arifin, S.P',
  },
  {
    id: 'obs-2026-09-09',
    tanggal: '2026-09-09',
    penyinaran: 7.3,
    suhuMax: 35,
    suhuMin: 24,
    suhuRerata: 29.5,
    kelembaban: 71,
    angin: 3.27,
    hujan: 0,
    evaporasi: 4.86,
    catatan: 'Cuaca cerah sepanjang hari, penyadapan pagi hari berjalan lancar.',
    pengamat: 'Arifin, S.P',
  },
  {
    id: 'obs-2026-09-08',
    tanggal: '2026-09-08',
    penyinaran: 8,
    suhuMax: 35,
    suhuMin: 23,
    suhuRerata: 29,
    kelembaban: 71,
    angin: 2.83,
    hujan: 0,
    evaporasi: 3.44,
    catatan: 'Udara pagi sejuk, turgor sel lateks tinggi.',
    pengamat: 'Arifin, S.P',
  },
  {
    id: 'obs-2026-09-07',
    tanggal: '2026-09-07',
    penyinaran: 6.2,
    suhuMax: 35,
    suhuMin: 23,
    suhuRerata: 29,
    kelembaban: 75,
    angin: 3.74,
    hujan: 0,
    evaporasi: 4.88,
    catatan: 'Cerah berawan ringan, aman untuk aktivitas penyadapan.',
    pengamat: 'Arifin, S.P',
  },
  {
    id: 'obs-2026-09-06',
    tanggal: '2026-09-06',
    penyinaran: 8.5,
    suhuMax: 35,
    suhuMin: 23,
    suhuRerata: 29,
    kelembaban: 75,
    angin: 3.66,
    hujan: 0,
    evaporasi: 4.92,
    catatan: 'Penyinaran maksimal, evapotranspirasi stabil.',
    pengamat: 'Arifin, S.P',
  },
  {
    id: 'obs-2026-09-05',
    tanggal: '2026-09-05',
    penyinaran: 8.7,
    suhuMax: 35,
    suhuMin: 23,
    suhuRerata: 29,
    kelembaban: 70,
    angin: 3.01,
    hujan: 0,
    evaporasi: 5.04,
    catatan: 'Cerah panas, angin permukaan tenang.',
    pengamat: 'Arifin, S.P',
  },
  {
    id: 'obs-2026-09-04',
    tanggal: '2026-09-04',
    penyinaran: 9.2,
    suhuMax: 35,
    suhuMin: 22,
    suhuRerata: 28.5,
    kelembaban: 69,
    angin: 3.14,
    hujan: 0,
    evaporasi: 5.16,
    catatan: 'Suhu dini hari 22°C sangat mendukung aliran lateks.',
    pengamat: 'Arifin, S.P',
  },
];

export function hitungRekomendasiSadap(dataTerbaru?: PengamatanHarian): SadapRecommendation {
  if (!dataTerbaru || dataTerbaru.hujan === null) {
    return {
      status: 'BELUM_ADA',
      title: 'Rekomendasi Sadap Karet: Pengamatan Lapangan Belum Ada (-)',
      description:
        'Data curah hujan ditandai (-) atau belum ada observasi lapangan. Rekomendasi sadap akan aktif otomatis setelah ada observasi lapangan.',
      tingkatRisiko: 'netral',
    };
  }

  if (dataTerbaru.hujan > 5) {
    return {
      status: 'TUNDA',
      title: 'Rekomendasi Sadap Karet: Tunda Penyadapan (Curah Hujan Tinggi)',
      description: `Curah hujan tercatat ${dataTerbaru.hujan} mm. Hindari menyadap karena alur sadap basah dapat menyebabkan lateks mengalir keluar mangkuk dan memicu penyakit jamur bidang sadap (Mouldy Rot / Ceratocystis).`,
      tingkatRisiko: 'tinggi',
    };
  }

  if (dataTerbaru.hujan > 0 && dataTerbaru.hujan <= 5) {
    return {
      status: 'TUNDA',
      title: 'Rekomendasi Sadap Karet: Waspada / Cek Bidang Sadap',
      description: `Curah hujan ringan (${dataTerbaru.hujan} mm). Pastikan kulit batang dan alur sadap telah kering sempurna sebelum pisau sadap digoreskan.`,
      tingkatRisiko: 'sedang',
    };
  }

  return {
    status: 'AMAN',
    title: 'Rekomendasi Sadap Karet: Sangat Baik Untuk Penyadapan',
    description:
      'Kondisi kering dan optimal. Penyadapan pagi hari disarankan dimulai pada pukul 05:00 - 06:00 pagi demi turgor optimal dan aliran lateks maksimal.',
    tingkatRisiko: 'rendah',
  };
}
