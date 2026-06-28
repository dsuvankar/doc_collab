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
  // Increments each time load_doc fully processes — used to trigger a textarea re-sync
  const [syncKey, setSyncKey] = useState(0);

  // Debounce isConnected to avoid unnecessary Yjs handler teardowns
  const [isConnected, setIsConnected] = useState(false);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounce isOnline to avoid status badge flicker
  const onlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isApplyingSnapshotRef = useRef(false);

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

    const hasConnectedRef = { current: false };

    socket.on("connect", () => {
      // Cancel timers
      cancelDisconnectTimer();
      cancelOnlineTimer();
      setIsOnline(true);
      setIsReconnecting(false);
      setIsConnected(true);
      setConnectionError(null);

      if (hasConnectedRef.current) {
        // Reconnect after going offline — reload so the merged doc state is fresh
        window.location.reload();
        return;
      }

      hasConnectedRef.current = true;
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

    // NOTE: socket.on("connect") already fires on every reconnect in socket.io v4.
    // A separate "reconnect" handler would cause a duplicate join_doc + load_doc,
    // leading to a spurious second push_update that corrupts offline sync.

    socket.on("version_saved", () => {
      onVersionSavedRef.current?.();
    });

    // Apply server snapshot and push local edits
    socket.on("load_doc", (serverSnapshot: Uint8Array) => {
      console.log("[useSync] load_doc called, length:", serverSnapshot.byteLength || serverSnapshot.length || serverSnapshot);
      const doc = ydocRef.current;
      if (!doc) {
        console.warn("[useSync] load_doc: No ydocRef.current!");
        return;
      }

     
      const snapshotBytes = serverSnapshot instanceof Uint8Array ? serverSnapshot : new Uint8Array(serverSnapshot);

      // Compute server state vector
      const serverDoc = new Y.Doc();
      Y.applyUpdate(serverDoc, snapshotBytes);
      const serverStateVector = Y.encodeStateVector(serverDoc);

      // Compute offline diff BEFORE applying server snapshot
      const offlineDiff = Y.encodeStateAsUpdate(doc, serverStateVector);

      // Apply server snapshot 
      
      isApplyingSnapshotRef.current = true;
      Y.applyUpdate(doc, snapshotBytes, socket);
      isApplyingSnapshotRef.current = false;

      // Push offline edits to server
      if (offlineDiff.length > 2) {
        console.log(`[useSync] Pushing ${offlineDiff.length} bytes of offline edits to server`);
        socket.emit("push_update", { docId, update: Array.from(offlineDiff) });
      }

     
      setSyncKey((k) => k + 1);
    });


    socket.on("receive_update", (update: Uint8Array) => {
      console.log("[useSync] receive_update called, length:", update.byteLength || update.length || update);
      const doc = ydocRef.current;
      if (!doc) {
        console.warn("[useSync] receive_update: No ydocRef.current!");
        return;
      }
      try {
        const updateArr = update instanceof Uint8Array ? update : new Uint8Array(update);
        Y.applyUpdate(doc, updateArr, socket);
      } catch (err) {
        console.error("[useSync] Failed to apply update:", err);
      }
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
  }, [docId]); 
  // Yjs update handler effect
  useEffect(() => {
    const socket = socketRef.current;
    if (!ydoc || !socket || !isConnected) return;

    const handleUpdate = (update: Uint8Array, origin: any) => {
      // Skip if we're applying the server snapshot in load_doc
      if (isApplyingSnapshotRef.current) return;
      if (origin !== socket) {
        socket.emit("push_update", { docId, update: Array.from(update) });
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

  return { isOnline, isReconnecting, connectionError, saveVersion, syncKey };
}
