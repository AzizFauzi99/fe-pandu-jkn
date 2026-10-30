import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type RefObject,
} from "react";
import Markdown from "react-markdown";
import { api, ApiError, streamChat } from "../api/client";
import type { ChatImage, Session } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { SummaryModal } from "../components/SummaryModal";
import { firstName } from "../lib/profile";
import { Icon } from "../ui/Icons";
import { Shell } from "../ui/Shell";
import { useToast } from "../ui/Toast";

interface Photo {
  file: File;
  url: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  pending?: boolean;
  error?: boolean;
}

interface Chip {
  title: string;
  color: string;
  icon: string;
  prompt: string;
  action?: "photo" | "send";
}

const CHIPS: Chip[] = [
  {
    title: "Cek kepesertaan",
    color: "#3b82f6",
    icon: "check",
    prompt:
      "Apakah saya berhak menjadi peserta BPJS? Jelaskan syaratnya, apa yang menghalangi, dan cara mendaftar.",
  },
  {
    title: "Konsultasi keluhan",
    color: "#22c55e",
    icon: "heart",
    prompt: "Saya ingin konsultasi tentang keluhan: ",
  },
  {
    title: "Analisis makanan",
    color: "#f97316",
    icon: "camera",
    prompt: "Analisis kandungan gizi makanan ini dan beri rekomendasi.",
    action: "photo",
  },
  {
    title: "Status BPJS",
    color: "#a855f7",
    icon: "clock",
    prompt:
      "Cek status BPJS saya: aktif atau nonaktif? Jika nonaktif, apa penyebabnya dan bagaimana mengaktifkannya kembali?",
    action: "send",
  },
];

const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/webp"];
const NOTE =
  "Agen memberi informasi umum, bukan diagnosis. Untuk kondisi darurat, hubungi 119 atau segera ke IGD.";

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

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  photo: Photo | null;
  onPick: (file: File | null) => void;
  disabled: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

function Composer({
  value,
  onChange,
  onSend,
  photo,
  onPick,
  disabled,
  textareaRef,
  fileInputRef,
}: ComposerProps) {
  const { showToast } = useToast();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [value, textareaRef]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGES.includes(file.type)) {
      showToast("Pilih gambar JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast("Ukuran gambar maksimal 8 MB.");
      return;
    }
    onPick(file);
  }

  return (
    <div className="comp">
      {photo && (
        <div className="prev">
          <div>
            <img src={photo.url} alt="Foto makanan" />
            <button type="button" aria-label="Hapus foto" onClick={() => onPick(null)}>
              ×
            </button>
          </div>
        </div>
      )}
      <div className="box">
        <button
          className="iconbtn attach"
          type="button"
          aria-label="Lampirkan foto makanan"
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon name="attach" />
        </button>
        <textarea
          ref={textareaRef}
          rows={2}
          placeholder="Tanyakan seputar BPJS atau keluhan Anda"
          aria-label="Pesan"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
        <button
          className="send"
          type="button"
          disabled={disabled || (!value.trim() && !photo)}
          aria-label="Kirim pesan"
          onClick={onSend}
        >
          <Icon name="send" />
        </button>
      </div>
    </div>
  );
}

export function ChatPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlsRef = useRef<Set<string>>(new Set());
  const threadRequest = useRef(0);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await api.listSessions());
    } catch {
      /* daftar percakapan bisa dimuat ulang nanti */
    }
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    const stage = stageRef.current;
    if (stage) stage.scrollTop = stage.scrollHeight;
  }, [messages, loadingThread]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current.clear();
    },
    [],
  );

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

  function resetImages() {
    setPhoto(null);
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
  }

  function newChat() {
    if (sending) return;
    threadRequest.current += 1;
    setCurrentId(null);
    setMessages([]);
    setInput("");
    resetImages();
    setSummaryOpen(false);
    textareaRef.current?.focus();
  }

  async function openSession(session: Session) {
    if (sending || session.id === currentId) return;
    const request = ++threadRequest.current;
    setCurrentId(session.id);
    setMessages([]);
    setInput("");
    resetImages();
    setSummaryOpen(false);
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
      if (threadRequest.current === request) {
        setLoadingThread(false);
        textareaRef.current?.focus();
      }
    }
  }

  async function sendMessage(override?: { text?: string; includePhoto?: boolean }) {
    const text = (override?.text ?? input).trim();
    const file = override?.includePhoto === false ? null : photo?.file ?? null;
    if ((!text && !file) || sending) return;

    const imageUrl = photo?.url;
    const userId = uid("u");
    const assistantId = uid("a");

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
            if (!sessionId) created = true;
            sessionId = id;
            setCurrentId(id);
          },
          onToken: (token) => {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + token, pending: false }
                  : message,
              ),
            );
          },
          onError: (message) => {
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
      if ((err as Error).name !== "AbortError") {
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

  function handleChip(chip: Chip) {
    if (chip.action === "photo") {
      setInput(chip.prompt);
      fileInputRef.current?.click();
      return;
    }
    if (chip.action === "send") {
      void sendMessage({ text: chip.prompt, includePhoto: false });
      return;
    }
    setInput(chip.prompt);
    textareaRef.current?.focus();
  }

  const currentSession = sessions.find((session) => session.id === currentId) ?? null;

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

  const groups: Array<[string, Session[]]> = [
    ["Berbintang", sessions.filter((session) => session.starred)],
    ["Terbaru", sessions.filter((session) => !session.starred)],
  ];

  const hasThread = messages.length > 0;

  const topActions = currentSession ? (
    <>
      <button
        type="button"
        className="iconbtn"
        aria-label="Ringkasan untuk dokter"
        title="Ringkasan untuk dokter"
        onClick={() => setSummaryOpen(true)}
      >
        <Icon name="file" />
      </button>
      <button
        type="button"
        className={`iconbtn starTop${currentSession.starred ? " on" : ""}`}
        aria-pressed={currentSession.starred}
        aria-label={
          currentSession.starred ? "Hapus bintang percakapan" : "Beri bintang percakapan"
        }
        onClick={() => void toggleStar(currentSession)}
      >
        <Icon name="star" />
      </button>
    </>
  ) : undefined;

  return (
    <Shell
      active="chat"
      title="Percakapan"
      column
      sidebarTop={
        <div className="newwrap">
          <button className="newbtn" id="newChat" type="button" onClick={newChat}>
            <Icon name="plus" />
            Percakapan baru
          </button>
        </div>
      }
      sidebarBody={
        <div className="list" id="cList">
          {sessions.length === 0 ? (
            <p className="empty">Belum ada percakapan.</p>
          ) : (
            groups.map(([name, items]) =>
              items.length === 0 ? null : (
                <div key={name}>
                  <div className="group">{name}</div>
                  {items.map((session) => (
                    <div className="conv" key={session.id}>
                      <button
                        type="button"
                        className={`item${currentId === session.id ? " on" : ""}`}
                        title={session.title}
                        onClick={() => void openSession(session)}
                      >
                        {session.title}
                      </button>
                      <button
                        type="button"
                        className={`starbtn${session.starred ? " on" : ""}`}
                        aria-pressed={session.starred}
                        aria-label={`${session.starred ? "Hapus bintang" : "Beri bintang"}: ${session.title}`}
                        onClick={() => void toggleStar(session)}
                      >
                        <Icon name="star" />
                      </button>
                    </div>
                  ))}
                </div>
              ),
            )
          )}
        </div>
      }
      topActions={topActions}
    >
      <div className="stage" ref={stageRef}>
        {loadingThread ? (
          <div className="center">
            <span className="spinner" />
            Memuat percakapan…
          </div>
        ) : !hasThread ? (
          <div className="welcome" id="cWelcome">
            <h1 className="hello">
              <Icon name="sparkle" />
              <span>Ada yang bisa dibantu, {firstName(profile?.nama_lengkap)}?</span>
            </h1>
            <Composer
              value={input}
              onChange={setInput}
              onSend={() => void sendMessage()}
              photo={photo}
              onPick={pickPhoto}
              disabled={sending}
              textareaRef={textareaRef}
              fileInputRef={fileInputRef}
            />
            <div className="chips">
              {CHIPS.map((chip) => (
                <button
                  className="chip"
                  key={chip.title}
                  type="button"
                  style={{ "--c": chip.color } as CSSProperties}
                  onClick={() => handleChip(chip)}
                >
                  <Icon name={chip.icon} />
                  {chip.title}
                </button>
              ))}
            </div>
            <p className="note">{NOTE}</p>
          </div>
        ) : (
          <div className="thread" id="cThread">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`msg ${message.role === "user" ? "u" : "b"}${message.error ? " error" : ""}`}
              >
                {message.imageUrl && <img src={message.imageUrl} alt="Foto makanan" />}
                {message.pending && !message.content ? (
                  <span className="dots">
                    <span />
                    <span />
                    <span />
                  </span>
                ) : message.role === "assistant" && !message.error ? (
                  <Markdown>{message.content}</Markdown>
                ) : (
                  message.content
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {hasThread && !loadingThread && (
        <div className="dock" id="cDock">
          <Composer
            value={input}
            onChange={setInput}
            onSend={() => void sendMessage()}
            photo={photo}
            onPick={pickPhoto}
            disabled={sending}
            textareaRef={textareaRef}
            fileInputRef={fileInputRef}
          />
          <p className="note">{NOTE}</p>
        </div>
      )}

      {summaryOpen && currentId && (
        <SummaryModal sessionId={currentId} onClose={() => setSummaryOpen(false)} />
      )}
    </Shell>
  );
}
