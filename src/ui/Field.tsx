import { useId, useState, type ReactNode } from "react";
import { Icon } from "./Icons";

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="f">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <small className="err">{error}</small>
      ) : hint ? (
        <small>{hint}</small>
      ) : null}
    </div>
  );
}

interface PasswordFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}

export function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
}: PasswordFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const [show, setShow] = useState(false);

  return (
    <div className="pw">
      <input
        id={inputId}
        type={show ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? "true" : undefined}
      />
      <button
        type="button"
        className="eye"
        aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
        onClick={() => setShow((current) => !current)}
      >
        <Icon name="eye" />
      </button>
    </div>
  );
}
