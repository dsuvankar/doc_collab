export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Helper function to handle standard JSON fetch responses
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  let json;
  try {
    json = await res.json();
  } catch (err) {
    json = { message: "An error occurred" };
  }

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new Error(json.message || "An error occurred");
  }

  return json;
}
