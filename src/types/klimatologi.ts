export interface PengamatanHarian {
  id: string;
  tanggal: string; // YYYY-MM-DD
  penyinaran: number | null; // Jam
  suhuMax: number | null; // °C
  suhuMin: number | null; // °C
  suhuRerata: number | null; // °C
  kelembaban: number | null; // %
  angin: number | null; // km/j
  hujan: number | null; // mm
  evaporasi: number | null; // mm
  catatan?: string;
  pengamat?: string;
}

export type NavTab =
  | 'beranda'
  | 'grafik'
  | 'gemini'
  | 'unduh'
  | 'informasi'
  | 'keamanan';

export interface SadapRecommendation {
  status: 'AMAN' | 'TUNDA' | 'BELUM_ADA';
  title: string;
  description: string;
  tingkatRisiko: 'rendah' | 'sedang' | 'tinggi' | 'netral';
}

export interface TamuLog {
  id: string;
  nama: string;
  instansi: string;
  tujuan: string;
  tanggal: string;
  jam: string;
  kontak: string;
  status: 'Disetujui' | 'Menunggu' | 'Selesai';
}

export type ObservationHour = '07:00' | '13:00' | '18:00';
export type ValidationStatus = 'Tervalidasi' | 'Perlu Tinjau';

export interface KlimatologiRecord {
  id: string;
  tanggal: string;
  jam: ObservationHour;
  suhuUdara: number;
  suhuMaks: number;
  suhuMin: number;
  kelembapan: number;
  curahHujan: number;
  kecepatanAngin: number;
  arahAngin: string;
  penyinaranMatahari: number;
  tekananUdara: number;
  penguapan: number;
  pengamat: string;
  status: ValidationStatus;
  catatan: string;
  updatedAt?: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  channel: 'local' | 'drive' | 'sheets';
  status: 'info' | 'success' | 'error';
  message: string;
  account: string;
  link?: string;
}
