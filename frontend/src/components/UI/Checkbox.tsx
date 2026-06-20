import { faCheck } from "@fortawesome/free-solid-svg-icons";

import IconComponent from "./Icon";

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export default function Checkbox({ label, checked, onChange }: CheckboxProps) {
  function handleChange() {
    onChange(!checked);
  }

  return (
    <label className="checkbox-label">
      <input type="checkbox" onChange={handleChange} className="checkbox-hidden" />
      <div className={`checkbox-visible ${checked ? "checkbox-visible--checked" : ""}`}>
        <IconComponent
          faIcon={faCheck}
          iconClassName={`checkbox-visible__checkmark ${checked ? "checkbox-visible__checkmark--checked" : ""}`}
        />
      </div>
      {label}
    </label>
  );
}
