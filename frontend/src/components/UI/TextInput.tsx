import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useId, useState } from "react";

import IconComponent from "./Icon";
import "./style.scss";

type TextInputBaseProps = {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  id?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
};

type TextInputProps = TextInputBaseProps & {
  type?: "text" | "password";
};

export default function TextInput({
  label,
  value,
  onChange,
  type = "text",
  id: idProp,
  autoComplete,
  disabled,
  required,
  minLength,
  showPasswordLabel = "Show password",
  hidePasswordLabel = "Hide password",
}: TextInputProps) {
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const inputType = type === "password" ? (isPasswordVisible ? "text" : "password") : "text";

  const input = (
    <input
      id={inputId}
      type={inputType}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="text-input"
      autoComplete={autoComplete}
      disabled={disabled}
      required={required}
      minLength={minLength}
    />
  );

  return (
    <label className="text-input-label" htmlFor={inputId}>
      {label}
      {type === "password" ? (
        <div className="text-input-wrap">
          {input}
          <button
            type="button"
            className="text-input-toggle"
            disabled={disabled}
            aria-label={isPasswordVisible ? hidePasswordLabel : showPasswordLabel}
            onClick={() => setIsPasswordVisible((prev) => !prev)}
          >
            <IconComponent faIcon={!isPasswordVisible ? faEyeSlash : faEye} />
          </button>
        </div>
      ) : (
        input
      )}
    </label>
  );
}
