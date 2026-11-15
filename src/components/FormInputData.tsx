import React, { useState, useEffect, useRef } from 'react';
import { X, Info, Calendar, RotateCcw, AlertCircle, Save } from 'lucide-react';
import { KlimatologiRecord } from '../types';
import { postGasAction } from '../lib/gasService';

interface FormInputDataProps {
  onClose: () => void;
  onSubmitSuccess: (newRecord: KlimatologiRecord) => void;
  editingRecord?: KlimatologiRecord | null;
  adminEmail?: string;
}

function normalizeDateInput(rawVal?: string): string {
  if (!rawVal) return '';
  const str = String(rawVal).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
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
  const dmyMatch = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return str;
}

export default function FormInputData({ onClose, onSubmitSuccess, editingRecord, adminEmail }: FormInputDataProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idNotFoundError, setIdNotFoundError] = useState(false);

  // Form Fields - Default '-' for observation columns when no data is entered
  const [tanggal, setTanggal] = useState('');
  const [lamaPenyinaran, setLamaPenyinaran] = useState('-');
  const [suhuMax, setSuhuMax] = useState('-');
  const [suhuMin, setSuhuMin] = useState('-');
  const [suhuRerata, setSuhuRerata] = useState('-');
  const [kelembaban, setKelembaban] = useState('-');
  const [kecepatanAngin, setKecepatanAngin] = useState('-');
  const [arahAngin, setArahAngin] = useState('-');
  const [curahHujan, setCurahHujan] = useState('-');

  // Kelembaban entry mode ('psikrometer' | 'tiga_waktu' | 'langsung')
  const [humidityInputMode, setHumidityInputMode] = useState<'psikrometer' | 'tiga_waktu' | 'langsung'>('psikrometer');

  // Psikrometer BK/BB states (3 observation times) - default '-'
  const [bolaKeringPagi, setBolaKeringPagi] = useState('-');
  const [bolaBasahPagi, setBolaBasahPagi] = useState('-');
  const [bolaKeringSiang, setBolaKeringSiang] = useState('-');
  const [bolaBasahSiang, setBolaBasahSiang] = useState('-');
  const [bolaKeringSore, setBolaKeringSore] = useState('-');
  const [bolaBasahSore, setBolaBasahSore] = useState('-');

  // Directly input relative humidity states (3 observation times) - default '-'
  const [kelembabanPagi, setKelembabanPagi] = useState('-');
  const [kelembabanSiang, setKelembabanSiang] = useState('-');
  const [kelembabanSore, setKelembabanSore] = useState('-');

  // Evaporasi entry mode (direct vs hook gauge) - default '-'
  const [useHookCalculator, setUseHookCalculator] = useState(true);
  const [hookAwal, setHookAwal] = useState('-');
  const [hookAkhir, setHookAkhir] = useState('-');
  const [evaporasi, setEvaporasi] = useState('-');

  // Kecepatan Angin entry mode (direct vs anemometer counter) - default '-'
  const [useAnemometerCalculator, setUseAnemometerCalculator] = useState(true);
  const [anemometerAwal, setAnemometerAwal] = useState('-');
  const [anemometerAkhir, setAnemometerAkhir] = useState('-');

  const [catatan, setCatatan] = useState('-');

  // Track user modification to avoid auto-calculation effects wiping loaded edit values on mount
  const userTouchedTempRef = useRef(false);

  // Helper to ensure empty or undefined fields become '-'
  const toDash = (val: unknown): string => {
    if (val === undefined || val === null || val === '' || val === '-') return '-';
    return String(val);
  };

  // Helper to parse decimal strings supporting comma or dot
  const parseNum = (val: string): number => {
    return parseFloat(val.replace(/,/g, '.'));
  };

  // Quick reset all observation fields to '-'
  const handleSetAllToDash = () => {
    userTouchedTempRef.current = true;
    setLamaPenyinaran('-');
    setSuhuMax('-');
    setSuhuMin('-');
    setSuhuRerata('-');
    setBolaKeringPagi('-');
    setBolaBasahPagi('-');
    setBolaKeringSiang('-');
    setBolaBasahSiang('-');
    setBolaKeringSore('-');
    setBolaBasahSore('-');
    setKelembabanPagi('-');
    setKelembabanSiang('-');
    setKelembabanSore('-');
    setKelembaban('-');
    setAnemometerAwal('-');
    setAnemometerAkhir('-');
    setKecepatanAngin('-');
    setArahAngin('-');
    setCurahHujan('-');
    setHookAwal('-');
    setHookAkhir('-');
    setEvaporasi('-');
    setCatatan('-');
  };

  // Numeric input handler that allows typing digits, dot/comma decimal separator, and '-'
  const handleNumberInput =
    (setter: React.Dispatch<React.SetStateAction<string>>, onUserEdit?: () => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const normalized = e.target.value.replace(/,/g, '.');
      if (normalized === '' || normalized === '-' || /^-?\d*\.?\d*$/.test(normalized)) {
        if (onUserEdit) onUserEdit();
        setter(normalized);
      }
    };

  // Auto-select text when focusing on an input with '-' so user can type immediately
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.target.value === '-') {
      e.target.select();
    }
  };

  // Restore '-' if input is left blank upon blur
  const handleBlur = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value.trim();
    if (v === '' || v === '-') {
      setter('-');
    }
  };

  // Set initial state if editing or new
  useEffect(() => {
    setError(null);
    setIdNotFoundError(false);
    userTouchedTempRef.current = false;

    if (editingRecord) {
      setTanggal(normalizeDateInput(editingRecord.tanggal));
      setLamaPenyinaran(toDash(editingRecord.lamaPenyinaran));
      setSuhuMax(toDash(editingRecord.suhuMax));
      setSuhuMin(toDash(editingRecord.suhuMin));
      setSuhuRerata(toDash(editingRecord.suhuRerata));
      setKelembaban(toDash(editingRecord.kelembaban));
      setKecepatanAngin(toDash(editingRecord.kecepatanAngin));
      setArahAngin(toDash(editingRecord.arahAngin));
      setCurahHujan(toDash(editingRecord.curahHujan));
      setCatatan(editingRecord.catatan && editingRecord.catatan !== '-' ? editingRecord.catatan : '-');

      if (
        editingRecord.bolaKeringPagi !== undefined &&
        editingRecord.bolaKeringPagi !== null &&
        editingRecord.bolaKeringPagi !== '-' &&
        editingRecord.bolaBasahPagi !== undefined &&
        editingRecord.bolaBasahPagi !== null &&
        editingRecord.bolaBasahPagi !== '-'
      ) {
        setHumidityInputMode('psikrometer');
        setBolaKeringPagi(toDash(editingRecord.bolaKeringPagi));
        setBolaBasahPagi(toDash(editingRecord.bolaBasahPagi));
        setBolaKeringSiang(toDash(editingRecord.bolaKeringSiang));
        setBolaBasahSiang(toDash(editingRecord.bolaBasahSiang));
        setBolaKeringSore(toDash(editingRecord.bolaKeringSore));
        setBolaBasahSore(toDash(editingRecord.bolaBasahSore));
        setKelembabanPagi(toDash(editingRecord.kelembabanPagi));
        setKelembabanSiang(toDash(editingRecord.kelembabanSiang));
        setKelembabanSore(toDash(editingRecord.kelembabanSore));
      } else if (
        editingRecord.kelembabanPagi !== undefined &&
        editingRecord.kelembabanPagi !== null &&
        editingRecord.kelembabanPagi !== '-' &&
        editingRecord.kelembabanSiang !== undefined &&
        editingRecord.kelembabanSiang !== null &&
        editingRecord.kelembabanSiang !== '-'
      ) {
        setHumidityInputMode('tiga_waktu');
        setKelembabanPagi(toDash(editingRecord.kelembabanPagi));
        setKelembabanSiang(toDash(editingRecord.kelembabanSiang));
        setKelembabanSore(toDash(editingRecord.kelembabanSore));
      } else {
        setHumidityInputMode('langsung');
        setKelembaban(toDash(editingRecord.kelembaban));
      }

      if (
        editingRecord.hookAwal !== undefined &&
        editingRecord.hookAwal !== null &&
        editingRecord.hookAwal !== '-' &&
        editingRecord.hookAkhir !== undefined &&
        editingRecord.hookAkhir !== null &&
        editingRecord.hookAkhir !== '-'
      ) {
        setUseHookCalculator(true);
        setHookAwal(toDash(editingRecord.hookAwal));
        setHookAkhir(toDash(editingRecord.hookAkhir));
        setEvaporasi(toDash(editingRecord.evaporasi));
      } else {
        setUseHookCalculator(false);
        setEvaporasi(toDash(editingRecord.evaporasi));
      }

      if (
        editingRecord.anemometerAwal !== undefined &&
        editingRecord.anemometerAwal !== null &&
        editingRecord.anemometerAwal !== '-' &&
        editingRecord.anemometerAkhir !== undefined &&
        editingRecord.anemometerAkhir !== null &&
        editingRecord.anemometerAkhir !== '-'
      ) {
        setUseAnemometerCalculator(true);
        setAnemometerAwal(toDash(editingRecord.anemometerAwal));
        setAnemometerAkhir(toDash(editingRecord.anemometerAkhir));
        setKecepatanAngin(toDash(editingRecord.kecepatanAngin));
      } else {
        setUseAnemometerCalculator(false);
        setKecepatanAngin(toDash(editingRecord.kecepatanAngin));
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      setTanggal(today);
      handleSetAllToDash();
    }
  }, [editingRecord]);

  // Handle auto calculations for Average Temperature (Rerata Suhu)
  useEffect(() => {
    if (suhuMax !== '-' && suhuMin !== '-' && suhuMax !== '' && suhuMin !== '') {
      const max = parseNum(suhuMax);
      const min = parseNum(suhuMin);
      if (!isNaN(max) && !isNaN(min)) {
        setSuhuRerata(((max + min) / 2).toFixed(1));
        return;
      }
    }
    if (userTouchedTempRef.current || !editingRecord) {
      setSuhuRerata('-');
    }
  }, [suhuMax, suhuMin, editingRecord]);

  const calcRH = (tDryStr: string, tWetStr: string): number | null => {
    if (tDryStr === '-' || tWetStr === '-' || tDryStr === '' || tWetStr === '') return null;
    const tDry = parseNum(tDryStr);
    const tWet = parseNum(tWetStr);
    if (isNaN(tDry) || isNaN(tWet) || tDry < tWet || tDry <= 0 || tWet <= 0) return null;
    const e_sw = 6.112 * Math.exp((17.67 * tWet) / (tWet + 243.5));
    const e = e_sw - 0.668 * (1 + 0.00115 * tWet) * (tDry - tWet);
    const e_sd = 6.112 * Math.exp((17.67 * tDry) / (tDry + 243.5));
    const calculatedRH = Math.round((e / e_sd) * 100);
    return Math.max(0, Math.min(100, calculatedRH));
  };

  // Handle auto calculations for Kelembaban (BMKG 3-time Psychrometer or weighted entry method)
  useEffect(() => {
    if (humidityInputMode === 'psikrometer') {
      const rhPagi = calcRH(bolaKeringPagi, bolaBasahPagi);
      const rhSiang = calcRH(bolaKeringSiang, bolaBasahSiang);
      const rhSore = calcRH(bolaKeringSore, bolaBasahSore);

      setKelembabanPagi(rhPagi !== null ? String(rhPagi) : '-');
      setKelembabanSiang(rhSiang !== null ? String(rhSiang) : '-');
      setKelembabanSore(rhSore !== null ? String(rhSore) : '-');

      const validRHs: number[] = [];
      if (rhPagi !== null) validRHs.push(rhPagi);
      if (rhSiang !== null) validRHs.push(rhSiang);
      if (rhSore !== null) validRHs.push(rhSore);

      if (validRHs.length > 0) {
        const sum = validRHs.reduce((a, b) => a + b, 0);
        setKelembaban(String(Math.round(sum / validRHs.length)));
      } else {
        setKelembaban('-');
      }
    } else if (humidityInputMode === 'tiga_waktu') {
      const validRHs: number[] = [];
      const p = parseNum(kelembabanPagi);
      const s = parseNum(kelembabanSiang);
      const so = parseNum(kelembabanSore);
      if (kelembabanPagi !== '-' && !isNaN(p)) validRHs.push(p);
      if (kelembabanSiang !== '-' && !isNaN(s)) validRHs.push(s);
      if (kelembabanSore !== '-' && !isNaN(so)) validRHs.push(so);

      if (validRHs.length > 0) {
        const sum = validRHs.reduce((a, b) => a + b, 0);
        setKelembaban(String(Math.round(sum / validRHs.length)));
      } else {
        setKelembaban('-');
      }
    }
  }, [
    bolaKeringPagi,
    bolaBasahPagi,
    bolaKeringSiang,
    bolaBasahSiang,
    bolaKeringSore,
    bolaBasahSore,
    kelembabanPagi,
    kelembabanSiang,
    kelembabanSore,
    humidityInputMode,
  ]);

  // Handle auto calculations for Evaporasi (BMKG hook gauge method)
  useEffect(() => {
    if (useHookCalculator) {
      if (hookAwal !== '-' && hookAkhir !== '-' && hookAwal !== '' && hookAkhir !== '') {
        const awal = parseNum(hookAwal);
        const akhir = parseNum(hookAkhir);
        if (!isNaN(awal) && !isNaN(akhir)) {
          const rainVal = parseNum(curahHujan);
          const rain = curahHujan !== '-' && curahHujan !== '' && !isNaN(rainVal) ? rainVal : 0;
          const calculatedEvap = awal - akhir + rain;
          setEvaporasi((calculatedEvap >= 0 ? calculatedEvap : 0).toFixed(2));
          return;
        }
      }
      setEvaporasi('-');
    }
  }, [hookAwal, hookAkhir, curahHujan, useHookCalculator]);

  // Handle auto calculations for Kecepatan Angin (BMKG Cup Counter Anemometer method)
  useEffect(() => {
    if (useAnemometerCalculator) {
      if (anemometerAwal !== '-' && anemometerAkhir !== '-' && anemometerAwal !== '' && anemometerAkhir !== '') {
        const awal = parseNum(anemometerAwal);
        const akhir = parseNum(anemometerAkhir);
        if (!isNaN(awal) && !isNaN(akhir)) {
          const diff = akhir >= awal ? akhir - awal : 0;
          setKecepatanAngin((diff / 24).toFixed(2));
          return;
        }
      }
      setKecepatanAngin('-');
    }
  }, [anemometerAwal, anemometerAkhir, useAnemometerCalculator]);

  // Helper to format values: '-' if empty/unfilled, otherwise number or '-'
  const parseVal = (val: string): number | string => {
    if (val === '' || val === '-' || val === undefined || val === null) return '-';
    const n = parseFloat(String(val).replace(/,/g, '.'));
    return isNaN(n) ? '-' : n;
  };

  const buildValidatedRecord = (targetId: string): KlimatologiRecord | null => {
    if (!tanggal) {
      setError('Tanggal pengamatan wajib dipilih.');
      return null;
    }

    const pLama = parseVal(lamaPenyinaran);
    if (typeof pLama === 'number' && (pLama < 0 || pLama > 24)) {
      setError('Lama penyinaran harus di antara 0 dan 24 jam.');
      return null;
    }
    const pSMin = parseVal(suhuMin);
    const pSMax = parseVal(suhuMax);
    if (typeof pSMin === 'number' && typeof pSMax === 'number' && pSMin > pSMax) {
      setError('Suhu minimum tidak boleh melebihi suhu maksimum.');
      return null;
    }
    const pRH = parseVal(kelembaban);
    if (typeof pRH === 'number' && (pRH < 0 || pRH > 100)) {
      setError('Kelembaban udara harus di antara 0% dan 100%.');
      return null;
    }

    return {
      id: targetId,
      tanggal,
      lamaPenyinaran: parseVal(lamaPenyinaran),
      suhuMax: parseVal(suhuMax),
      suhuMin: parseVal(suhuMin),
      suhuRerata: parseVal(suhuRerata),
      kelembaban: parseVal(kelembaban),
      kecepatanAngin: parseVal(kecepatanAngin),
      arahAngin: arahAngin.trim() === '' ? '-' : arahAngin.trim(),
      curahHujan: parseVal(curahHujan),
      evaporasi: parseVal(evaporasi),
      ...(useHookCalculator ? { hookAwal: parseVal(hookAwal), hookAkhir: parseVal(hookAkhir) } : {}),
      ...(useAnemometerCalculator ? { anemometerAwal: parseVal(anemometerAwal), anemometerAkhir: parseVal(anemometerAkhir) } : {}),
      ...(humidityInputMode === 'psikrometer'
        ? {
            bolaKeringPagi: parseVal(bolaKeringPagi),
            bolaBasahPagi: parseVal(bolaBasahPagi),
            bolaKeringSiang: parseVal(bolaKeringSiang),
            bolaBasahSiang: parseVal(bolaBasahSiang),
            bolaKeringSore: parseVal(bolaKeringSore),
            bolaBasahSore: parseVal(bolaBasahSore),
          }
        : {}),
      ...(humidityInputMode !== 'langsung'
        ? {
            kelembabanPagi: parseVal(kelembabanPagi),
            kelembabanSiang: parseVal(kelembabanSiang),
            kelembabanSore: parseVal(kelembabanSore),
          }
        : {}),
      catatan: catatan.trim() === '' ? '-' : catatan.trim(),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIdNotFoundError(false);

    // Use text-safe ID prefix for new records so Google Sheets never converts YYYY-MM-DD into a Date cell
    const initialId = editingRecord ? editingRecord.id || tanggal : `obs-${tanggal}-${Date.now()}`;
    const recordData = buildValidatedRecord(initialId);
    if (!recordData) return;

    setLoading(true);
    const emailToSend = adminEmail || 'stklimat.ppk@gmail.com';

    try {
      if (editingRecord) {
        try {
          await postGasAction({
            action: 'update',
            adminEmail: emailToSend,
            data: recordData,
            id: initialId,
          });
          onSubmitSuccess(recordData);
          return;
        } catch (firstErr: any) {
          const msg = String(firstErr?.message || '');
          const isNotFound = /tidak ditemukan|not found/i.test(msg);

          // If primary ID was a Date ISO string (from Sheets date-formatting), retry update using tanggal string
          if (isNotFound && tanggal && initialId !== tanggal) {
            try {
              const retryRecord = { ...recordData, id: tanggal };
              await postGasAction({
                action: 'update',
                adminEmail: emailToSend,
                data: retryRecord,
                id: tanggal,
              });
              onSubmitSuccess(retryRecord);
              return;
            } catch (retryErr: any) {
              const retryMsg = String(retryErr?.message || msg);
              if (/tidak ditemukan|not found/i.test(retryMsg)) {
                setIdNotFoundError(true);
                setError('Baris data tidak dapat ditemukan oleh Google Sheets (kolom "id" di spreadsheet kosong atau terformat tanggal).');
                return;
              }
              throw retryErr;
            }
          }

          if (isNotFound) {
            setIdNotFoundError(true);
            setError('Baris data tidak dapat ditemukan oleh Google Sheets (kolom "id" di spreadsheet kosong atau terformat tanggal).');
            return;
          }
          throw firstErr;
        }
      } else {
        await postGasAction({
          action: 'create',
          adminEmail: emailToSend,
          data: recordData,
          id: initialId,
        });
        onSubmitSuccess(recordData);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan data ke Google Apps Script Web App.');
    } finally {
      setLoading(false);
    }
  };

  // Explicit recovery when legacy Google Sheets rows lack a valid matching ID column
  const handleSaveAsNewEntry = async () => {
    setError(null);
    const freshId = `obs-${tanggal}-${Date.now()}`;
    const recordData = buildValidatedRecord(freshId);
    if (!recordData) return;

    setLoading(true);
    try {
      await postGasAction({
        action: 'create',
        adminEmail: adminEmail || 'stklimat.ppk@gmail.com',
        data: recordData,
        id: freshId,
      });
      setIdNotFoundError(false);
      onSubmitSuccess(recordData);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengirim data sebagai entri baru ke Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/5 dark:ring-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between bg-emerald-800 dark:bg-emerald-900 px-6 py-4 text-white">
          <div>
            <h2 className="font-display text-lg font-bold">
              {editingRecord ? 'Edit Data Pengamatan' : 'Form Pengisian Data Lapangan'}
            </h2>
            <p className="font-sans text-xs text-emerald-100">
              Pengisian parameter observasi harian klimatologi standard BMKG
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-emerald-100 hover:bg-emerald-700/50 hover:text-white transition cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form Wrapper with Scrollable Body + Pinned Footer */}
        <form noValidate onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-700 dark:text-slate-200">
            <div className="rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 p-3 text-xs text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <Info className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Seluruh kolom pengamatan yang belum ada data ditandai dengan <strong>-</strong> (strip).
                </span>
              </div>
              <button
                type="button"
                onClick={handleSetAllToDash}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100/60 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Isi tanda - pada seluruh kolom pengamatan"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Terapkan (-) Seluruh Kolom
              </button>
            </div>

            {/* Tanggal & Penyinaran */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Tanggal Pengamatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  disabled={!!editingRecord}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
                  Lama Penyinaran <span className="text-slate-400 font-normal">(jam)</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={lamaPenyinaran}
                  onChange={handleNumberInput(setLamaPenyinaran)}
                  onFocus={handleFocus}
                  onBlur={handleBlur(setLamaPenyinaran)}
                  placeholder="-"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-emerald-500 focus:outline-hidden font-medium"
                />
              </div>
            </div>

            {/* Suhu Section */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Suhu Udara (°C)</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Suhu Maksimum</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={suhuMax}
                    onChange={handleNumberInput(setSuhuMax, () => {
                      userTouchedTempRef.current = true;
                    })}
                    onFocus={handleFocus}
                    onBlur={handleBlur(setSuhuMax)}
                    placeholder="-"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-emerald-500 focus:outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Suhu Minimum</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={suhuMin}
                    onChange={handleNumberInput(setSuhuMin, () => {
                      userTouchedTempRef.current = true;
                    })}
                    onFocus={handleFocus}
                    onBlur={handleBlur(setSuhuMin)}
                    placeholder="-"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-emerald-500 focus:outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block flex items-center gap-1">
                    Suhu Rerata (Rata-rata)
                    <span className="rounded-sm bg-emerald-100 dark:bg-emerald-950/60 px-1 text-[9px] font-bold text-emerald-800 dark:text-emerald-300">
                      Auto
                    </span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={suhuRerata !== '-' && suhuRerata !== '' ? `${suhuRerata} °C` : '-'}
                    placeholder="-"
                    className="w-full rounded-lg border border-emerald-100 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/30 px-3.5 py-2 text-sm font-semibold text-emerald-900 dark:text-emerald-300 shadow-xs focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Kelembaban Section */}
            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/20 p-4 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-indigo-100/50 dark:border-indigo-900/40 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                    Kelembaban Udara <span className="text-indigo-600 dark:text-indigo-400">(%)</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Pengamatan Pagi (07:00), Siang (13:00), Sore (18:00)</p>
                </div>

                {/* Input Mode Select */}
                <div className="flex bg-indigo-50 dark:bg-slate-800 p-1 rounded-lg self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setHumidityInputMode('psikrometer')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      humidityInputMode === 'psikrometer'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    Psikrometer (BK/BB)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHumidityInputMode('tiga_waktu')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      humidityInputMode === 'tiga_waktu'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    3 Waktu (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHumidityInputMode('langsung')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      humidityInputMode === 'langsung'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    Rerata Langsung
                  </button>
                </div>
              </div>

              {humidityInputMode === 'psikrometer' && (
                <div className="space-y-4">
                  {/* 3 times observation inputs */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {/* Pagi */}
                    <div className="rounded-lg border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 space-y-2.5">
                      <span className="block text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300">Pagi (07:00)</span>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Suhu BK (°C)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="-"
                          value={bolaKeringPagi}
                          onChange={handleNumberInput(setBolaKeringPagi)}
                          onFocus={handleFocus}
                          onBlur={handleBlur(setBolaKeringPagi)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-hidden font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Suhu BB (°C)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="-"
                          value={bolaBasahPagi}
                          onChange={handleNumberInput(setBolaBasahPagi)}
                          onFocus={handleFocus}
                          onBlur={handleBlur(setBolaBasahPagi)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-hidden font-medium"
                        />
                      </div>
                      <div className="pt-1.5 border-t border-dashed border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <span>RH Pagi:</span>
                        <span className="font-bold text-indigo-800 dark:text-indigo-300">
                          {kelembabanPagi !== '-' && kelembabanPagi !== '' ? `${kelembabanPagi}%` : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Siang */}
                    <div className="rounded-lg border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 space-y-2.5">
                      <span className="block text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300">Siang (13:00)</span>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Suhu BK (°C)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="-"
                          value={bolaKeringSiang}
                          onChange={handleNumberInput(setBolaKeringSiang)}
                          onFocus={handleFocus}
                          onBlur={handleBlur(setBolaKeringSiang)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-hidden font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Suhu BB (°C)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="-"
                          value={bolaBasahSiang}
                          onChange={handleNumberInput(setBolaBasahSiang)}
                          onFocus={handleFocus}
                          onBlur={handleBlur(setBolaBasahSiang)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-hidden font-medium"
                        />
                      </div>
                      <div className="pt-1.5 border-t border-dashed border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <span>RH Siang:</span>
                        <span className="font-bold text-indigo-800 dark:text-indigo-300">
                          {kelembabanSiang !== '-' && kelembabanSiang !== '' ? `${kelembabanSiang}%` : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Sore */}
                    <div className="rounded-lg border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 space-y-2.5">
                      <span className="block text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300">Sore (18:00)</span>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Suhu BK (°C)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="-"
                          value={bolaKeringSore}
                          onChange={handleNumberInput(setBolaKeringSore)}
                          onFocus={handleFocus}
                          onBlur={handleBlur(setBolaKeringSore)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-hidden font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Suhu BB (°C)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="-"
                          value={bolaBasahSore}
                          onChange={handleNumberInput(setBolaBasahSore)}
                          onFocus={handleFocus}
                          onBlur={handleBlur(setBolaBasahSore)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-hidden font-medium"
                        />
                      </div>
                      <div className="pt-1.5 border-t border-dashed border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <span>RH Sore:</span>
                        <span className="font-bold text-indigo-800 dark:text-indigo-300">
                          {kelembabanSore !== '-' && kelembabanSore !== '' ? `${kelembabanSore}%` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md bg-white dark:bg-slate-800 border border-indigo-50 dark:border-slate-700 p-2.5 flex items-center justify-between text-xs font-medium text-indigo-900 dark:text-indigo-200">
                    <div className="flex flex-col">
                      <span className="font-semibold">Rumus Rerata BMKG (1.1.1):</span>
                      <span className="text-slate-500 dark:text-slate-400 font-normal font-mono">RH = (RH_pagi + RH_siang + RH_sore) / 3</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase text-indigo-600 dark:text-indigo-400 font-bold tracking-wider">Hasil Rerata</span>
                      <span className="text-base font-bold text-indigo-800 dark:text-indigo-300">
                        {kelembaban !== '-' && kelembaban !== '' ? `${kelembaban}%` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {humidityInputMode === 'tiga_waktu' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Kelembaban Pagi (07:00) %</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="-"
                        value={kelembabanPagi}
                        onChange={handleNumberInput(setKelembabanPagi)}
                        onFocus={handleFocus}
                        onBlur={handleBlur(setKelembabanPagi)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-hidden font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Kelembaban Siang (13:00) %</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="-"
                        value={kelembabanSiang}
                        onChange={handleNumberInput(setKelembabanSiang)}
                        onFocus={handleFocus}
                        onBlur={handleBlur(setKelembabanSiang)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-hidden font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Kelembaban Sore (18:00) %</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="-"
                        value={kelembabanSore}
                        onChange={handleNumberInput(setKelembabanSore)}
                        onFocus={handleFocus}
                        onBlur={handleBlur(setKelembabanSore)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-hidden font-medium"
                      />
                    </div>
                  </div>

                  <div className="rounded-md bg-white dark:bg-slate-800 border border-indigo-50 dark:border-slate-700 p-2.5 flex items-center justify-between text-xs font-medium text-indigo-900 dark:text-indigo-200">
                    <div className="flex flex-col">
                      <span className="font-semibold">Rumus Rerata BMKG (1.1.1):</span>
                      <span className="text-slate-500 dark:text-slate-400 font-normal font-mono">RH = (RH_pagi + RH_siang + RH_sore) / 3</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase text-indigo-600 dark:text-indigo-400 font-bold tracking-wider">Hasil Rerata</span>
                      <span className="text-base font-bold text-indigo-800 dark:text-indigo-300">
                        {kelembaban !== '-' && kelembaban !== '' ? `${kelembaban}%` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {humidityInputMode === 'langsung' && (
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Masukkan Kelembaban Rerata Langsung (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={kelembaban}
                    onChange={handleNumberInput(setKelembaban)}
                    onFocus={handleFocus}
                    onBlur={handleBlur(setKelembaban)}
                    placeholder="-"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-hidden font-medium"
                  />
                </div>
              )}
            </div>

            {/* Kecepatan Angin Section */}
            <div className="rounded-xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/20 dark:bg-sky-950/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                  Kecepatan Angin (Cup Counter Anemometer) <span className="text-sky-600 dark:text-sky-400">(km/jam)</span>
                </h3>

                {/* Anemometer Toggle Switch */}
                <label className="flex items-center gap-1.5 text-xs text-sky-900 dark:text-sky-200 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAnemometerCalculator}
                    onChange={(e) => setUseAnemometerCalculator(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
                  />
                  Kalkulator Cup Counter BMKG
                </label>
              </div>

              {useAnemometerCalculator ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Counter Anemometer Hari Ke-n (km)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={anemometerAwal}
                        onChange={handleNumberInput(setAnemometerAwal)}
                        onFocus={handleFocus}
                        onBlur={handleBlur(setAnemometerAwal)}
                        placeholder="-"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-sky-500 focus:outline-hidden font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Counter Anemometer Hari Ke-(n+1) (km)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={anemometerAkhir}
                        onChange={handleNumberInput(setAnemometerAkhir)}
                        onFocus={handleFocus}
                        onBlur={handleBlur(setAnemometerAkhir)}
                        placeholder="-"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-sky-500 focus:outline-hidden font-medium"
                      />
                    </div>
                  </div>

                  <div className="rounded-md bg-white dark:bg-slate-800 border border-sky-50 dark:border-slate-700 p-2.5 flex items-center justify-between text-xs font-medium text-sky-900 dark:text-sky-200">
                    <div className="flex flex-col">
                      <span className="font-semibold">Rumus BMKG:</span>
                      <span className="text-slate-500 dark:text-slate-400 font-normal">Laju Rerata = (Counter Akhir - Counter Awal) / 24 Jam</span>
                      <span className="text-slate-400 text-[10px] font-normal">
                        ({anemometerAkhir !== '-' && anemometerAkhir !== '' ? anemometerAkhir : '-'} -{' '}
                        {anemometerAwal !== '-' && anemometerAwal !== '' ? anemometerAwal : '-'}) / 24
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase text-sky-600 dark:text-sky-400 font-bold tracking-wider">Laju Angin</span>
                      <span className="text-base font-bold text-sky-800 dark:text-sky-300">
                        {kecepatanAngin !== '-' && kecepatanAngin !== '' ? `${kecepatanAngin} km/jam` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Masukkan Laju Angin Langsung (km/jam)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={kecepatanAngin}
                    onChange={handleNumberInput(setKecepatanAngin)}
                    onFocus={handleFocus}
                    onBlur={handleBlur(setKecepatanAngin)}
                    placeholder="-"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-sky-500 focus:outline-hidden font-medium"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                  Arah Angin Dominan
                </label>
                <select
                  value={arahAngin}
                  onChange={(e) => setArahAngin(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-sky-500 focus:outline-hidden font-medium"
                >
                  <option value="-">-</option>
                  <option value="Utara">Utara (N)</option>
                  <option value="Timur Laut">Timur Laut (NE)</option>
                  <option value="Timur">Timur (E)</option>
                  <option value="Tenggara">Tenggara (SE)</option>
                  <option value="Selatan">Selatan (S)</option>
                  <option value="Barat Daya">Barat Daya (SW)</option>
                  <option value="Barat">Barat (W)</option>
                  <option value="Barat Laut">Barat Laut (NW)</option>
                  <option value="Tenang">Tenang (Calm)</option>
                </select>
              </div>
            </div>

            {/* Curah Hujan Section */}
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/5 dark:bg-emerald-950/10 p-4 space-y-3">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                Curah Hujan <span className="text-slate-400 font-normal">(mm)</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={curahHujan}
                onChange={handleNumberInput(setCurahHujan)}
                onFocus={handleFocus}
                onBlur={handleBlur(setCurahHujan)}
                placeholder="-"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-emerald-500 focus:outline-hidden font-medium"
              />
            </div>

            {/* Evaporasi Section */}
            <div className="rounded-xl border border-teal-100 dark:border-teal-900/40 bg-teal-50/20 dark:bg-teal-950/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                  Evaporasi Panci Kelas A <span className="text-teal-600 dark:text-teal-400">(mm)</span>
                </h3>

                {/* Calculator Toggle Switch */}
                <label className="flex items-center gap-1.5 text-xs text-teal-900 dark:text-teal-200 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useHookCalculator}
                    onChange={(e) => setUseHookCalculator(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                  />
                  Kalkulator Hook Gauge BMKG
                </label>
              </div>

              {useHookCalculator ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Hook Gauge Hari Ke-n (mm)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={hookAwal}
                        onChange={handleNumberInput(setHookAwal)}
                        onFocus={handleFocus}
                        onBlur={handleBlur(setHookAwal)}
                        placeholder="-"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-teal-500 focus:outline-hidden font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Hook Gauge Hari Ke-(n+1) (mm)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={hookAkhir}
                        onChange={handleNumberInput(setHookAkhir)}
                        onFocus={handleFocus}
                        onBlur={handleBlur(setHookAkhir)}
                        placeholder="-"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-teal-500 focus:outline-hidden font-medium"
                      />
                    </div>
                  </div>

                  <div className="rounded-md bg-white dark:bg-slate-800 border border-teal-50 dark:border-slate-700 p-2.5 flex items-center justify-between text-xs font-medium text-teal-900 dark:text-teal-200">
                    <div className="flex flex-col">
                      <span className="font-semibold">Rumus BMKG:</span>
                      <span className="text-slate-500 dark:text-slate-400 font-normal">Evaporasi = (Hook Awal - Hook Akhir) + Curah Hujan</span>
                      <span className="text-slate-400 text-[10px] font-normal">
                        ({hookAwal !== '-' && hookAwal !== '' ? hookAwal : '-'} - {hookAkhir !== '-' && hookAkhir !== '' ? hookAkhir : '-'}) +{' '}
                        {curahHujan !== '-' && curahHujan !== '' ? `${curahHujan} mm` : '-'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase text-teal-600 dark:text-teal-400 font-bold tracking-wider">Hasil Hitung</span>
                      <span className="text-base font-bold text-teal-800 dark:text-teal-300">
                        {evaporasi !== '-' && evaporasi !== '' ? `${evaporasi} mm` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Masukkan Nilai Evaporasi Langsung (mm)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={evaporasi}
                    onChange={handleNumberInput(setEvaporasi)}
                    onFocus={handleFocus}
                    onBlur={handleBlur(setEvaporasi)}
                    placeholder="-"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-teal-500 focus:outline-hidden font-medium"
                  />
                </div>
              )}
            </div>

            {/* Catatan Lapangan */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Catatan Pengamatan Lapangan / Kondisi Kebun Karet
              </label>
              <textarea
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur(setCatatan)}
                placeholder="-"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 shadow-xs focus:border-emerald-500 focus:outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Pinned Footer with Always-Visible Error Feedback + Actions */}
          <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 px-6 py-4 space-y-3">
            {error && (
              <div
                role="alert"
                className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-semibold text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/60 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                {idNotFoundError && editingRecord && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pl-6 pt-1">
                    <span className="text-[11px] font-normal text-rose-700 dark:text-rose-300">
                      Anda dapat menyimpan pembaruan ini sebagai baris baru ber-ID valid di Google Sheets:
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveAsNewEntry}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {loading ? 'Menyimpan...' : 'Simpan sebagai Entri Baru'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Menyimpan...' : 'Simpan Data'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
