import { useState } from 'react';
import { Download, FileSpreadsheet, Calendar, Info, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';
import { KlimatologiRecord } from '../types';
import ExcelJS from 'exceljs';

interface UnduhDataProps {
  records: KlimatologiRecord[];
  isSyncing?: boolean;
  onSyncNow?: () => void;
  dataSource?: 'sheets' | 'cache' | null;
  syncError?: string | null;
}

export default function UnduhData({ records, isSyncing = false, onSyncNow, dataSource, syncError }: UnduhDataProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Filter records based on selection & sort ascending chronologically (earliest/day 1 first)
  const getFilteredRecords = () => {
    let list = [...records];
    if (startDate || endDate) {
      list = list.filter((rec) => {
        const recDate = rec.tanggal;
        const startOk = startDate ? recDate >= startDate : true;
        const endOk = endDate ? recDate <= endDate : true;
        return startOk && endOk;
      });
    }
    return list.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  };

  const filtered = getFilteredRecords();

  const getMonthNameIndo = (recList: KlimatologiRecord[]) => {
    if (recList.length === 0) return 'Mei';
    const firstRec = recList[0];
    const d = new Date(firstRec.tanggal);
    const monthsIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return monthsIndo[d.getMonth()];
  };

  const getYearVal = (recList: KlimatologiRecord[]) => {
    if (recList.length === 0) return '2026';
    const firstRec = recList[0];
    const d = new Date(firstRec.tanggal);
    return d.getFullYear().toString();
  };

  const formatDateXlsx = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    
    const day = parseInt(parts[2], 10);
    const monthNum = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (monthNum >= 0 && monthNum < 12) {
      return `${day}-${months[monthNum]}-${year}`;
    }
    return dateStr;
  };

  const sumVal = (arr: any[], field: string) => {
    const sum = arr.reduce((acc, curr) => {
      const val = curr[field];
      return acc + (typeof val === 'number' && !isNaN(val) ? val : 0);
    }, 0);
    return Math.round(sum * 100) / 100;
  };

  const handleDownloadXLSX = async () => {
    if (filtered.length === 0) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('DATA IKLIM');

      // Make gridlines visible
      worksheet.views = [{ showGridLines: true }];

      // Define static columns widths
      worksheet.columns = [
        { key: 'tanggal', width: 15 },
        { key: 'lamaPenyinaran', width: 23 },
        { key: 'suhuMax', width: 11 },
        { key: 'suhuMin', width: 11 },
        { key: 'suhuRerata', width: 13 },
        { key: 'kelembaban', width: 18 },
        { key: 'kecepatanAngin', width: 20 },
        { key: 'curahHujan', width: 15 },
        { key: 'evaporasi', width: 20 },
      ];

      // Row 2: Header Title "DATA IKLIM"
      worksheet.mergeCells('A2:I2');
      const titleCell = worksheet.getCell('A2');
      titleCell.value = 'DATA IKLIM';
      titleCell.font = { name: 'Arial', size: 14, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(2).height = 25;

      // Row 3: Metadata Row 1
      worksheet.getRow(3).height = 18;
      worksheet.getCell('A3').value = 'Bulan';
      worksheet.getCell('A3').font = { name: 'Arial', size: 10 };
      
      const mName = getMonthNameIndo(filtered);
      worksheet.getCell('B3').value = mName;
      worksheet.getCell('B3').font = { name: 'Arial', size: 10 };

      worksheet.getCell('C3').value = 'Stasiun';
      worksheet.getCell('C3').font = { name: 'Arial', size: 10 };
      
      worksheet.mergeCells('D3:G3');
      worksheet.getCell('D3').value = ': Klimatologi PPK Sembawa';
      worksheet.getCell('D3').font = { name: 'Arial', size: 10 };

      worksheet.getCell('H3').value = 'Lintang';
      worksheet.getCell('H3').font = { name: 'Arial', size: 10 };
      
      worksheet.getCell('I3').value = ': 0,3.08\'S';
      worksheet.getCell('I3').font = { name: 'Arial', size: 10 };

      // Row 4: Metadata Row 2
      worksheet.getRow(4).height = 18;
      worksheet.getCell('A4').value = 'Tahun';
      worksheet.getCell('A4').font = { name: 'Arial', size: 10 };

      const yearVal = getYearVal(filtered);
      worksheet.getCell('B4').value = yearVal;
      worksheet.getCell('B4').font = { name: 'Arial', size: 10 };

      worksheet.getCell('C4').value = 'Provinsi';
      worksheet.getCell('C4').font = { name: 'Arial', size: 10 };

      worksheet.mergeCells('D4:G4');
      worksheet.getCell('D4').value = ': Sumatera Selatan';
      worksheet.getCell('D4').font = { name: 'Arial', size: 10 };

      worksheet.getCell('H4').value = 'Bujur';
      worksheet.getCell('H4').font = { name: 'Arial', size: 10 };

      worksheet.getCell('I4').value = ': 104,18\'T';
      worksheet.getCell('I4').font = { name: 'Arial', size: 10 };

      // Row 5: Metadata Row 3
      worksheet.getRow(5).height = 18;
      worksheet.getCell('C5').value = 'Negara';
      worksheet.getCell('C5').font = { name: 'Arial', size: 10 };

      worksheet.mergeCells('D5:G5');
      worksheet.getCell('D5').value = ': Indonesia';
      worksheet.getCell('D5').font = { name: 'Arial', size: 10 };

      worksheet.getCell('H5').value = 'Tinggi';
      worksheet.getCell('H5').font = { name: 'Arial', size: 10 };

      worksheet.getCell('I5').value = ': 10m dpl';
      worksheet.getCell('I5').font = { name: 'Arial', size: 10 };

      // Row 6: Empty spacer row
      worksheet.getRow(6).height = 15;

      // Row 7, 8, 9: Header structure
      worksheet.getRow(7).height = 25;
      worksheet.getRow(8).height = 20;
      worksheet.getRow(9).height = 20;

      // Merge Column A (Tanggal)
      worksheet.mergeCells('A7:A9');
      worksheet.getCell('A7').value = 'Tanggal';

      // Merge Column B (Lama Penyinaran)
      worksheet.mergeCells('B7:B8');
      worksheet.getCell('B7').value = 'Lama Penyinaran\nMatahari';
      worksheet.getCell('B9').value = 'J a m';

      // Merge Column C&D (Suhu Udara Header)
      worksheet.mergeCells('C7:D7');
      worksheet.getCell('C7').value = 'Suhu Udara';
      worksheet.getCell('C8').value = 'Max';
      worksheet.getCell('C9').value = '°C';
      worksheet.getCell('D8').value = 'Min';
      worksheet.getCell('D9').value = '°C';

      // Convert Column E (Rata-rata)
      worksheet.mergeCells('E7:E8');
      worksheet.getCell('E7').value = 'Rata-rata';
      worksheet.getCell('E9').value = '°C';

      // Merge Column F (Lembah Nisbi)
      worksheet.mergeCells('F7:F8');
      worksheet.getCell('F7').value = 'Rata-rata\nLembah Nisbi';
      worksheet.getCell('F9').value = '%';

      // Merge Column G (Kecepatan Angin)
      worksheet.mergeCells('G7:G8');
      worksheet.getCell('G7').value = 'Kecepatan Angin\n(0,5m)';
      worksheet.getCell('G9').value = 'Km/Jam';

      // Merge Column H (Curah Hujan)
      worksheet.mergeCells('H7:H8');
      worksheet.getCell('H7').value = 'Curah Hujan';
      worksheet.getCell('H9').value = 'mm';

      // Merge Column I (Evaporasi)
      worksheet.mergeCells('I7:I8');
      worksheet.getCell('I7').value = 'Evaporasi Panci\nkls (A)';
      worksheet.getCell('I9').value = 'mm';

      // Header style rules
      const headerFont = { name: 'Arial', size: 9, bold: true };
      const headerAlign = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;
      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      } as any;

      const headerCells = [
        'A7', 'A8', 'A9',
        'B7', 'B8', 'B9',
        'C7', 'C8', 'C9',
        'D7', 'D8', 'D9',
        'E7', 'E8', 'E9',
        'F7', 'F8', 'F9',
        'G7', 'G8', 'G9',
        'H7', 'H8', 'H9',
        'I7', 'I8', 'I9'
      ];

      headerCells.forEach((ref) => {
        const cell = worksheet.getCell(ref);
        cell.font = headerFont;
        cell.alignment = headerAlign;
        cell.border = borderStyle;
      });

      // Populate records
      let currentRowNum = 10;
      filtered.forEach((rec) => {
        const row = worksheet.getRow(currentRowNum);
        row.height = 20;

        // Column 1: Date
        const cellA = row.getCell(1);
        cellA.value = formatDateXlsx(rec.tanggal);
        cellA.alignment = { horizontal: 'center', vertical: 'middle' };

        // Column 2: Lama Penyinaran
        const cellB = row.getCell(2);
        cellB.value = (rec.lamaPenyinaran !== undefined && rec.lamaPenyinaran !== null) ? rec.lamaPenyinaran : '-';
        cellB.alignment = { horizontal: 'center', vertical: 'middle' };

        // Column 3: Suhu Max
        const cellC = row.getCell(3);
        cellC.value = rec.suhuMax ? rec.suhuMax : '-';
        cellC.alignment = { horizontal: 'center', vertical: 'middle' };

        // Column 4: Suhu Min
        const cellD = row.getCell(4);
        cellD.value = rec.suhuMin ? rec.suhuMin : '-';
        cellD.alignment = { horizontal: 'center', vertical: 'middle' };

        // Column 5: Suhu Rerata
        const cellE = row.getCell(5);
        cellE.value = rec.suhuRerata ? rec.suhuRerata : '-';
        cellE.alignment = { horizontal: 'center', vertical: 'middle' };

        // Column 6: Kelembaban
        const cellF = row.getCell(6);
        cellF.value = rec.kelembaban ? rec.kelembaban : '-';
        cellF.alignment = { horizontal: 'center', vertical: 'middle' };

        // Column 7: Kecepatan Angin
        const cellG = row.getCell(7);
        cellG.value = (rec.kecepatanAngin !== undefined && rec.kecepatanAngin !== null) ? rec.kecepatanAngin : '-';
        cellG.alignment = { horizontal: 'center', vertical: 'middle' };

        // Column 8: Curah Hujan
        const cellH = row.getCell(8);
        cellH.value = (rec.curahHujan !== undefined && rec.curahHujan !== null) ? (rec.curahHujan !== 0 ? rec.curahHujan : 0) : '-';
        cellH.alignment = { horizontal: 'center', vertical: 'middle' };

        // Column 9: Evaporasi
        const cellI = row.getCell(9);
        cellI.value = (rec.evaporasi !== undefined && rec.evaporasi !== null) ? rec.evaporasi : '-';
        cellI.alignment = { horizontal: 'center', vertical: 'middle' };

        // Style each database cell beautifully
        for (let c = 1; c <= 9; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Arial', size: 9 };
          cell.border = borderStyle;
        }

        currentRowNum++;
      });

      // Footer Summary Row ("Jumlah")
      const summaryRow = worksheet.getRow(currentRowNum);
      summaryRow.height = 22;

      const sumLabelCell = summaryRow.getCell(1);
      sumLabelCell.value = 'Jumlah';
      sumLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Calculate sums
      summaryRow.getCell(2).value = sumVal(filtered, 'lamaPenyinaran');
      summaryRow.getCell(3).value = sumVal(filtered, 'suhuMax');
      summaryRow.getCell(4).value = sumVal(filtered, 'suhuMin');
      summaryRow.getCell(5).value = sumVal(filtered, 'suhuRerata');
      summaryRow.getCell(6).value = sumVal(filtered, 'kelembaban');
      summaryRow.getCell(7).value = sumVal(filtered, 'kecepatanAngin');
      
      const sumRain = sumVal(filtered, 'curahHujan');
      summaryRow.getCell(8).value = sumRain !== 0 ? sumRain : '';
      
      summaryRow.getCell(9).value = sumVal(filtered, 'evaporasi');

      // Style summary row
      for (let c = 1; c <= 9; c++) {
        const cell = summaryRow.getCell(c);
        cell.font = { name: 'Arial', size: 9, bold: true };
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Write array buffer and trigger immediate download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const fileSuffix = startDate && endDate ? `${startDate}_ke_${endDate}` : 'semua_data';
      link.href = url;
      link.download = `data_klimatologi_sembawa_${fileSuffix}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);

      // Trigger temporary success notification
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (e) {
      console.error('Failed to export professional .xlsx table:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Syncing / Cache Status Banner */}
      {isSyncing && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Menyinkronkan data pengamatan terbaru dari Google Sheets...</span>
          </div>
        </div>
      )}

      {!isSyncing && syncError && dataSource === 'cache' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300 shadow-2xs">
          <span>
            <strong>Mode Cache Offline:</strong> Ekspor menggunakan data tersimpan di localStorage ({syncError}).
          </span>
          {onSyncNow && (
            <button
              type="button"
              onClick={onSyncNow}
              className="rounded-lg bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-200 transition cursor-pointer"
            >
              Sinkronkan Ulang
            </button>
          )}
        </div>
      )}

      {/* Title */}
      <div>
        <h2 className="font-display text-base font-bold text-slate-800 dark:text-slate-100 md:text-lg flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Ekspor & Unduh Data Klimatologi Lapangan
        </h2>
        <p className="font-sans text-xs text-slate-500 dark:text-slate-400">
          Unduh rekaman klimatologi harian stasiun Sembawa langsung dalam format spreadsheet Excel (.xlsx) resmi dengan desain layout dan pembagian kolom rapi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Export options column */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm md:col-span-1 space-y-4">
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-400">Parameter Filter</h3>
          
          {/* Select Start Date */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Select End Date */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleDownloadXLSX}
              disabled={filtered.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-600 dark:hover:bg-emerald-700 transition active:scale-95 disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800 cursor-pointer"
            >
              <Download className="h-4.5 w-4.5" />
              Unduh Spreadsheet XLSX ({filtered.length} baris)
            </button>
          </div>
        </div>

        {/* Export summary column */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm md:col-span-2 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-400">Ringkasan Berkas Ekspor</h3>
            
            {downloadSuccess && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Berkas spreadsheet .xlsx Anda berhasil disiapkan dan terunduh otomatis!</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-wider">Jumlah Baris Record</span>
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{filtered.length} hari</span>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-wider">Cakupan Tanggal</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-normal block mt-1.5">
                  {startDate || records[records.length - 1]?.tanggal || 'Sejak awal'} 
                  <span className="text-slate-400 mx-2">s/d</span> 
                  {endDate || records[0]?.tanggal || 'Terbaru'}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 p-4 text-xs text-slate-600 dark:text-slate-300 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                <Info className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                <span>Format Spreadsheet Profesional (.xlsx)</span>
              </div>
              <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-300">
                Berkas ekspor ini disusun menggunakan layout penulisan tabel resmi BMKG. Memiliki metadata klimatologi, pembagian kolom bersusun, ketebalan border presisi, serta baris kalkulasi jumlah (total) otomatis di bagian bawah.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span>Stasiun Klimatologi Puslit Karet</span>
            <ChevronRight className="h-3 w-3" />
            <span>Format Ekspor Standard BMKG</span>
          </div>
        </div>
      </div>
    </div>
  );
}
