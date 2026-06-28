"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import * as Y from "yjs";

export function useSync(
  docId: string,
  ydoc: Y.Doc | null,
  onVersionSaved?: () => void
) {
  const [isOnline, setIsOnline] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Debounce isConnected to avoid unnecessary Yjs handler teardowns
  const [isConnected, setIsConnected] = useState(false);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounce isOnline to avoid status badge flicker
  const onlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Keep refs for socket handlers
  const ydocRef = useRef<Y.Doc | null>(ydoc);
  const onVersionSavedRef = useRef(onVersionSaved);

  useEffect(() => {
    ydocRef.current = ydoc;
  }, [ydoc]);

  useEffect(() => {
    onVersionSavedRef.current = onVersionSaved;
  }, [onVersionSaved]);

  // Socket lifecycle effect
  useEffect(() => {
    if (!docId) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080", {
      withCredentials: true,
      // Retry indefinitely with backoff
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000, // cap backoff at 10s
    });
    socketRef.current = socket;

    const cancelDisconnectTimer = () => {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
    };

    const cancelOnlineTimer = () => {
      if (onlineTimerRef.current) {
        clearTimeout(onlineTimerRef.current);
        onlineTimerRef.current = null;
      }
    };

    socket.on("connect", () => {
      // Cancel timers
      cancelDisconnectTimer();
      cancelOnlineTimer();
      setIsOnline(true);
      setIsReconnecting(false);
      setIsConnected(true);
      setConnectionError(null);
      socket.emit("join_doc", docId);
    });

    socket.on("disconnect", (reason) => {
      // Debounce isOnline false state
      onlineTimerRef.current = setTimeout(() => {
        setIsOnline(false);
        onlineTimerRef.current = null;
      }, 400);

      if (reason === "io server disconnect") {
        cancelDisconnectTimer();
        cancelOnlineTimer();
        setIsOnline(false);
        setIsConnected(false);
        setIsReconnecting(false);
        setConnectionError("Disconnected by server. Please refresh.");
        return;
      }

      // Handle auto-reconnect
      setIsReconnecting(true);
      disconnectTimerRef.current = setTimeout(() => {
        // Mark disconnected after 8s
        setIsConnected(false);
        disconnectTimerRef.current = null;
      }, 8000);
    });

    // Handle connection errors
    socket.on("connect_error", (err) => {
      const message = err.message || "Connection failed";
      if (message === "UNAUTHORIZED") {
        // Auth error
        cancelDisconnectTimer();
        setIsReconnecting(false);
        setIsConnected(false);
        setConnectionError("Authentication failed. Please log in again.");
      } else {
        // Transient error
        setIsReconnecting(true);
      }
      console.error("[useSync] Socket connect_error:", message);
    });

    socket.on("reconnect", () => {
      // Re-join document room
      socket.emit("join_doc", docId);
    });

    socket.on("version_saved", () => {
      onVersionSavedRef.current?.();
    });

    // Apply server snapshot and push local edits
    socket.on("load_doc", (serverSnapshot: Uint8Array) => {
      const doc = ydocRef.current;
      if (!doc) return;

      // 1. Decode snapshot
      const snapshotBytes = new Uint8Array(serverSnapshot);

      // 2. Compute server state vector
      const serverDoc = new Y.Doc();
      Y.applyUpdate(serverDoc, snapshotBytes);
      const serverStateVector = Y.encodeStateVector(serverDoc);

      // 3. Apply server snapshot
      Y.applyUpdate(doc, snapshotBytes, socket);

      // 4. Push local edits
      const offlineDiff = Y.encodeStateAsUpdate(doc, serverStateVector);
      // Emit diff if not empty
      if (offlineDiff.length > 2) {
        console.log(`[useSync] Pushing ${offlineDiff.length} bytes of offline edits to server`);
        socket.emit("push_update", { docId, update: offlineDiff });
      }
    });


    socket.on("receive_update", (update: Uint8Array) => {
      const doc = ydocRef.current;
      if (!doc) return;
      Y.applyUpdate(doc, new Uint8Array(update), socket);
    });

    // Reconnect when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !socket.connected) {
        console.log("[useSync] Tab became visible, socket disconnected — reconnecting...");
        socket.connect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelDisconnectTimer();
      cancelOnlineTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      socket.disconnect();
      socketRef.current = null;
      setIsOnline(false);
      setIsConnected(false);
      setIsReconnecting(false);
      setConnectionError(null);
    };
  }, [docId]); // ← ydoc intentionally excluded

  // Yjs update handler effect
  useEffect(() => {
    const socket = socketRef.current;
    if (!ydoc || !socket || !isConnected) return;

    const handleUpdate = (update: Uint8Array, origin: any) => {
      if (origin !== socket) {
        socket.emit("push_update", { docId, update });
      }
    };

    ydoc.on("update", handleUpdate);
    return () => {
      ydoc.off("update", handleUpdate);
    };
  }, [ydoc, docId, isConnected]);

  const saveVersion = (label?: string) => {
    if (socketRef.current && isOnline) {
      socketRef.current.emit("save_version", { docId, label });
    }
  };

  return { isOnline, isReconnecting, connectionError, saveVersion };
}
