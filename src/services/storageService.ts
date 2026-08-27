import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from '../constants';
import {
  CLOUDINARY,
  getCloudinaryUploadUrl,
  isCloudinaryConfigured,
} from '../config/cloudinary';

export function validateImage(
  uri: string,
  fileSize?: number,
  mimeType?: string,
): { valid: boolean; error?: string } {
  if (mimeType && !ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: 'Please upload a JPEG, PNG, or WebP image.',
    };
  }
  if (fileSize && fileSize > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return {
      valid: false,
      error: `Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB.`,
    };
  }
  if (!uri) {
    return { valid: false, error: 'Please select a profile picture.' };
  }
  return { valid: true };
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  url?: string;
  error?: { message?: string };
}

/**
 * Upload a profile image to Cloudinary and return the CDN URL.
 * Uses unsigned upload preset — never put API secrets in the mobile app.
 */
export async function uploadProfileImage(
  userId: string,
  uri: string,
  contentType: string = 'image/jpeg',
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured. Set cloudName and uploadPreset in src/config/cloudinary.ts',
    );
  }

  const mimeType = contentType.startsWith('image/')
    ? contentType
    : 'image/jpeg';
  const extension = mimeType.includes('png')
    ? 'png'
    : mimeType.includes('webp')
      ? 'webp'
      : 'jpg';

  // Unique public_id so each update gets a new CDN URL (fixed "profile"
  // reused the same URL and React Native Image kept showing the old photo).
  const publicId = `profile_${Date.now()}`;

  const formData = new FormData();
  formData.append('file', {
    uri,
    type: mimeType,
    name: `profile.${extension}`,
  } as unknown as Blob);
  formData.append('upload_preset', CLOUDINARY.uploadPreset);
  formData.append('folder', `${CLOUDINARY.folder}/${userId}`);
  formData.append('public_id', publicId);

  let response: Response;
  try {
    response = await fetch(getCloudinaryUploadUrl(), {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error(
      'Could not reach Cloudinary. Check your internet connection.',
    );
  }

  const data = (await response.json()) as CloudinaryUploadResponse;

  if (!response.ok || data.error) {
    throw new Error(
      data.error?.message ??
        `Cloudinary upload failed (${response.status}). Check cloud name and unsigned upload preset.`,
    );
  }

  const imageUrl = data.secure_url ?? data.url;
  if (!imageUrl) {
    throw new Error('Cloudinary did not return an image URL.');
  }

  return imageUrl;
}

/** Upload payment receipt screenshot to Cloudinary. */
export async function uploadPaymentReceipt(
  userId: string,
  uri: string,
  contentType: string = 'image/jpeg',
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured. Set cloudName and uploadPreset in src/config/cloudinary.ts',
    );
  }

  const mimeType = contentType.startsWith('image/')
    ? contentType
    : 'image/jpeg';
  const extension = mimeType.includes('png')
    ? 'png'
    : mimeType.includes('webp')
      ? 'webp'
      : 'jpg';

  const formData = new FormData();
  formData.append('file', {
    uri,
    type: mimeType,
    name: `receipt.${extension}`,
  } as unknown as Blob);
  formData.append('upload_preset', CLOUDINARY.uploadPreset);
  formData.append('folder', `${CLOUDINARY.folder}/${userId}/receipts`);
  formData.append('public_id', `receipt_${Date.now()}`);

  let response: Response;
  try {
    response = await fetch(getCloudinaryUploadUrl(), {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error(
      'Could not reach Cloudinary. Check your internet connection.',
    );
  }

  const data = (await response.json()) as CloudinaryUploadResponse;

  if (!response.ok || data.error) {
    throw new Error(
      data.error?.message ??
        `Cloudinary upload failed (${response.status}). Check cloud name and unsigned upload preset.`,
    );
  }

  const imageUrl = data.secure_url ?? data.url;
  if (!imageUrl) {
    throw new Error('Cloudinary did not return an image URL.');
  }

  return imageUrl;
}

/** Client apps cannot safely delete Cloudinary assets without an API secret. */
export async function deleteProfileImage(_userId: string): Promise<void> {
  // No-op: delete via Cloudinary dashboard or a secure backend if needed later.
}
