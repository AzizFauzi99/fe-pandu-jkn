import type {
  BpjsStatus,
  ChatRequestBody,
  DoctorSummary,
  LoginResponse,
  Profile,
  ProfileBody,
  RegisterPayload,
  RegisterResponse,
  Session,
  SessionMessage,
} from "./types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
const TOKEN_KEY = "pandu-jkn.token";

export const AUTH_EXPIRED_EVENT = "pandu-jkn:auth-expired";

/* ---------------- token storage ---------------- */

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string, remember: boolean): void {
  clearToken();
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

/* ---------------- errors ---------------- */

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function messageFromDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg);
        }
        return String(item);
      })
      .filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  return fallback;
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { Accept: "application/json" };

  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, null, "Tidak bisa menghubungi server. Periksa koneksi Anda.");
  }

  if (res.status === 401 && auth) {
    clearToken();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }

  if (res.status === 204) return undefined as T;

  const payload = await readBody(res);

  if (!res.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? (payload as { detail: unknown }).detail
        : payload;
    throw new ApiError(
      res.status,
      detail,
      messageFromDetail(detail, "Permintaan gagal. Coba lagi."),
    );
  }

  return payload as T;
}

/* ---------------- endpoints ---------------- */

export const api = {
  register(payload: RegisterPayload) {
    return request<RegisterResponse>("/register", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },

  login(email: string, password: string) {
    return request<LoginResponse>("/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
  },

  logout() {
    return request<unknown>("/logout", { method: "POST" });
  },

  getProfile() {
    return request<Profile>("/profile");
  },

  saveProfile(body: ProfileBody) {
    return request<Profile>("/profile", { method: "PUT", body });
  },

  listSessions() {
    return request<Session[]>("/sessions");
  },

  getSessionMessages(sessionId: string) {
    return request<SessionMessage[]>(`/sessions/${encodeURIComponent(sessionId)}/messages`);
  },

  renameSession(sessionId: string, title: string) {
    return request<Session>(`/sessions/${encodeURIComponent(sessionId)}`, {
      method: "PATCH",
      body: { title },
    });
  },

  starSession(sessionId: string, starred: boolean) {
    return request<Session>(`/sessions/${encodeURIComponent(sessionId)}/star`, {
      method: "PUT",
      body: { starred },
    });
  },

  deleteSession(sessionId: string) {
    return request<void>(`/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
  },

  bpjsStatus(userId: string) {
    return request<BpjsStatus>(`/bpjs-status/${encodeURIComponent(userId)}`);
  },

  summary(sessionId: string) {
    return request<DoctorSummary>("/summary", {
      method: "POST",
      body: { session_id: sessionId },
    });
  },
};

/* ---------------- chat streaming (SSE) ---------------- */

export interface StreamHandlers {
  onSession?: (sessionId: string) => void;
  onToken?: (token: string) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

interface StreamEvent {
  session_id?: string;
  answer?: string;
  error?: string;
  completed?: boolean;
}

function dataFromEvent(raw: string): string {
  return raw
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
}

export async function streamChat(
  body: ChatRequestBody,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, null, "Tidak bisa menghubungi server. Periksa koneksi Anda.");
  }

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }

  if (!res.ok || !res.body) {
    const payload = await readBody(res);
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? (payload as { detail: unknown }).detail
        : payload;
    throw new ApiError(
      res.status,
      detail,
      messageFromDetail(detail, "Jawaban belum bisa diambil. Coba lagi."),
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  const handleEvent = (raw: string) => {
    const data = dataFromEvent(raw).trim();
    if (!data) return;

    let event: StreamEvent;
    try {
      event = JSON.parse(data) as StreamEvent;
    } catch {
      return;
    }

    if (event.session_id) handlers.onSession?.(event.session_id);
    if (event.answer) handlers.onToken?.(event.answer);
    if (event.error) handlers.onError?.(event.error);
    if (event.completed && !finished) {
      finished = true;
      handlers.onDone?.();
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let match = /\r?\n\r?\n/.exec(buffer);
    while (match) {
      const raw = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      handleEvent(raw);
      match = /\r?\n\r?\n/.exec(buffer);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) handleEvent(buffer);

  if (!finished) handlers.onDone?.();
}
