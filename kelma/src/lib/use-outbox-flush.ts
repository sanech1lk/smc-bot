"use client";

import { useEffect, useRef } from "react";
import { flushOutbox } from "@/lib/outbox";

type FlushCallbacks = Parameters<typeof flushOutbox>[0];

/** Flushes the offline outbox on mount and whenever the browser regains connectivity. */
export function useOutboxFlush(callbacks: FlushCallbacks) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    flushOutbox(callbacksRef.current);

    function onOnline() {
      flushOutbox(callbacksRef.current);
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
}
