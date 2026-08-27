import { jsPDF } from 'jspdf';
import ReactNativeBlobUtil from 'react-native-blob-util';

export type PdfImage = {
  data: string;
  format: 'JPEG' | 'PNG';
};

export const PDF_PHOTO_SIZE_MM = 11;
const IMAGE_FETCH_CONCURRENCY = 6;

/** Small JPEG thumb for PDF embedding (Cloudinary or original URL). */
export function getPlayerPhotoThumbUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace(
      '/upload/',
      '/upload/w_120,h_120,c_fill,g_face,f_jpg,q_70/',
    );
  }
  return url;
}

/** Circular player avatar for squad posters (Cloudinary round crop). */
export function getPlayerPhotoCircleUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace(
      '/upload/',
      '/upload/w_128,h_128,c_fill,g_face,r_max,f_png,q_80/',
    );
  }
  return url;
}

async function fetchImageBase64(
  url: string,
  timeoutMs = 20000,
): Promise<PdfImage | null> {
  try {
    const res = await ReactNativeBlobUtil.config({
      timeout: timeoutMs,
    }).fetch('GET', url);
    const status = res.info().status;
    if (status < 200 || status >= 300) {
      return null;
    }
    const data = await res.base64();
    if (!data) return null;

    const contentType = String(
      res.info().headers?.['Content-Type'] ??
        res.info().headers?.['content-type'] ??
        '',
    ).toLowerCase();
    const lowerUrl = url.toLowerCase();
    const format: 'JPEG' | 'PNG' =
      contentType.includes('png') || lowerUrl.includes('f_png') || lowerUrl.includes('r_max')
        ? 'PNG'
        : 'JPEG';
    return { data, format };
  } catch {
    return null;
  }
}

export async function loadPdfImageFromUrl(
  url?: string | null,
): Promise<PdfImage | null> {
  if (!url) return null;
  return fetchImageBase64(url);
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

  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    () => run(),
  );
  await Promise.all(runners);
  return results;
}

export async function loadPdfImagesFromUrls(
  urls: Array<string | undefined | null>,
): Promise<Array<PdfImage | null>> {
  // Always load circular Cloudinary crops for PDF table photos
  return loadCircleImagesFromUrls(urls);
}

/** Circular avatars (Cloudinary r_max PNG when available). */
export async function loadCircleImagesFromUrls(
  urls: Array<string | undefined | null>,
): Promise<Array<PdfImage | null>> {
  return mapWithConcurrency(urls, IMAGE_FETCH_CONCURRENCY, async url => {
    const circle = getPlayerPhotoCircleUrl(url) ?? getPlayerPhotoThumbUrl(url);
    if (!circle) return null;
    return fetchImageBase64(circle);
  });
}

export function drawPdfPhotoPlaceholder(
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

/**
 * Draws a circular player photo in a table cell.
 * Uses pre-rounded Cloudinary PNGs + lime ring (no jsPDF clip).
 */
export function drawPdfPhotoInCell(
  doc: jsPDF,
  img: PdfImage | null | undefined,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
  size: number = PDF_PHOTO_SIZE_MM,
) {
  const x = cellX + (cellWidth - size) / 2;
  const y = cellY + (cellHeight - size) / 2;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;

  if (img) {
    try {
      doc.addImage(img.data, img.format, x, y, size, size);
      doc.setDrawColor(163, 207, 45);
      doc.setLineWidth(0.45);
      doc.circle(cx, cy, r, 'S');
      return;
    } catch {
      // Fall through to placeholder
    }
  }
  drawPdfPhotoPlaceholder(doc, x, y, size);
}
