/**
 * Cloudinary config for profile photo uploads.
 *
 * Setup:
 * 1. Create account at https://cloudinary.com
 * 2. Copy your Cloud Name from the dashboard
 * 3. Settings → Upload → Upload presets → Add upload preset
 *    - Signing mode: Unsigned
 *    - Folder: mcl-players (optional)
 *    - Allowed formats: jpg, png, webp
 * 4. Paste cloud name + preset name below
 */
export const CLOUDINARY = {
  cloudName: 'cifzbvap',
  uploadPreset: 'gsxeh67j',
  folder: 'mcl-players',
} as const;

export function getCloudinaryUploadUrl(): string {
  return `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`;
}

export function isCloudinaryConfigured(): boolean {
  return (
    CLOUDINARY.cloudName !== 'YOUR_CLOUD_NAME' &&
    CLOUDINARY.uploadPreset !== 'YOUR_UNSIGNED_PRESET' &&
    Boolean(CLOUDINARY.cloudName) &&
    Boolean(CLOUDINARY.uploadPreset)
  );
}
