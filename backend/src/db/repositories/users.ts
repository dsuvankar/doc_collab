import sql from "../client.js";

// Create user
export async function createUser(email: string, passwordHash: string, name: string) {
  const rows = await sql`
    INSERT INTO users (email, password_hash, name)
    VALUES (${email}, ${passwordHash}, ${name})
    RETURNING id, email, name, created_at
  `;
  return rows[0];
}

// Get user by email
export async function getUserByEmail(email: string) {
  const rows = await sql`
    SELECT id, email, password_hash, name, created_at
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  return rows[0] || null;
}

// Get user by ID
export async function getUserById(id: number) {
  const rows = await sql`
    SELECT id, email, name, created_at
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] || null;
}
