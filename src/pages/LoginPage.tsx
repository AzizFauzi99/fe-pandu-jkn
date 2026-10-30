import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "../ui/AuthLayout";
import { Field, PasswordField } from "../ui/Field";
import { useToast } from "../ui/Toast";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [alert, setAlert] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert("");

    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = "Isi email Anda.";
    if (!password) nextErrors.password = "Isi kata sandi.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password, remember);
      navigate("/chat", { replace: true });
    } catch (err) {
      setAlert(
        err instanceof ApiError
          ? err.status === 401
            ? "Email atau kata sandi tidak cocok. Periksa lagi lalu coba masuk kembali."
            : err.message
          : "Tidak bisa masuk. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout mode="login">
      <h1>Masuk</h1>
      <p className="sub">Masuk untuk melanjutkan percakapan Anda.</p>

      {alert && (
        <div className="alert" role="alert">
          {alert}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Field id="lid" label="Email" error={errors.email}>
          <input
            id="lid"
            type="email"
            autoComplete="username"
            placeholder="nama@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errors.email ? "true" : undefined}
          />
        </Field>

        <Field id="lpw" label="Kata sandi" error={errors.password}>
          <PasswordField
            id="lpw"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder="Masukkan kata sandi"
            error={errors.password}
          />
        </Field>

        <div className="between">
          <label className="check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Ingat saya
          </label>
          <a
            href="#forgot"
            onClick={(event) => {
              event.preventDefault();
              showToast("Fitur atur ulang kata sandi belum tersedia.");
            }}
          >
            Lupa kata sandi?
          </a>
        </div>

        <button className="btn block" type="submit" disabled={submitting}>
          {submitting ? "Memproses…" : "Masuk"}
        </button>
      </form>

      <p className="alt">
        Belum punya akun? <Link to="/register">Daftar</Link>
      </p>
    </AuthLayout>
  );
}
