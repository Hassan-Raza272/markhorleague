import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Franchise, Player, PlayerCategory, KitSize } from '../types';
import { drawMclCircularLogo } from './drawMclLogo';
import { getCategoryLabel } from './validation';
import { KIT_SIZES, KIT_SIZE_LABELS } from '../constants';
import { isAnyFranchiseOwnerPlayer } from '../services/draftService';
import {
  drawPdfPhotoInCell,
  loadPdfImagesFromUrls,
  PDF_PHOTO_SIZE_MM,
} from './pdfImages';

export { getPlayerPhotoThumbUrl } from './pdfImages';

export type PlayerExportStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type PdfExportScope =
  | 'ALL'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

export type PdfCategoryScope = 'ALL' | PlayerCategory | 'UNASSIGNED';

export type PdfKitSizeScope = 'ALL' | KitSize | 'UNASSIGNED';

/** Include all players, or exclude franchise owners and locked players */
export type PdfSquadRoleScope = 'ALL' | 'WITHOUT_OWNER_LOCKS';

export const PDF_EXPORT_SCOPES: Array<{
  key: PdfExportScope;
  label: string;
}> = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

export const PDF_CATEGORY_SCOPES: Array<{
  key: PdfCategoryScope;
  label: string;
}> = [
  { key: 'ALL', label: 'All' },
  { key: 'JUNIOR', label: 'Junior' },
  { key: 'SENIOR', label: 'Senior' },
  { key: 'EMERGING', label: 'Emerging' },
  { key: 'UNASSIGNED', label: 'Unassigned' },
];

export const PDF_KIT_SIZE_SCOPES: Array<{
  key: PdfKitSizeScope;
  label: string;
}> = [
  { key: 'ALL', label: 'All Sizes' },
  ...KIT_SIZES.map(size => ({
    key: size as PdfKitSizeScope,
    label: KIT_SIZE_LABELS[size],
  })),
  { key: 'UNASSIGNED', label: 'Not Selected' },
];

export const PDF_SQUAD_ROLE_SCOPES: Array<{
  key: PdfSquadRoleScope;
  label: string;
}> = [
  { key: 'ALL', label: 'All Players' },
  { key: 'WITHOUT_OWNER_LOCKS', label: 'Without Owner & Locks' },
];

const PHOTO_COL = 1;

export function getPlayerExportStats(players: Player[]): PlayerExportStats {
  return {
    total: players.length,
    pending: players.filter(p => p.status === 'PENDING').length,
    approved: players.filter(p => p.status === 'APPROVED').length,
    rejected: players.filter(p => p.status === 'REJECTED').length,
  };
}

export function filterPlayersForPdfExport(
  players: Player[],
  scope: PdfExportScope,
  categoryScope: PdfCategoryScope = 'ALL',
  kitSizeScope: PdfKitSizeScope = 'ALL',
  squadRoleScope: PdfSquadRoleScope = 'ALL',
  franchises: Franchise[] = [],
): Player[] {
  let list = players;
  switch (scope) {
    case 'PENDING':
      list = list.filter(p => p.status === 'PENDING');
      break;
    case 'APPROVED':
      list = list.filter(p => p.status === 'APPROVED');
      break;
    case 'REJECTED':
      list = list.filter(p => p.status === 'REJECTED');
      break;
    default:
      break;
  }

  if (categoryScope === 'UNASSIGNED') {
    list = list.filter(p => !p.category);
  } else if (categoryScope !== 'ALL') {
    list = list.filter(p => p.category === categoryScope);
  }

  if (kitSizeScope === 'UNASSIGNED') {
    list = list.filter(p => !p.kitSize);
  } else if (kitSizeScope !== 'ALL') {
    list = list.filter(p => p.kitSize === kitSizeScope);
  }

  if (squadRoleScope === 'WITHOUT_OWNER_LOCKS') {
    list = list.filter(
      p =>
        !p.lockedFranchiseId &&
        !isAnyFranchiseOwnerPlayer(p, franchises),
    );
  }

  return list;
}

export function getPdfExportScopeLabel(scope: PdfExportScope): string {
  return PDF_EXPORT_SCOPES.find(s => s.key === scope)?.label ?? 'All';
}

export function getPdfCategoryScopeLabel(scope: PdfCategoryScope): string {
  return PDF_CATEGORY_SCOPES.find(s => s.key === scope)?.label ?? 'All';
}

export function getPdfKitSizeScopeLabel(scope: PdfKitSizeScope): string {
  return PDF_KIT_SIZE_SCOPES.find(s => s.key === scope)?.label ?? 'All Sizes';
}

export function getPdfSquadRoleScopeLabel(scope: PdfSquadRoleScope): string {
  return PDF_SQUAD_ROLE_SCOPES.find(s => s.key === scope)?.label ?? 'All Players';
}

export type PdfExportFilters = {
  statusScope?: PdfExportScope;
  categoryScope?: PdfCategoryScope;
  kitSizeScope?: PdfKitSizeScope;
  squadRoleScope?: PdfSquadRoleScope;
};

function getActivePdfFilterLabels(filters?: PdfExportFilters): string[] {
  if (!filters) return [];
  const labels: string[] = [];
  if (filters.statusScope && filters.statusScope !== 'ALL') {
    labels.push(`Status: ${getPdfExportScopeLabel(filters.statusScope)}`);
  }
  if (filters.categoryScope && filters.categoryScope !== 'ALL') {
    labels.push(`Category: ${getPdfCategoryScopeLabel(filters.categoryScope)}`);
  }
  if (filters.kitSizeScope && filters.kitSizeScope !== 'ALL') {
    labels.push(
      `Uniform Size: ${getPdfKitSizeScopeLabel(filters.kitSizeScope)}`,
    );
  }
  if (filters.squadRoleScope && filters.squadRoleScope !== 'ALL') {
    labels.push(`Squad: ${getPdfSquadRoleScopeLabel(filters.squadRoleScope)}`);
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

export function getPremiumPdfFilename(
  scope: PdfExportScope = 'ALL',
  categoryScope: PdfCategoryScope = 'ALL',
  kitSizeScope: PdfKitSizeScope = 'ALL',
  squadRoleScope: PdfSquadRoleScope = 'ALL',
): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const statusPart = scope.toLowerCase().replace(/_/g, '-');
  const categoryPart = categoryScope.toLowerCase().replace(/_/g, '-');
  const sizePart = kitSizeScope.toLowerCase().replace(/_/g, '-');
  const squadPart =
    squadRoleScope === 'WITHOUT_OWNER_LOCKS' ? 'no-owner-locks' : 'all-players';
  return `MCL_2026-27_Players_${statusPart}_${categoryPart}_${sizePart}_${squadPart}_${stamp}.pdf`;
}

async function loadPlayerImages(players: Player[]) {
  return loadPdfImagesFromUrls(players.map(player => player.profileImage));
}

/** Builds a premium landscape PDF of registered players (with photos). Returns base64. */
export async function buildPremiumPlayersPdfBase64(
  players: Player[],
  filters?: PdfExportFilters,
): Promise<string> {
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

  const sorted = [...players].sort((a, b) =>
    a.playerId.localeCompare(b.playerId),
  );
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
      fontSize: 7.5,
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [20, 30, 20],
      cellPadding: 1.4,
      minCellHeight: PDF_PHOTO_SIZE_MM + 4,
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
      drawPdfPhotoInCell(
        doc,
        images[data.row.index],
        data.cell.x,
        data.cell.y,
        data.cell.width,
        data.cell.height,
      );
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

  return doc.output('datauristring').split(',')[1] ?? '';
}
