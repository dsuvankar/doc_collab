import sql from "../client.js";
import { nanoid } from "nanoid";

// Get user documents
export async function getDocsForUser(userId: number) {
  const rows = await sql`
    SELECT d.id, d.title, d.updated_at, dc.role
    FROM documents d
    JOIN document_collaborators dc ON d.id = dc.doc_id
    WHERE dc.user_id = ${userId}
    ORDER BY d.updated_at DESC
  `;
  return rows;
}

// Get document by ID
export async function getDocById(docId: string) {
  const rows = await sql`
    SELECT id, title, updated_at, owner_id
    FROM documents
    WHERE id = ${docId}
    LIMIT 1
  `;
  
  if (rows.length === 0) return null;
  
  return {
    id: rows[0].id, 
    title: rows[0].title, 
    updatedAt: rows[0].updated_at,
    ownerId: rows[0].owner_id
  };
}

// Create document
export async function createDocument(userId: number, title: string) {
  const docId = nanoid(10);
  const rows = await sql`
    WITH new_doc AS (
      INSERT INTO documents (id, title, owner_id)
      VALUES (${docId}, ${title}, ${userId})
      RETURNING id
    )
    INSERT INTO document_collaborators (doc_id, user_id, role)
    SELECT id, ${userId}, 'owner' FROM new_doc
    RETURNING doc_id
  `;
  
  return { docId: rows[0].doc_id };
}
