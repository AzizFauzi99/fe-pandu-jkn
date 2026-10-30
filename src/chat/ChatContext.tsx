import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, streamChat } from "../api/client";
import type { ChatImage, Session } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ui/Toast";

export interface Photo {
  file: File;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  pending?: boolean;
  error?: boolean;
}

interface ChatValue {
  sessions: Session[];
  currentId: string | null;
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  photo: Photo | null;
  pickPhoto: (file: File | null) => void;
  sending: boolean;
  loadingThread: boolean;
  newChat: () => void;
  openSession: (session: Session) => Promise<void>;
  sendMessage: (override?: { text?: string; includePhoto?: boolean }) => Promise<void>;
  toggleStar: (session: Session) => Promise<void>;
  updateSession: (session: Session) => void;
  removeSession: (sessionId: string) => void;
}

const ChatContext = createContext<ChatValue | null>(null);

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const urlsRef = useRef<Set<string>>(new Set());
  const threadRequest = useRef(0);
  const generation = useRef(0);
  const lastToken = useRef<string | null>(null);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await api.listSessions());
    } catch {
      /* daftar percakapan bisa dimuat ulang nanti */
    }
  }, []);

  function makeUrl(file: File): string {
    const url = URL.createObjectURL(file);
    urlsRef.current.add(url);
    return url;
  }

  function releaseUrl(url: string) {
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  }

  function pickPhoto(file: File | null) {
    if (photo) releaseUrl(photo.url);
    setPhoto(file ? { file, url: makeUrl(file) } : null);
  }

  function clearImages() {
    setPhoto(null);
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
  }

  function clearThread() {
    generation.current += 1;
    threadRequest.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setCurrentId(null);
    setMessages([]);
    setInput("");
    setLoadingThread(false);
    setSending(false);
    clearImages();
  }

  // Sesi streaming tetap hidup saat pengguna berpindah halaman; hentikan hanya
  // ketika token berubah (logout/ganti akun) atau provider dilepas.
  useEffect(() => {
    if (lastToken.current === token) return;
    lastToken.current = token;
    clearThread();
    setSessions([]);
    if (token) void refreshSessions();
  }, [token, refreshSessions]);

  useEffect(
    () => () => {
      generation.current += 1;
      abortRef.current?.abort();
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current.clear();
    },
    [],
  );

  function newChat() {
    if (sending) {
      showToast("Tunggu hingga jawaban selesai sebelum memulai percakapan baru.");
      return;
    }
    clearThread();
  }

  async function openSession(session: Session) {
    if (session.id === currentId) return;
    if (sending) {
      showToast("Tunggu hingga jawaban selesai sebelum membuka percakapan lain.");
      return;
    }

    const request = ++threadRequest.current;
    setCurrentId(session.id);
    setMessages([]);
    setInput("");
    clearImages();
    setLoadingThread(true);

    try {
      const history = await api.getSessionMessages(session.id);
      if (threadRequest.current !== request) return;
      setMessages(
        history.map((message) => ({
          id: uid("h"),
          role: message.role,
          content: message.content,
        })),
      );
    } catch (err) {
      if (threadRequest.current === request) {
        showToast(
          err instanceof ApiError ? err.message : "Riwayat percakapan belum bisa dimuat.",
        );
      }
    } finally {
      if (threadRequest.current === request) setLoadingThread(false);
    }
  }

  async function sendMessage(override?: { text?: string; includePhoto?: boolean }) {
    const text = (override?.text ?? input).trim();
    const file = override?.includePhoto === false ? null : photo?.file ?? null;
    if ((!text && !file) || sending) return;

    const imageUrl = file ? photo?.url : undefined;
    const userId = uid("u");
    const assistantId = uid("a");
    const gen = ++generation.current;

    setMessages((current) => [
      ...current,
      { id: userId, role: "user", content: text, imageUrl },
      { id: assistantId, role: "assistant", content: "", pending: true },
    ]);
    setInput("");
    setPhoto(null);
    setSending(true);

    let sessionId = currentId;
    let created = false;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let images: ChatImage[] = [];
      if (file) {
        images = [{ mime_type: file.type, data: await fileToBase64(file) }];
      }

      await streamChat(
        { user_input: text, session_id: sessionId, images },
        {
          onSession: (id) => {
            if (generation.current !== gen) return;
            if (!sessionId) created = true;
            sessionId = id;
            setCurrentId(id);
          },
          onToken: (token) => {
            if (generation.current !== gen) return;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + token, pending: false }
                  : message,
              ),
            );
          },
          onError: (message) => {
            if (generation.current !== gen) return;
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantId
                  ? {
                      ...item,
                      content: `Jawaban belum bisa diambil: ${message}`,
                      pending: false,
                      error: true,
                    }
                  : item,
              ),
            );
          },
        },
        controller.signal,
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError" && generation.current === gen) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Jawaban belum bisa diambil. Periksa koneksi lalu kirim ulang pesan Anda.";
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? { ...item, content: message, pending: false, error: true }
              : item,
          ),
        );
      }
    } finally {
      if (generation.current === gen) {
        abortRef.current = null;
        setSending(false);
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId && item.pending ? { ...item, pending: false } : item,
          ),
        );

        if (created && sessionId) {
          const title = (text || "Analisis foto makanan").slice(0, 40);
          try {
            await api.renameSession(sessionId, title);
          } catch {
            /* judul bisa diperbarui nanti */
          }
        }
        if (sessionId) void refreshSessions();
      }
    }
  }

  async function toggleStar(session: Session) {
    const next = !session.starred;
    setSessions((current) =>
      current.map((item) => (item.id === session.id ? { ...item, starred: next } : item)),
    );
    try {
      await api.starSession(session.id, next);
    } catch {
      setSessions((current) =>
        current.map((item) =>
          item.id === session.id ? { ...item, starred: session.starred } : item,
        ),
      );
      showToast("Bintang belum bisa diubah. Coba lagi.");
    }
  }

  function updateSession(updated: Session) {
    setSessions((current) =>
      current.map((session) => (session.id === updated.id ? updated : session)),
    );
  }

  function removeSession(sessionId: string) {
    setSessions((current) => current.filter((session) => session.id !== sessionId));
    if (sessionId === currentId) clearThread();
  }

  return (
    <ChatContext.Provider
      value={{
        sessions,
        currentId,
        messages,
        input,
        setInput,
        photo,
        pickPhoto,
        sending,
        loadingThread,
        newChat,
        openSession,
        sendMessage,
        toggleStar,
        updateSession,
        removeSession,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat harus dipakai di dalam ChatProvider");
  return ctx;
}
