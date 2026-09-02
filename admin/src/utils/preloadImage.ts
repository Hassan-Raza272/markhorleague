/** Preload a remote image; resolves false on error or timeout. */
export function preloadImage(
  url: string,
  timeoutMs = 4000,
): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };

    const timer = window.setTimeout(() => finish(false), timeoutMs);
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;
  });
}

/** Wait briefly for a photo URL to appear in the live photos map. */
export async function waitForPhotoUrl(
  playerDocId: string,
  profileImage: string | null | undefined,
  getPhotos: () => Record<string, string>,
  maxWaitMs = 1500,
  intervalMs = 100,
): Promise<string | undefined> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const url = profileImage || getPhotos()[playerDocId];
    if (url) return url;
    await new Promise(r => window.setTimeout(r, intervalMs));
  }
  return profileImage || getPhotos()[playerDocId] || undefined;
}
