import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DraftPick, Franchise } from '../types';
import { drawMclCircularLogo } from './drawMclLogo';
import { getCategoryLabel } from './validation';
import { KIT_SIZE_LABELS } from '../constants';
import { getPickDetails } from './draftOrder';
import {
  drawPdfPhotoInCell,
  loadPdfImagesFromUrls,
  PDF_PHOTO_SIZE_MM,
} from './pdfImages';

export type PlayerImageLookup = Map<string, string | undefined>;

function sortSquadPicks(picks: DraftPick[]): DraftPick[] {
  const locks = picks
    .filter(pick => pick.isLock)
    .sort((a, b) => a.positionInRound - b.positionInRound);
  const drafted = picks
    .filter(pick => !pick.isLock)
    .sort((a, b) => a.pickNumber - b.pickNumber);
  return [...locks, ...drafted];
}

function squadPickLabel(
  pick: DraftPick,
  draftedIndex: number,
  lockCount: number,
): string {
  return pick.isLock ? 'LOCK' : String(lockCount + draftedIndex + 1);
}

function squadRoundLabel(pick: DraftPick, draftedIndex: number): string {
  return pick.isLock ? '—' : String(draftedIndex + 1);
}

const PHOTO_COL = 1;

function groupPicksByFranchise(
  picks: DraftPick[],
  franchises: Franchise[],
): Map<string, DraftPick[]> {
  const grouped = new Map<string, DraftPick[]>();
  franchises.forEach(f => grouped.set(f.id, []));
  picks.forEach(pick => {
    const list = grouped.get(pick.franchiseId) ?? [];
    list.push(pick);
    grouped.set(pick.franchiseId, list);
  });
  grouped.forEach((list, id) => {
    grouped.set(
      id,
      [...list].sort((a, b) => a.pickNumber - b.pickNumber),
    );
  });
  return grouped;
}

function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(7, 26, 11);
  doc.rect(0, 0, 297, 38, 'F');
  doc.setFillColor(163, 207, 45);
  doc.rect(0, 38, 297, 2, 'F');

  drawMclCircularLogo(doc, 10, 5, 26, 0.8);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('MCL 2026-27', 40, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(163, 207, 45);
  doc.text('MARKHOR CRICKET LEAGUE  ·  SEASON 4', 40, 22);

  doc.setTextColor(212, 175, 55);
  doc.setFontSize(9);
  doc.text(title, 40, 30);

  doc.setTextColor(180, 190, 180);
  doc.setFontSize(8);
  doc.text(subtitle, 40, 35);
}

function drawFooter(doc: jsPDF, label: string) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 120);
    doc.text(`${label}  ·  Page ${i} of ${pageCount}`, 14, 200);
    doc.setDrawColor(163, 207, 45);
    doc.setLineWidth(0.4);
    doc.line(14, 196, 283, 196);
  }
}

export async function buildFranchiseSquadPdfBase64(
  franchise: Franchise,
  picks: DraftPick[],
  playerImages?: PlayerImageLookup,
): Promise<string> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const sorted = sortSquadPicks(picks);
  const images = await loadPdfImagesFromUrls(
    sorted.map(pick => playerImages?.get(pick.playerDocId)),
  );

  drawHeader(
    doc,
    `${franchise.name.toUpperCase()} · OFFICIAL SQUAD`,
    `Draft selections · ${sorted.length} players`,
  );

  const lockCount = sorted.filter(pick => pick.isLock).length;
  let draftedIndex = 0;
  autoTable(doc, {
    startY: 44,
    head: [[
      'Squad No.',
      'Photo',
      'Round',
      'Player ID',
      'Full Name',
      'Role',
      'Category',
      'Shirt #',
      'Kit Size',
    ]],
    body: sorted.map(p => {
      const labelIndex = p.isLock ? -1 : draftedIndex;
      if (!p.isLock) draftedIndex += 1;
      return [
        squadPickLabel(p, labelIndex, lockCount),
        '',
        squadRoundLabel(p, labelIndex),
        p.playerId,
        p.playerName,
        p.playerRole,
        getCategoryLabel(p.playerCategory),
        p.shirtNumber ?? '—',
        p.kitSize ? KIT_SIZE_LABELS[p.kitSize] : '—',
      ];
    }),
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
      minCellHeight: PDF_PHOTO_SIZE_MM + 4,
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: [240, 247, 244] },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 26, fontStyle: 'bold' },
      4: { cellWidth: 42 },
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
  });

  drawFooter(doc, `${franchise.name} · MCL 2026-27 Draft Squad`);
  return doc.output('datauristring').split(',')[1] ?? '';
}

export async function buildFullDraftBoardPdfBase64(
  picks: DraftPick[],
  franchises: Franchise[],
): Promise<string> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const franchiseCount = Math.max(franchises.length, 1);
  const sorted = [...picks]
    .filter(pick => !pick.isLock)
    .sort((a, b) => a.pickNumber - b.pickNumber);

  drawHeader(
    doc,
    'FULL DRAFT BOARD',
    `${sorted.length} picks · ${franchises.length} franchises · rotating draft order`,
  );

  autoTable(doc, {
    startY: 44,
    head: [[
      'Pick #',
      'Round',
      'Franchise',
      'Player ID',
      'Player Name',
      'Role',
      'Category',
    ]],
    body: sorted.map(p => [
      String(p.pickNumber),
      String(getPickDetails(p.pickNumber, franchiseCount).round),
      p.franchiseName,
      p.playerId,
      p.playerName,
      p.playerRole,
      getCategoryLabel(p.playerCategory),
    ]),
    headStyles: {
      fillColor: [11, 61, 46],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [20, 30, 20],
      cellPadding: 1.2,
    },
    alternateRowStyles: { fillColor: [240, 247, 244] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 28, fontStyle: 'bold' },
      3: { cellWidth: 24 },
    },
    margin: { left: 8, right: 8 },
  });

  drawFooter(doc, 'MCL 2026-27 Official Draft Board');
  return doc.output('datauristring').split(',')[1] ?? '';
}

export async function buildAllFranchiseSquadPdfs(
  picks: DraftPick[],
  franchises: Franchise[],
  playerImages?: PlayerImageLookup,
): Promise<Array<{ franchise: Franchise; base64: string; filename: string }>> {
  const grouped = groupPicksByFranchise(picks, franchises);
  const results: Array<{
    franchise: Franchise;
    base64: string;
    filename: string;
  }> = [];

  for (const franchise of franchises) {
    const franchisePicks = grouped.get(franchise.id) ?? [];
    const base64 = await buildFranchiseSquadPdfBase64(
      franchise,
      franchisePicks,
      playerImages,
    );
    const safeName = franchise.name.replace(/[^a-zA-Z0-9]+/g, '-');
    results.push({
      franchise,
      base64,
      filename: `MCL-2026-27-${safeName}-Squad.pdf`,
    });
  }

  return results;
}

export function getDraftBoardFilename(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `MCL-2026-27-Draft-Board-${stamp}.pdf`;
}
