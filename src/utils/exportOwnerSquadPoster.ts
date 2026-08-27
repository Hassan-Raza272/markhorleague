import { GState, jsPDF } from 'jspdf';
import type { DraftPick, Franchise, PlayingRole } from '../types';
import { drawMclCircularLogo } from './drawMclLogo';
import {
  ALLROUNDER_ROLE_PNG_BASE64,
  BATSMAN_ROLE_PNG_BASE64,
  BOWLER_ROLE_PNG_BASE64,
  WICKETKEEPER_ROLE_PNG_BASE64,
} from '../assets/roleIconsBase64';
import {
  loadCircleImagesFromUrls,
  type PdfImage,
} from './pdfImages';
import type { PlayerImageLookup } from './exportDraftPdf';

const W = 1080;
const H = 1920;

type SquadPosterPlayer = {
  name: string;
  role: PlayingRole | string;
  isCaptain?: boolean;
  isOwner?: boolean;
  photoUrl?: string;
  photo?: PdfImage | null;
};

type RoleSection = {
  label: string;
  players: SquadPosterPlayer[];
};

const ROLE_SECTIONS: Array<{
  label: string;
  match: (role: string) => boolean;
}> = [
  {
    label: 'BATSMEN',
    match: role => {
      const n = role.toLowerCase();
      return n.includes('bat') && !n.includes('all') && !n.includes('wicket');
    },
  },
  {
    label: 'WICKETKEEPERS',
    match: role => role.toLowerCase().includes('wicket'),
  },
  {
    label: 'ALL-ROUNDERS',
    match: role => role.toLowerCase().includes('all'),
  },
  {
    label: 'BOWLERS',
    match: role => {
      const n = role.toLowerCase();
      return n.includes('bowl') && !n.includes('all');
    },
  },
];

function buildRoleSections(players: SquadPosterPlayer[]): RoleSection[] {
  const used = new Set<SquadPosterPlayer>();
  const sections: RoleSection[] = ROLE_SECTIONS.map(section => {
    const list = players.filter(player => {
      if (used.has(player)) return false;
      if (!section.match(String(player.role))) return false;
      used.add(player);
      return true;
    });
    return { label: section.label, players: list };
  }).filter(section => section.players.length > 0);

  const leftover = players.filter(player => !used.has(player));
  if (leftover.length > 0) {
    sections.push({ label: 'SQUAD', players: leftover });
  }
  return sections;
}

function drawStadiumBackground(doc: jsPDF) {
  doc.setFillColor(2, 8, 4);
  doc.rect(0, 0, W, H, 'F');

  doc.setGState(new GState({ opacity: 0.2 }));
  doc.setFillColor(18, 60, 28);
  doc.ellipse(W * 0.5, H * 0.35, 520, 380, 'F');
  doc.setGState(new GState({ opacity: 0.12 }));
  doc.setFillColor(163, 207, 45);
  doc.ellipse(W * 0.7, H * 0.55, 340, 460, 'F');
  doc.setGState(new GState({ opacity: 1 }));

  const streaks: Array<[number, number, number]> = [
    [0.1, 0.22, 0.06],
    [0.14, 0.16, 0.1],
    [0.09, 0.2, 0.02],
    [0.12, 0.14, 0.14],
    [0.08, 0.18, 0.08],
  ];

  streaks.forEach(([opacity, widthFactor, tilt]) => {
    doc.setGState(new GState({ opacity }));
    doc.setFillColor(163, 207, 45);
    const mid = H * (0.3 + tilt);
    const spread = W * widthFactor;
    doc.triangle(
      -60,
      mid + 520,
      W * 0.7,
      mid - 780,
      W * 0.7 + spread,
      mid - 760,
      'F',
    );
  });

  doc.setGState(new GState({ opacity: 0.07 }));
  doc.setFillColor(80, 200, 120);
  doc.triangle(0, H, W * 0.75, H * 0.25, W * 0.85, H * 0.2, 'F');
  doc.setGState(new GState({ opacity: 1 }));

  doc.setGState(new GState({ opacity: 0.45 }));
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(28, 150, W - 56, H - 280, 28, 28, 'F');
  doc.setGState(new GState({ opacity: 1 }));
}

function getRoleImageBase64(role: string): string | null {
  const normalized = role.toLowerCase();
  if (normalized.includes('wicket')) return WICKETKEEPER_ROLE_PNG_BASE64;
  if (normalized.includes('all')) return ALLROUNDER_ROLE_PNG_BASE64;
  if (normalized.includes('bowl')) return BOWLER_ROLE_PNG_BASE64;
  if (normalized.includes('bat')) return BATSMAN_ROLE_PNG_BASE64;
  return null;
}

function drawRoleImage(
  doc: jsPDF,
  role: string,
  cx: number,
  cy: number,
  size: number,
) {
  const image = getRoleImageBase64(role);
  if (!image) return;
  const x = cx - size / 2;
  const y = cy - size / 2;
  try {
    doc.addImage(image, 'PNG', x, y, size, size);
  } catch {
    // Skip if image decode fails
  }
}

/**
 * Circular player photo with lime ring.
 * Do NOT use jsPDF clip() — it leaks and hides names, role images,
 * and every player after the first (page looks empty).
 */
function drawCircularPlayerPhoto(
  doc: jsPDF,
  photo: PdfImage | null | undefined,
  cx: number,
  cy: number,
  diameter: number,
) {
  const r = diameter / 2;

  // White disc behind photo
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, r + 1, 'F');

  if (photo) {
    try {
      // Prefer Cloudinary r_max circular PNGs (transparent corners).
      doc.addImage(
        photo.data,
        photo.format,
        cx - r,
        cy - r,
        diameter,
        diameter,
      );
    } catch {
      doc.setFillColor(230, 235, 230);
      doc.circle(cx, cy, r, 'F');
      doc.setTextColor(120, 140, 120);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(Math.max(8, diameter * 0.28));
      doc.text('?', cx, cy + diameter * 0.1, { align: 'center' });
    }
  } else {
    doc.setFillColor(230, 235, 230);
    doc.circle(cx, cy, r, 'F');
    doc.setTextColor(120, 140, 120);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(8, diameter * 0.28));
    doc.text('?', cx, cy + diameter * 0.1, { align: 'center' });
  }

  // Lime ring (draws on top so the avatar reads circular)
  doc.setDrawColor(163, 207, 45);
  doc.setLineWidth(2.6);
  doc.circle(cx, cy, r, 'S');
}

function fitSingleLine(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && doc.getTextWidth(`${truncated}…`) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function drawHeader(doc: jsPDF, franchiseName: string, playerCount: number) {
  doc.setGState(new GState({ opacity: 0.7 }));
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, W, 140, 'F');
  doc.setGState(new GState({ opacity: 1 }));

  drawMclCircularLogo(doc, 36, 22, 96, 2.5);

  doc.setTextColor(163, 207, 45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MARKHOR CRICKET LEAGUE', 150, 48);

  doc.setTextColor(212, 175, 55);
  doc.setFontSize(13);
  doc.text('SEASON 4  ·  2026-27', 150, 72);

  doc.setFillColor(163, 207, 45);
  doc.roundedRect(150, 88, 128, 26, 6, 6, 'F');
  doc.setTextColor(2, 8, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OFFICIAL SQUAD', 214, 105, { align: 'center' });

  doc.setDrawColor(163, 207, 45);
  doc.setLineWidth(2);
  doc.roundedRect(W - 210, 48, 174, 44, 10, 10, 'S');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${playerCount} PLAYERS`, W - 123, 76, { align: 'center' });

  const title = franchiseName.toUpperCase();
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  const titleMaxW = W - 80;
  let titleSize = 44;
  doc.setFontSize(titleSize);
  while (titleSize > 26 && doc.getTextWidth(title) > titleMaxW) {
    titleSize -= 2;
    doc.setFontSize(titleSize);
  }
  doc.text(fitSingleLine(doc, title, titleMaxW), 40, 188);

  doc.setTextColor(212, 175, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('(SQUAD LIST)', 40, 222);
}

function drawSquadByRole(doc: jsPDF, sections: RoleSection[]) {
  const listLeft = 48;
  const listWidth = W - 96;
  const listTop = 248;
  const listBottom = H - 120;

  const sectionHeaderH = 34;
  const sectionGap = 14;
  const pillGap = 8;

  const totalPlayers = sections.reduce((sum, s) => sum + s.players.length, 0);
  const headerBlocks = sections.length * (sectionHeaderH + sectionGap);
  const gaps = Math.max(totalPlayers - sections.length, 0) * pillGap;
  const availableForPills =
    listBottom - listTop - headerBlocks - gaps - sectionGap;
  const pillH = Math.min(
    56,
    Math.max(40, availableForPills / Math.max(totalPlayers, 1)),
  );

  let y = listTop;
  let squadNumber = 1;

  sections.forEach(section => {
    doc.setFillColor(163, 207, 45);
    doc.roundedRect(listLeft, y, 6, sectionHeaderH - 8, 3, 3, 'F');

    doc.setTextColor(163, 207, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(section.label, listLeft + 18, y + 18);

    doc.setTextColor(160, 175, 160);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(
      `${section.players.length}`,
      listLeft + listWidth,
      y + 18,
      { align: 'right' },
    );

    doc.setDrawColor(60, 90, 60);
    doc.setLineWidth(1);
    doc.line(
      listLeft + 18,
      y + sectionHeaderH - 6,
      listLeft + listWidth,
      y + sectionHeaderH - 6,
    );

    y += sectionHeaderH;

    section.players.forEach(player => {
      const radius = Math.min(pillH / 2, 24);
      const avatarSize = Math.min(40, pillH - 10);
      const midCy = y + pillH / 2;
      const midY = midCy + 5;
      const fontSize = Math.min(15, pillH * 0.38);

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(listLeft, y, listWidth, pillH, radius, radius, 'F');

      doc.setDrawColor(163, 207, 45);
      doc.setLineWidth(1);
      doc.setGState(new GState({ opacity: 0.28 }));
      doc.roundedRect(listLeft, y, listWidth, pillH, radius, radius, 'S');
      doc.setGState(new GState({ opacity: 1 }));

      // Squad number
      doc.setTextColor(20, 28, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      doc.text(String(squadNumber), listLeft + 24, midY, { align: 'center' });

      // Circular player photo
      const avatarCx = listLeft + 58;
      drawCircularPlayerPhoto(doc, player.photo, avatarCx, midCy, avatarSize);

      // Name (draw after photo; left-aligned so it always reads clearly)
      const suffixes: string[] = [];
      if (player.isCaptain) suffixes.push('(C)');
      if (player.isOwner) suffixes.push('(Owner)');
      const label = suffixes.length
        ? `${player.name.toUpperCase()} ${suffixes.join(' ')}`
        : player.name.toUpperCase();
      const nameLeft = avatarCx + avatarSize / 2 + 14;
      const nameMaxW = listLeft + listWidth - 52 - nameLeft;
      const fitted = fitSingleLine(doc, label, Math.max(40, nameMaxW));
      doc.setTextColor(20, 28, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      doc.text(fitted, nameLeft, midY, { align: 'left' });

      // Role image
      const iconSize = Math.min(34, pillH - 10);
      drawRoleImage(
        doc,
        player.role,
        listLeft + listWidth - 28,
        midCy,
        iconSize,
      );

      squadNumber += 1;
      y += pillH + pillGap;
    });

    y += sectionGap;
  });
}

function drawFooter(doc: jsPDF) {
  doc.setFillColor(0, 0, 0);
  doc.rect(0, H - 96, W, 96, 'F');

  doc.setFillColor(163, 207, 45);
  doc.rect(0, H - 100, W, 4, 'F');

  doc.setTextColor(180, 190, 180);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text('Markhor Cricket League  ·  Official Franchise Squad', 36, H - 52);

  doc.setTextColor(163, 207, 45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MCL SEASON 4', 36, H - 28);

  doc.setTextColor(212, 175, 55);
  doc.setFontSize(12);
  doc.text('to Owner', W - 36, H - 40, { align: 'right' });
}

function toPosterPlayers(
  picks: DraftPick[],
  captainPlayerDocId?: string | null,
  ownerPlayerDocId?: string | null,
  playerImages?: PlayerImageLookup,
): SquadPosterPlayer[] {
  return picks.map(pick => ({
    name: pick.playerName,
    role: pick.playerRole,
    isCaptain: Boolean(
      captainPlayerDocId && pick.playerDocId === captainPlayerDocId,
    ),
    isOwner: Boolean(
      ownerPlayerDocId && pick.playerDocId === ownerPlayerDocId,
    ),
    photoUrl: playerImages?.get(pick.playerDocId),
  }));
}

export async function buildOwnerSquadPosterBase64(
  franchise: Franchise,
  picks: DraftPick[],
  captainPlayerDocId?: string | null,
  ownerPlayerDocId?: string | null,
  playerImages?: PlayerImageLookup,
): Promise<string> {
  const players = toPosterPlayers(
    picks,
    captainPlayerDocId,
    ownerPlayerDocId,
    playerImages,
  );
  const photos = await loadCircleImagesFromUrls(
    players.map(player => player.photoUrl),
  );
  players.forEach((player, index) => {
    player.photo = photos[index];
  });

  const sections = buildRoleSections(players);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [W, H],
    hotfixes: ['px_scaling'],
  });

  drawStadiumBackground(doc);
  drawHeader(doc, franchise.name, players.length);
  drawSquadByRole(doc, sections);
  drawFooter(doc);

  return doc.output('datauristring').split(',')[1] ?? '';
}

export function getOwnerSquadPosterFilename(franchiseName: string): string {
  const safeName = franchiseName.replace(/[^a-zA-Z0-9]+/g, '-');
  return `MCL-2026-27-${safeName}-Owner-Squad.pdf`;
}

export async function buildAllOwnerSquadPosters(
  franchises: Franchise[],
  picksByFranchise: Map<string, DraftPick[]>,
  captainPlayerDocIdByFranchise: Map<string, string | undefined>,
  ownerPlayerDocIdByFranchise: Map<string, string | undefined>,
  playerImages?: PlayerImageLookup,
): Promise<Array<{ franchise: Franchise; base64: string; filename: string }>> {
  const results: Array<{
    franchise: Franchise;
    base64: string;
    filename: string;
  }> = [];

  for (const franchise of franchises) {
    const picks = picksByFranchise.get(franchise.id) ?? [];
    if (picks.length === 0) continue;
    const base64 = await buildOwnerSquadPosterBase64(
      franchise,
      picks,
      captainPlayerDocIdByFranchise.get(franchise.id),
      ownerPlayerDocIdByFranchise.get(franchise.id),
      playerImages,
    );
    results.push({
      franchise,
      base64,
      filename: getOwnerSquadPosterFilename(franchise.name),
    });
  }

  return results;
}
