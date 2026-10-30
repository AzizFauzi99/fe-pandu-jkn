export type RequiredField = "name" | "email" | "phone" | "birth" | "sex" | "nik" | "height" | "weight";

export const REQUIRED_FIELDS: RequiredField[] = [
  "name",
  "email",
  "phone",
  "birth",
  "sex",
  "nik",
  "height",
  "weight",
];

export function todayISO(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export const EMAIL_RE = /^\S+@\S+\.\S+$/;
export const PHONE_RE = /^(\+62|62|0)8\d{8,11}$/;
export const NIK_RE = /^\d{6,16}$/;

/** Kembalikan pesan kesalahan, atau null saat nilai valid. */
export function validateField(field: RequiredField, value: string): string | null {
  const v = value.trim();
  switch (field) {
    case "name":
      return v.length < 3 ? "Isi nama lengkap, minimal 3 huruf." : null;
    case "email":
      return !EMAIL_RE.test(v) ? "Masukkan email yang valid." : null;
    case "phone":
      return !PHONE_RE.test(v.replace(/[\s-]/g, ""))
        ? "Masukkan nomor HP Indonesia, misalnya 0812…"
        : null;
    case "birth":
      return !v || v > todayISO() || v < "1900-01-01"
        ? "Isi tanggal lahir yang valid."
        : null;
    case "sex":
      return !v ? "Pilih jenis kelamin." : null;
    case "nik":
      return !NIK_RE.test(v) ? "NIK minimal 6 digit angka." : null;
    case "height": {
      const n = Number(v);
      return !(v !== "" && Number.isFinite(n) && n >= 50 && n <= 250)
        ? "Tinggi badan antara 50 dan 250 cm."
        : null;
    }
    case "weight": {
      const n = Number(v);
      return !(v !== "" && Number.isFinite(n) && n >= 10 && n <= 300)
        ? "Berat badan antara 10 dan 300 kg."
        : null;
    }
    default:
      return null;
  }
}
