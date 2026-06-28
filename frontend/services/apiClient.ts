export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Helper function to handle standard JSON fetch responses
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "An error occurred");
  }

  return json;
}
