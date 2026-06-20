import { faTrash } from "@fortawesome/free-solid-svg-icons";
import type { ButtonHTMLAttributes } from "react";

import IconButton from "./IconButton";
import "../style.scss";

type DeleteIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  "aria-label": string;
};

export default function DeleteIconButton({
  className,
  type = "button",
  ...rest
}: DeleteIconButtonProps) {
  return (
    <IconButton
      type={type}
      faIcon={faTrash}
      className={["icon-button", "icon-button--delete", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}
