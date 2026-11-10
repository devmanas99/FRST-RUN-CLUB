import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import appletConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId,
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== 'remixed-project-id'
);

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Keep users signed in between visits
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Ignore persistence errors in restricted browser contexts
});

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_INPUT_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_OUTPUT_BLOB_BYTES = 300 * 1024; // 300 KB

export interface PixelCropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Validates that a chosen file is JPG, PNG, or WebP and <= 8 MB.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return 'Please choose a JPG, PNG, or WebP image file.';
  }
  if (file.size > MAX_INPUT_FILE_BYTES) {
    return 'Image is too large (max 8 MB). Please choose a smaller photo.';
  }
  return null;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the selected image.'));
    img.src = src;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Could not encode image as JPEG.'));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Crops the image using the user's crop box, resizes on-device (max 400px for avatar,
 * max 1200px for banner), re-encodes as JPEG at ~80% quality (stripping EXIF/location data),
 * and guarantees the output is under 300 KB.
 */
export async function cropAndCompressImage(
  imageSrc: string,
  crop: PixelCropArea,
  kind: 'avatar' | 'banner'
): Promise<Blob> {
  const img = await loadImageElement(imageSrc);

  const maxWidth = kind === 'avatar' ? 400 : 1200;
  const maxHeight = kind === 'avatar' ? 400 : 400;

  const scale = Math.min(1, maxWidth / Math.max(1, crop.width), maxHeight / Math.max(1, crop.height));
  const targetWidth = Math.max(1, Math.round(crop.width * scale));
  const targetHeight = Math.max(1, Math.round(crop.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not process image on this device.');
  }

  // Fill with white in case of transparent PNG/WebP
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  let quality = 0.8;
  let blob = await canvasToJpegBlob(canvas, quality);

  while (blob.size > MAX_OUTPUT_BLOB_BYTES && quality > 0.35) {
    quality = Number((quality - 0.12).toFixed(2));
    blob = await canvasToJpegBlob(canvas, quality);
  }

  if (blob.size > MAX_OUTPUT_BLOB_BYTES) {
    throw new Error('Processed image is still over 300 KB. Please try a simpler image.');
  }

  return blob;
}

export function formatStorageError(err: unknown): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'You appear to be offline. Please check your internet connection and try again.';
  }
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('storage/unauthorized') || raw.includes('permission')) {
    return 'Permission denied. Make sure you are signed in to your own profile and the file is under 1 MB.';
  }
  if (raw.includes('storage/canceled')) {
    return 'Upload was cancelled.';
  }
  if (raw.includes('storage/quota-exceeded')) {
    return 'Storage quota reached. Please try again later.';
  }
  if (raw.includes('network') || raw.includes('offline') || raw.includes('retry-limit')) {
    return 'Network error while uploading. Please check your connection and try again.';
  }
  return raw.replace('Firebase: ', '');
}

/**
 * Uploads a cropped/compressed JPEG blob (< 300 KB) to Firebase Storage at:
 * - profiles/{uid}/avatar.jpg
 * - profiles/{uid}/banner.jpg
 */
export async function uploadCroppedProfileImage(
  uid: string,
  kind: 'avatar' | 'banner',
  blob: Blob,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Please reconnect and try again.');
  }
  if (blob.size > MAX_OUTPUT_BLOB_BYTES) {
    throw new Error('Image must be under 300 KB.');
  }

  const path = `profiles/${uid}/${kind}.jpg`;
  const storageRef = ref(storage, path);

  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg',
      cacheControl: 'public,max-age=3600',
    });

    task.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (err) => {
        reject(new Error(formatStorageError(err)));
      },
      () => {
        if (onProgress) onProgress(100);
        resolve();
      }
    );
  });

  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl.slice(0, 1000);
}

/**
 * Removes the user's avatar or banner from Firebase Storage at profiles/{uid}/{kind}.jpg
 */
export async function deleteProfileImageFromStorage(
  uid: string,
  kind: 'avatar' | 'banner'
): Promise<void> {
  const path = `profiles/${uid}/${kind}.jpg`;
  const storageRef = ref(storage, path);
  try {
    await deleteObject(storageRef);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('storage/object-not-found')) {
      // Ignore if file wasn't in Storage (e.g. external URL or already removed)
      console.warn('Notice removing file from storage:', msg);
    }
  }
}

/**
 * Square-crops, resizes to max 300px, compresses to under 100 KB,
 * and uploads a collaboration partner logo to collabs/{collabId}.jpg
 */
export async function uploadCollabLogoImage(
  collabId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const MAX_LOGO_BYTES = 100 * 1024; // 100 KB
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const minSide = Math.max(1, Math.min(img.width, img.height));
    const sx = Math.round((img.width - minSide) / 2);
    const sy = Math.round((img.height - minSide) / 2);

    const targetSide = Math.min(300, minSide);

    const canvas = document.createElement('canvas');
    canvas.width = targetSide;
    canvas.height = targetSide;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process logo image.');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetSide, targetSide);
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSide, targetSide);

    let quality = 0.82;
    let blob = await canvasToJpegBlob(canvas, quality);
    while (blob.size > MAX_LOGO_BYTES && quality > 0.35) {
      quality = Number((quality - 0.12).toFixed(2));
      blob = await canvasToJpegBlob(canvas, quality);
    }

    if (blob.size > MAX_LOGO_BYTES) {
      throw new Error('Logo image must be under 100 KB after compression.');
    }

    const storageRef = ref(storage, `collabs/${collabId}.jpg`);
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, blob, {
        contentType: 'image/jpeg',
        cacheControl: 'public,max-age=3600',
      });
      task.on(
        'state_changed',
        (snap) => {
          if (onProgress && snap.totalBytes > 0) {
            onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
          }
        },
        (err) => reject(new Error(formatStorageError(err))),
        () => {
          if (onProgress) onProgress(100);
          resolve();
        }
      );
    });

    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl.slice(0, 1000);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!isFirebaseConfigured) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();
