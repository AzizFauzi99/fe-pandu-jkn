import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { BpjsCategory, BpjsStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { DataFields, HealthFields } from "../components/ProfileFields";
import {
  formToPatch,
  initial,
  profileToForm,
  validateForm,
  type ProfileForm,
} from "../lib/profile";
import type { RequiredField } from "../lib/validation";
import { Shell } from "../ui/Shell";
import { useToast } from "../ui/Toast";

const DATA_FIELDS: RequiredField[] = ["name", "phone", "birth", "sex", "nik"];
const HEALTH_FIELDS: RequiredField[] = ["height", "weight"];

const BPJS_LABEL: Record<BpjsCategory, string> = {
  sudah_aktif: "Aktif",
  bisa_daftar: "Bisa daftar",
  perlu_tindakan: "Perlu tindakan",
  tidak_bisa: "Tidak bisa",
  perlu_verifikasi: "Perlu verifikasi",
};

const BPJS_TONE: Record<BpjsCategory, "ok" | "bad" | "warn"> = {
  sudah_aktif: "ok",
  bisa_daftar: "warn",
  perlu_tindakan: "bad",
  tidak_bisa: "bad",
  perlu_verifikasi: "warn",
};

export function ProfilePage() {
  const { profile, saveProfile } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState<ProfileForm>(() => profileToForm(profile));
  const [errors, setErrors] = useState<ReturnType<typeof validateForm>>({});
  const [saving, setSaving] = useState<"data" | "health" | null>(null);

  const [bpjs, setBpjs] = useState<BpjsStatus | null>(null);
  const [bpjsLoading, setBpjsLoading] = useState(false);
  const [bpjsError, setBpjsError] = useState("");
  const [bpjsAttempt, setBpjsAttempt] = useState(0);

  useEffect(() => {
    setForm(profileToForm(profile));
  }, [profile]);

  const nik = profile?.nik;

  useEffect(() => {
    if (!nik) {
      setBpjs(null);
      setBpjsError("");
      return;
    }
    let cancelled = false;
    setBpjsLoading(true);
    setBpjsError("");
    api
      .bpjsStatus(nik)
      .then((status) => {
        if (!cancelled) setBpjs(status);
      })
      .catch((err) => {
        if (!cancelled) {
          setBpjsError(
            err instanceof ApiError ? err.message : "Status BPJS belum bisa dimuat. Coba lagi.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setBpjsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nik, bpjsAttempt]);

  function change(key: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(kind: "data" | "health") {
    const next = validateForm(form, kind === "data" ? DATA_FIELDS : HEALTH_FIELDS);
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(kind);
    try {
      await saveProfile(formToPatch(form));
      showToast(kind === "data" ? "Data diri disimpan." : "Data kesehatan disimpan.");
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? err.message
          : "Perubahan belum bisa disimpan. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setSaving(null);
    }
  }

  const tone = bpjs ? BPJS_TONE[bpjs.kategori] : "warn";

  return (
    <Shell active="profile" title="Profil">
      <div className="page">
        <div className="head">
          <span className="avatar">{initial(profile?.nama_lengkap)}</span>
          <div>
            <h1>{profile?.nama_lengkap || "Pengguna"}</h1>
            <p>{profile?.email}</p>
          </div>
        </div>

        <form
          className="sec"
          noValidate
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void save("data");
          }}
        >
          <h2>Data diri</h2>
          <p>Dipakai agen untuk menyesuaikan jawaban dan menyiapkan ringkasan bagi dokter.</p>
          <DataFields prefix="p" form={form} errors={errors} onChange={change} />
          <div className="actions">
            <button className="btn" type="submit" disabled={saving !== null}>
              {saving === "data" ? "Menyimpan…" : "Simpan perubahan"}
            </button>
          </div>
        </form>

        <form
          className="sec"
          noValidate
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void save("health");
          }}
        >
          <h2>Data kesehatan</h2>
          <p>Wajib untuk analisis foto makanan dan rekomendasi gizi.</p>
          <HealthFields prefix="p" form={form} errors={errors} onChange={change} />
          <div className="actions">
            <button className="btn" type="submit" disabled={saving !== null}>
              {saving === "health" ? "Menyimpan…" : "Simpan data kesehatan"}
            </button>
          </div>
        </form>

        <section className="sec">
          <h2>Status kepesertaan</h2>
          <p>Data BPJS berdasarkan NIK yang terdaftar pada akun Anda.</p>

          {!nik ? (
            <p className="empty">Isi NIK terlebih dahulu untuk melihat status kepesertaan.</p>
          ) : bpjsLoading ? (
            <div className="center">
              <span className="spinner" />
              Memeriksa status…
            </div>
          ) : bpjsError ? (
            <div className="status">
              <p>{bpjsError}</p>
              <div className="actions">
                <button className="btn ghost" type="button" onClick={() => setBpjsAttempt((n) => n + 1)}>
                  Coba lagi
                </button>
              </div>
            </div>
          ) : bpjs ? (
            <div className="status">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <b>{bpjs.status ?? "Status tidak ditemukan"}</b>
                <span className={`tag ${tone}`}>{BPJS_LABEL[bpjs.kategori]}</span>
              </div>
              {(bpjs.segmen || bpjs.kelasRawat) && (
                <p className="muted">
                  {[bpjs.segmen && `Segmen: ${bpjs.segmen}`, bpjs.kelasRawat && `Kelas: ${bpjs.kelasRawat}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              <p>{bpjs.alasan}</p>
              <ul>
                <li>{bpjs.tindakan}</li>
              </ul>
              <div className="actions">
                <button className="btn ghost" type="button" onClick={() => setBpjsAttempt((n) => n + 1)}>
                  Periksa ulang
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <div className="actions" style={{ justifyContent: "flex-start" }}>
          <Link to="/chat">Kembali ke percakapan</Link>
        </div>
      </div>
    </Shell>
  );
}
