"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Eraser, Undo2, X } from "lucide-react";
import { drawStrokes, parseAnnotations, type Stroke } from "@/lib/annotations";
import { useLocale } from "@/components/locale-provider";

const COLORS = ["#ef4444", "#eab308", "#22c55e", "#3b82f6", "#ffffff"];

/**
 * Full-screen markup editor: draw arrows/circles over a site photo to point
 * out a defect. Strokes are stored separately from the file, so the original
 * photo (and its GPS stamp) is never altered.
 */
export function PhotoAnnotator({
  photoUrl,
  initial,
  onCancel,
  onSave
}: {
  photoUrl: string;
  initial: string | null | undefined;
  onCancel: () => void;
  onSave: (serialised: string | null) => Promise<void> | void;
}) {
  const { t } = useLocale();
  const [strokes, setStrokes] = useState<Stroke[]>(() => parseAnnotations(initial));
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    const ctx = canvas.getContext("2d");
    if (ctx) drawStrokes(ctx, strokes, canvas.width, canvas.height);
  }, [strokes]);

  useEffect(() => {
    redraw();
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [redraw]);

  function pointAt(e: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    };
  }

  function onDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const p = pointAt(e);
    setStrokes((prev) => [...prev, { color, width: 0.008, points: [p] }]);
  }

  function onMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const p = pointAt(e);
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, points: [...last.points, p] }];
    });
  }

  function onUp() {
    drawing.current = false;
  }

  async function handleSave() {
    setSaving(true);
    await onSave(strokes.length > 0 ? JSON.stringify(strokes) : null);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="top-safe flex items-center justify-between px-4 py-3">
        <button
          onClick={onCancel}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label={t("photoAnnotator.cancelAria")}
        >
          <X size={20} />
        </button>
        <p className="font-semibold text-white">{t("photoAnnotator.title")}</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white disabled:opacity-50"
          aria-label={t("photoAnnotator.saveAria")}
        >
          <Check size={20} />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center p-3">
        <div ref={wrapRef} className="relative max-h-full w-full max-w-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" className="max-h-[70vh] w-full object-contain" />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          />
        </div>
      </div>

      <div className="bottom-nav-safe flex items-center justify-center gap-3 px-4 py-4">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-9 w-9 rounded-full border-2 transition-transform ${
              color === c ? "scale-110 border-white" : "border-white/30"
            }`}
            style={{ backgroundColor: c }}
            aria-label={t("photoAnnotator.colorAria", { color: c })}
          />
        ))}
        <button
          onClick={() => setStrokes((prev) => prev.slice(0, -1))}
          disabled={strokes.length === 0}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
          aria-label={t("photoAnnotator.undoAria")}
        >
          <Undo2 size={19} />
        </button>
        <button
          onClick={() => setStrokes([])}
          disabled={strokes.length === 0}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
          aria-label={t("photoAnnotator.clearAria")}
        >
          <Eraser size={19} />
        </button>
      </div>
    </div>
  );
}

/** Read-only overlay that renders saved markup on top of a photo. */
export function AnnotationOverlay({ annotations }: { annotations: string | null | undefined }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = parseAnnotations(annotations);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    if (ctx) drawStrokes(ctx, strokes, canvas.width, canvas.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations]);

  useEffect(() => {
    redraw();
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [redraw]);

  if (strokes.length === 0) return null;
  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
