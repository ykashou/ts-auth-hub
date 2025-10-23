// Authentication utilities
export function getToken(): string | null {
  return localStorage.getItem("authToken");
}

export function setToken(token: string): void {
  localStorage.setItem("authToken", token);
}

export function clearToken(): void {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userRole");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function setUserRole(role: "admin" | "user"): void {
  localStorage.setItem("userRole", role);
}

export function getUserRole(): "admin" | "user" | null {
  return localStorage.getItem("userRole") as "admin" | "user" | null;
}
