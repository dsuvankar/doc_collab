import sql from "../client.js";

// List versions
export async function listVersions(userId: number, docId: string) {
  const rows = await sql`
    SELECT dv.id, dv.label, dv.created_at, dv.created_by, u.name as creator_name
    FROM document_versions dv
    JOIN users u ON dv.created_by = u.id
    WHERE dv.doc_id = ${docId}
    ORDER BY dv.created_at DESC
  `;
  return rows;
}

// Save version
export async function saveVersion(userId: number, docId: string, snapshotBuffer: Buffer, label: string | null) {
  const rows = await sql`
    INSERT INTO document_versions (doc_id, snapshot, label, created_by)
    VALUES (${docId}, ${snapshotBuffer}, ${label}, ${userId})
    RETURNING id
  `;
  return rows.length > 0 ? rows[0].id : null;
}

// Get version snapshot
export async function getVersionSnapshot(userId: number, docId: string, versionId: number) {
  const rows = await sql`
    SELECT dv.snapshot
    FROM document_versions dv
    WHERE dv.id = ${versionId} AND dv.doc_id = ${docId}
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0].snapshot : null;
}

// Delete version
export async function deleteVersion(userId: number, docId: string, versionId: number) {
  const result = await sql`
    DELETE FROM document_versions
    WHERE id = ${versionId}
      AND doc_id = ${docId}
      AND created_by = ${userId}
    RETURNING id
  `;
  return result.length > 0; // true = deleted, false = not found / not authorized
}
