"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { useSession } from "next-auth/react";
import {
  DEFAULT_SETTINGS,
  shouldPlayMessageSound,
  shouldVibrateForMessage,
  type UserSettingsShape
} from "@/lib/settings";
import { playSound, unlockAudio, vibrate } from "@/lib/sounds";

interface SettingsContextValue {
  settings: UserSettingsShape;
  loaded: boolean;
  /** Optimistic local update + PATCH to the server; rolls back on failure. */
  update: (patch: Partial<UserSettingsShape>) => Promise<boolean>;
  /** Plays the configured message sound/vibration, respecting quiet hours. */
  notifyMessage: (options?: { chatIsOpen?: boolean }) => void;
  notifySend: () => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  update: async () => false,
  notifyMessage: () => {},
  notifySend: () => {}
});

export const useSettings = () => useContext(SettingsContext);

/** Applies the interface text scale as a root font-size — every size in the
 *  app is in rem, so this alone reaches every screen without a rewrite. */
function applyTextScale(percent: number) {
  document.documentElement.style.fontSize = `${percent}%`;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [settings, setSettings] = useState<UserSettingsShape>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.settings) return;
        setSettings(data.settings);
        applyTextScale(data.settings.textScale);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));

    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    // Unauthenticated screens (login, register, legal pages) always render
    // at 100% — the scale is a signed-in preference, not a device setting.
    if (status !== "authenticated") applyTextScale(100);
  }, [status]);

  useEffect(() => {
    // First real tap anywhere unlocks the audio context, so the very first
    // notification sound of the session isn't silently dropped.
    const onFirstInteraction = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", onFirstInteraction);
    };
    window.addEventListener("pointerdown", onFirstInteraction, { once: true });
    return () => window.removeEventListener("pointerdown", onFirstInteraction);
  }, []);

  const update = useCallback(async (patch: Partial<UserSettingsShape>) => {
    const previous = settingsRef.current;
    const next = { ...previous, ...patch };
    setSettings(next);
    if (patch.textScale) applyTextScale(patch.textScale);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      if (!res.ok) throw new Error("save failed");
      return true;
    } catch {
      setSettings(previous);
      if (patch.textScale) applyTextScale(previous.textScale);
      return false;
    }
  }, []);

  const notifyMessage = useCallback((options?: { chatIsOpen?: boolean }) => {
    const s = settingsRef.current;
    const chatIsOpen = options?.chatIsOpen ?? false;
    if (shouldPlayMessageSound(s, { chatIsOpen })) playSound(s.soundName, s.soundVolume);
    if (shouldVibrateForMessage(s, { chatIsOpen })) vibrate(40);
  }, []);

  const notifySend = useCallback(() => {
    const s = settingsRef.current;
    if (s.soundOnSend && s.soundEnabled) playSound("ping", Math.min(s.soundVolume, 40));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loaded, update, notifyMessage, notifySend }}>
      {children}
    </SettingsContext.Provider>
  );
}
