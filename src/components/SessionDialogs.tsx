import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { api, ApiError } from "../api/client";
import type { Session } from "../api/types";
import { Field } from "../ui/Field";
import { Icon } from "../ui/Icons";

function useDialog(onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);
}

function closeOnBackdrop(onClose: () => void) {
  return (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };
}

interface RenameProps {
  session: Session;
  onClose: () => void;
  onSaved: (session: Session) => void;
}

export function RenameSessionModal({ session, onClose, onSaved }: RenameProps) {
  const [title, setTitle] = useState(session.title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useDialog(onClose);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = title.trim();
    if (!next) {
      setError("Judul tidak boleh kosong.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      onSaved(await api.renameSession(session.id, next));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Judul belum bisa disimpan. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="renameTitle"
      onClick={closeOnBackdrop(onClose)}
    >
      <form className="modal" onSubmit={handleSubmit}>
        <button type="button" className="modalClose" aria-label="Tutup" onClick={onClose}>
          <Icon name="close" />
        </button>
        <h2 id="renameTitle">Ubah judul percakapan</h2>
        <p className="sub">Gunakan nama singkat agar percakapan mudah ditemukan kembali.</p>

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        <Field id="sessionTitle" label="Judul" hint={`${title.trim().length}/100 karakter`}>
          <input
            ref={inputRef}
            id="sessionTitle"
            value={title}
            maxLength={100}
            autoComplete="off"
            placeholder="Contoh: Konsultasi demam"
            onChange={(event) => {
              setTitle(event.target.value);
              if (error) setError("");
            }}
          />
        </Field>

        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button className="btn" type="submit" disabled={saving || !title.trim()}>
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface DeleteProps {
  session: Session;
  onClose: () => void;
  onDeleted: (sessionId: string) => void;
}

export function DeleteSessionModal({ session, onClose, onDeleted }: DeleteProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useDialog(onClose);

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      await api.deleteSession(session.id);
      onDeleted(session.id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Percakapan belum bisa dihapus. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deleteTitle"
      onClick={closeOnBackdrop(onClose)}
    >
      <div className="modal">
        <button type="button" className="modalClose" aria-label="Tutup" onClick={onClose}>
          <Icon name="close" />
        </button>
        <h2 id="deleteTitle">Hapus percakapan?</h2>
        <p className="sub">
          Percakapan “{session.title}” beserta seluruh riwayat pesannya akan dihapus permanen dan
          tidak bisa dikembalikan.
        </p>

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose} disabled={deleting}>
            Batal
          </button>
          <button className="btn danger" type="button" onClick={handleDelete} disabled={deleting}>
            <Icon name="trash" />
            {deleting ? "Menghapus…" : "Hapus percakapan"}
          </button>
        </div>
      </div>
    </div>
  );
}
