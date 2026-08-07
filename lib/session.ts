export const SESSION_KEY = "cw_session";

export interface SessionData {
  userId: string;
  name: string;
}

export function getSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionData>;
    if (parsed && typeof parsed.userId === "string") {
      return { userId: parsed.userId, name: parsed.name ?? "" };
    }
    return null;
  } catch {
    return null;
  }
}

export function setSession(data: SessionData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
