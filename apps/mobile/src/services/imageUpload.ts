/**
 * Image upload service using Cloudinary
 * Handles compression and direct upload to Cloudinary CDN
 */

import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';

// Get cloud name from app config, fallback to placeholder
const CLOUD_NAME = Constants.expoConfig?.extra?.cloudinaryCloudName || 'YOUR_CLOUD_NAME';
const UPLOAD_PRESET = 'wishlist_app';

// Cloudinary upload endpoint
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export type ImageFolder = 'avatars' | 'items' | 'wishlists';

interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  error?: {
    message: string;
  };
}

/**
 * Compress an image to reduce file size before upload
 * @param uri Local file URI
 * @param maxWidth Maximum width (height scales proportionally)
 * @param quality Compression quality (0-1)
 */
async function compressImage(
  uri: string,
  maxWidth: number = 800,
  quality: number = 0.7
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { 
      compress: quality, 
      format: ImageManipulator.SaveFormat.JPEG 
    }
  );
  return result.uri;
}

/**
 * Upload an image to Cloudinary
 * @param localUri Local file URI (file://)
 * @param folder Destination folder in Cloudinary
 * @returns Upload result with URL and metadata
 */
export async function uploadImage(
  localUri: string,
  folder: ImageFolder
): Promise<UploadResult> {
  // Validate cloud name is configured
  if (CLOUD_NAME === 'YOUR_CLOUD_NAME') {
    throw new Error(
      'Cloudinary not configured. Please set cloudinaryCloudName in app.json extra config.'
    );
  }

  // Skip upload if not a local file (already a URL)
  if (!localUri.startsWith('file://') && !localUri.startsWith('content://')) {
    // Already a remote URL, return as-is
    return {
      url: localUri,
      publicId: '',
      width: 0,
      height: 0,
    };
  }

  try {
    // 1. Compress image to reduce file size (~200KB)
    const compressedUri = await compressImage(localUri);

    // 2. Create form data for upload
    const formData = new FormData();
    formData.append('file', {
      uri: compressedUri,
      type: 'image/jpeg',
      name: `${Date.now()}.jpg`,
    } as any);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', `wishlist/${folder}`);

    // 3. Upload directly to Cloudinary
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const data: CloudinaryResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
    };
  } catch (error) {
    console.error('Image upload error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to upload image'
    );
  }
}

/**
 * Upload an avatar image (optimized settings for profile pictures)
 * @param localUri Local file URI
 * @returns Uploaded image URL
 */
export async function uploadAvatar(localUri: string): Promise<string> {
  const result = await uploadImage(localUri, 'avatars');
  return result.url;
}

/**
 * Upload an item image
 * @param localUri Local file URI
 * @returns Uploaded image URL
 */
export async function uploadItemImage(localUri: string): Promise<string> {
  const result = await uploadImage(localUri, 'items');
  return result.url;
}

/**
 * Upload a wishlist cover image
 * @param localUri Local file URI
 * @returns Uploaded image URL
 */
export async function uploadWishlistCover(localUri: string): Promise<string> {
  const result = await uploadImage(localUri, 'wishlists');
  return result.url;
}

/**
 * Get a transformed Cloudinary URL for optimized delivery
 * @param url Original Cloudinary URL
 * @param width Desired width
 * @param height Desired height (optional)
 * @returns Transformed URL
 */
export function getTransformedUrl(
  url: string,
  width: number,
  height?: number
): string {
  if (!url.includes('cloudinary.com')) {
    return url; // Not a Cloudinary URL
  }

  // Insert transformation after /upload/
  const transformation = height
    ? `c_fill,w_${width},h_${height},f_auto,q_auto`
    : `c_scale,w_${width},f_auto,q_auto`;

  return url.replace('/upload/', `/upload/${transformation}/`);
}

/**
 * Get a thumbnail URL (square, face-focused for avatars)
 * @param url Original Cloudinary URL
 * @param size Thumbnail size (default 100)
 * @returns Thumbnail URL
 */
export function getThumbnailUrl(url: string, size: number = 100): string {
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  return url.replace(
    '/upload/',
    `/upload/c_thumb,g_face,w_${size},h_${size},f_auto,q_auto/`
  );
}
