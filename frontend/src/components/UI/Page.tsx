import type { HTMLAttributes, ReactNode } from "react";

import { joinClassNames } from "./joinClassNames";
import "./layout.scss";

type PageWidth = "default" | "wide" | "full";

type PageProps = {
  children: ReactNode;
  width?: PageWidth;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "className">;

export default function Page({ children, width = "default", className, ...rest }: PageProps) {
  return (
    <div
      className={joinClassNames("page", width !== "default" && `page--${width}`, className)}
      {...rest}
    >
      {children}
    </div>
  );
}
