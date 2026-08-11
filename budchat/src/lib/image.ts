import sharp from "sharp";

/**
 * Normalises an uploaded image before it is written to disk.
 *
 * A modern phone camera produces 8–12 MB per shot, and a crew documenting a
 * flat takes dozens a day — stored raw, that fills the uploads volume and
 * makes every backup heavier for no gain, since nobody ever looks at a
 * defect photo at 4032px. Next.js already resizes on delivery, so the value
 * here is purely in what lands on disk.
 *
 * Three things happen on the way through:
 *  - EXIF orientation is baked into the pixels, so portrait shots from a
 *    phone don't appear sideways once metadata is dropped;
 *  - the long edge is capped, never enlarged — a small image stays as it is;
 *  - all other metadata is dropped, which also strips the GPS tags the
 *    camera embedded. Location is deliberately kept in the database column
 *    instead, where the app decides who may see it.
 */

/** Enough to zoom into a crack or a socket; ~10× smaller than the original. */
const PHOTO_MAX_EDGE = 2048;

/** Floor plans get more room — legibility of small annotations matters. */
const PLAN_MAX_EDGE = 3500;

const JPEG_QUALITY = 82;

export interface ProcessedImage {
  buffer: Buffer;
  /** File extension without the dot, matching the encoded bytes. */
  ext: string;
  /** False when the original was passed through untouched. */
  processed: boolean;
}

async function normalise(input: Buffer, maxEdge: number): Promise<ProcessedImage> {
  const output = await sharp(input)
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return { buffer: output, ext: "jpg", processed: true };
}

/**
 * Never fails the upload: an unreadable or exotic file is stored as it
 * arrived. Losing a photo taken on site is a worse outcome than storing an
 * oversized one, and the size ceiling in the route still applies.
 */
async function normaliseOrPassThrough(
  input: Buffer,
  mime: string,
  maxEdge: number
): Promise<ProcessedImage> {
  try {
    return await normalise(input, maxEdge);
  } catch (cause) {
    console.error("[image] Не удалось обработать изображение, сохраняю оригинал:", cause);
    const fallbackExt = (mime.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
    return { buffer: input, ext: fallbackExt, processed: false };
  }
}

export function processPhoto(input: Buffer, mime: string): Promise<ProcessedImage> {
  return normaliseOrPassThrough(input, mime, PHOTO_MAX_EDGE);
}

export function processPlan(input: Buffer, mime: string): Promise<ProcessedImage> {
  return normaliseOrPassThrough(input, mime, PLAN_MAX_EDGE);
}

/** Documents may be PDFs or office files, which must be stored byte-for-byte. */
export function isProcessableImage(mime: string): boolean {
  return ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(mime);
}
