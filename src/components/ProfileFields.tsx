import type { ProfileForm } from "../lib/profile";
import type { RequiredField } from "../lib/validation";
import { todayISO } from "../lib/validation";
import { Field } from "../ui/Field";

interface FieldsProps {
  prefix: string;
  form: ProfileForm;
  errors: Partial<Record<RequiredField, string>>;
  onChange: (key: keyof ProfileForm, value: string) => void;
}

export function DataFields({ prefix, form, errors, onChange }: FieldsProps) {
  return (
    <>
      <div className="row">
        <Field id={`${prefix}n`} label="Nama lengkap" error={errors.name}>
          <input
            id={`${prefix}n`}
            autoComplete="name"
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
            aria-invalid={errors.name ? "true" : undefined}
          />
        </Field>
        <Field id={`${prefix}e`} label="Email" hint="Mengikuti email akun.">
          <input id={`${prefix}e`} type="email" value={form.email} readOnly />
        </Field>
      </div>

      <div className="row">
        <Field id={`${prefix}p`} label="Nomor HP" error={errors.phone}>
          <input
            id={`${prefix}p`}
            type="tel"
            autoComplete="tel"
            placeholder="08xxxxxxxxxx"
            value={form.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            aria-invalid={errors.phone ? "true" : undefined}
          />
        </Field>
        <Field id={`${prefix}d`} label="Tanggal lahir" error={errors.birth}>
          <input
            id={`${prefix}d`}
            type="date"
            autoComplete="bday"
            max={todayISO()}
            value={form.birth}
            onChange={(event) => onChange("birth", event.target.value)}
            aria-invalid={errors.birth ? "true" : undefined}
          />
        </Field>
      </div>

      <div className="row">
        <Field id={`${prefix}s`} label="Jenis kelamin" error={errors.sex}>
          <select
            id={`${prefix}s`}
            value={form.sex}
            onChange={(event) => onChange("sex", event.target.value)}
            aria-invalid={errors.sex ? "true" : undefined}
          >
            <option value="">Pilih</option>
            <option value="laki-laki">Laki-laki</option>
            <option value="perempuan">Perempuan</option>
          </select>
        </Field>
        <Field id={`${prefix}nik`} label="NIK" error={errors.nik}>
          <input
            id={`${prefix}nik`}
            inputMode="numeric"
            maxLength={16}
            autoComplete="off"
            placeholder="Minimal 6 digit"
            value={form.nik}
            onChange={(event) => onChange("nik", event.target.value.replace(/\D/g, ""))}
            aria-invalid={errors.nik ? "true" : undefined}
          />
        </Field>
      </div>
    </>
  );
}

export function HealthFields({ prefix, form, errors, onChange }: FieldsProps) {
  return (
    <>
      <div className="row">
        <Field id={`${prefix}h`} label="Tinggi badan (cm)" error={errors.height}>
          <input
            id={`${prefix}h`}
            type="number"
            min={50}
            max={250}
            inputMode="numeric"
            value={form.height}
            onChange={(event) => onChange("height", event.target.value)}
            aria-invalid={errors.height ? "true" : undefined}
          />
        </Field>
        <Field id={`${prefix}w`} label="Berat badan (kg)" error={errors.weight}>
          <input
            id={`${prefix}w`}
            type="number"
            min={10}
            max={300}
            inputMode="decimal"
            value={form.weight}
            onChange={(event) => onChange("weight", event.target.value)}
            aria-invalid={errors.weight ? "true" : undefined}
          />
        </Field>
      </div>

      <Field
        id={`${prefix}a`}
        label="Alergi makanan (opsional)"
        hint="Pisahkan dengan koma."
      >
        <input
          id={`${prefix}a`}
          placeholder="Contoh: kacang, udang"
          value={form.allergies}
          onChange={(event) => onChange("allergies", event.target.value)}
        />
      </Field>

      <Field id={`${prefix}c`} label="Kondisi atau riwayat penyakit (opsional)">
        <textarea
          id={`${prefix}c`}
          rows={2}
          placeholder="Contoh: diabetes, hipertensi"
          value={form.conditions}
          onChange={(event) => onChange("conditions", event.target.value)}
        />
      </Field>
    </>
  );
}
