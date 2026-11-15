import { useState, useRef, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  Thermometer, 
  CloudRain, 
  Sun, 
  Droplets, 
  Wind, 
  TrendingUp, 
  Calendar, 
  Search, 
  RotateCcw, 
  Download, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Code2, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Eye,
  ExternalLink,
  Copy,
  Check,
  X,
  Loader2,
  ChevronRight,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { KlimatologiRecord } from '../types';

interface GrafikProps {
  records: KlimatologiRecord[];
  isSyncing?: boolean;
  onSyncNow?: () => void;
  dataSource?: 'sheets' | 'cache' | null;
  syncError?: string | null;
}

export type BaseGrafikParam = 'suhu' | 'curahHujanEvap' | 'kelembaban' | 'angin' | 'sinarMatahari';
export type GrafikParam = BaseGrafikParam | 'hasilUnduh';

export const MENU_ITEMS_GRAFIK: {
  id: BaseGrafikParam;
  name: string;
  sub: string;
  icon: any;
  color: string;
}[] = [
  { id: 'suhu', name: 'Suhu Udara', sub: 'Max, Min, Rerata', icon: Thermometer, color: 'text-rose-500 bg-rose-50 border-rose-100' },
  { id: 'curahHujanEvap', name: 'Hujan & Evaporasi', sub: 'Keseimbangan Air', icon: CloudRain, color: 'text-indigo-500 bg-indigo-50 border-indigo-100' },
  { id: 'kelembaban', name: 'Kelembaban Nisbi', sub: 'Humidity Harian', icon: Droplets, color: 'text-sky-500 bg-sky-50 border-sky-100' },
  { id: 'angin', name: 'Kecepatan Angin', sub: 'Laju Sirkulasi', icon: Wind, color: 'text-slate-500 bg-slate-50 border-slate-100' },
  { id: 'sinarMatahari', name: 'Lama Penyinaran', sub: 'Durasi Matahari', icon: Sun, color: 'text-amber-500 bg-amber-50 border-amber-100' },
];

export default function Grafik({ records, isSyncing = false, onSyncNow, dataSource, syncError }: GrafikProps) {
  const menuItems = MENU_ITEMS_GRAFIK;
  const [activeParam, setActiveParam] = useState<GrafikParam>('suhu');
  const [selectedExportParam, setSelectedExportParam] = useState<BaseGrafikParam>('suhu');
  const [exportCardTab, setExportCardTab] = useState<'grafik' | 'csv'>('grafik');
  
  // Date filter state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');
  const [filterError, setFilterError] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Ref to chart container for PNG and SVG rendering
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  // Ref to the official export sheet on the card for high-resolution html2canvas snapshot
  const exportSheetRef = useRef<HTMLDivElement>(null);
  // Ref to the standard rendered analysis card for direct DOM export
  const standardCardRef = useRef<HTMLDivElement>(null);

  // Loading indicator for export buttons
  const [isExporting, setIsExporting] = useState<'png' | 'svg' | null>(null);

  // Modal preview state ("Hasil Unduh Grafik")
  const [exportModal, setExportModal] = useState<{
    isOpen: boolean;
    format: 'png' | 'svg' | 'csv';
    previewUrl: string | null;
    blob: Blob | null;
    filename: string;
    title: string;
    period: string;
    count: number;
    csvHeaders?: string[];
    csvPreviewRows?: string[][];
  }>({
    isOpen: false,
    format: 'png',
    previewUrl: null,
    blob: null,
    filename: '',
    title: '',
    period: '',
    count: 0,
    csvHeaders: [],
    csvPreviewRows: []
  });
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Filter records chronologically (oldest to newest for proper left-to-right chart time axis)
  const filteredRecords = useMemo(() => {
    let list = [...records];
    if (appliedStartDate || appliedEndDate) {
      list = list.filter((rec) => {
        const d = rec.tanggal;
        if (!d) return false;
        const startOk = appliedStartDate ? d >= appliedStartDate : true;
        const endOk = appliedEndDate ? d <= appliedEndDate : true;
        return startOk && endOk;
      });
    }
    return list.sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
  }, [records, appliedStartDate, appliedEndDate]);

  // Format data for chart (convert '-' or missing values to null so Recharts leaves them blank)
  const chartData = useMemo(() => {
    return filteredRecords.map((rec) => ({
      ...rec,
      suhuMax: rec.suhuMax === '-' || rec.suhuMax === null || rec.suhuMax === undefined ? null : Number(rec.suhuMax),
      suhuMin: rec.suhuMin === '-' || rec.suhuMin === null || rec.suhuMin === undefined ? null : Number(rec.suhuMin),
      suhuRerata: rec.suhuRerata === '-' || rec.suhuRerata === null || rec.suhuRerata === undefined ? null : Number(rec.suhuRerata),
      curahHujan: rec.curahHujan === '-' || rec.curahHujan === null || rec.curahHujan === undefined ? null : Number(rec.curahHujan),
      evaporasi: rec.evaporasi === '-' || rec.evaporasi === null || rec.evaporasi === undefined ? null : Number(rec.evaporasi),
      kelembaban: rec.kelembaban === '-' || rec.kelembaban === null || rec.kelembaban === undefined ? null : Number(rec.kelembaban),
      kecepatanAngin: rec.kecepatanAngin === '-' || rec.kecepatanAngin === null || rec.kecepatanAngin === undefined ? null : Number(rec.kecepatanAngin),
      lamaPenyinaran: rec.lamaPenyinaran === '-' || rec.lamaPenyinaran === null || rec.lamaPenyinaran === undefined ? null : Number(rec.lamaPenyinaran),
    }));
  }, [filteredRecords]);

  // Handle Search click
  const handleSearch = () => {
    setFilterError(null);
    if (startDate && endDate && startDate > endDate) {
      setFilterError('Tanggal awal tidak boleh lebih besar dari tanggal akhir.');
      return;
    }
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  // Handle Reset click
  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setFilterError(null);
  };

  // Quick preset filter
  const handleQuickPreset = (preset: '30days' | 'thisMonth' | 'all') => {
    setFilterError(null);
    if (preset === 'all') {
      handleReset();
      return;
    }

    if (records.length === 0) return;

    // Get the latest available date from data or current date
    const sortedDates = [...records].map(r => r.tanggal).filter(Boolean).sort();
    const latestDateStr = sortedDates[sortedDates.length - 1] || new Date().toISOString().split('T')[0];
    const latestDate = new Date(latestDateStr);

    if (preset === '30days') {
      const past30 = new Date(latestDate);
      past30.setDate(past30.getDate() - 30);
      const startStr = past30.toISOString().split('T')[0];
      setStartDate(startStr);
      setEndDate(latestDateStr);
      setAppliedStartDate(startStr);
      setAppliedEndDate(latestDateStr);
    } else if (preset === 'thisMonth') {
      const year = latestDate.getFullYear();
      const month = String(latestDate.getMonth() + 1).padStart(2, '0');
      const startStr = `${year}-${month}-01`;
      setStartDate(startStr);
      setEndDate(latestDateStr);
      setAppliedStartDate(startStr);
      setAppliedEndDate(latestDateStr);
    }
  };

  // Notification helper
  const showNotice = (msg: string) => {
    setDownloadNotice(msg);
    setTimeout(() => {
      setDownloadNotice(null);
    }, 4000);
  };

  // Date range label for export filenames
  const getDateRangeLabel = () => {
    if (appliedStartDate && appliedEndDate) return `${appliedStartDate}_sd_${appliedEndDate}`;
    if (appliedStartDate) return `sejak_${appliedStartDate}`;
    if (appliedEndDate) return `sd_${appliedEndDate}`;
    return 'semua_data';
  };

  // 1. Export CSV (Hanya menampilkan kolom parameter yang dipilih)
  const handleDownloadCSV = () => {
    if (filteredRecords.length === 0) {
      alert('Tidak ada data pengamatan dalam rentang tanggal yang dipilih.');
      return;
    }

    const targetParam = activeParam === 'hasilUnduh' ? selectedExportParam : activeParam;
    const currentItem = menuItems.find((m) => m.id === targetParam);
    const paramName = currentItem?.name || targetParam;

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null || val === '') return '-';
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    let headers: string[] = [];
    let extractRow: (r: KlimatologiRecord) => (string | number | undefined | null)[] = () => [];

    switch (targetParam) {
      case 'suhu':
        headers = [
          'Tanggal',
          'Suhu Maksimum (°C)',
          'Suhu Minimum (°C)',
          'Suhu Rerata (°C)',
          'Catatan'
        ];
        extractRow = (r) => [
          r.tanggal,
          r.suhuMax,
          r.suhuMin,
          r.suhuRerata,
          r.catatan
        ];
        break;

      case 'curahHujanEvap':
        headers = [
          'Tanggal',
          'Curah Hujan (mm)',
          'Evaporasi Panci (mm)',
          'Catatan'
        ];
        extractRow = (r) => [
          r.tanggal,
          r.curahHujan,
          r.evaporasi,
          r.catatan
        ];
        break;

      case 'kelembaban':
        headers = [
          'Tanggal',
          'Kelembaban Nisbi (%)',
          'Catatan'
        ];
        extractRow = (r) => [
          r.tanggal,
          r.kelembaban,
          r.catatan
        ];
        break;

      case 'angin':
        headers = [
          'Tanggal',
          'Kecepatan Angin (km/jam)',
          'Catatan'
        ];
        extractRow = (r) => [
          r.tanggal,
          r.kecepatanAngin,
          r.catatan
        ];
        break;

      case 'sinarMatahari':
        headers = [
          'Tanggal',
          'Lama Penyinaran (jam)',
          'Catatan'
        ];
        extractRow = (r) => [
          r.tanggal,
          r.lamaPenyinaran,
          r.catatan
        ];
        break;
    }

    const rows = filteredRecords.map((r) => {
      return extractRow(r).map(escapeCsv).join(',');
    });

    // Add UTF-8 BOM so Excel opens indonesian characters properly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `klimatologi_${targetParam}_${getDateRangeLabel()}.csv`;
    const previewUrl = URL.createObjectURL(blob);

    safeDownloadBlob(blob, filename);

    // Tampilkan juga modal "Hasil Unduh Grafik" untuk CSV dengan pratinjau data tabel jika bukan di halaman Hasil Unduh
    const sampleRows = filteredRecords.slice(0, 15).map((r) => 
      extractRow(r).map((v) => (v !== undefined && v !== null && v !== '' ? String(v) : '-'))
    );

    setExportModal({
      isOpen: false,
      format: 'csv',
      previewUrl: previewUrl,
      blob: blob,
      filename: filename,
      title: `Data CSV ${paramName}`,
      period: appliedStartDate || appliedEndDate 
        ? `${appliedStartDate || 'Awal'} s/d ${appliedEndDate || 'Akhir'}`
        : 'Semua Periode Pengamatan',
      count: filteredRecords.length,
      csvHeaders: headers,
      csvPreviewRows: sampleRows
    });

    showNotice(`Berhasil mengunduh CSV (${paramName} - ${filteredRecords.length} baris)`);
  };

  // Safe file downloader with 60-second revoke timeout (avoids premature browser cancel in iframe)
  const safeDownloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = async () => {
    if (!exportModal.blob) return;
    try {
      if (exportModal.format === 'csv') {
        const text = await exportModal.blob.text();
        await navigator.clipboard.writeText(text);
        setCopiedNotice(true);
        setTimeout(() => setCopiedNotice(false), 3000);
      } else if (navigator.clipboard && window.ClipboardItem && exportModal.format === 'png') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': exportModal.blob })
        ]);
        setCopiedNotice(true);
        setTimeout(() => setCopiedNotice(false), 3000);
      } else {
        const text = await exportModal.blob.text();
        await navigator.clipboard.writeText(text);
        setCopiedNotice(true);
        setTimeout(() => setCopiedNotice(false), 3000);
      }
    } catch (err) {
      console.warn('Clipboard write warning:', err);
      alert('Gunakan klik kanan pada pratinjau untuk menyalin secara langsung.');
    }
  };

  // Parameter legend metadata for high-fidelity export
  const getParamLegendItems = (param: BaseGrafikParam) => {
    switch (param) {
      case 'suhu':
        return [
          { label: 'Suhu Max (°C)', color: '#ef4444' },
          { label: 'Suhu Min (°C)', color: '#3b82f6' },
          { label: 'Rerata Suhu (°C)', color: '#10b981' },
        ];
      case 'curahHujanEvap':
        return [
          { label: 'Curah Hujan (mm)', color: '#6366f1' },
          { label: 'Evaporasi Panci (mm)', color: '#14b8a6' },
        ];
      case 'kelembaban':
        return [
          { label: 'Kelembaban Nisbi (%)', color: '#0ea5e9' },
        ];
      case 'angin':
        return [
          { label: 'Kecepatan Angin (km/jam)', color: '#64748b' },
        ];
      case 'sinarMatahari':
        return [
          { label: 'Lama Penyinaran (jam)', color: '#f59e0b' },
        ];
      default:
        return [];
    }
  };

  // Helper: Find the real Recharts chart SVG element (strictly excluding legend icons)
  const findMainChartSvg = (container: HTMLElement): SVGSVGElement | null => {
    // 1. First priority: direct child of .recharts-wrapper that is not inside legend
    const rechartsWrapper = container.querySelector('.recharts-wrapper');
    if (rechartsWrapper) {
      const svgs = Array.from(rechartsWrapper.querySelectorAll('svg')) as SVGSVGElement[];
      const chartSvg = svgs.find(s => {
        if (s.closest('.recharts-legend-wrapper')) return false;
        const hasChartLayers = s.querySelector('.recharts-cartesian-grid, .recharts-cartesian-axis, .recharts-line, .recharts-bar, .recharts-area, .recharts-curve');
        if (hasChartLayers) return true;
        const bbox = s.getBoundingClientRect();
        return bbox.width > 200 && bbox.height > 100;
      });
      if (chartSvg) return chartSvg;
    }

    // 2. Search container for any SVG with chart components
    const allSvgs = Array.from(container.querySelectorAll('svg')) as SVGSVGElement[];
    const validSvg = allSvgs.find(s => {
      if (s.closest('.recharts-legend-wrapper')) return false;
      const hasChartLayers = s.querySelector('.recharts-cartesian-grid, .recharts-cartesian-axis, .recharts-line, .recharts-bar, .recharts-area, .recharts-curve');
      if (hasChartLayers) return true;
      const bbox = s.getBoundingClientRect();
      return bbox.width > 200 && bbox.height > 100;
    });

    return validSvg || allSvgs.find(s => !s.closest('.recharts-legend-wrapper')) || null;
  };

  // Helper: Constructs a complete, self-contained SVG with header, badge, full Recharts vector body, and legend
  const createFullCompositeSVG = (): { fullSvgString: string; width: number; height: number; paramName: string; periodLabel: string } | null => {
    if (!chartWrapperRef.current) return null;
    const svgEl = findMainChartSvg(chartWrapperRef.current);
    if (!svgEl) return null;

    const rect = svgEl.getBoundingClientRect();
    const chartW = Math.max(Math.round(rect.width), 800);
    const chartH = Math.max(Math.round(rect.height), 360);

    const headerH = 92;
    const legendH = 45;
    const footerH = 35;
    const totalW = chartW + 40; // 20px padding left and right
    const totalH = chartH + headerH + legendH + footerH;

    const targetParam: BaseGrafikParam = activeParam === 'hasilUnduh' ? selectedExportParam : activeParam;
    const paramName = menuItems.find(m => m.id === targetParam)?.name || targetParam;
    const periodLabel = appliedStartDate || appliedEndDate 
      ? `${appliedStartDate || 'Awal'} s/d ${appliedEndDate || 'Akhir'}`
      : 'Semua Periode Pengamatan';
    const legendItems = getParamLegendItems(targetParam);

    // Clone svgEl to preserve all defs, clipPaths, lines, and text
    const cloned = svgEl.cloneNode(true) as SVGElement;
    cloned.setAttribute('x', '20');
    cloned.setAttribute('y', `${headerH + 10}`);
    cloned.setAttribute('width', `${chartW}`);
    cloned.setAttribute('height', `${chartH}`);
    
    // Safety check: ensure viewBox is valid and NOT the 32x32 legend icon box
    const currentViewBox = cloned.getAttribute('viewBox');
    if (!currentViewBox || currentViewBox.includes('32 32') || currentViewBox.includes('14 14')) {
      cloned.setAttribute('viewBox', `0 0 ${chartW} ${chartH}`);
    }

    const serializer = new XMLSerializer();
    const chartContentString = serializer.serializeToString(cloned);

    // Build clean vector legend SVG
    let legendSvg = '';
    if (legendItems && legendItems.length > 0) {
      let currentX = 25;
      const legendY = headerH + chartH + 20;
      legendSvg = `<g class="export-legend" transform="translate(0, ${legendY})">`;
      for (const item of legendItems) {
        legendSvg += `
          <circle cx="${currentX}" cy="0" r="5" fill="${item.color}" />
          <text x="${currentX + 12}" y="4" fill="#334155" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12px" font-weight="600">${item.label}</text>
        `;
        currentX += (item.label.length * 8) + 40;
      }
      legendSvg += '</g>';
    }

    const currentDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // Full composite SVG
    let fullSvg = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" version="1.1">
  <defs>
    <style>
      text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
      .recharts-text { fill: #64748b; font-size: 11px; }
      .recharts-cartesian-axis-tick-value { fill: #64748b; font-size: 11px; }
      .recharts-cartesian-axis-line { stroke: #cbd5e1; }
      .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line { stroke: #f1f5f9; }
    </style>
  </defs>

  <!-- Solid white background -->
  <rect width="${totalW}" height="${totalH}" fill="#ffffff" />

  <!-- Header Section -->
  <g class="export-header" transform="translate(25, 20)">
    <!-- Badge -->
    <rect x="0" y="0" width="225" height="22" rx="6" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1" />
    <text x="10" y="15" fill="#065f46" font-size="10px" font-weight="bold" letter-spacing="0.5px">STASIUN KLIMATOLOGI PPK</text>
    <text x="165" y="15" fill="#94a3b8" font-size="10px" font-weight="bold">SEMBAWA</text>

    <!-- Title -->
    <text x="0" y="44" fill="#0f172a" font-size="17px" font-weight="bold">Grafik ${paramName}</text>

    <!-- Subtitle / Period -->
    <text x="0" y="62" fill="#64748b" font-size="12px" font-weight="500">Periode Observasi: ${periodLabel} (${filteredRecords.length} Hari Pengamatan)</text>

    <!-- Header divider line -->
    <line x1="0" y1="74" x2="${totalW - 50}" y2="74" stroke="#f1f5f9" stroke-width="1.5" />
  </g>

  <!-- Recharts Chart Body as Nested SVG (Preserves coordinates & clipPaths) -->
  ${chartContentString}

  <!-- Legend Section -->
  ${legendSvg}

  <!-- Footer Section -->
  <g class="export-footer" transform="translate(25, ${totalH - 15})">
    <line x1="0" y1="-12" x2="${totalW - 50}" y2="-12" stroke="#f1f5f9" stroke-width="1" />
    <text x="0" y="2" fill="#94a3b8" font-size="10px">Dicetak dari Portal Informasi Stasiun Klimatologi PPK Sembawa • ${currentDateStr}</text>
  </g>
</svg>
    `.trim();

    // XML character sanitization
    fullSvg = fullSvg.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
    // Strip or replace any modern CSS color functions (like oklch) to avoid parse errors in canvas
    fullSvg = fullSvg.replace(/oklch\([^)]+\)/gi, '#475569');

    return { fullSvgString: fullSvg, width: totalW, height: totalH, paramName, periodLabel };
  };

  // 2. Export High-Resolution PNG (WYSIWYG html2canvas on card or Pure Vector SVG to Canvas)
  const handleDownloadPNG = async () => {
    try {
      setIsExporting('png');
      const targetParam: BaseGrafikParam = activeParam === 'hasilUnduh' ? selectedExportParam : activeParam;
      const paramName = menuItems.find(m => m.id === targetParam)?.name || targetParam;
      const filename = `grafik_${targetParam}_${getDateRangeLabel()}.png`;

      // Priority 1: Ekspor elemen card grafik yang SUDAH DIRENDER langsung di halaman (WYSIWYG 1:1)
      const targetCardEl = activeParam === 'hasilUnduh'
        ? (exportSheetRef.current || standardCardRef.current || chartWrapperRef.current)
        : (standardCardRef.current || chartWrapperRef.current);

      if (targetCardEl) {
        try {
          const canvas = await html2canvas(targetCardEl, {
            scale: 2, // 2x resolusi tinggi agar teks, sumbu, kurva dan legenda sangat tajam
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            ignoreElements: (element) => {
              return !!(element.classList && element.classList.contains('no-export'));
            }
          });

          canvas.toBlob((blob) => {
            setIsExporting(null);
            if (!blob) {
              handleDownloadSVG();
              return;
            }
            const previewUrl = URL.createObjectURL(blob);
            safeDownloadBlob(blob, filename);
            setExportModal({
              isOpen: false,
              format: 'png',
              previewUrl: previewUrl,
              blob: blob,
              filename: filename,
              title: `Grafik ${paramName} (PNG)`,
              period: appliedStartDate || appliedEndDate ? `${appliedStartDate || 'Awal'} s/d ${appliedEndDate || 'Akhir'}` : 'Semua Periode',
              count: filteredRecords.length
            });
            showNotice(`Berhasil mengunduh PNG resolusi tinggi (${filename})`);
          }, 'image/png');
          return;
        } catch (h2cErr) {
          console.warn('html2canvas snapshot warning, fallback to composite SVG:', h2cErr);
        }
      }

      // Priority 2: Full Vector SVG to Canvas
      const prep = createFullCompositeSVG();
      if (!prep) {
        setIsExporting(null);
        alert('Grafik belum siap atau tidak ditemukan untuk diunduh.');
        return;
      }

      const svgBlob = new Blob([prep.fullSvgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();

      const openModalWithAsset = (blob: Blob, url: string, format: 'png' | 'svg') => {
        setIsExporting(null);
        const activeFilename = format === 'png' ? filename : filename.replace('.png', '.svg');
        safeDownloadBlob(blob, activeFilename);
        setExportModal({
          isOpen: false,
          format: format,
          previewUrl: url,
          blob: blob,
          filename: activeFilename,
          title: `Grafik ${prep.paramName} (${format.toUpperCase()})`,
          period: prep.periodLabel,
          count: filteredRecords.length
        });
        showNotice(`Berhasil membuat file grafik ${format.toUpperCase()} (${prep.paramName})`);
      };

      img.onload = () => {
        try {
          const scale = 2;
          const canvas = document.createElement('canvas');
          canvas.width = prep.width * scale;
          canvas.height = prep.height * scale;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            openModalWithAsset(svgBlob, svgUrl, 'svg');
            return;
          }

          ctx.scale(scale, scale);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, prep.width, prep.height);
          ctx.drawImage(img, 0, 0, prep.width, prep.height);

          canvas.toBlob((blob) => {
            URL.revokeObjectURL(svgUrl);
            if (!blob) {
              openModalWithAsset(svgBlob, URL.createObjectURL(svgBlob), 'svg');
              return;
            }
            const previewUrl = URL.createObjectURL(blob);
            openModalWithAsset(blob, previewUrl, 'png');
          }, 'image/png');
        } catch (canvasErr) {
          console.warn('Canvas rasterization issue, fallback to vector SVG:', canvasErr);
          openModalWithAsset(svgBlob, svgUrl, 'svg');
        }
      };

      img.onerror = (err) => {
        console.warn('Image rasterization error, using vector SVG directly:', err);
        openModalWithAsset(svgBlob, svgUrl, 'svg');
      };

      img.src = svgUrl;

    } catch (err: any) {
      console.error('PNG export error:', err);
      setIsExporting(null);
      handleDownloadSVG();
    }
  };

  // 3. Export Clean Vector SVG
  const handleDownloadSVG = () => {
    try {
      setIsExporting('svg');
      const prep = createFullCompositeSVG();
      if (!prep) {
        setIsExporting(null);
        alert('Grafik belum siap atau tidak ditemukan.');
        return;
      }

      const targetParam: BaseGrafikParam = activeParam === 'hasilUnduh' ? selectedExportParam : activeParam;
      const fullSvg = '<?xml version="1.0" encoding="UTF-8"?>\n' + prep.fullSvgString;
      const blob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
      const filename = `grafik_${targetParam}_${getDateRangeLabel()}.svg`;
      const previewUrl = URL.createObjectURL(blob);

      // Trigger safe download
      safeDownloadBlob(blob, filename);

      setIsExporting(null);
      setExportModal(prev => ({
        ...prev,
        format: 'svg',
        previewUrl: previewUrl,
        blob: blob,
        filename: filename,
        title: `Grafik ${prep.paramName} (Vektor SVG)`,
        period: prep.periodLabel,
        count: filteredRecords.length
      }));

      showNotice(`Berhasil mengunduh SVG (${filename})`);
    } catch (err: any) {
      console.error('SVG export error:', err);
      setIsExporting(null);
      alert('Terjadi kesalahan saat memproses SVG: ' + (err?.message || 'Error'));
    }
  };

  // 4. Buka / Tampilkan Panel "Hasil Unduh Grafik"
  const handleOpenHasilUnduh = () => {
    setActiveParam('hasilUnduh');
    showNotice('Menampilkan Hasil Unduh Grafik (Real-Time) pada Card Grafik');
  };

  // Compute parameter statistics for current filtered view
  const paramStats = useMemo(() => {
    if (chartData.length === 0) return null;
    const targetParam: BaseGrafikParam = activeParam === 'hasilUnduh' ? selectedExportParam : activeParam;

    if (targetParam === 'suhu') {
      const validMax = chartData.map(d => d.suhuMax).filter((v): v is number => typeof v === 'number' && !isNaN(v));
      const validMin = chartData.map(d => d.suhuMin).filter((v): v is number => typeof v === 'number' && !isNaN(v));
      const maxVal = validMax.length > 0 ? Math.max(...validMax) : null;
      const minVal = validMin.length > 0 ? Math.min(...validMin) : null;
      return {
        label1: 'Suhu Tertinggi',
        val1: maxVal !== null ? `${maxVal}°C` : '-',
        label2: 'Suhu Terendah',
        val2: minVal !== null ? `${minVal}°C` : '-',
        label3: 'Data Observasi',
        val3: `${chartData.length} hari`
      };
    } else if (targetParam === 'curahHujanEvap') {
      const rainVals = chartData.map(d => d.curahHujan).filter((v): v is number => typeof v === 'number' && !isNaN(v));
      const totalRain = rainVals.reduce((a, b) => a + b, 0);
      const rainDays = rainVals.filter(v => v > 0).length;
      return {
        label1: 'Total Curah Hujan',
        val1: `${Math.round(totalRain * 10) / 10} mm`,
        label2: 'Hari Terjadi Hujan',
        val2: `${rainDays} hari`,
        label3: 'Data Observasi',
        val3: `${chartData.length} hari`
      };
    } else if (targetParam === 'kelembaban') {
      const rhVals = chartData.map(d => d.kelembaban).filter((v): v is number => typeof v === 'number' && !isNaN(v));
      const avgRH = rhVals.length > 0 ? Math.round(rhVals.reduce((a, b) => a + b, 0) / rhVals.length) : null;
      return {
        label1: 'Rerata Kelembaban',
        val1: avgRH !== null ? `${avgRH}%` : '-',
        label2: 'RH Tertinggi',
        val2: rhVals.length > 0 ? `${Math.max(...rhVals)}%` : '-',
        label3: 'Data Observasi',
        val3: `${chartData.length} hari`
      };
    } else if (targetParam === 'angin') {
      const windVals = chartData.map(d => d.kecepatanAngin).filter((v): v is number => typeof v === 'number' && !isNaN(v));
      const avgWind = windVals.length > 0 ? (windVals.reduce((a, b) => a + b, 0) / windVals.length).toFixed(1) : null;
      const maxWind = windVals.length > 0 ? Math.max(...windVals) : null;
      return {
        label1: 'Rerata Kecepatan',
        val1: avgWind !== null ? `${avgWind} km/j` : '-',
        label2: 'Angin Tertinggi',
        val2: maxWind !== null ? `${maxWind} km/j` : '-',
        label3: 'Data Observasi',
        val3: `${chartData.length} hari`
      };
    } else if (targetParam === 'sinarMatahari') {
      const sunVals = chartData.map(d => d.lamaPenyinaran).filter((v): v is number => typeof v === 'number' && !isNaN(v));
      const totalSun = sunVals.reduce((a, b) => a + b, 0);
      const avgSun = sunVals.length > 0 ? (totalSun / sunVals.length).toFixed(1) : null;
      return {
        label1: 'Total Jam Sinar',
        val1: `${Math.round(totalSun * 10) / 10} jam`,
        label2: 'Rerata Penyinaran',
        val2: avgSun !== null ? `${avgSun} jam/hari` : '-',
        label3: 'Data Observasi',
        val3: `${chartData.length} hari`
      };
    }
    return null;
  }, [chartData, activeParam, selectedExportParam]);

  const renderChart = (paramToRender: BaseGrafikParam = activeParam === 'hasilUnduh' ? selectedExportParam : activeParam) => {
    if (chartData.length === 0) {
      return (
        <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
          <Calendar className="h-10 w-10 text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700 text-sm">Tidak Ada Data Pengamatan</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Tidak ditemukan catatan observasi lapangan pada rentang tanggal yang dipilih. Silakan sesuaikan atau reset tanggal pencarian.
          </p>
          <button
            onClick={handleReset}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Tampilkan Semua Data
          </button>
        </div>
      );
    }

    switch (paramToRender) {
      case 'suhu':
        return (
          <div className="h-96 w-full bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="tanggal" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="°C" domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                  labelClassName="font-bold text-slate-800"
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line 
                  type="monotone" 
                  dataKey="suhuMax" 
                  name="Suhu Max" 
                  stroke="#ef4444" 
                  strokeWidth={2.5} 
                  dot={{ r: 3 }} 
                  activeDot={{ r: 6 }} 
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="suhuMin" 
                  name="Suhu Min" 
                  stroke="#3b82f6" 
                  strokeWidth={2.5} 
                  dot={{ r: 3 }} 
                  activeDot={{ r: 6 }} 
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="suhuRerata" 
                  name="Rerata Suhu" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 2 }} 
                  strokeDasharray="4 4"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case 'curahHujanEvap':
        return (
          <div className="h-96 w-full bg-white p-2">
            <p className="mb-2 text-[11px] font-medium text-slate-500">
              *Menganalisis keseimbangan kelembaban air tanah perkebunan karet (Curah Hujan vs Evaporasi Panci Kelas A)
            </p>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="tanggal" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" mm" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  labelClassName="font-bold text-slate-800"
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line 
                  type="monotone" 
                  dataKey="curahHujan" 
                  name="Curah Hujan (mm)" 
                  stroke="#6366f1" 
                  strokeWidth={2.5} 
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="evaporasi" 
                  name="Evaporasi Panci (mm)" 
                  stroke="#14b8a6" 
                  strokeWidth={2.5} 
                  dot={{ r: 3 }} 
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case 'kelembaban':
        return (
          <div className="h-96 w-full bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHumidity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="tanggal" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="%" domain={[30, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  labelClassName="font-bold text-slate-800"
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area 
                  type="monotone" 
                  dataKey="kelembaban" 
                  name="Kelembaban Nisbi (%)" 
                  stroke="#0ea5e9" 
                  fillOpacity={1} 
                  fill="url(#colorHumidity)" 
                  strokeWidth={2.5} 
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      case 'angin':
        return (
          <div className="h-96 w-full bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="tanggal" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" km/j" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  labelClassName="font-bold text-slate-800"
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line 
                  type="monotone" 
                  dataKey="kecepatanAngin" 
                  name="Kecepatan Angin (km/jam)" 
                  stroke="#64748b" 
                  strokeWidth={2.5} 
                  dot={{ r: 3 }} 
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case 'sinarMatahari':
        return (
          <div className="h-96 w-full bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="tanggal" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" jam" domain={[0, 12]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  labelClassName="font-bold text-slate-800"
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar 
                  dataKey="lamaPenyinaran" 
                  name="Lama Penyinaran (jam)" 
                  fill="#f59e0b" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={30} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Syncing / Cache Status Banner */}
      {isSyncing && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600 shrink-0" />
            <span>Menyinkronkan data grafik terbaru dari Google Sheets...</span>
          </div>
        </div>
      )}

      {!isSyncing && syncError && dataSource === 'cache' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 shadow-2xs">
          <span>
            <strong>Mode Cache Offline:</strong> Grafik menggunakan data tersimpan di localStorage ({syncError}).
          </span>
          {onSyncNow && (
            <button
              type="button"
              onClick={onSyncNow}
              className="rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-200 transition cursor-pointer"
            >
              Sinkronkan Ulang
            </button>
          )}
        </div>
      )}

      {/* Title & Page Header */}
      <div>
        <h2 className="font-display text-base font-bold text-slate-800 dark:text-slate-100 md:text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Tren & Analisis Grafis Parameter Klimatologi
        </h2>
        <p className="font-sans text-xs text-slate-500 dark:text-slate-400">
          Visualisasi data interaktif berdasarkan observasi lapangan stasiun klimatologi Pusat Penelitian Karet
        </p>
      </div>

      {/* Download Notification Toast Banner */}
      {downloadNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* Date Range Filter & Download Control Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs md:p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          
          {/* Left / Top: Date Filters & Search Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Filter className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Rentang:</span>
            </div>

            {/* Dari Tanggal */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="grafik-start-date" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Dari:
              </label>
              <div className="relative">
                <input
                  id="grafik-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-800"
                />
              </div>
            </div>

            {/* Sampai Tanggal */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="grafik-end-date" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Sampai:
              </label>
              <div className="relative">
                <input
                  id="grafik-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-800"
                />
              </div>
            </div>

            {/* Tombol Cari Data */}
            <button
              id="btn-cari-data-grafik"
              onClick={handleSearch}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Cari data</span>
            </button>

            {/* Tombol Reset */}
            {(appliedStartDate || appliedEndDate || startDate || endDate) && (
              <button
                id="btn-reset-data-grafik"
                onClick={handleReset}
                title="Reset Rentang Tanggal"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}

            {/* Quick Presets */}
            <div className="hidden sm:flex items-center gap-1 pl-1 text-[11px] text-slate-400 dark:text-slate-500">
              <span>Preset:</span>
              <button 
                onClick={() => handleQuickPreset('30days')} 
                className="rounded px-1.5 py-0.5 font-medium hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition"
              >
                30 Hari
              </button>
              <span>•</span>
              <button 
                onClick={() => handleQuickPreset('thisMonth')} 
                className="rounded px-1.5 py-0.5 font-medium hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition"
              >
                Bulan Ini
              </button>
            </div>
          </div>

          {/* Right / Next: Tombol Unduh Data (Urutan: PNG, SVG, CSV) */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 xl:border-t-0 xl:pt-0 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 mr-1 flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Unduh data:
            </span>

            {/* 1. Unduh PNG */}
            <button
              id="btn-unduh-png-grafik"
              onClick={handleDownloadPNG}
              disabled={isExporting !== null}
              title="Unduh visual grafik saat ini dalam format gambar PNG resolusi tinggi"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-800 disabled:opacity-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
            >
              {isExporting === 'png' ? (
                <Loader2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>{isExporting === 'png' ? 'Memproses...' : 'PNG'}</span>
            </button>

            {/* 2. Unduh SVG */}
            <button
              id="btn-unduh-svg-grafik"
              onClick={handleDownloadSVG}
              disabled={isExporting !== null}
              title="Unduh grafik dalam format vektor SVG"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-amber-400 hover:bg-amber-50/50 hover:text-amber-800 disabled:opacity-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-300"
            >
              {isExporting === 'svg' ? (
                <Loader2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
              ) : (
                <Code2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              )}
              <span>{isExporting === 'svg' ? 'Memproses...' : 'SVG'}</span>
            </button>

            {/* 3. Unduh CSV */}
            <button
              id="btn-unduh-csv-grafik"
              onClick={handleDownloadCSV}
              title={`Unduh data CSV khusus parameter ${menuItems.find(m => m.id === activeParam)?.name || activeParam} (${filteredRecords.length} baris)`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-800 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>CSV</span>
            </button>

            {/* Tombol Hasil Unduh Grafik (Pratinjau) */}
            <button
              id="btn-lihat-hasil-unduh"
              onClick={handleOpenHasilUnduh}
              title="Buka pratinjau hasil unduh grafik (PNG, SVG, atau CSV)"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs transition hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
            >
              <Eye className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Hasil Unduh Grafik</span>
              {exportModal.previewUrl && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
              )}
            </button>
          </div>
        </div>

        {/* Validation error display */}
        {filterError && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-rose-600 animate-in fade-in">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{filterError}</span>
          </div>
        )}

        {/* Filter Summary Status */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {appliedStartDate || appliedEndDate ? (
                <>
                  Rentang aktif: <span className="font-mono text-emerald-700 dark:text-emerald-400">{appliedStartDate || 'Awal'}</span> s/d{' '}
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">{appliedEndDate || 'Akhir'}</span>
                </>
              ) : (
                'Menampilkan semua observasi pengamatan'
              )}
            </span>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {filteredRecords.length} Hari Observasi
            </span>
          </div>

          {/* Mini Stats Indicators */}
          {paramStats && (
            <div className="flex items-center gap-3 font-medium">
              <span>{paramStats.label1}: <strong className="text-slate-700 dark:text-slate-200">{paramStats.val1}</strong></span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>{paramStats.label2}: <strong className="text-slate-700 dark:text-slate-200">{paramStats.val2}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Main Analysis Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Param selectors on left */}
        <div className="flex flex-col gap-2 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">Pilih Parameter</p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeParam === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveParam(item.id);
                  setSelectedExportParam(item.id);
                }}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-emerald-700 border-slate-900 dark:border-emerald-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className={`rounded-lg p-2 border ${item.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold">{item.name}</p>
                  <p className={`text-[9px] ${isSelected ? 'text-slate-300 dark:text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>{item.sub}</p>
                </div>
              </button>
            );
          })}

          {/* Menu Navigasi Hasil Unduh Grafik */}
          <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="menu-btn-hasil-unduh-grafik"
              onClick={() => {
                setActiveParam('hasilUnduh');
                showNotice('Menampilkan Kartu Hasil Unduh Grafik Real-Time');
              }}
              title="Buka hasil unduh grafik berdasarkan data real-time pada card grafik"
              className={`group flex w-full items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                activeParam === 'hasilUnduh'
                  ? 'border-emerald-600 bg-emerald-700 text-white shadow-md ring-2 ring-emerald-300'
                  : 'border-emerald-200/90 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-slate-700 dark:text-slate-200 hover:border-emerald-400 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`rounded-lg p-2 transition ${
                  activeParam === 'hasilUnduh' 
                    ? 'bg-emerald-800 text-white shadow-inner' 
                    : 'bg-emerald-600 text-white shadow-xs group-hover:scale-105'
                }`}>
                  <Eye className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs font-bold ${activeParam === 'hasilUnduh' ? 'text-white' : 'text-emerald-950'}`}>
                      Hasil Unduh Grafik
                    </p>
                    <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                      activeParam === 'hasilUnduh' 
                        ? 'bg-emerald-900/70 text-emerald-100 border border-emerald-500' 
                        : 'bg-emerald-200 text-emerald-800'
                    }`}>
                      Real-Time
                    </span>
                  </div>
                  <p className={`text-[10px] font-medium ${activeParam === 'hasilUnduh' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                    Tampil Langsung di Card
                  </p>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 transition ${
                activeParam === 'hasilUnduh' ? 'text-emerald-200 translate-x-1' : 'text-emerald-600 group-hover:translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        {/* Display chart container on right */}
        {activeParam === 'hasilUnduh' ? (
          /* =========================================================================
             KARTU HASIL UNDUH GRAFIK (REAL-TIME PADA CARD GRAFIK)
             ========================================================================= */
          <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm md:p-6 lg:col-span-3">
            {/* Header Kartu Hasil Unduh */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase flex items-center gap-1.5 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
                    Hasil Unduh Grafik (Real-Time)
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">Stasiun Klimatologi PPK Sembawa</span>
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <span>Hasil Siap Unduh: {menuItems.find(m => m.id === selectedExportParam)?.name}</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Visual dan data di bawah ini dihasilkan secara real-time berdasarkan filter observasi aktif ({filteredRecords.length} hari pengamatan).
                </p>
              </div>

              {/* Action Buttons: Unduh Langsung */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-card-unduh-png"
                  onClick={handleDownloadPNG}
                  disabled={isExporting !== null}
                  title="Unduh gambar PNG dari card ini"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                >
                  {isExporting === 'png' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  <span>Unduh PNG</span>
                </button>

                <button
                  id="btn-card-unduh-svg"
                  onClick={handleDownloadSVG}
                  disabled={isExporting !== null}
                  title="Unduh vektor SVG dari card ini"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-600 active:scale-95 disabled:opacity-50"
                >
                  {isExporting === 'svg' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Code2 className="h-3.5 w-3.5" />}
                  <span>Unduh SVG</span>
                </button>

                <button
                  id="btn-card-unduh-csv"
                  onClick={handleDownloadCSV}
                  title={`Unduh file CSV parameter ${menuItems.find(m => m.id === selectedExportParam)?.name}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Unduh CSV</span>
                </button>

                <button
                  onClick={() => setActiveParam(selectedExportParam)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
                  title="Kembali ke mode grafik interaktif"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Kembali</span>
                </button>
              </div>
            </div>

            {/* Parameter Pills & Tab Switcher */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80">
              {/* Parameter Selector */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  Pilih Parameter:
                </span>
                {menuItems.map((param) => {
                  const isSelected = selectedExportParam === param.id;
                  return (
                    <button
                      key={param.id}
                      onClick={() => setSelectedExportParam(param.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-emerald-700 text-white shadow-xs ring-1 ring-emerald-800'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {param.name}
                    </button>
                  );
                })}
              </div>

              {/* Tab Mode (Grafik vs CSV) */}
              <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 shadow-2xs">
                <button
                  onClick={() => setExportCardTab('grafik')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                    exportCardTab === 'grafik'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ImageIcon className="h-3 w-3" />
                  <span>Grafik Resmi (PNG/SVG)</span>
                </button>
                <button
                  onClick={() => setExportCardTab('csv')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                    exportCardTab === 'csv'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="h-3 w-3" />
                  <span>Tabel Data CSV ({filteredRecords.length})</span>
                </button>
              </div>
            </div>

            {/* Card Content: Grafik Resmi atau Tabel CSV */}
            {exportCardTab === 'grafik' ? (
              /* Lembar Dokumen Ekspor Grafik Resmi */
              <div className="rounded-xl border border-slate-200 bg-slate-100/60 p-2 sm:p-4">
                <div 
                  ref={exportSheetRef}
                  className="w-full rounded-xl bg-white p-5 sm:p-6 shadow-sm border border-slate-200"
                >
                  {/* Kop Resmi Dokumen */}
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
                          STASIUN KLIMATOLOGI PPK SEMBAWA
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">Pusat Penelitian Karet</span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        HASIL REAL-TIME
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1.5">
                      Grafik Analisis {menuItems.find(m => m.id === selectedExportParam)?.name}
                    </h2>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-1 text-xs text-slate-500">
                      <span>
                        Periode Observasi: <strong className="text-slate-700">{appliedStartDate || 'Awal'} s/d {appliedEndDate || 'Akhir'}</strong> ({filteredRecords.length} Hari Pengamatan)
                      </span>
                      {paramStats && (
                        <div className="flex items-center gap-2 font-medium text-[11px] text-slate-600">
                          <span>{paramStats.label1}: <strong className="text-slate-800">{paramStats.val1}</strong></span>
                          <span>•</span>
                          <span>{paramStats.label2}: <strong className="text-slate-800">{paramStats.val2}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Grafik (menggunakan chartWrapperRef untuk Recharts) */}
                  <div ref={chartWrapperRef} className="w-full my-2">
                    {renderChart(selectedExportParam)}
                  </div>

                  {/* Kaki Resmi Dokumen */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] text-slate-400">
                    <span>Dicetak dari Portal Informasi Stasiun Klimatologi PPK Sembawa • {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span className="font-mono text-slate-400">Format Resmi Ekspor</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Tabel Real-Time Data CSV */
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Pratinjau Data Tabel CSV:</span>
                    <span className="text-slate-600 font-medium">{menuItems.find(m => m.id === selectedExportParam)?.name}</span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {filteredRecords.length} Baris Data
                  </span>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead className="bg-slate-100/90 text-slate-700 sticky top-0 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-2.5 border-b border-slate-200 whitespace-nowrap">No</th>
                        <th className="p-2.5 border-b border-slate-200 whitespace-nowrap">Tanggal</th>
                        {selectedExportParam === 'suhu' && (
                          <>
                            <th className="p-2.5 border-b border-slate-200 whitespace-nowrap text-rose-700">Suhu Max (°C)</th>
                            <th className="p-2.5 border-b border-slate-200 whitespace-nowrap text-blue-700">Suhu Min (°C)</th>
                            <th className="p-2.5 border-b border-slate-200 whitespace-nowrap text-emerald-700">Suhu Rerata (°C)</th>
                          </>
                        )}
                        {selectedExportParam === 'curahHujanEvap' && (
                          <>
                            <th className="p-2.5 border-b border-slate-200 whitespace-nowrap text-indigo-700">Curah Hujan (mm)</th>
                            <th className="p-2.5 border-b border-slate-200 whitespace-nowrap text-teal-700">Evaporasi (mm)</th>
                          </>
                        )}
                        {selectedExportParam === 'kelembaban' && (
                          <th className="p-2.5 border-b border-slate-200 whitespace-nowrap text-sky-700">Kelembaban Nisbi (%)</th>
                        )}
                        {selectedExportParam === 'angin' && (
                          <th className="p-2.5 border-b border-slate-200 whitespace-nowrap text-slate-700">Kecepatan Angin (km/jam)</th>
                        )}
                        {selectedExportParam === 'sinarMatahari' && (
                          <th className="p-2.5 border-b border-slate-200 whitespace-nowrap text-amber-700">Lama Penyinaran (jam)</th>
                        )}
                        <th className="p-2.5 border-b border-slate-200 whitespace-nowrap">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 font-sans">
                            Tidak ada data dalam rentang tanggal yang dipilih.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.slice(0, 50).map((record, index) => (
                          <tr key={record.id || index} className="hover:bg-slate-50/80">
                            <td className="p-2.5 text-slate-400">{index + 1}</td>
                            <td className="p-2.5 font-semibold text-slate-700 whitespace-nowrap">{record.tanggal}</td>
                            {selectedExportParam === 'suhu' && (
                              <>
                                <td className="p-2.5 font-bold text-rose-600">{record.suhuMax ?? '-'}</td>
                                <td className="p-2.5 font-bold text-blue-600">{record.suhuMin ?? '-'}</td>
                                <td className="p-2.5 font-bold text-emerald-600">{record.suhuRerata ?? '-'}</td>
                              </>
                            )}
                            {selectedExportParam === 'curahHujanEvap' && (
                              <>
                                <td className="p-2.5 font-bold text-indigo-600">{record.curahHujan ?? '-'}</td>
                                <td className="p-2.5 font-bold text-teal-600">{record.evaporasi ?? '-'}</td>
                              </>
                            )}
                            {selectedExportParam === 'kelembaban' && (
                              <td className="p-2.5 font-bold text-sky-600">{record.kelembaban ?? '-'}</td>
                            )}
                            {selectedExportParam === 'angin' && (
                              <td className="p-2.5 font-bold text-slate-600">{record.kecepatanAngin ?? '-'}</td>
                            )}
                            {selectedExportParam === 'sinarMatahari' && (
                              <td className="p-2.5 font-bold text-amber-600">{record.lamaPenyinaran ?? '-'}</td>
                            )}
                            <td className="p-2.5 text-slate-500 font-sans">{record.catatan || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredRecords.length > 50 && (
                  <div className="p-2 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-100">
                    Menampilkan 50 baris pertama. Gunakan tombol Unduh CSV untuk mendapatkan file lengkap.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
             STANDARD CARD GRAFIK INTERAKTIF
             ========================================================================= */
          <div ref={standardCardRef} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm md:p-6 lg:col-span-3">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-800 dark:text-emerald-300 uppercase">
                    Stasiun Klimatologi PPK
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">Sembawa</span>
                </div>
                <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {menuItems.find(m => m.id === activeParam)?.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {appliedStartDate || appliedEndDate 
                    ? `Periode pengamatan: ${appliedStartDate || 'Awal'} s/d ${appliedEndDate || 'Akhir'} (${filteredRecords.length} Hari Pengamatan)`
                    : `Semua periode observasi pengamatan (${filteredRecords.length} Hari Pengamatan)`
                  }
                </p>
              </div>

              <div className="no-export flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedExportParam(activeParam);
                    setActiveParam('hasilUnduh');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition"
                  title="Lihat hasil unduh grafik real-time pada card"
                >
                  <Eye className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Lihat Hasil Unduh Real-Time</span>
                </button>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                  <span>Format:</span>
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300">.csv</span>
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300">.png</span>
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300">.svg</span>
                </div>
              </div>
            </div>

            {/* Chart Wrapper with Ref for High-DPI Canvas Rendering & SVG Serialization */}
            <div ref={chartWrapperRef} className="w-full">
              {renderChart()}
            </div>

            {/* Kaki Resmi Dokumen */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-[10px] text-slate-400">
              <span>Dicetak dari Portal Informasi Stasiun Klimatologi PPK Sembawa • {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span className="font-mono text-slate-400">Pusat Penelitian Karet</span>
            </div>
          </div>
        )}
      </div>

      {/* Modal Pratinjau & Hasil Unduh Grafik */}
      {exportModal.isOpen && exportModal.previewUrl && (
        <div 
          id="modal-hasil-unduh-grafik"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className={`rounded-lg p-2 ${
                  exportModal.format === 'png' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : exportModal.format === 'csv'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {exportModal.format === 'png' ? (
                    <ImageIcon className="h-5 w-5" />
                  ) : exportModal.format === 'csv' ? (
                    <FileSpreadsheet className="h-5 w-5" />
                  ) : (
                    <Code2 className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-bold text-slate-900">
                      Hasil Unduh Grafik &amp; Data
                    </h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      exportModal.format === 'png' 
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                        : exportModal.format === 'csv'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {exportModal.format === 'png' ? 'PNG Resolusi Tinggi' : exportModal.format === 'csv' ? 'CSV Tabel Data' : 'Vektor SVG'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {exportModal.title} • {exportModal.period} ({exportModal.count} Hari)
                  </p>
                </div>
              </div>

              <button
                id="btn-tutup-modal-hasil-unduh"
                onClick={() => setExportModal(prev => ({ ...prev, isOpen: false }))}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preview Container: Gambar atau Tabel CSV */}
            <div className="relative flex-1 overflow-auto bg-slate-100/70 p-4 sm:p-6 flex items-center justify-center min-h-[300px]">
              {exportModal.format === 'csv' ? (
                <div className="w-full max-h-[55vh] overflow-auto rounded-xl bg-white shadow-md border border-slate-200">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold">Pratinjau 15 Baris Pertama Data CSV:</span>
                    <span className="font-mono text-[11px] text-slate-500">Total {exportModal.count} Baris Data</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 border-collapse">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 uppercase text-[10px] font-bold">
                        <tr>
                          {exportModal.csvHeaders?.map((header, idx) => (
                            <th key={idx} className="p-2.5 border-b border-slate-200 whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {exportModal.csvPreviewRows?.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/80">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2.5 whitespace-nowrap">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="max-w-full overflow-hidden rounded-xl bg-white p-3 shadow-md border border-slate-200">
                  <img 
                    src={exportModal.previewUrl} 
                    alt="Pratinjau Hasil Unduh Grafik" 
                    className="max-h-[55vh] w-auto max-w-full object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Toast Feedback Salin */}
              {copiedNotice && (
                <div className="absolute top-4 right-4 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>{exportModal.format === 'csv' ? 'Data CSV tersalin ke clipboard!' : 'Grafik tersalin ke clipboard!'}</span>
                </div>
              )}
            </div>

            {/* Footer & Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3.5">
              <div className="text-xs text-slate-500 truncate max-w-sm">
                <span className="font-semibold text-slate-700">Nama File: </span>
                <span className="font-mono text-[11px] text-slate-600">{exportModal.filename}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {/* Salin ke Clipboard */}
                <button
                  id="btn-salin-hasil-unduh"
                  onClick={handleCopyToClipboard}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 active:scale-95"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>{exportModal.format === 'csv' ? 'Salin Data CSV' : 'Salin Gambar'}</span>
                </button>

                {/* Buka di Tab Baru (Aman untuk iframe sandbox) */}
                <a
                  id="btn-buka-tab-baru-hasil-unduh"
                  href={exportModal.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 active:scale-95"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                  <span>Buka di Tab Baru</span>
                </a>

                {/* Unduh Ulang */}
                <button
                  id="btn-unduh-ulang-hasil-unduh"
                  onClick={() => {
                    if (exportModal.blob) {
                      safeDownloadBlob(exportModal.blob, exportModal.filename);
                      showNotice(`Mengunduh file ${exportModal.filename}`);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh File Lagi</span>
                </button>

                {/* Tutup */}
                <button
                  id="btn-tutup-hasil-unduh"
                  onClick={() => setExportModal(prev => ({ ...prev, isOpen: false }))}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
                >
                  Tutup
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
