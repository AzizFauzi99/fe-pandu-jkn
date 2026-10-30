import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { formToPatch, isProfileComplete, profileToForm, validateForm } from "../lib/profile";
import { REQUIRED_FIELDS } from "../lib/validation";
import { useToast } from "../ui/Toast";
import { DataFields, HealthFields } from "./ProfileFields";

export function CompleteProfileModal() {
  const { profile, saveProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState(() => profileToForm(profile));
  const [errors, setErrors] = useState<ReturnType<typeof validateForm>>({});
  const [alert, setAlert] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const order = ["mn", "mp", "md", "ms", "mnik", "mh", "mw"];
    for (const id of order) {
      const element = document.getElementById(id) as
        | HTMLInputElement
        | HTMLSelectElement
        | null;
      if (element && !element.value) {
        element.focus();
        break;
      }
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!profile || isProfileComplete(profile)) return null;

  function change(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert("");

    const next = validateForm(form, REQUIRED_FIELDS);
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const saved = await saveProfile(formToPatch(form));
      if (isProfileComplete(saved)) showToast("Profil lengkap. Selamat datang!");
      else setAlert("Masih ada data wajib yang belum lengkap.");
    } catch (err) {
      setAlert(
        err instanceof ApiError
          ? err.message
          : "Profil belum bisa disimpan. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="mTitle" aria-describedby="mDesc">
      <form className="modal" onSubmit={handleSubmit} noValidate>
        <h2 id="mTitle">Lengkapi profil Anda</h2>
        <p className="sub" id="mDesc">
          Data berikut wajib diisi sebelum Anda bisa memakai percakapan. Agen memakainya untuk
          menyesuaikan jawaban dan menyiapkan ringkasan bagi dokter.
        </p>

        {alert && (
          <div className="alert" role="alert">
            {alert}
          </div>
        )}

        <DataFields prefix="m" form={form} errors={errors} onChange={change} />
        <HealthFields prefix="m" form={form} errors={errors} onChange={change} />

        <button className="btn block" type="submit" disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan dan lanjutkan"}
        </button>
        <p className="alt">
          <button className="linkbtn" type="button" onClick={handleLogout}>
            Keluar dari akun
          </button>
        </p>
      </form>
    </div>
  );
}
