"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

export function useYDoc(docId: string) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [ytext, setYtext] = useState<Y.Text | null>(null);

  useEffect(() => {
    if (!docId) return;

    const doc = new Y.Doc();

    const text = doc.getText("content");

    // Offline persistence
    const provider = new IndexeddbPersistence(docId, doc);

    provider.on("synced", () => {
      setIsLoaded(true);
    });

    // Update state
    setYdoc(doc);
    setYtext(text);

    return () => {
      provider.destroy();
      doc.destroy();
      setYdoc(null);
      setYtext(null);
      setIsLoaded(false);
    };
  }, [docId]);

  return { ydoc, ytext, isLoaded };
}
