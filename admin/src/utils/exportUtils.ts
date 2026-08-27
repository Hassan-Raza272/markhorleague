import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Player, KitSize, PlayerCategory } from '../types';
import { drawMclCircularLogo } from './drawMclLogo';

type PdfExportScope = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type PdfCategoryScope = 'ALL' | PlayerCategory | 'UNASSIGNED';
type PdfKitSizeScope = 'ALL' | KitSize | 'UNASSIGNED';

export type PdfExportFilters = {
  statusScope?: PdfExportScope;
  categoryScope?: PdfCategoryScope;
  kitSizeScope?: PdfKitSizeScope;
};

const STATUS_LABELS: Record<PdfExportScope, string> = {
  ALL: 'All',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const CATEGORY_SCOPE_LABELS: Record<PdfCategoryScope, string> = {
  ALL: 'All',
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
  EMERGING: 'Emerging',
  UNASSIGNED: 'Unassigned',
};

const KIT_SIZE_SCOPE_LABELS: Record<PdfKitSizeScope, string> = {
  ALL: 'All Sizes',
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  XL: 'XL',
  '2XL': '2XL',
  '3XL': '3XL',
  '4XL': '4XL',
  UNASSIGNED: 'Not Selected',
};

function getActivePdfFilterLabels(filters?: PdfExportFilters): string[] {
  if (!filters) return [];
  const labels: string[] = [];
  if (filters.statusScope && filters.statusScope !== 'ALL') {
    labels.push(`Status: ${STATUS_LABELS[filters.statusScope]}`);
  }
  if (filters.categoryScope && filters.categoryScope !== 'ALL') {
    labels.push(`Category: ${CATEGORY_SCOPE_LABELS[filters.categoryScope]}`);
  }
  if (filters.kitSizeScope && filters.kitSizeScope !== 'ALL') {
    labels.push(`Uniform Size: ${KIT_SIZE_SCOPE_LABELS[filters.kitSizeScope]}`);
  }
  return labels;
}

function drawPdfFilterBanner(doc: jsPDF, filters?: PdfExportFilters): number {
  const labels = getActivePdfFilterLabels(filters);
  if (labels.length === 0) return 44;

  const bannerY = 42;
  const bannerH = 10;
  doc.setFillColor(15, 40, 20);
  doc.roundedRect(14, bannerY, 269, bannerH, 2, 2, 'F');
  doc.setDrawColor(163, 207, 45);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, bannerY, 269, bannerH, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(163, 207, 45);
  doc.text('EXPORT FILTER', 18, bannerY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 175, 55);
  doc.text(labels.join('   ·   '), 18, bannerY + 8.5);

  return bannerY + bannerH + 4;
}

function getCategoryLabel(category?: string | null): string {
  switch (category) {
    case 'JUNIOR':
      return 'Junior';
    case 'SENIOR':
      return 'Senior';
    case 'EMERGING':
      return 'Emerging';
    default:
      return 'Unassigned';
  }
}

type PdfImage = {
  data: string;
  format: 'JPEG' | 'PNG';
};

const PHOTO_COL = 1;
const PHOTO_SIZE_MM = 11;
const IMAGE_FETCH_CONCURRENCY = 6;

export function exportToExcel(players: Player[], filename = 'MCL_2026-27_Player_List.xlsx') {
  const rows = players.map((p, i) => ({
    'Sr #': i + 1,
    'Player ID': p.playerId,
    'Player Name': p.fullName,
    Age: p.age,
    City: p.city,
    Role: p.role,
    'Batting Style': p.battingStyle,
    'Bowling Style': p.bowlingStyle,
    'Current Club': p.currentClub ?? '',
    Experience: `${p.yearsOfExperience} Years`,
    Phone: p.phone,
    CNIC: p.cnic,
    'Registration Status': p.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Players');
  XLSX.writeFile(wb, filename);
}

export function exportToCSV(players: Player[], filename = 'MCL_2026-27_Player_List.csv') {
  const rows = players.map((p, i) => ({
    'Sr #': i + 1,
    'Player ID': p.playerId,
    'Player Name': p.fullName,
    Age: p.age,
    City: p.city,
    Role: p.role,
    'Batting Style': p.battingStyle,
    'Bowling Style': p.bowlingStyle,
    'Current Club': p.currentClub ?? '',
    Experience: `${p.yearsOfExperience} Years`,
    Phone: p.phone,
    'Registration Status': p.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadBlob(new Blob([csv], { type: 'text/csv' }), filename);
}

function getPlayerPhotoThumbUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace(
      '/upload/',
      '/upload/w_120,h_120,c_fill,g_face,f_jpg,q_70/',
    );
  }
  return url;
}

/** Circular player avatar for PDF tables (Cloudinary round crop). */
function getPlayerPhotoCircleUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace(
      '/upload/',
      '/upload/w_128,h_128,c_fill,g_face,r_max,f_png,q_80/',
    );
  }
  return url;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchImageBase64(url: string): Promise<PdfImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
    const buffer = await res.arrayBuffer();
    const data = arrayBufferToBase64(buffer);
    if (!data) return null;
    const format: 'JPEG' | 'PNG' =
      contentType.includes('png') ||
      url.toLowerCase().includes('f_png') ||
      url.toLowerCase().includes('r_max')
        ? 'PNG'
        : 'JPEG';
    return { data, format };
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run()),
  );
  return results;
}

async function loadPlayerImages(
  players: Player[],
): Promise<Array<PdfImage | null>> {
  return mapWithConcurrency(players, IMAGE_FETCH_CONCURRENCY, async player => {
    const circle =
      getPlayerPhotoCircleUrl(player.profileImage) ??
      getPlayerPhotoThumbUrl(player.profileImage);
    if (!circle) return null;
    return fetchImageBase64(circle);
  });
}

function drawPhotoPlaceholder(
  doc: jsPDF,
  x: number,
  y: number,
  size: number,
) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;
  doc.setFillColor(220, 228, 222);
  doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(163, 207, 45);
  doc.setLineWidth(0.4);
  doc.circle(cx, cy, r, 'S');
  doc.setTextColor(140, 150, 140);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('N/A', cx, cy + 1.2, { align: 'center' });
}

/** Builds the premium MCL player register PDF document (with photos). */
async function buildPremiumPdfDoc(
  players: Player[],
  filters?: PdfExportFilters,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(7, 26, 11);
  doc.rect(0, 0, 297, 38, 'F');
  doc.setFillColor(163, 207, 45);
  doc.rect(0, 38, 297, 2, 'F');

  drawMclCircularLogo(doc, 10, 5, 26, 0.8);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('MCL 2026-27', 40, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(163, 207, 45);
  doc.text('MARKHOR CRICKET LEAGUE  ·  SEASON 4', 40, 22);

  doc.setTextColor(212, 175, 55);
  doc.setFontSize(9);
  doc.text('OFFICIAL REGISTERED PLAYERS DOCUMENT', 40, 30);

  const tableStartY = drawPdfFilterBanner(doc, filters);

  const sorted = [...players].sort((a, b) => a.playerId.localeCompare(b.playerId));
  const images = await loadPlayerImages(sorted);

  autoTable(doc, {
    startY: tableStartY,
    head: [[
      'Sr',
      'Photo',
      'Player ID',
      'Full Name',
      'Age',
      'City',
      'Category',
      'Role',
      'Batting',
      'Bowling',
      'Exp',
      'Status',
      'Phone',
    ]],
    body: sorted.map((p, i) => [
      String(i + 1),
      '',
      p.playerId,
      p.fullName,
      String(p.age),
      p.city,
      getCategoryLabel(p.category),
      p.role,
      p.battingStyle,
      p.bowlingStyle,
      `${p.yearsOfExperience}y`,
      p.status,
      p.phone,
    ]),
    headStyles: {
      fillColor: [11, 61, 46],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [20, 30, 20],
      cellPadding: 1.6,
      minCellHeight: PHOTO_SIZE_MM + 4,
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: [240, 247, 244] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 22, fontStyle: 'bold' },
      3: { cellWidth: 26 },
      6: { cellWidth: 18, fontStyle: 'bold' },
      11: { fontStyle: 'bold' },
    },
    margin: { left: 8, right: 8 },
    didDrawCell: data => {
      if (data.section !== 'body' || data.column.index !== PHOTO_COL) {
        return;
      }
      const img = images[data.row.index];
      const size = PHOTO_SIZE_MM;
      const x = data.cell.x + (data.cell.width - size) / 2;
      const y = data.cell.y + (data.cell.height - size) / 2;

      if (img) {
        try {
          doc.addImage(img.data, img.format, x, y, size, size);
          doc.setDrawColor(163, 207, 45);
          doc.setLineWidth(0.45);
          doc.circle(x + size / 2, y + size / 2, size / 2, 'S');
          return;
        } catch {
          // Fall through to placeholder
        }
      }
      drawPhotoPlaceholder(doc, x, y, size);
    },
    didDrawPage: data => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120, 130, 120);
      doc.text(
        `MCL 2026-27 Official Player Register  ·  Page ${data.pageNumber} of ${pageCount}`,
        14,
        200,
      );
      doc.setDrawColor(163, 207, 45);
      doc.setLineWidth(0.4);
      doc.line(14, 196, 283, 196);
    },
  });

  return doc;
}

/** Premium official PDF for all (or filtered) registered players — downloads to device. */
export async function exportToPDF(
  players: Player[],
  filename = `MCL_2026-27_Official_Players_${new Date().toISOString().slice(0, 10)}.pdf`,
  filters?: PdfExportFilters,
) {
  const doc = await buildPremiumPdfDoc(players, filters);
  doc.save(filename);
}

export async function getPremiumPdfBlob(
  players: Player[],
  filters?: PdfExportFilters,
): Promise<Blob> {
  const doc = await buildPremiumPdfDoc(players, filters);
  return doc.output('blob');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareFile(blob: Blob, filename: string, title: string) {
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  }
  downloadBlob(blob, filename);
}
