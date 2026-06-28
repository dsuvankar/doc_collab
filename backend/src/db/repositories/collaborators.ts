import sql from "../client.js";

// Add collaborator
export async function addCollaborator(ownerUserId: string, docId: string, email: string, role: string) {
  // Verify owner and insert
  const rows = await sql`
    WITH target_user AS (
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    ),
    is_owner AS (
      SELECT 1 FROM documents WHERE id = ${docId} AND owner_id = ${ownerUserId}
    )
    INSERT INTO document_collaborators (doc_id, user_id, role)
    SELECT ${docId}, (SELECT id FROM target_user), ${role}
    WHERE EXISTS (SELECT 1 FROM is_owner) AND EXISTS (SELECT 1 FROM target_user)
    ON CONFLICT (doc_id, user_id) DO UPDATE SET role = ${role}
    RETURNING user_id;
  `;
  
  return rows.length > 0 ? rows[0] : null;
}

// List collaborators
export async function listCollaborators(userId: string, docId: string) {
  // Verify access
  const rows = await sql`
    SELECT u.id, u.email, u.name, dc.role
    FROM document_collaborators dc
    JOIN users u ON dc.user_id = u.id
    WHERE dc.doc_id = ${docId}
      AND EXISTS (
        SELECT 1 FROM document_collaborators
        WHERE doc_id = ${docId} AND user_id = ${userId}
      )
  `;
  return rows;
}
