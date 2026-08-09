"use client";

import { useSpeechToText } from "@/lib/use-speech-to-text";

export function MicButton({ onResult, className = "" }: { onResult: (text: string) => void; className?: string }) {
  const { supported, listening, start, stop } = useSpeechToText(onResult);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-xl transition ${
        listening ? "animate-pulse bg-status-red text-white" : "bg-bg-elevated text-text-secondary"
      } ${className}`}
      aria-label={listening ? "Остановить запись" : "Голосовой ввод"}
      title={listening ? "Идёт запись — нажмите, чтобы остановить" : "Надиктовать текст"}
    >
      {listening ? "⏺" : "🎤"}
    </button>
  );
}
