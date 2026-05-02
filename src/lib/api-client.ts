// Lightweight fetch client for the self-hosted Arena API.
// Round 1: this file exists but stores still use localStorage.
// Round 2: stores will be rewired to call this client.
//
// Configure the API base URL by setting VITE_API_URL in your Lovable project's
// environment variables (e.g. https://arena.example.com/api).
// If not set, the API client is disabled and the app falls back to localStorage.

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const TOKEN_KEY = "arena_token";

export const apiEnabled = Boolean(API_URL);

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_URL) throw new ApiError(0, "API_URL not configured (set VITE_API_URL)");

  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const msg = (data && typeof data === "object" && "error" in data)
      ? String((data as { error: unknown }).error)
      : `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, data);
  }

  return data as T;
}

export const api = {
  get:    <T>(path: string)              => request<T>("GET",    path),
  post:   <T>(path: string, body?: unknown) => request<T>("POST",   path, body),
  patch:  <T>(path: string, body?: unknown) => request<T>("PATCH",  path, body),
  delete: <T>(path: string)              => request<T>("DELETE", path),
};

// --- Auth helpers ---
export type ApiUser = {
  id: string;
  email: string;
  employeeId?: string;
  role: "admin" | "hr" | "manager" | "employee";
  isApproved: boolean;
};

export async function signup(input: { email: string; password: string; name: string; employeeId?: string }) {
  const res = await api.post<{ token?: string; user?: ApiUser; message?: string }>("/auth/signup", input);
  if (res.token) setToken(res.token);
  return res;
}

export async function login(input: { email: string; password: string }) {
  const res = await api.post<{ token: string; user: ApiUser }>("/auth/login", input);
  setToken(res.token);
  return res;
}

export async function me() {
  return api.get<{ user: ApiUser }>("/auth/me");
}

export function logout() {
  setToken(null);
}

export async function health() {
  return api.get<{ ok: boolean; db: string; ts: number }>("/health");
}
