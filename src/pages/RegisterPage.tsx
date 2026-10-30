import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "../ui/AuthLayout";
import { Field, PasswordField } from "../ui/Field";
import { useToast } from "../ui/Toast";
import { EMAIL_RE, NIK_RE, PHONE_RE } from "../lib/validation";

type Errors = Partial<Record<"name" | "email" | "phone" | "nik" | "password" | "confirm" | "terms", string>>;

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nik, setNik] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [alert, setAlert] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert("");

    const next: Errors = {};
    if (name.trim().length < 3) next.name = "Isi nama lengkap, minimal 3 huruf.";
    if (!EMAIL_RE.test(email.trim())) next.email = "Masukkan email yang valid.";
    if (!PHONE_RE.test(phone.replace(/[\s-]/g, "")))
      next.phone = "Masukkan nomor HP Indonesia, misalnya 0812…";
    if (!NIK_RE.test(nik)) next.nik = "NIK minimal 6 digit angka.";
    if (password.length < 8) next.password = "Kata sandi minimal 8 karakter.";
    if (confirm !== password) next.confirm = "Kata sandi tidak sama.";
    if (!terms) next.terms = "Centang persetujuan untuk melanjutkan.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await register({
        nama_lengkap: name.trim(),
        email: email.trim(),
        no_hp: phone.replace(/[\s-]/g, "").replace(/^\+/, ""),
        nik,
        password,
      });
      showToast("Akun berhasil dibuat.");
      navigate("/chat", { replace: true });
    } catch (err) {
      setAlert(
        err instanceof ApiError
          ? err.message
          : "Akun belum bisa dibuat. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout mode="register">
      <h1>Buat akun</h1>
      <p className="sub">Isi data berikut untuk mulai memakai Pandu JKN.</p>

      {alert && (
        <div className="alert" role="alert">
          {alert}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Field id="rname" label="Nama lengkap" error={errors.name}>
          <input
            id="rname"
            autoComplete="name"
            placeholder="Sesuai KTP"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={errors.name ? "true" : undefined}
          />
        </Field>

        <div className="row">
          <Field id="remail" label="Email" error={errors.email}>
            <input
              id="remail"
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={errors.email ? "true" : undefined}
            />
          </Field>
          <Field id="rphone" label="Nomor HP" error={errors.phone}>
            <input
              id="rphone"
              type="tel"
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              aria-invalid={errors.phone ? "true" : undefined}
            />
          </Field>
        </div>

        <Field
          id="rnik"
          label="NIK"
          hint="Gunakan NIK yang terdaftar sebagai peserta JKN."
          error={errors.nik}
        >
          <input
            id="rnik"
            inputMode="numeric"
            maxLength={16}
            autoComplete="off"
            placeholder="Nomor Induk Kependudukan"
            value={nik}
            onChange={(event) => setNik(event.target.value.replace(/\D/g, ""))}
            aria-invalid={errors.nik ? "true" : undefined}
          />
        </Field>

        <div className="row">
          <Field id="rpw" label="Kata sandi" error={errors.password}>
            <PasswordField
              id="rpw"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              error={errors.password}
            />
          </Field>
          <Field id="rpw2" label="Ulangi kata sandi" error={errors.confirm}>
            <input
              id="rpw2"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              aria-invalid={errors.confirm ? "true" : undefined}
            />
          </Field>
        </div>

        <div className="f">
          <label className="check">
            <input
              type="checkbox"
              checked={terms}
              onChange={(event) => setTerms(event.target.checked)}
              aria-invalid={errors.terms ? "true" : undefined}
            />
            <span>Saya setuju data saya diproses untuk layanan Pandu JKN.</span>
          </label>
          {errors.terms && <small className="err">{errors.terms}</small>}
        </div>

        <button className="btn block" type="submit" disabled={submitting}>
          {submitting ? "Membuat akun…" : "Daftar"}
        </button>
      </form>

      <p className="alt">
        Sudah punya akun? <Link to="/login">Masuk</Link>
      </p>
    </AuthLayout>
  );
}
