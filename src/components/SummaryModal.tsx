import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../api/client";
import type { DoctorSummary } from "../api/types";
import { Icon } from "../ui/Icons";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Pills({ items }: { items: string[] }) {
  if (!items.length) return <p className="pillrow"><span className="pill">Tidak disebutkan</span></p>;
  return (
    <p className="pillrow">
      {items.map((item) => (
        <span className="pill" key={item}>
          {item}
        </span>
      ))}
    </p>
  );
}

function List({ items }: { items: string[] }) {
  if (!items.length) return <p>Tidak disebutkan</p>;
  return (
    <ul className="summary-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function triageTone(level: string): "ok" | "bad" | "warn" {
  if (level === "emergency") return "bad";
  if (level === "mandiri") return "ok";
  return "warn";
}

export function SummaryModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [summary, setSummary] = useState<DoctorSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .summary(sessionId)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Ringkasan belum bisa dibuat. Periksa koneksi lalu coba lagi.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, attempt]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summaryTitle"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal wide">
        <button type="button" className="modalClose" aria-label="Tutup ringkasan" onClick={onClose}>
          <Icon name="close" />
        </button>
        <h2 id="summaryTitle">Ringkasan untuk dokter</h2>
        <p className="sub">
          Dibuat dari percakapan ini. Informasi yang tidak disebutkan pasien tidak ditambahkan.
        </p>

        {loading ? (
          <div className="center">
            <span className="spinner" />
            Menyusun ringkasan…
          </div>
        ) : error ? (
          <>
            <div className="alert" role="alert">
              {error}
            </div>
            <div className="actions">
              <button className="btn ghost" type="button" onClick={() => setAttempt((value) => value + 1)}>
                Coba lagi
              </button>
            </div>
          </>
        ) : summary ? (
          <div className="summary-grid">
            <Block title="Keluhan utama">
              <p>{summary.keluhan_utama || "Tidak disebutkan"}</p>
            </Block>
            <Block title="Onset">
              <p>{summary.onset || "Tidak disebutkan"}</p>
            </Block>
            <Block title="Tingkat keparahan">
              <p>{summary.tingkat_keparahan || "Tidak disebutkan"}</p>
            </Block>
            <Block title="Level triase">
              <p>
                <span className={`tag ${triageTone(summary.level_triase)}`}>
                  {summary.level_triase}
                </span>
              </p>
            </Block>
            <Block title="Gejala penyerta">
              <Pills items={summary.gejala_penyerta} />
            </Block>
            <Block title="Profil singkat">
              <p>
                Usia: {summary.usia ?? "tidak disebutkan"} · Jenis kelamin:{" "}
                {summary.jenis_kelamin || "tidak disebutkan"}
              </p>
            </Block>
            <Block title="Riwayat penyakit">
              <Pills items={summary.riwayat_penyakit} />
            </Block>
            <Block title="Alergi">
              <Pills items={summary.alergi} />
            </Block>
            <Block title="Obat saat ini">
              <Pills items={summary.obat_saat_ini} />
            </Block>
            <Block title="Saran yang diberikan">
              <List items={summary.saran_diberikan} />
            </Block>
            <Block title="Data yang belum lengkap">
              <Pills items={summary.data_belum_lengkap} />
            </Block>
          </div>
        ) : null}

        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>
            <Icon name="close" />
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
