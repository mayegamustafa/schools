import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30 MB
export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export function uploadToCloudinary(
  buffer: Buffer,
  options: UploadApiOptions
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) return reject(error ?? new Error('Upload failed'));
      resolve(result);
    });
    stream.end(buffer);
  });
}

/**
 * Per-kind delivery transforms. School logos are shown at ~64-96px and covers at
 * banner width, so there is no reason to store or serve the original camera file.
 */
export function transformsFor(kind: string): UploadApiOptions {
  switch (kind) {
    case 'logo':
      return {
        transformation: [{ width: 512, height: 512, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
      };
    case 'cover':
      return {
        transformation: [{ width: 1600, height: 900, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
      };
    case 'gallery':
      return {
        transformation: [{ width: 1600, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
      };
    default:
      return {};
  }
}

export { cloudinary };
