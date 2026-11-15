import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  getDoc,
  Firestore
} from "firebase/firestore";

dotenv.config();

// Lazy-loaded SMTP transporter to prevent crash if variables are not yet loaded
let mailTransporter: any = null;

function getMailTransporter() {
  if (mailTransporter === null) {
    let host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      // Auto-correct common typos where users might write smtp@gmail.com instead of smtp.gmail.com
      host = host.trim();
      if (host.includes("@")) {
        console.warn(`Warning: SMTP_HOST "${host}" contains '@'. Auto-correcting to use '.' instead.`);
        host = host.replace(/@/g, ".");
      }

      mailTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports (like 587)
        auth: {
          user,
          pass,
        },
      });
      console.log(`SMTP Mail Transporter initialized successfully at ${host}:${port}`);
    } else {
      console.log("SMTP environment variables not configured. Email notifications will run in simulation mode.");
      mailTransporter = false;
    }
  }
  return mailTransporter;
}

async function sendActualEmail(to: string, subject: string, text: string) {
  try {
    const transporter = getMailTransporter();
    if (transporter) {
      const from = process.env.SMTP_FROM || `"SiKlimat Sembawa" <${process.env.SMTP_USER || "no-reply@klimatologisembawa.id"}>`;
      await transporter.sendMail({
        from,
        to,
        subject,
        text,
      });
      console.log(`Successfully sent email notification to ${to}`);
      return true;
    }
  } catch (err) {
    console.error(`Failed to send real email to ${to}:`, err);
  }
  return false;
}

const app = express();
const PORT = 3000;

// Enable CORS for all incoming requests (crucial for iframe & preview environments)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Path to persist data
const DATA_FILE_PATH = path.join(process.cwd(), "data-klimatologi.json");

// Helper to generate realistic historical data
function generateDefaultData() {
  const data = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 30); // 30 days ago

  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(baseDate);
    currentDate.setDate(baseDate.getDate() + i);
    const dateString = currentDate.toISOString().split("T")[0];

    // Seed variables with logical dependencies, e.g., rainy days have lower sun, lower max temp, high humidity
    const isRainy = Math.random() < 0.4; // 40% chance of rain in Sembawa rubber area
    const curahHujan = isRainy ? parseFloat((Math.random() * 25 + 1).toFixed(1)) : 0;
    
    const lamaPenyinaran = isRainy 
      ? parseFloat((Math.random() * 3 + 1).toFixed(1)) 
      : parseFloat((Math.random() * 4 + 5).toFixed(1));

    const suhuMax = isRainy
      ? parseFloat((Math.random() * 2 + 29).toFixed(1))
      : parseFloat((Math.random() * 3 + 31).toFixed(1));

    const suhuMin = parseFloat((Math.random() * 2 + 22).toFixed(1));
    const suhuRerata = parseFloat(((suhuMax + suhuMin) / 2).toFixed(1));

    const kelembaban = isRainy
      ? Math.floor(Math.random() * 10 + 85)
      : Math.floor(Math.random() * 10 + 72);

    const kecepatanAngin = parseFloat((Math.random() * 8 + 4).toFixed(1));

    // Evaporasi Panci Kelas A BMKG calculation helper:
    // If dry: Hook gauge difference (e.g. 10mm starting to 6.2mm = 3.8mm evaporation).
    // Let's create realistic hook values:
    const hookAwal = parseFloat((Math.random() * 5 + 10).toFixed(1)); // 10.0 - 15.0 mm
    // When it rains, level goes up, so hookAkhir can be higher or lower depending on (Evaporasi - CurahHujan)
    // Evaporation is typically 2.5 - 5.5 mm per day
    const simulatedEvap = parseFloat((Math.random() * 3 + 2.5).toFixed(1));
    // hookAwal - hookAkhir + curahHujan = evaporasi -> hookAkhir = hookAwal + curahHujan - evaporasi
    const hookAkhir = parseFloat((hookAwal + curahHujan - simulatedEvap).toFixed(1));
    const evaporasi = parseFloat((hookAwal - hookAkhir + curahHujan).toFixed(1));

    data.push({
      id: dateString,
      tanggal: dateString,
      lamaPenyinaran,
      suhuMax,
      suhuMin,
      suhuRerata,
      kelembaban,
      kecepatanAngin,
      curahHujan,
      evaporasi,
      hookAwal,
      hookAkhir,
      catatan: isRainy ? "Hujan sedang, kegiatan sadap karet terganggu di beberapa blok." : "Cerah, penyadapan berjalan lancar."
    });
  }

  return data;
}

// Lazy-loaded Firestore DB helper to prevent load-time crashes
let db: Firestore | null = null;

async function getFirestoreDB(): Promise<Firestore | null> {
  if (db !== null) return db;
  try {
    const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!(await fs.access(firebaseConfigPath).then(() => true).catch(() => false))) {
      console.log("firebase-applet-config.json not present at root, using local files.");
      return null;
    }
    const firebaseConfigRaw = await fs.readFile(firebaseConfigPath, "utf-8");
    const firebaseConfig = JSON.parse(firebaseConfigRaw);
    
    // Initialize standard Firebase client App safely
    const fbApp = initializeApp(firebaseConfig);
    const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
    db = getFirestore(fbApp, databaseId);
    console.log(`Firebase Firestore Client connected successfully to cloud database: ${databaseId}`);
    return db;
  } catch (err: any) {
    console.warn("Firebase Client SDK couldn't be initialized. Falling back to local files:", err.message);
    return null;
  }
}

// Helper to remove any undefined values recursively for Firestore compatibility
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        sanitized[key] = sanitizeForFirestore(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
}

// Read or initialize data
async function readData() {
  const firestoreDb = await getFirestoreDB();
  if (firestoreDb) {
    try {
      const querySnapshot = await getDocs(collection(firestoreDb, "klimatologi"));
      const records: any[] = [];
      querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });

      const seedDocRef = doc(firestoreDb, "system_state", "seeding_klimatologi");
      const seedDocSnap = await getDoc(seedDocRef);
      const isSeeded = seedDocSnap.exists() && seedDocSnap.data()?.seeded;

      if (isSeeded || records.length > 0) {
        if (!isSeeded) {
          // Self-heal the seed status in Firebase so it doesn't run seeding triggers again
          await setDoc(seedDocRef, { seeded: true, initializedAt: new Date().toISOString() }).catch(() => {});
        }
        return records;
      } else {
        // First run on a pristine database: pre-seed with 30 historical records so the dashboard looks loaded
        console.log("Pristine Firestore. Pre-seeding database with 30-day historical klimatologi data...");
        const defaultData = generateDefaultData();
        await Promise.all(defaultData.map((item: any) => setDoc(doc(firestoreDb, "klimatologi", item.id), sanitizeForFirestore(item))));
        await setDoc(seedDocRef, { seeded: true, initializedAt: new Date().toISOString() });
        return defaultData;
      }
    } catch (fbErr: any) {
      console.error("Firestore readData error, falling back to local file:", fbErr.message);
    }
  }

  // Fallback to local file system
  try {
    const content = await fs.readFile(DATA_FILE_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    const defaultData = generateDefaultData();
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(defaultData, null, 2), "utf-8");
    return defaultData;
  }
}

// Write data
async function writeData(data: any) {
  const firestoreDb = await getFirestoreDB();
  if (firestoreDb) {
    try {
      // 1. Fetch current IDs in Firestore
      const querySnapshot = await getDocs(collection(firestoreDb, "klimatologi"));
      const currentIds = new Set<string>();
      querySnapshot.forEach((doc) => {
        currentIds.add(doc.id);
      });

      // 2. Add or update items in Firestore
      const dataIds = new Set(data.map((item: any) => item.id));
      const upsertPromises = data.map((item: any) => setDoc(doc(firestoreDb, "klimatologi", item.id), sanitizeForFirestore(item)));

      // 3. Delete items from Firestore that are no longer in local memory list
      const deletePromises: Promise<void>[] = [];
      currentIds.forEach((id) => {
        if (!dataIds.has(id)) {
          deletePromises.push(deleteDoc(doc(firestoreDb, "klimatologi", id)));
        }
      });

      await Promise.all([...upsertPromises, ...deletePromises]);
      console.log(`Synced ${data.length} records successfully to Firestore.`);
    } catch (fbErr: any) {
      console.error("Firestore writeData error:", fbErr.message);
    }
  }

  // Local file sync fallback
  try {
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err: any) {
    console.error("Failed to write offline local data JSON backup:", err);
  }
}

// Path to persist users
const USERS_FILE_PATH = path.join(process.cwd(), "users-klimatologi.json");

// Helper to generate default guests/users
function generateDefaultUsers() {
  return [
    {
      email: "budi.gunawan@gmail.com",
      nama: "Budi Gunawan",
      instansi: "Universitas Sriwijaya (UNSRI)",
      tujuan: "Penelitian Tugas Akhir Kajian Evaporasi Balai Sembawa",
      status: "pending",
      createdAt: "2026-06-14T08:30:00.000Z"
    },
    {
      email: "citra.lestari@puslitkaret.id",
      nama: "Dr. Citra Lestari",
      instansi: "Pusat Penelitian Karet Sembawa",
      tujuan: "Evaluasi Agroklimatologi Blok Penyadapan Karet Baru",
      status: "verified",
      createdAt: "2026-06-12T09:15:00.000Z",
      verifiedAt: "2026-06-12T10:00:00.000Z"
    },
    {
      email: "andika.dewa@unud.ac.id",
      nama: "Andika Dewa Pradana",
      instansi: "Fakultas Pertanian Universitas Udayana",
      tujuan: "Studi Banding Pengaruh Cuaca Terhadap Kualitas Lateks",
      status: "pending",
      createdAt: "2026-06-15T02:10:00.000Z"
    }
  ];
}

// Read or initialize users data
async function readUsers() {
  const firestoreDb = await getFirestoreDB();
  if (firestoreDb) {
    try {
      const querySnapshot = await getDocs(collection(firestoreDb, "users"));
      const records: any[] = [];
      querySnapshot.forEach((doc) => {
        records.push({ email: doc.id, ...doc.data() });
      });

      const seedDocRef = doc(firestoreDb, "system_state", "seeding_users");
      const seedDocSnap = await getDoc(seedDocRef);
      const isSeeded = seedDocSnap.exists() && seedDocSnap.data()?.seeded;

      if (isSeeded || records.length > 0) {
        if (!isSeeded) {
          // Self-heal seed status in Firebase
          await setDoc(seedDocRef, { seeded: true, initializedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        }
        return records;
      } else {
        // Pre-seed clean Firestore with preconfigured users
        console.log("Pristine Firestore. Pre-seeding default database users...");
        const defaultUsers = generateDefaultUsers();
        await Promise.all(defaultUsers.map((user: any) => setDoc(doc(firestoreDb, "users", user.email), sanitizeForFirestore(user))));
        await setDoc(seedDocRef, { seeded: true, initializedAt: new Date().toISOString() }, { merge: true });
        return defaultUsers;
      }
    } catch (fbErr: any) {
      console.error("Firestore readUsers error, falling back to local file:", fbErr.message);
    }
  }

  // Fallback to local file system
  try {
    const content = await fs.readFile(USERS_FILE_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    const defaultUsers = generateDefaultUsers();
    await fs.writeFile(USERS_FILE_PATH, JSON.stringify(defaultUsers, null, 2), "utf-8");
    return defaultUsers;
  }
}

// Write users data
async function writeUsers(users: any) {
  const firestoreDb = await getFirestoreDB();
  if (firestoreDb) {
    try {
      const querySnapshot = await getDocs(collection(firestoreDb, "users"));
      const currentEmails = new Set<string>();
      querySnapshot.forEach((doc) => {
        currentEmails.add(doc.id);
      });

      const userEmails = new Set(users.map((u: any) => u.email));
      const upsertPromises = users.map((u: any) => setDoc(doc(firestoreDb, "users", u.email), sanitizeForFirestore(u)));

      const deletePromises: Promise<void>[] = [];
      currentEmails.forEach((email) => {
        if (!userEmails.has(email)) {
          deletePromises.push(deleteDoc(doc(firestoreDb, "users", email)));
        }
      });

      await Promise.all([...upsertPromises, ...deletePromises]);
      console.log(`Synced ${users.length} users successfully to Firestore.`);
    } catch (fbErr: any) {
      console.error("Firestore writeUsers error:", fbErr.message);
    }
  }

  // Backup fallback
  try {
    await fs.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2), "utf-8");
  } catch (err: any) {
    console.error("Failed to write offline local users JSON backup:", err);
  }
}

// Keep trace of simulated administrative emails dispatched to stklimat.ppk@gmail.com
const EMAIL_LOGS_FILE_PATH = path.join(process.cwd(), "email-logs-klimatologi.json");

async function readEmailLogs() {
  const firestoreDb = await getFirestoreDB();
  if (firestoreDb) {
    try {
      const querySnapshot = await getDocs(collection(firestoreDb, "emailLogs"));
      const records: any[] = [];
      querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });

      const seedDocRef = doc(firestoreDb, "system_state", "seeding_email_logs");
      const seedDocSnap = await getDoc(seedDocRef);
      const isSeeded = seedDocSnap.exists() && seedDocSnap.data()?.seeded;

      if (isSeeded || records.length > 0) {
        if (!isSeeded) {
          // Self-heal seed status in Firebase
          await setDoc(seedDocRef, { seeded: true, initializedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        }
        return records;
      } else {
        // Seed default email logs in empty database
        console.log("Pristine Firestore. Pre-seeding default email logs...");
        const defaultLogs = [
          {
            id: "log_default_1",
            to: "stklimat.ppk@gmail.com",
            subject: "[DIREKTUR VERIFIKASI] Permohonan Registrasi Tamu Baru: Budi Gunawan",
            body: "Halo Admin STASIUN KLIMATOLOGI,\n\nPengunjung atas nama Budi Gunawan (Universitas Sriwijaya (UNSRI)) telah mendaftar dengan email: budi.gunawan@gmail.com.\n\nTujuan Akses: Penelitian Tugas Akhir Kajian Evaporasi Balai Sembawa\n\nRegistrasi saat ini berstatus PENDING. Silakan lakukan verifikasi dan aktivasi akun tamu ini di panel Admin Keamanan agar ybs dapat masuk ke aplikasi.",
            sentAt: "2026-06-14T08:30:05.000Z"
          },
          {
            id: "log_default_2",
            to: "stklimat.ppk@gmail.com",
            subject: "[DIREKTUR VERIFIKASI] Permohonan Registrasi Tamu Baru: Dr. Citra Lestari",
            body: "Halo Admin STASIUN KLIMATOLOGI,\n\nPengunjung atas nama Dr. Citra Lestari (Pusat Penelitian Karet Sembawa) telah mendaftar dengan email: citra.lestari@puslitkaret.id.\n\nTujuan Akses: Evaluasi Agroklimatologi Blok Penyadapan Karet Baru\n\nRegistrasi saat ini berstatus PENDING. Silakan lakukan verifikasi dan aktivasi.",
            sentAt: "2026-06-12T09:15:05.000Z"
          },
          {
            id: "log_default_3",
            to: "stklimat.ppk@gmail.com",
            subject: "[DIREKTUR VERIFIKASI] Permohonan Registrasi Tamu Baru: Andika Dewa Pradana",
            body: "Halo Admin STASIUN KLIMATOLOGI,\n\nPengunjung atas nama Andika Dewa Pradana (Fakultas Pertanian Universitas Udayana) telah mendaftar dengan email: andika.dewa@unud.ac.id.\n\nTujuan Akses: Studi Banding Pengaruh Cuaca Terhadap Kualitas Lateks\n\nRegistrasi saat ini berstatus PENDING. Silakan lakukan verifikasi dan aktivasi akun tamu ini di panel Admin Keamanan agar ybs dapat masuk ke aplikasi.",
            sentAt: "2026-06-15T02:10:05.000Z"
          }
        ];
        await Promise.all(defaultLogs.map((log: any) => setDoc(doc(firestoreDb, "emailLogs", log.id), sanitizeForFirestore(log))));
        await setDoc(seedDocRef, { seeded: true, initializedAt: new Date().toISOString() }, { merge: true });
        return defaultLogs;
      }
    } catch (fbErr: any) {
      console.error("Firestore readEmailLogs error, falling back to local file:", fbErr.message);
    }
  }

  // Fallback to local file system
  try {
    const content = await fs.readFile(EMAIL_LOGS_FILE_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    const defaultLogs = [
      {
        id: "log_default_1",
        to: "stklimat.ppk@gmail.com",
        subject: "[DIREKTUR VERIFIKASI] Permohonan Registrasi Tamu Baru: Budi Gunawan",
        body: "Halo Admin STASIUN KLIMATOLOGI,\n\nPengunjung atas nama Budi Gunawan (Universitas Sriwijaya (UNSRI)) telah mendaftar dengan email: budi.gunawan@gmail.com.\n\nTujuan Akses: Penelitian Tugas Akhir Kajian Evaporasi Balai Sembawa\n\nRegistrasi saat ini berstatus PENDING. Silakan lakukan verifikasi dan aktivasi akun tamu ini di panel Admin Keamanan agar ybs dapat masuk ke aplikasi.",
        sentAt: "2026-06-14T08:30:05.000Z"
      },
      {
        id: "log_default_2",
        to: "stklimat.ppk@gmail.com",
        subject: "[DIREKTUR VERIFIKASI] Permohonan Registrasi Tamu Baru: Dr. Citra Lestari",
        body: "Halo Admin STASIUN KLIMATOLOGI,\n\nPengunjung atas nama Dr. Citra Lestari (Pusat Penelitian Karet Sembawa) telah mendaftar dengan email: citra.lestari@puslitkaret.id.\n\nTujuan Akses: Evaluasi Agroklimatologi Blok Penyadapan Karet Baru\n\nRegistrasi saat ini berstatus PENDING. Silakan lakukan verifikasi dan aktivasi.",
        sentAt: "2026-06-12T09:15:05.000Z"
      },
      {
        id: "log_default_3",
        to: "stklimat.ppk@gmail.com",
        subject: "[DIREKTUR VERIFIKASI] Permohonan Registrasi Tamu Baru: Andika Dewa Pradana",
        body: "Halo Admin STASIUN KLIMATOLOGI,\n\nPengunjung atas nama Andika Dewa Pradana (Fakultas Pertanian Universitas Udayana) telah mendaftar dengan email: andika.dewa@unud.ac.id.\n\nTujuan Akses: Studi Banding Pengaruh Cuaca Terhadap Kualitas Lateks\n\nRegistrasi saat ini berstatus PENDING. Silakan lakukan verifikasi dan aktivasi akun tamu ini di panel Admin Keamanan agar ybs dapat masuk ke aplikasi.",
        sentAt: "2026-06-15T02:10:05.000Z"
      }
    ];
    await fs.writeFile(EMAIL_LOGS_FILE_PATH, JSON.stringify(defaultLogs, null, 2), "utf-8");
    return defaultLogs;
  }
}

async function writeEmailLogs(emailLogs: any) {
  const firestoreDb = await getFirestoreDB();
  if (firestoreDb) {
    try {
      const querySnapshot = await getDocs(collection(firestoreDb, "emailLogs"));
      const currentIds = new Set<string>();
      querySnapshot.forEach((doc) => {
        currentIds.add(doc.id);
      });

      const emailIds = new Set(emailLogs.map((log: any) => log.id));
      const upsertPromises = emailLogs.map((log: any) => setDoc(doc(firestoreDb, "emailLogs", log.id), sanitizeForFirestore(log)));

      const deletePromises: Promise<void>[] = [];
      currentIds.forEach((id) => {
        if (!emailIds.has(id)) {
          deletePromises.push(deleteDoc(doc(firestoreDb, "emailLogs", id)));
        }
      });

      await Promise.all([...upsertPromises, ...deletePromises]);
      console.log(`Synced ${emailLogs.length} email logs successfully to Firestore.`);
    } catch (fbErr: any) {
      console.error("Firestore writeEmailLogs error:", fbErr.message);
    }
  }

  // Backup fallback
  try {
    await fs.writeFile(EMAIL_LOGS_FILE_PATH, JSON.stringify(emailLogs, null, 2), "utf-8");
  } catch (err: any) {
    console.error("Failed to write offline local email logs JSON backup:", err);
  }
}

/* API Endpoints */

// Sign up guest endpoint - sends notification email to "stklimat.ppk@gmail.com"
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, nama, instansi, tujuan } = req.body;
    if (!email || !nama || !instansi) {
      return res.status(400).json({ error: "Email, Nama, dan Instansi wajib diisi." });
    }

    const emailTrimmed = email.trim().toLowerCase();
    const users = await readUsers();

    // Check if user is trying to register admin email
    if (emailTrimmed === "stklimat.ppk@gmail.com") {
      return res.status(400).json({ error: "Email ini adalah email Admin dan tidak membutuhkan registrasi ulang." });
    }

    // Check pre-existing registration
    const existingUser = users.find((u: any) => u.email === emailTrimmed);
    if (existingUser) {
      if (existingUser.status === "verified") {
        return res.status(400).json({ error: "Email sudah terdaftar dan berstatus Aktif. Silakan langsung masuk." });
      } else if (existingUser.status === "pending") {
        return res.status(400).json({ 
          error: "pending", 
          message: "Registrasi Anda sedang menunggu verifikasi oleh Admin. Notifikasi persetujuan pendaftaran ulang telah dikirimkan ke email admin: stklimat.ppk@gmail.com." 
        });
      } else {
        return res.status(400).json({ error: "Permohonan registrasi sebelumnya untuk email ini ditolak oleh admin." });
      }
    }

    // Create guest registration
    const newUser = {
      email: emailTrimmed,
      nama: nama.trim(),
      instansi: instansi.trim(),
      tujuan: (tujuan || "Peninjauan data lapangan / Umum").trim(),
      status: "pending",
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await writeUsers(users);

    // Create notification log entry representing the email sent to admin stklimat.ppk@gmail.com
    const emailLogs = await readEmailLogs();
    const newLog = {
      id: "log_" + Date.now(),
      to: "stklimat.ppk@gmail.com",
      subject: `[DIREKTUR VERIFIKASI] Permohonan Registrasi Tamu Baru: ${newUser.nama}`,
      body: `Halo Admin STASIUN KLIMATOLOGI,\n\nPengunjung atas nama ${newUser.nama} (${newUser.instansi}) telah mendaftar dengan email: ${newUser.email}.\n\nTujuan Akses: ${newUser.tujuan}\n\nRegistrasi saat ini berstatus PENDING. Silakan lakukan verifikasi dan aktivasi akun tamu ini di panel Admin Keamanan agar ybs dapat masuk ke aplikasi.\n\nTindakan: Klik tombol Setujui di Tab Administratif Keamanan aplikasi.`,
      sentAt: new Date().toISOString()
    };
    emailLogs.push(newLog);
    await writeEmailLogs(emailLogs);

    // Send real email if SMTP is configured
    await sendActualEmail(newLog.to, newLog.subject, newLog.body);

    res.status(201).json({ 
      success: true, 
      message: "Registrasi berstatus pending tersimpan. Notifikasi email verifikasi telah terkirim ke stklimat.ppk@gmail.com." 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login endpoint with verification status checks
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email wajib diisi." });
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Check if Admin
    if (emailTrimmed === "stklimat.ppk@gmail.com") {
      return res.json({
        success: true,
        isAdmin: true,
        email: "stklimat.ppk@gmail.com",
        nama: "Administrator Klimatologi"
      });
    }

    // Check guests database
    const users = await readUsers();
    const user = users.find((u: any) => u.email === emailTrimmed);

    if (!user) {
      return res.status(404).json({ 
        error: "not_found", 
        message: "Email ini belum terdaftar. Silakan lakukan 'Registrasi Tamu Baru' terlebih dahulu." 
      });
    }

    if (user.status === "pending") {
      return res.status(403).json({
        error: "pending",
        message: `Akses ditolak. Email Anda belum diverifikasi oleh admin. Permohonan verifikasi telah dikirim ke email admin: stklimat.ppk@gmail.com.`
      });
    }

    if (user.status === "rejected") {
      return res.status(403).json({
        error: "rejected",
        message: "Akses ditolak. Mohon maaf, permohonan registrasi bagi email ini ditolak oleh stasiun admin."
      });
    }

    // Status is verified
    res.json({
      success: true,
      isAdmin: false,
      email: user.email,
      nama: user.nama,
      instansi: user.instansi
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all guests (Admin only)
app.get("/api/auth/guests-list", async (req, res) => {
  try {
    const users = await readUsers();
    // Sort by createdAt descending
    users.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get admin email notification logs
app.get("/api/auth/email-logs", async (req, res) => {
  try {
    const logs = await readEmailLogs();
    logs.sort((a: any, b: any) => b.sentAt.localeCompare(a.sentAt));
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Guest registration status (Admin only)
app.post("/api/auth/verify", async (req, res) => {
  try {
    const { email, status } = req.body;
    if (!email || !status || !["verified", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Email dan status valid wajib dikirimkan." });
    }

    const emailTrimmed = email.trim().toLowerCase();
    const users = await readUsers();
    const userIndex = users.findIndex((u: any) => u.email === emailTrimmed);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Pengunjung tidak ditemukan." });
    }

    users[userIndex].status = status;
    if (status === "verified") {
      users[userIndex].verifiedAt = new Date().toISOString();

      // Log email notification to the approved guest
      try {
        const emailLogs = await readEmailLogs();
        const guestName = users[userIndex].nama;
        const guestEmail = users[userIndex].email;
        const subject = "[SIKLIMAT SEMBAWA] Permohonan Akses Data Klimatologi Anda Telah DISETUJUI";
        const body = `Halo ${guestName},\n\nKami menginfokan bahwa permohonan pendaftaran akses Anda untuk Sistem SiKlimat Sembawa telah DISETUJUI oleh Administrator.\n\nSekarang Anda dapat masuk ke dasbor pemantauan data klimatologi real-time dan evaporasi menggunakan email terdaftar Anda: ${guestEmail}.\n\nSilakan kunjungi menu Login, ketik email Anda, lalu klik "Masuk ke Dashboard" untuk mulai menggunakan aplikasi.\n\nSalam,\nStasiun Klimatologi Sembawa • Pusat Penelitian Karet`;
        
        const guestLog = {
          id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          to: guestEmail,
          subject,
          body,
          sentAt: new Date().toISOString()
        };
        emailLogs.push(guestLog);
        await writeEmailLogs(emailLogs);

        // Try sending live email if SMTP is configured
        await sendActualEmail(guestEmail, subject, body);
      } catch (logErr) {
        console.error("Failed to generate guest notification log:", logErr);
      }
    } else if (status === "rejected") {
      // Log email notification to the rejected guest
      try {
        const emailLogs = await readEmailLogs();
        const guestName = users[userIndex].nama;
        const guestEmail = users[userIndex].email;
        const subject = "[SIKLIMAT SEMBAWA] Permohonan Akses Data Klimatologi Anda DITOLAK";
        const body = `Halo ${guestName},\n\nTerima kasih atas ketertarikan Anda untuk mengakses data klimatologi di stasiun Sembawa.\n\nMohon maaf, permohonan pendaftaran akses Anda untuk Sistem SiKlimat Sembawa saat ini DITOLAK atau ditangguhkan oleh Administrator.\n\nJika menurut Anda hal ini disebabkan oleh kesalahan data atau jika Anda ingin mengajukan permohonan kembali, silakan hubungi kami melalui email di: stklimat.ppk@gmail.com.\n\nSalam,\nStasiun Klimatologi Sembawa • Pusat Penelitian Karet`;
        
        const guestLog = {
          id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          to: guestEmail,
          subject,
          body,
          sentAt: new Date().toISOString()
        };
        emailLogs.push(guestLog);
        await writeEmailLogs(emailLogs);

        // Try sending live email if SMTP is configured
        await sendActualEmail(guestEmail, subject, body);
      } catch (logErr) {
        console.error("Failed to generate guest rejection log:", logErr);
      }
    }
    
    await writeUsers(users);
    res.json({ success: true, user: users[userIndex] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Initial data check
app.get("/api/klimatologi", async (req, res) => {
  try {
    const data = await readData();
    // Sort by Date descending
    data.sort((a: any, b: any) => b.tanggal.localeCompare(a.tanggal));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add new observation record (Admin only simulated via frontend login filter)
app.post("/api/klimatologi", async (req, res) => {
  try {
    const record = req.body;
    if (!record.tanggal) {
      return res.status(400).json({ error: "Tanggal wajib diisi" });
    }

    const data = await readData();
    // Check if record with this date already exists, update or fail
    const existingIndex = data.findIndex((item: any) => item.tanggal === record.tanggal);
    
    // Helper to parse input: preserve '-' if passed or empty, otherwise parse float
    const parseField = (val: any): number | string => {
      if (val === undefined || val === null || val === '' || val === '-' || val === 'null' || val === 'undefined') {
        return '-';
      }
      const num = typeof val === 'number' ? val : parseFloat(val);
      return isNaN(num) ? '-' : num;
    };

    const suhuMax = parseField(record.suhuMax);
    const suhuMin = parseField(record.suhuMin);
    let suhuRerata = parseField(record.suhuRerata);
    if (suhuRerata === '-' && typeof suhuMax === 'number' && typeof suhuMin === 'number') {
      suhuRerata = parseFloat(((suhuMax + suhuMin) / 2).toFixed(1));
    }
    
    let curahHujan = parseField(record.curahHujan);
    let evaporasi = parseField(record.evaporasi);
    const hookAwal = record.hookAwal !== undefined ? parseField(record.hookAwal) : undefined;
    const hookAkhir = record.hookAkhir !== undefined ? parseField(record.hookAkhir) : undefined;
    
    const anemometerAwal = record.anemometerAwal !== undefined ? parseField(record.anemometerAwal) : undefined;
    const anemometerAkhir = record.anemometerAkhir !== undefined ? parseField(record.anemometerAkhir) : undefined;
    const bolaKering = record.bolaKering !== undefined ? parseField(record.bolaKering) : undefined;
    const bolaBasah = record.bolaBasah !== undefined ? parseField(record.bolaBasah) : undefined;
    
    const bolaKeringPagi = record.bolaKeringPagi !== undefined ? parseField(record.bolaKeringPagi) : undefined;
    const bolaBasahPagi = record.bolaBasahPagi !== undefined ? parseField(record.bolaBasahPagi) : undefined;
    const bolaKeringSiang = record.bolaKeringSiang !== undefined ? parseField(record.bolaKeringSiang) : undefined;
    const bolaBasahSiang = record.bolaBasahSiang !== undefined ? parseField(record.bolaBasahSiang) : undefined;
    const bolaKeringSore = record.bolaKeringSore !== undefined ? parseField(record.bolaKeringSore) : undefined;
    const bolaBasahSore = record.bolaBasahSore !== undefined ? parseField(record.bolaBasahSore) : undefined;

    let kelembabanPagi = record.kelembabanPagi !== undefined ? parseField(record.kelembabanPagi) : undefined;
    let kelembabanSiang = record.kelembabanSiang !== undefined ? parseField(record.kelembabanSiang) : undefined;
    let kelembabanSore = record.kelembabanSore !== undefined ? parseField(record.kelembabanSore) : undefined;

    // Calc evaporation via BMKG hook gauge formula if hook values are provided
    if (hookAwal !== undefined && hookAkhir !== undefined && typeof hookAwal === 'number' && typeof hookAkhir === 'number') {
      const chNum = typeof curahHujan === 'number' ? curahHujan : 0;
      evaporasi = parseFloat((hookAwal - hookAkhir + chNum).toFixed(2));
    }

    // Calc wind speed via BMKG cup counter formula if values are provided
    let kecepatanAngin = parseField(record.kecepatanAngin);
    if (anemometerAwal !== undefined && anemometerAkhir !== undefined && typeof anemometerAwal === 'number' && typeof anemometerAkhir === 'number') {
      const diff = anemometerAkhir >= anemometerAwal ? (anemometerAkhir - anemometerAwal) : 0;
      kecepatanAngin = parseFloat((diff / 24).toFixed(2));
    }

    // Helper function for RH calculation
    const calcRH = (tDry?: number, tWet?: number): number | undefined => {
      if (tDry !== undefined && tWet !== undefined && tDry >= tWet && tDry > 0) {
        const e_sw = 6.112 * Math.exp((17.67 * tWet) / (tWet + 243.5));
        const e = e_sw - 0.668 * (1 + 0.00115 * tWet) * (tDry - tWet);
        const e_sd = 6.112 * Math.exp((17.67 * tDry) / (tDry + 243.5));
        return Math.max(0, Math.min(100, Math.round((e / e_sd) * 100)));
      }
      return undefined;
    };

    // Calculate RH for each period if psychrometer data is provided
    if (typeof bolaKeringPagi === 'number' && typeof bolaBasahPagi === 'number') {
      const calPagi = calcRH(bolaKeringPagi, bolaBasahPagi);
      if (calPagi !== undefined) kelembabanPagi = calPagi;
    }
    if (typeof bolaKeringSiang === 'number' && typeof bolaBasahSiang === 'number') {
      const calSiang = calcRH(bolaKeringSiang, bolaBasahSiang);
      if (calSiang !== undefined) kelembabanSiang = calSiang;
    }
    if (typeof bolaKeringSore === 'number' && typeof bolaBasahSore === 'number') {
      const calSore = calcRH(bolaKeringSore, bolaBasahSore);
      if (calSore !== undefined) kelembabanSore = calSore;
    }

    // Calc relative humidity via BMKG psychrometer wet/dry bulb or weighted observation formula (1.1.1)
    let kelembaban = parseField(record.kelembaban);
    if ((typeof kelembabanPagi === 'number' && kelembabanPagi > 0) || 
        (typeof kelembabanSiang === 'number' && kelembabanSiang > 0) || 
        (typeof kelembabanSore === 'number' && kelembabanSore > 0)) {
      let denom = 0;
      let sum = 0;
      if (typeof kelembabanPagi === 'number' && kelembabanPagi > 0) { sum += kelembabanPagi; denom += 1; }
      if (typeof kelembabanSiang === 'number' && kelembabanSiang > 0) { sum += kelembabanSiang; denom += 1; }
      if (typeof kelembabanSore === 'number' && kelembabanSore > 0) { sum += kelembabanSore; denom += 1; }
      if (denom > 0) {
        kelembaban = Math.round(sum / denom);
      }
    } else if (typeof bolaKering === 'number' && typeof bolaBasah === 'number') {
      const legacyRH = calcRH(bolaKering, bolaBasah);
      if (legacyRH !== undefined) kelembaban = legacyRH;
    }

    const processedRecord = {
      id: record.tanggal,
      tanggal: record.tanggal,
      lamaPenyinaran: parseField(record.lamaPenyinaran),
      suhuMax,
      suhuMin,
      suhuRerata,
      kelembaban,
      kecepatanAngin,
      curahHujan,
      evaporasi,
      hookAwal,
      hookAkhir,
      anemometerAwal,
      anemometerAkhir,
      bolaKering,
      bolaBasah,
      bolaKeringPagi,
      bolaBasahPagi,
      bolaKeringSiang,
      bolaBasahSiang,
      bolaKeringSore,
      bolaBasahSore,
      kelembabanPagi,
      kelembabanSiang,
      kelembabanSore,
      catatan: record.catatan || "-"
    };

    if (existingIndex >= 0) {
      data[existingIndex] = processedRecord;
    } else {
      data.push(processedRecord);
    }

    await writeData(data);
    res.status(201).json(processedRecord);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all records (Admin only)
app.delete("/api/klimatologi", async (req, res) => {
  try {
    await writeData([]);
    res.json({ success: true, message: "Semua data klimatologi berhasil dihapus" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete record (Admin only)
app.delete("/api/klimatologi/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData();
    const updatedData = data.filter((item: any) => item.id !== id);
    await writeData(updatedData);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Climatology Assistant (Asisten Klimatologi) powered by Google Gemini (gemini-3.5-flash)
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history, records: clientRecords } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Pesan tidak boleh kosong" });
    }

    // Retrieve API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return res.status(400).json({
        error: "Kunci API Gemini belum dikonfigurasi atau masih menggunakan placeholder. Silakan atur atau pilih API Key Anda di panel Settings > Secrets AI Studio."
      });
    }

    // Get current records (prefer latest synced Google Sheets records from client, fallback to server store)
    const data = Array.isArray(clientRecords) && clientRecords.length > 0
      ? [...clientRecords]
      : await readData();
    data.sort((a: any, b: any) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));
    const recentRecords = data.slice(0, 7); // Let's send the last 7 days of field observations

    // Format the records for the system instructions
    const recordsText = recentRecords.map((r: any) => {
      return `- Tanggal: ${r.tanggal}, Penyinaran: ${r.lamaPenyinaran} jam, Suhu: ${r.suhuMin}°C s/d ${r.suhuMax}°C (Rata-rata: ${r.suhuRerata}°C), Kelembaban: ${r.kelembaban}%, Angin: ${r.kecepatanAngin} km/jam, Hujan: ${r.curahHujan} mm, Evaporasi: ${r.evaporasi} mm. Catatan: ${r.catatan || '-'}`;
    }).join("\n");

    const systemInstruction = `Anda adalah Asisten Klimatologi cerdas untuk Stasiun Klimatologi Pusat Penelitian Karet (Puslit Karet), khususnya di Balai Penelitian Sembawa.
Tugas Anda adalah membantu peneliti, staf lapangan, dan petani karet dalam menganalisis data cuaca/klimatologi lapangan serta memberikan rekomendasi budidaya karet yang relevan.

Berikut adalah data pengamatan klimatologi lapangan terbaru (7 hari terakhir):
${recordsText}

Panduan memberikan tanggapan:
1. Berikan tanggapan yang profesional, informatif, ramah, dan solutif dalam Bahasa Indonesia yang baik dan benar.
2. Hubungkan analisis cuaca dengan aspek agronomis tanaman karet (Hevea brasiliensis). Contoh dampak agronomi karet:
   - Curah hujan tinggi (>10-20 mm per hari atau hujan berturut-turut) dapat menghambat penyadapan karet (tapping) karena bidang sadap basah dapat memicu infeksi jamur bidang sadap (Mati Alur Sadap / MAS, Bark rot/mulas sadap) dan mengencerkan atau menghanyutkan lateks.
   - Suhu yang terlalu panas dilapisi dengan kelembaban rendah dapat meningkatkan laju transpirasi dan mengurangi tekanan turgor sel penghasil lateks, sehingga hasil lateks menurun di siang hari. Sadap karet paling baik dilakukan pagi-pagi sekali (jam 5-7 pagi).
   - Penyinaran matahari yang stabil mendukung fotosintesis untuk pembentukan lateks.
   - Kelembaban tinggi (>85%) ditambah kabut/mendung rentan memicu penyakit gugur daun karet yang disebabkan oleh patogen Colletotrichum gloeosporioides atau Oidium heveae.
3. Sebutkan data ril jika merujuk pada histori pengamatan di atas untuk mendukung argumen analisis klimatologi Anda.
4. Jawab pertanyaan umum klimatologi, pengisian evaporasi panci kelas A, atau saran agroklimatologi karet dengan sangat antusias dan bernilai ilmiah praktis.
5. Jika pengguna memberikan sapaan atau obrolan santai (seperti "Halo", "Hai", "Selamat pagi", "Assalamu'alaikum", dsb.), sapa balik mereka secara alami, hangat, ramah dan profesional seperti interaksi manusia langsung atau asisten pintar modern (ChatGPT/Gemini), lalu tawarkan bantuan Anda terkait klimatologi Balai Penelitian Sembawa secara ringkas.`;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Format message chat history for Gemini API
    const formattedContents = [];
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        formattedContents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text }]
        });
      }
    }
    // Append the latest user message
    formattedContents.push({
      role: "user",
      parts: [{ text: message }]
    });

    // Define fallback models stack compliant with @google/genai guidelines
    const modelsToTry = [
      {
        name: "gemini-4-hydrogen",
        config: {
          systemInstruction,
        }
      },
      {
        name: "gemini-3.1-flash-lite",
        config: {
          systemInstruction,
          temperature: 0.7
        }
      }
    ];

    let lastError: any = null;
    let responseText: string | undefined = undefined;

    for (const modelOption of modelsToTry) {
      try {
        console.log(`Mencoba menghubungi model Gemini: ${modelOption.name}...`);
        const response = await ai.models.generateContent({
          model: modelOption.name,
          contents: formattedContents,
          config: modelOption.config
        });

        if (response && response.text) {
          responseText = response.text;
          console.log(`Sukses ditanggapi oleh model: ${modelOption.name}`);
          break; // Exit loop on successful response
        }
      } catch (err: any) {
        console.log(`[Transition Info] Model ${modelOption.name} currently resting. Trying alternative options...`);
        lastError = err;
      }
    }

    if (!responseText) {
      const errorMessage = lastError?.message || JSON.stringify(lastError || "");
      if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("API key not valid") || errorMessage.includes("INVALID_ARGUMENT")) {
        return res.status(400).json({
          error: "Kunci API Gemini tidak valid atau belum diatur. Silakan pilih atau perbarui API Key Anda di panel Settings > Secrets AI Studio."
        });
      }
      if (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE") || errorMessage.includes("demand")) {
        return res.status(503).json({
          error: "Layanan model AI Google Gemini sedang mengalami lalu lintas padat secara global (503 Service Unavailable). Silakan coba kirim analisis beberapa saat lagi."
        });
      }
      return res.status(500).json({
        error: lastError?.message || "Gagal memperoleh respon dari model klimatologi pendukung."
      });
    }

    res.json({
      text: responseText,
    });
  } catch (err: any) {
    console.error("Gemini Error:", err);
    const msg = err?.message || String(err);
    if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
      return res.status(400).json({
        error: "Kunci API Gemini tidak valid. Silakan periksa atau pilih API Key Anda di panel Settings > Secrets AI Studio."
      });
    }
    res.status(500).json({ error: msg || "Gagal mendapatkan analisis dari Asisten Gemini." });
  }
});

// Explicitly handle unmatched API routes as 404 JSON to prevent falling back to index.html (causing "Unexpected token <")
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint API tidak ditemukan (404)." });
});

// General server error-handling middleware to ensure all errors are returned as JSON
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled server error:", err);
  res.status(err.status || 500).json({
    error: err.name || "ServerError",
    message: err.message || "Terjadi kesalahan internal pada server klimatologi."
  });
});

// Vite server integrations
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === "GET") {
        return res.sendFile(path.join(distPath, "index.html"));
      }
      next();
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Klimatologi berjalan di http://localhost:${PORT}`);
  });
}

startServer();
