import { useState, type MouseEvent } from "react";

type ToggleEvent = MouseEvent<HTMLButtonElement>;

function useToggle(initialValue: boolean = false) {
  const [value, setValue] = useState(initialValue);

  function toggle(event?: ToggleEvent) {
    event?.stopPropagation();
    setValue((current) => !current);
  }

  function valueOn(event?: ToggleEvent) {
    event?.stopPropagation();
    setValue(true);
  }

  function valueOff(event?: ToggleEvent) {
    event?.stopPropagation();
    setValue(false);
  }

  return { value, toggle, valueOn, valueOff };
}

export default useToggle;
