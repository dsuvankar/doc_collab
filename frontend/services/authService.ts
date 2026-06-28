import { fetchApi } from "./apiClient";

export const authService = {
  login: (data: any) => 
    fetchApi("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    
  register: (data: any) =>
    fetchApi("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
