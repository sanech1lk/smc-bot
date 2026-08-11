"use client";

import { Mic, Square } from "lucide-react";
import { useSpeechToText } from "@/lib/use-speech-to-text";
import { useLocale } from "@/components/locale-provider";

export function MicButton({ onResult, className = "" }: { onResult: (text: string) => void; className?: string }) {
  const { t } = useLocale();
  const { supported, listening, start, stop } = useSpeechToText(onResult);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition ${
        listening ? "animate-pulse bg-status-red text-white" : "bg-bg-elevated text-text-secondary"
      } ${className}`}
      aria-label={listening ? t("micButton.stopRecording") : t("micButton.voiceInput")}
      title={listening ? t("micButton.recordingTitle") : t("micButton.dictateTitle")}
    >
      {listening ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
    </button>
  );
}
