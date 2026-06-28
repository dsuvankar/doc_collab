"use client";

import { useEffect, RefObject } from "react";
import * as Y from "yjs";

export function useTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  ytext: Y.Text | null,
  isLoaded: boolean,
  syncTrigger?: number   // incremented by useSync after each load_doc to force a re-sync
) {
  useEffect(() => {
    if (!ref.current || !ytext || !isLoaded) return;

    const textarea = ref.current;

    // Initial value
    textarea.value = ytext.toString();

    // Listen to remote changes
    const observer = (event: Y.YTextEvent, transaction: Y.Transaction) => {
      // Ignore local changes
      if (transaction.origin === textarea) return;

      // Update textarea on remote change
      const currentCursor = textarea.selectionStart;
      textarea.value = ytext.toString();
      
      // Attempt to restore cursor
      textarea.setSelectionRange(currentCursor, currentCursor);
    };

    ytext.observe(observer);

    // Listen to local changes
    const handleInput = () => {
      if (!ytext.doc) return;

      const oldStr = ytext.toString();
      const newStr = textarea.value;

      if (oldStr === newStr) return;

      // Find diff
      let start = 0;
      while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
        start++;
      }

      let oldEnd = oldStr.length - 1;
      let newEnd = newStr.length - 1;
      while (oldEnd >= start && newEnd >= start && oldStr[oldEnd] === newStr[newEnd]) {
        oldEnd--;
        newEnd--;
      }

      const deletedChars = oldEnd - start + 1;
      const insertedStr = newStr.slice(start, newEnd + 1);

      ytext.doc.transact(() => {
        if (deletedChars > 0) {
          ytext.delete(start, deletedChars);
        }
        if (insertedStr.length > 0) {
          ytext.insert(start, insertedStr);
        }
      }, textarea); // Pass origin to ignore locally
    };

    textarea.addEventListener("input", handleInput);

    return () => {
      ytext.unobserve(observer);
      textarea.removeEventListener("input", handleInput);
    };
  }, [ref, ytext, isLoaded, syncTrigger]);
}
