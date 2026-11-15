export interface KlimatologiRecord {
  id: string; // ISO Date YYYY-MM-DD
  tanggal: string; // YYYY-MM-DD
  lamaPenyinaran: number | string | null; // jam or '-'
  suhuMax: number | string | null; // °C or '-'
  suhuMin: number | string | null; // °C or '-'
  suhuRerata: number | string | null; // °C or '-'
  kelembaban: number | string | null; // % or '-'
  kecepatanAngin: number | string | null; // km/jam or '-'
  curahHujan: number | string | null; // mm or '-'
  evaporasi: number | string | null; // mm or '-'
  hookAwal?: number | string | null; // mm (optional hook gauge raw data helper)
  hookAkhir?: number | string | null; // mm (optional hook gauge raw data helper)
  anemometerAwal?: number | string | null; // km (optional anemometer counter helper)
  anemometerAkhir?: number | string | null; // km (optional anemometer counter helper)
  bolaKering?: number | string | null; // °C (optional dry-bulb temperature helper)
  bolaBasah?: number | string | null; // °C (optional wet-bulb temperature helper)
  bolaKeringPagi?: number | string | null;
  bolaBasahPagi?: number | string | null;
  bolaKeringSiang?: number | string | null;
  bolaBasahSiang?: number | string | null;
  bolaKeringSore?: number | string | null;
  bolaBasahSore?: number | string | null;
  kelembabanPagi?: number | string | null;
  kelembabanSiang?: number | string | null;
  kelembabanSore?: number | string | null;
  catatan?: string; // notes/comments on the observation
}

export type ActiveTab = 'beranda' | 'grafik' | 'asisten' | 'unduh' | 'pengaturan' | 'keamanan';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}
