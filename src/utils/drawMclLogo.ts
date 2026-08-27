import { jsPDF } from 'jspdf';
import { MCL_LOGO_CIRCLE_PNG_BASE64 } from '../assets/mclLogoCircleBase64';

/**
 * Draws the MCL logo as a circle with a lime ring.
 * Uses a pre-masked circular PNG (avoids jsPDF clip leaks).
 */
export function drawMclCircularLogo(
  doc: jsPDF,
  x: number,
  y: number,
  size: number,
  ringWidth = 0.7,
) {
  try {
    doc.addImage(MCL_LOGO_CIRCLE_PNG_BASE64, 'PNG', x, y, size, size);
    doc.setDrawColor(163, 207, 45);
    doc.setLineWidth(ringWidth);
    doc.circle(x + size / 2, y + size / 2, size / 2, 'S');
  } catch {
    // Continue without logo if embedding fails
  }
}
