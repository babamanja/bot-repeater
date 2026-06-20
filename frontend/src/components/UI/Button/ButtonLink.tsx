import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { joinClassNames } from "../joinClassNames";
import "../style.scss";

type ButtonLinkProps = {
  children: ReactNode;
  to: string;
  style?: "primary" | "secondary" | "success" | "borderless";
  className?: string;
  role?: string;
  onClick?: () => void;
};

export default function ButtonLink({
  children,
  to,
  style = "primary",
  className,
  role,
  onClick,
}: ButtonLinkProps) {
  return (
    <Link
      to={to}
      role={role}
      className={joinClassNames("button", `button--${style}`, className)}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
