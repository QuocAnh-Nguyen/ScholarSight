export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}

export function clearToken(): void {
  localStorage.removeItem("token")
}