import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type RefObject,
} from "react";
import Markdown from "react-markdown";
import type { Session } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useChat, type Photo } from "../chat/ChatContext";
import { DeleteSessionModal, RenameSessionModal } from "../components/SessionDialogs";
import { SummaryModal } from "../components/SummaryModal";
import { firstName } from "../lib/profile";
import { Icon } from "../ui/Icons";
import { Shell } from "../ui/Shell";
import { useToast } from "../ui/Toast";

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
  const {
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
  } = useChat();

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [renaming, setRenaming] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState<Session | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (stage) stage.scrollTop = stage.scrollHeight;
  }, [messages, loadingThread]);

  useEffect(() => {
    if (!loadingThread) textareaRef.current?.focus();
  }, [loadingThread, currentId]);

  function handleNewChat() {
    newChat();
    setSummaryOpen(false);
    textareaRef.current?.focus();
  }

  function handleOpenSession(session: Session) {
    setSummaryOpen(false);
    void openSession(session);
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

  function askRename(session: Session) {
    if (sending) {
      showToast("Tunggu hingga jawaban selesai sebelum mengubah judul.");
      return;
    }
    setRenaming(session);
  }

  function askDelete(session: Session) {
    if (sending) {
      showToast("Tunggu hingga jawaban selesai sebelum menghapus percakapan.");
      return;
    }
    setDeleting(session);
  }

  function handleRenamed(updated: Session) {
    updateSession(updated);
    setRenaming(null);
    showToast("Judul percakapan diperbarui.");
  }

  function handleDeleted(sessionId: string) {
    removeSession(sessionId);
    setDeleting(null);
    if (sessionId === currentId) setSummaryOpen(false);
    showToast("Percakapan dihapus.");
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
          <button className="newbtn" id="newChat" type="button" onClick={handleNewChat}>
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
                        onClick={() => handleOpenSession(session)}
                      >
                        {session.title}
                      </button>
                      <div className={`convActions${session.starred ? " starred" : ""}`}>
                        <button
                          type="button"
                          className="convbtn danger"
                          title="Hapus percakapan"
                          aria-label={`Hapus percakapan: ${session.title}`}
                          onClick={() => askDelete(session)}
                        >
                          <Icon name="trash" />
                        </button>
                        <button
                          type="button"
                          className="convbtn"
                          title="Ubah judul"
                          aria-label={`Ubah judul: ${session.title}`}
                          onClick={() => askRename(session)}
                        >
                          <Icon name="pencil" />
                        </button>
                        <button
                          type="button"
                          className={`convbtn starbtn${session.starred ? " on" : ""}`}
                          aria-pressed={session.starred}
                          aria-label={`${session.starred ? "Hapus bintang" : "Beri bintang"}: ${session.title}`}
                          onClick={() => void toggleStar(session)}
                        >
                          <Icon name="star" />
                        </button>
                      </div>
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

      {renaming && (
        <RenameSessionModal
          session={renaming}
          onClose={() => setRenaming(null)}
          onSaved={handleRenamed}
        />
      )}

      {deleting && (
        <DeleteSessionModal
          session={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={handleDeleted}
        />
      )}
    </Shell>
  );
}
