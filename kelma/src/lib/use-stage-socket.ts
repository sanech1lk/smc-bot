"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket-client";

export function useStageSocket(stageId: string) {
  useEffect(() => {
    const socket = getSocket();
    socket.emit("stage:join", stageId);
    return () => {
      socket.emit("stage:leave", stageId);
    };
  }, [stageId]);

  return getSocket();
}
