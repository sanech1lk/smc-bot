/** A single freehand stroke, stored in 0..1 space so it scales to any size. */
export interface Stroke {
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

function isStroke(value: unknown): value is Stroke {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Partial<Stroke>;
  return typeof s.color === "string" && typeof s.width === "number" && Array.isArray(s.points);
}

/**
 * Markup arrives from the database as free-form text, so anything malformed
 * must degrade to "no markup" rather than throw while rendering a photo.
 */
export function parseAnnotations(raw: string | null | undefined): Stroke[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStroke);
  } catch {
    return [];
  }
}

/** Paints saved strokes onto a canvas sized to the displayed photo. */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = Math.max(2, stroke.width * Math.min(w, h));
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
    for (const p of stroke.points.slice(1)) ctx.lineTo(p.x * w, p.y * h);
    // A single tap should still leave a visible dot.
    if (stroke.points.length === 1) ctx.lineTo(stroke.points[0].x * w + 0.1, stroke.points[0].y * h);
    ctx.stroke();
  }
}
