import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseDb, handleFirestoreError, OperationType } from './firebaseClient';

export const ADMIN_EMAIL = 'stklimat.ppk@gmail.com';

export interface GuestUserRecord {
  email: string;
  nama: string;
  instansi: string;
  tujuan: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  verifiedAt?: string;
}

export interface EmailLogRecord {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

export interface LoginResult {
  success: boolean;
  isAdmin: boolean;
  email: string;
  nama: string;
  instansi?: string;
}

export class AuthApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
    this.status = status;
  }
}

function getDefaultUsers(): GuestUserRecord[] {
  return [
    {
      email: 'budi.gunawan@gmail.com',
      nama: 'Budi Gunawan',
      instansi: 'Universitas Sriwijaya (UNSRI)',
      tujuan: 'Penelitian Tugas Akhir Kajian Evaporasi Balai Sembawa',
      status: 'pending',
      createdAt: '2026-06-14T08:30:00.000Z',
    },
    {
      email: 'citra.lestari@puslitkaret.id',
      nama: 'Dr. Citra Lestari',
      instansi: 'Pusat Penelitian Karet Sembawa',
      tujuan: 'Evaluasi Agroklimatologi Blok Penyadapan Karet Baru',
      status: 'verified',
      createdAt: '2026-06-12T09:15:00.000Z',
      verifiedAt: '2026-06-12T10:00:00.000Z',
    },
    {
      email: 'andika.dewa@unud.ac.id',
      nama: 'Andika Dewa Pradana',
      instansi: 'Fakultas Pertanian Universitas Udayana',
      tujuan: 'Studi Banding Pengaruh Cuaca Terhadap Kualitas Lateks',
      status: 'pending',
      createdAt: '2026-06-15T02:10:00.000Z',
    },
  ];
}

async function tryApiFetch<T>(url: string, options?: RequestInit): Promise<{ available: boolean; ok: boolean; status: number; data?: T }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return { available: false, ok: false, status: res.status };
    }
    const data = (await res.json()) as T;
    return { available: true, ok: res.ok, status: res.status, data };
  } catch {
    return { available: false, ok: false, status: 0 };
  }
}

export async function loginWithEmail(rawEmail: string): Promise<LoginResult> {
  const emailTrimmed = rawEmail.trim().toLowerCase();
  if (!emailTrimmed) {
    throw new AuthApiError('Email wajib diisi.', 'invalid_input', 400);
  }

  // Try backend Express API first (if running locally / full-stack server)
  const apiRes = await tryApiFetch<any>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailTrimmed }),
  });

  if (apiRes.available && apiRes.data) {
    if (!apiRes.ok) {
      throw new AuthApiError(
        apiRes.data.message || apiRes.data.error || 'Gagal login.',
        apiRes.data.error,
        apiRes.status
      );
    }
    return apiRes.data as LoginResult;
  }

  // Direct Firestore fallback (essential for static/serverless Vercel deployments)
  if (emailTrimmed === ADMIN_EMAIL) {
    return {
      success: true,
      isAdmin: true,
      email: ADMIN_EMAIL,
      nama: 'Administrator Klimatologi',
    };
  }

  const db = getFirebaseDb();
  let userData: GuestUserRecord | null = null;
  try {
    const userDocRef = doc(db, 'users', emailTrimmed);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      userData = { email: userSnap.id, ...(userSnap.data() as Omit<GuestUserRecord, 'email'>) };
    } else {
      // Check default seeded records if collection has not been seeded yet
      const allSnap = await getDocs(collection(db, 'users'));
      if (allSnap.empty) {
        const defaults = getDefaultUsers();
        userData = defaults.find((u) => u.email === emailTrimmed) || null;
      }
    }
  } catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.GET, `users/${emailTrimmed}`);
    }
    throw new AuthApiError('Gagal memeriksa akun di database. Silakan coba lagi.');
  }

  if (!userData) {
    throw new AuthApiError(
      "Email ini belum terdaftar. Silakan lakukan 'Registrasi Tamu Baru' terlebih dahulu.",
      'not_found',
      404
    );
  }

  if (userData.status === 'pending') {
    throw new AuthApiError(
      `Akses ditolak. Email Anda belum diverifikasi oleh admin. Permohonan verifikasi telah dikirim ke email admin: ${ADMIN_EMAIL}.`,
      'pending',
      403
    );
  }

  if (userData.status === 'rejected') {
    throw new AuthApiError(
      'Akses ditolak. Mohon maaf, permohonan registrasi bagi email ini ditolak oleh stasiun admin.',
      'rejected',
      403
    );
  }

  return {
    success: true,
    isAdmin: false,
    email: userData.email,
    nama: userData.nama,
    instansi: userData.instansi,
  };
}

export async function signupGuest(payload: {
  email: string;
  nama: string;
  instansi: string;
  tujuan?: string;
}): Promise<{ success: boolean; message: string }> {
  const emailTrimmed = payload.email.trim().toLowerCase();
  const namaTrimmed = payload.nama.trim();
  const instansiTrimmed = payload.instansi.trim();
  const tujuanTrimmed = (payload.tujuan || 'Peninjauan data lapangan / Umum').trim();

  if (!emailTrimmed || !namaTrimmed || !instansiTrimmed) {
    throw new AuthApiError('Email, Nama, dan Instansi wajib diisi.', 'invalid_input', 400);
  }

  const apiRes = await tryApiFetch<any>('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailTrimmed,
      nama: namaTrimmed,
      instansi: instansiTrimmed,
      tujuan: tujuanTrimmed,
    }),
  });

  if (apiRes.available && apiRes.data) {
    if (!apiRes.ok) {
      throw new AuthApiError(
        apiRes.data.message || apiRes.data.error || 'Registrasi gagal.',
        apiRes.data.error,
        apiRes.status
      );
    }
    return apiRes.data;
  }

  // Direct Firestore fallback for Vercel/static deployments
  if (emailTrimmed === ADMIN_EMAIL) {
    throw new AuthApiError('Email ini adalah email Admin dan tidak membutuhkan registrasi ulang.', 'admin_email', 400);
  }

  const db = getFirebaseDb();
  try {
    const existingRef = doc(db, 'users', emailTrimmed);
    const existingSnap = await getDoc(existingRef);
    if (existingSnap.exists()) {
      const existingUser = existingSnap.data() as GuestUserRecord;
      if (existingUser.status === 'verified') {
        throw new AuthApiError('Email sudah terdaftar dan berstatus Aktif. Silakan langsung masuk.', 'already_verified', 400);
      }
      if (existingUser.status === 'pending') {
        throw new AuthApiError(
          `Registrasi Anda sedang menunggu verifikasi oleh Admin. Notifikasi persetujuan pendaftaran ulang telah dikirimkan ke email admin: ${ADMIN_EMAIL}.`,
          'pending',
          400
        );
      }
      throw new AuthApiError('Permohonan registrasi sebelumnya untuk email ini ditolak oleh admin.', 'rejected', 400);
    }

    const newUser: GuestUserRecord = {
      email: emailTrimmed,
      nama: namaTrimmed,
      instansi: instansiTrimmed,
      tujuan: tujuanTrimmed,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await setDoc(existingRef, newUser);

    const logId = `log_${Date.now()}`;
    const newLog: EmailLogRecord = {
      id: logId,
      to: ADMIN_EMAIL,
      subject: `[DIREKTUR VERIFIKASI] Permohonan Registrasi Tamu Baru: ${newUser.nama}`,
      body: `Halo Admin STASIUN KLIMATOLOGI,\n\nPengunjung atas nama ${newUser.nama} (${newUser.instansi}) telah mendaftar dengan email: ${newUser.email}.\n\nTujuan Akses: ${newUser.tujuan}\n\nRegistrasi saat ini berstatus PENDING. Silakan lakukan verifikasi dan aktivasi akun tamu ini di panel Admin Keamanan agar ybs dapat masuk ke aplikasi.\n\nTindakan: Klik tombol Setujui di Tab Administratif Keamanan aplikasi.`,
      sentAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'emailLogs', logId), newLog);

    return {
      success: true,
      message: `Registrasi berstatus pending tersimpan. Notifikasi email verifikasi telah terkirim ke ${ADMIN_EMAIL}.`,
    };
  } catch (err: any) {
    if (err instanceof AuthApiError) throw err;
    if (String(err?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.WRITE, `users/${emailTrimmed}`);
    }
    throw new AuthApiError(err?.message || 'Gagal menyimpan registrasi ke database.');
  }
}

export async function fetchGuestsList(): Promise<GuestUserRecord[]> {
  const apiRes = await tryApiFetch<GuestUserRecord[]>('/api/auth/guests-list');
  if (apiRes.available && apiRes.ok && Array.isArray(apiRes.data)) {
    return apiRes.data;
  }

  const db = getFirebaseDb();
  try {
    const snap = await getDocs(collection(db, 'users'));
    const list: GuestUserRecord[] = [];
    snap.forEach((d) => {
      list.push({ email: d.id, ...(d.data() as Omit<GuestUserRecord, 'email'>) });
    });
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return list;
  } catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    }
    throw new Error('Gagal memuat daftar pengguna dari database.');
  }
}

export async function fetchEmailLogs(): Promise<EmailLogRecord[]> {
  const apiRes = await tryApiFetch<EmailLogRecord[]>('/api/auth/email-logs');
  if (apiRes.available && apiRes.ok && Array.isArray(apiRes.data)) {
    return apiRes.data;
  }

  const db = getFirebaseDb();
  try {
    const snap = await getDocs(collection(db, 'emailLogs'));
    const logs: EmailLogRecord[] = [];
    snap.forEach((d) => {
      logs.push({ id: d.id, ...(d.data() as Omit<EmailLogRecord, 'id'>) });
    });
    logs.sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
    return logs;
  } catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.LIST, 'emailLogs');
    }
    throw new Error('Gagal memuat log notifikasi email.');
  }
}

export async function verifyGuestStatus(
  rawEmail: string,
  status: 'verified' | 'rejected'
): Promise<{ success: boolean; user: GuestUserRecord }> {
  const emailTrimmed = rawEmail.trim().toLowerCase();
  const apiRes = await tryApiFetch<{ success: boolean; user: GuestUserRecord }>('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailTrimmed, status }),
  });

  if (apiRes.available && apiRes.data) {
    if (!apiRes.ok) {
      throw new Error((apiRes.data as any)?.error || 'Gagal memperbaharui status verifikasi.');
    }
    return apiRes.data;
  }

  const db = getFirebaseDb();
  try {
    const userRef = doc(db, 'users', emailTrimmed);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      throw new Error('Pengunjung tidak ditemukan.');
    }

    const existing = snap.data() as GuestUserRecord;
    const updatedUser: GuestUserRecord = {
      ...existing,
      email: emailTrimmed,
      status,
      ...(status === 'verified' ? { verifiedAt: new Date().toISOString() } : {}),
    };
    await setDoc(userRef, updatedUser);

    const logId = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const subject =
      status === 'verified'
        ? '[SIKLIMAT SEMBAWA] Permohonan Akses Data Klimatologi Anda Telah DISETUJUI'
        : '[SIKLIMAT SEMBAWA] Permohonan Akses Data Klimatologi Anda DITOLAK';
    const body =
      status === 'verified'
        ? `Halo ${updatedUser.nama},\n\nPermohonan akses Anda untuk Sistem SiKlimat Sembawa telah DISETUJUI oleh Administrator.\nAnda sekarang dapat masuk menggunakan email: ${emailTrimmed}.`
        : `Halo ${updatedUser.nama},\n\nMohon maaf, permohonan akses Anda untuk Sistem SiKlimat Sembawa saat ini DITOLAK oleh Administrator. Hubungi ${ADMIN_EMAIL} jika ada pertanyaan.`;

    await setDoc(doc(db, 'emailLogs', logId), {
      id: logId,
      to: emailTrimmed,
      subject,
      body,
      sentAt: new Date().toISOString(),
    });

    return { success: true, user: updatedUser };
  } catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.WRITE, `users/${emailTrimmed}`);
    }
    throw new Error(err?.message || 'Gagal memperbaharui status verifikasi tamu.');
  }
}
