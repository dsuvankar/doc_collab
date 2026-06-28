import * as Y from "yjs";
import { Socket, Server } from "socket.io";
import { getDocById } from "../db/repositories/documents.js";
import { loadUpdates, saveUpdate, compactUpdates } from "../db/repositories/yjsUpdates.js";
import { saveVersion } from "../db/repositories/versions.js";
import { PushUpdateSchema } from "../schemas.js";

export function registerDocHandlers(io: Server, socket: Socket) {
  const user = socket.data.user;

  socket.on("join_doc", async (docId: string) => {
    try {
      const doc = await getDocById(docId);
      if (!doc) {
        socket.emit("error", "FORBIDDEN");
        return;
      }

      socket.join(docId);
      socket.data.docId = docId;

      const rawUpdates = await loadUpdates(user.userId, docId);

      // Merge updates into a single snapshot
      const mergedDoc = new Y.Doc();
      for (const update of rawUpdates) {
        Y.applyUpdate(mergedDoc, new Uint8Array(update));
      }
      const mergedUpdate = Y.encodeStateAsUpdate(mergedDoc);

      // Compact in background
      compactUpdates(docId, rawUpdates.map((u: any) => new Uint8Array(u)), user.userId)
        .catch((err: unknown) => console.error("[compactUpdates] failed:", err));

      console.log(`[join_doc] docId=${docId} rawUpdates=${rawUpdates.length} mergedBytes=${mergedUpdate.length}`);

      // Send merged snapshot
      socket.emit("load_doc", Array.from(mergedUpdate));
    } catch (err) {
      console.error("Error joining doc:", err);
    }
  });

  socket.on("push_update", async (payload: any) => {
    try {
      console.log("[push_update] Received payload from", socket.id);
      const parsed = PushUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        console.error("[push_update] Invalid payload:", parsed.error);
        socket.emit("error", "INVALID_PAYLOAD");
        return;
      }
      const { docId, update } = parsed.data;

      let updateBytes = update;
      if (update && update.type === 'Buffer' && Array.isArray(update.data)) {
        updateBytes = Buffer.from(update.data);
      } else if (update instanceof ArrayBuffer) {
        updateBytes = Buffer.from(update);
      } else if (!Buffer.isBuffer(update) && !(update instanceof Uint8Array)) {
        // Fallback for objects/arrays that are raw bytes
        updateBytes = Buffer.from(update);
      }

      // Validate update
      try {
        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, updateBytes);
      } catch (err) {
        console.error("[push_update] Corrupt update:", err);
        socket.emit("error", "CORRUPT_UPDATE");
        return;
      }

      await saveUpdate(user.userId, docId, updateBytes);
      console.log(`[push_update] Saved and broadcasting ${updateBytes.length} bytes for docId=${docId}`);
      socket.to(docId).emit("receive_update", Array.from(updateBytes));
    } catch (err) {
      console.error("Error pushing update:", err);
    }
  });

  socket.on("save_version", async (payload: any) => {
    try {
      const docId = payload.docId;
      const label = payload.label || "Auto-saved version";
      if (!docId) return;

      const updates = await loadUpdates(user.userId, docId);
      const ydoc = new Y.Doc();

      // Merge updates
      for (const updateBuffer of updates) {
        Y.applyUpdate(ydoc, updateBuffer);
      }

      const snapshot = Y.encodeStateAsUpdate(ydoc);
      await saveVersion(user.userId, docId, Buffer.from(snapshot), label);
      io.to(docId).emit("version_saved");
    } catch (err) {
      console.error("Error saving version:", err);
    }
  });
}
