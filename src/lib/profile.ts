import type { Gender, Profile, ProfileBody } from "../api/types";
import { REQUIRED_FIELDS, validateField, type RequiredField } from "./validation";

export interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  birth: string;
  sex: string;
  nik: string;
  height: string;
  weight: string;
  allergies: string;
  conditions: string;
}

export const EMPTY_FORM: ProfileForm = {
  name: "",
  email: "",
  phone: "",
  birth: "",
  sex: "",
  nik: "",
  height: "",
  weight: "",
  allergies: "",
  conditions: "",
};

export function profileToForm(profile: Profile | null): ProfileForm {
  if (!profile) return { ...EMPTY_FORM };
  return {
    name: profile.nama_lengkap ?? "",
    email: profile.email ?? "",
    phone: profile.nomor_hp ?? "",
    birth: profile.tanggal_lahir ?? "",
    sex: profile.jenis_kelamin ?? "",
    nik: profile.nik ?? "",
    height: profile.tinggi_badan_cm?.toString() ?? "",
    weight: profile.berat_badan_kg?.toString() ?? "",
    allergies: (profile.alergi_makanan ?? []).join(", "),
    conditions: (profile.riwayat_penyakit ?? []).join(", "),
  };
}

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function gender(value: string): Gender | null {
  return value === "laki-laki" || value === "perempuan" ? value : null;
}

export function formToPatch(form: ProfileForm): Partial<Profile> {
  return {
    nama_lengkap: form.name.trim() || null,
    nomor_hp: form.phone.trim() || null,
    tanggal_lahir: form.birth || null,
    jenis_kelamin: gender(form.sex),
    nik: form.nik.trim() || null,
    tinggi_badan_cm: form.height ? Number(form.height) : null,
    berat_badan_kg: form.weight ? Number(form.weight) : null,
    alergi_makanan: splitList(form.allergies),
    riwayat_penyakit: splitList(form.conditions),
  };
}

export function toProfileBody(profile: Profile): ProfileBody {
  return {
    nama_lengkap: profile.nama_lengkap,
    nomor_hp: profile.nomor_hp,
    tanggal_lahir: profile.tanggal_lahir,
    jenis_kelamin: profile.jenis_kelamin,
    nik: profile.nik,
    tinggi_badan_cm: profile.tinggi_badan_cm,
    berat_badan_kg: profile.berat_badan_kg,
    alergi_makanan: profile.alergi_makanan ?? [],
    riwayat_penyakit: profile.riwayat_penyakit ?? [],
  };
}

export function validateForm(
  form: ProfileForm,
  fields: RequiredField[],
): Partial<Record<RequiredField, string>> {
  const errors: Partial<Record<RequiredField, string>> = {};
  for (const field of fields) {
    const message = validateField(field, form[field]);
    if (message) errors[field] = message;
  }
  return errors;
}

export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  const form = profileToForm(profile);
  return REQUIRED_FIELDS.every((field) => !validateField(field, form[field]));
}

export function firstName(name: string | null | undefined): string {
  return (name || "Pengguna").trim().split(/\s+/)[0] || "Pengguna";
}

export function initial(name: string | null | undefined): string {
  const n = (name || "Pengguna").trim();
  return (n[0] || "P").toUpperCase();
}
