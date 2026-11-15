import ExcelJS from 'exceljs';
import { PengamatanHarian } from '../types/klimatologi';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function exportPengamatanToExcel(records: PengamatanHarian[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Stasiun Klimatologi Puslit Karet Sembawa';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Data Klimatologi Sembawa', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  // Title Row
  sheet.mergeCells('A1:I1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'DATA HASIL PENGAMATAN KLIMATOLOGI — STASIUN PUSLIT KARET SEMBAWA';
  titleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0B132B' },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(1).height = 28;

  // Subtitle
  sheet.mergeCells('A2:I2');
  const subCell = sheet.getCell('A2');
  subCell.value = `Diekspor pada: ${new Date().toLocaleString('id-ID')} | Total: ${records.length} data pengamatan | Pengamat: Arifin, S.P`;
  subCell.font = { size: 9, italic: true, color: { argb: 'FF475569' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(2).height = 20;

  // Header Row
  const headers = [
    'Tanggal',
    'Penyinaran (Jam)',
    'Suhu Max (°C)',
    'Suhu Min (°C)',
    'Suhu Rerata (°C)',
    'Kelembaban (%)',
    'Angin (km/j)',
    'Curah Hujan (mm)',
    'Evaporasi (mm)',
  ];

  const headerRow = sheet.getRow(3);
  headerRow.values = headers;
  headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF00A86B' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  records.forEach((rec) => {
    sheet.addRow([
      rec.tanggal,
      rec.penyinaran ?? '-',
      rec.suhuMax ?? '-',
      rec.suhuMin ?? '-',
      rec.suhuRerata ?? '-',
      rec.kelembaban !== null ? `${rec.kelembaban}%` : '-',
      rec.angin ?? '-',
      rec.hujan ?? '-',
      rec.evaporasi ?? '-',
    ]);
  });

  const widths = [16, 18, 16, 16, 18, 16, 16, 18, 16];
  widths.forEach((w, idx) => {
    sheet.getColumn(idx + 1).width = w;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateTag = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `Data-Klimatologi-Puslit-Karet-Sembawa-${dateTag}.xlsx`);
}

export function exportPengamatanToCsv(records: PengamatanHarian[]): void {
  const headers = [
    'Tanggal',
    'Penyinaran_Jam',
    'Suhu_Max_C',
    'Suhu_Min_C',
    'Suhu_Rerata_C',
    'Kelembaban_Persen',
    'Angin_KMH',
    'Hujan_MM',
    'Evaporasi_MM',
  ];

  const rows = records.map((r) => [
    r.tanggal,
    r.penyinaran ?? '',
    r.suhuMax ?? '',
    r.suhuMin ?? '',
    r.suhuRerata ?? '',
    r.kelembaban ?? '',
    r.angin ?? '',
    r.hujan ?? '',
    r.evaporasi ?? '',
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const dateTag = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `Data-Klimatologi-Sembawa-${dateTag}.csv`);
}

export function exportPengamatanToJson(records: PengamatanHarian[]): void {
  const payload = JSON.stringify(
    {
      stasiun: 'Stasiun Klimatologi Puslit Karet Sembawa',
      lokasi: 'Banyuasin, Sumatera Selatan',
      waktuEkspor: new Date().toISOString(),
      jumlahData: records.length,
      data: records,
    },
    null,
    2
  );
  const blob = new Blob([payload], { type: 'application/json' });
  const dateTag = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `Backup-Klimatologi-Sembawa-${dateTag}.json`);
}

export function parsePengamatanJson(rawText: string): PengamatanHarian[] {
  const parsed = JSON.parse(rawText);
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];

  return list.map((item: any, idx: number) => ({
    id: String(item.id || `obs-import-${Date.now()}-${idx}`),
    tanggal: String(item.tanggal || new Date().toISOString().slice(0, 10)),
    penyinaran: item.penyinaran !== null && item.penyinaran !== undefined ? Number(item.penyinaran) : null,
    suhuMax: item.suhuMax !== null && item.suhuMax !== undefined ? Number(item.suhuMax) : null,
    suhuMin: item.suhuMin !== null && item.suhuMin !== undefined ? Number(item.suhuMin) : null,
    suhuRerata: item.suhuRerata !== null && item.suhuRerata !== undefined ? Number(item.suhuRerata) : null,
    kelembaban: item.kelembaban !== null && item.kelembaban !== undefined ? Number(item.kelembaban) : null,
    angin: item.angin !== null && item.angin !== undefined ? Number(item.angin) : null,
    hujan: item.hujan !== null && item.hujan !== undefined ? Number(item.hujan) : null,
    evaporasi: item.evaporasi !== null && item.evaporasi !== undefined ? Number(item.evaporasi) : null,
    catatan: item.catatan ? String(item.catatan) : '',
    pengamat: item.pengamat ? String(item.pengamat) : 'Arifin, S.P',
  }));
}
