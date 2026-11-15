import { KlimatologiRecord } from '../types';

export const DEFAULT_GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbyqG_CMmE1O0ebqPIdExY2e98dNtLmW3anRpEBz49jkeUBsF0QV0F8Dkhmm2T2R2VAf/exec';

export const GAS_URL_STORAGE_KEY = 'gas_web_app_url';
export const RECORDS_CACHE_STORAGE_KEY = 'klimatologi_records_cache';
export const LAST_SYNC_STORAGE_KEY = 'klimatologi_last_sync';

export type GasActionType = 'create' | 'update' | 'delete';

export interface GasPostPayload {
  action: GasActionType;
  adminEmail: string;
  data?: Partial<KlimatologiRecord> | Record<string, unknown>;
  id?: string;
}

export function getGasWebAppUrl(): string {
  try {
    const saved = localStorage.getItem(GAS_URL_STORAGE_KEY);
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  } catch (err) {
    console.warn('Gagal membaca URL Google Apps Script dari localStorage:', err);
  }
  return DEFAULT_GAS_WEB_APP_URL;
}

export function setGasWebAppUrl(url: string): string {
  const cleaned = url.trim();
  if (!cleaned) {
    throw new Error('URL Google Apps Script Web App tidak boleh kosong.');
  }
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('URL harus menggunakan protokol http:// atau https://.');
    }
  } catch {
    throw new Error('Format URL tidak valid. Pastikan URL diawali dengan https://');
  }
  localStorage.setItem(GAS_URL_STORAGE_KEY, cleaned);
  return cleaned;
}

export function resetGasWebAppUrl(): string {
  localStorage.setItem(GAS_URL_STORAGE_KEY, DEFAULT_GAS_WEB_APP_URL);
  return DEFAULT_GAS_WEB_APP_URL;
}

export function getCachedRecords(): KlimatologiRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_CACHE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Gagal membaca cache offline dari localStorage:', err);
  }
  return [];
}

export function setCachedRecords(records: KlimatologiRecord[]): void {
  try {
    localStorage.setItem(RECORDS_CACHE_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Gagal menyimpan cache offline ke localStorage:', err);
  }
}

export function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setLastSyncTime(isoTime: string): void {
  try {
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, isoTime);
  } catch {
    // Ignore storage quota errors
  }
}

function normalizeDateString(rawVal: unknown): string {
  if (rawVal === undefined || rawVal === null) return '';
  const str = String(rawVal).trim();
  if (!str) return '';

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // ISO timestamp e.g. 2026-05-01T17:00:00.000Z from Google Sheets Date cell
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      // Format in Asia/Jakarta (WIB) to avoid UTC off-by-one day shift on Google Sheets dates
      try {
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(d);
        const y = parts.find((p) => p.type === 'year')?.value;
        const m = parts.find((p) => p.type === 'month')?.value;
        const day = parts.find((p) => p.type === 'day')?.value;
        if (y && m && day) return `${y}-${m}-${day}`;
      } catch {
        return str.slice(0, 10);
      }
    }
    return str.slice(0, 10);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return str;
}

function roundClean(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function normalizeValue(val: unknown): number | string {
  if (val === undefined || val === null || val === '' || val === '-' || val === 'null' || val === 'undefined') {
    return '-';
  }
  if (typeof val === 'number') {
    return isNaN(val) ? '-' : roundClean(val);
  }
  const str = String(val).trim();
  if (str === '' || str === '-') return '-';
  // Replace comma decimal with dot if Sheets returned Indonesian locale decimal string
  const normalizedNumStr = str.replace(',', '.');
  if (/^-?\d+(\.\d+)?$/.test(normalizedNumStr)) {
    const parsed = parseFloat(normalizedNumStr);
    return isNaN(parsed) ? '-' : roundClean(parsed);
  }
  return str;
}

function normalizeOptionalValue(val: unknown): number | string | undefined {
  if (val === undefined || val === null || val === '') {
    return undefined;
  }
  return normalizeValue(val);
}

function pickField(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in row && row[key] !== undefined) {
      return row[key];
    }
  }
  // Case-insensitive / stripped fallback
  const lowerMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    lowerMap.set(k.toLowerCase().replace(/[\s_]/g, ''), v);
  }
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[\s_]/g, '');
    if (lowerMap.has(normalizedKey)) {
      return lowerMap.get(normalizedKey);
    }
  }
  return undefined;
}

export function normalizeGasRecords(rawPayload: unknown): KlimatologiRecord[] {
  let rows: unknown[] = [];

  if (Array.isArray(rawPayload)) {
    rows = rawPayload;
  } else if (rawPayload && typeof rawPayload === 'object') {
    const obj = rawPayload as Record<string, unknown>;
    if (Array.isArray(obj.data)) rows = obj.data;
    else if (Array.isArray(obj.records)) rows = obj.records;
    else if (Array.isArray(obj.rows)) rows = obj.rows;
    else if (Array.isArray(obj.result)) rows = obj.result;
    else if (Array.isArray(obj.items)) rows = obj.items;
  }

  const normalized: KlimatologiRecord[] = [];

  for (const item of rows) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;

    const rawTanggal = pickField(row, ['tanggal', 'date', 'tgl', 'TanggalPengamatan']);
    const tanggal = normalizeDateString(rawTanggal);
    if (!tanggal) continue;

    const rawId = pickField(row, ['id', 'recordId', 'ID']);
    const id = rawId !== undefined && rawId !== null && String(rawId).trim() !== '' ? String(rawId).trim() : tanggal;

    const rawCatatan = pickField(row, ['catatan', 'notes', 'keterangan']);
    const catatan =
      rawCatatan !== undefined && rawCatatan !== null && String(rawCatatan).trim() !== ''
        ? String(rawCatatan).trim()
        : '-';

    normalized.push({
      id,
      tanggal,
      lamaPenyinaran: normalizeValue(pickField(row, ['lamaPenyinaran', 'penyinaranJam', 'penyinaran', 'sunshine', 'lama_penyinaran'])),
      suhuMax: normalizeValue(pickField(row, ['suhuMax', 'suhuMaksimum', 'tmax', 'suhu_max'])),
      suhuMin: normalizeValue(pickField(row, ['suhuMin', 'suhuMinimum', 'tmin', 'suhu_min'])),
      suhuRerata: normalizeValue(pickField(row, ['suhuRerata', 'suhuRata', 'rerataSuhu', 'tavg', 'suhu_rerata', 'suhu_rata'])),
      kelembaban: normalizeValue(pickField(row, ['kelembaban', 'rhRata', 'kelembabanNisbi', 'rh', 'kelembaban_rata', 'rh_rata'])),
      kecepatanAngin: normalizeValue(pickField(row, ['kecepatanAngin', 'angin', 'windSpeed', 'kecepatan_angin'])),
      curahHujan: normalizeValue(pickField(row, ['curahHujan', 'hujan', 'rainfall', 'curah_hujan'])),
      evaporasi: normalizeValue(pickField(row, ['evaporasi', 'penguapan', 'evaporation', 'evap'])),
      hookAwal: normalizeOptionalValue(pickField(row, ['hookAwal'])),
      hookAkhir: normalizeOptionalValue(pickField(row, ['hookAkhir'])),
      anemometerAwal: normalizeOptionalValue(pickField(row, ['anemometerAwal'])),
      anemometerAkhir: normalizeOptionalValue(pickField(row, ['anemometerAkhir'])),
      bolaKering: normalizeOptionalValue(pickField(row, ['bolaKering'])),
      bolaBasah: normalizeOptionalValue(pickField(row, ['bolaBasah'])),
      bolaKeringPagi: normalizeOptionalValue(pickField(row, ['bolaKeringPagi'])),
      bolaBasahPagi: normalizeOptionalValue(pickField(row, ['bolaBasahPagi'])),
      bolaKeringSiang: normalizeOptionalValue(pickField(row, ['bolaKeringSiang'])),
      bolaBasahSiang: normalizeOptionalValue(pickField(row, ['bolaBasahSiang'])),
      bolaKeringSore: normalizeOptionalValue(pickField(row, ['bolaKeringSore'])),
      bolaBasahSore: normalizeOptionalValue(pickField(row, ['bolaBasahSore'])),
      kelembabanPagi: normalizeOptionalValue(pickField(row, ['kelembabanPagi'])),
      kelembabanSiang: normalizeOptionalValue(pickField(row, ['kelembabanSiang'])),
      kelembabanSore: normalizeOptionalValue(pickField(row, ['kelembabanSore'])),
      catatan,
    });
  }

  // Sort newest date first
  normalized.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  return normalized;
}

export async function fetchGasRecords(customUrl?: string): Promise<KlimatologiRecord[]> {
  const baseUrl = (customUrl || getGasWebAppUrl()).trim();
  const separator = baseUrl.includes('?') ? '&' : '?';
  const requestUrl = `${baseUrl}${separator}_t=${Date.now()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  let response: Response;
  try {
    // Simple GET without custom headers to avoid triggering CORS preflight on Google Apps Script
    response = await fetch(requestUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Koneksi ke Google Apps Script melebihi batas waktu (timeout). Silakan coba lagi.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Server Google Apps Script merespons dengan status ${response.status}`);
  }

  const rawText = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Respons dari Google Apps Script bukan format JSON yang valid. Pastikan Web App di-deploy dengan akses "Anyone".');
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    if (obj.status === 'error' || obj.success === false || obj.error) {
      throw new Error(String(obj.message || obj.error || 'Gagal mengambil data dari Google Sheets.'));
    }
  }

  const records = normalizeGasRecords(parsed);
  setCachedRecords(records);
  setLastSyncTime(new Date().toISOString());
  return records;
}

export async function postGasAction(payload: GasPostPayload): Promise<unknown> {
  const url = getGasWebAppUrl();

  const enrichedPayload: GasPostPayload = {
    ...payload,
    data: payload.data
      ? {
          ...payload.data,
          penyinaranJam: (payload.data as Record<string, unknown>).penyinaranJam ?? payload.data.lamaPenyinaran,
          suhuRata: (payload.data as Record<string, unknown>).suhuRata ?? payload.data.suhuRerata,
          rhRata: (payload.data as Record<string, unknown>).rhRata ?? payload.data.kelembaban,
          penguapan: (payload.data as Record<string, unknown>).penguapan ?? payload.data.evaporasi,
          updatedBy: payload.adminEmail,
          updatedAt: new Date().toISOString(),
        }
      : undefined,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  let response: Response;
  try {
    // IMPORTANT: Use text/plain;charset=utf-8 to avoid browser CORS preflight OPTIONS request
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      redirect: 'follow',
      body: JSON.stringify(enrichedPayload),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Permintaan ke Google Apps Script melebihi batas waktu (timeout). Silakan coba lagi.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Permintaan ke Google Apps Script gagal (HTTP ${response.status}).`);
  }

  const rawText = await response.text();
  if (!rawText) return { success: true };

  const trimmed = rawText.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) {
    throw new Error('Google Apps Script mengembalikan halaman HTML error. Pastikan Web App di-deploy ulang dengan akses "Anyone".');
  }

  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      if (obj.status === 'error' || obj.success === false || obj.error) {
        throw new Error(String(obj.message || obj.error || 'Gagal memproses aksi di Google Sheets.'));
      }
    }
    return parsed;
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { success: true, rawText };
    }
    throw err;
  }
}
