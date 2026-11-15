import { pgTable, serial, text, real, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(),
  email: text('email').notNull().unique(),
  nama: text('nama'),
  role: text('role').default('user'),
  instansi: text('instansi'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const klimatologi = pgTable('klimatologi', {
  id: text('id').primaryKey(),
  tanggal: text('tanggal').notNull(),
  tempMin: real('temp_min'),
  tempMax: real('temp_max'),
  tempAvg: real('temp_avg'),
  rhAvg: real('rh_avg'),
  curahHujan: real('curah_hujan'),
  penyinaranMatahari: real('penyinaran_matahari'),
  kecepatanAnginAvg: real('kecepatan_angin_avg'),
  arahAnginMax: text('arah_angin_max'),
  kecepatanAnginMax: real('kecepatan_angin_max'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const emailLogs = pgTable('email_logs', {
  id: text('id').primaryKey(),
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  status: text('status').notNull(),
  sentAt: timestamp('sent_at').defaultNow(),
});
