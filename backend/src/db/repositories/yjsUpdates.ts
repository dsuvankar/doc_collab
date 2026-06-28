import sql from "../client.js";
import * as Y from "yjs";

// Load updates
export async function loadUpdates(userId: number, docId: string) {
  const rows = await sql`
    SELECT yu.update_data
    FROM yjs_updates yu
    WHERE yu.doc_id = ${docId}
    ORDER BY yu.created_at ASC
  `;
  return rows.map(r => r.update_data);
}

// Save update
export async function saveUpdate(userId: number, docId: string, updateBuffer: Buffer) {
  const rows = await sql`
    INSERT INTO yjs_updates (doc_id, update_data, created_by)
    VALUES (${docId}, ${updateBuffer}, ${userId})
    RETURNING id
  `;
  return rows.length > 0;
}

/**
 * Compact updates into single snapshot
 */
export async function compactUpdates(docId: string, updates: Uint8Array[], createdBy: number) {
  if (updates.length <= 1) return; // nothing to compact

  // Merge updates
  const ydoc = new Y.Doc();
  for (const update of updates) {
    Y.applyUpdate(ydoc, update);
  }
  const merged = Buffer.from(Y.encodeStateAsUpdate(ydoc));

  // Save merged snapshot
  await sql.transaction(tx => [
    tx`DELETE FROM yjs_updates WHERE doc_id = ${docId}`,
    tx`
      INSERT INTO yjs_updates (doc_id, update_data, created_by)
      VALUES (${docId}, ${merged}, ${createdBy})
    `
  ]);
}
