import type { ReactNode } from "react";

import { joinClassNames } from "./joinClassNames";
import "./layout.scss";

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  titleAs?: "h1" | "h2" | "h3";
  className?: string;
};

export default function PageHeader({
  title,
  subtitle,
  actions,
  titleAs: TitleTag = "h1",
  className,
}: PageHeaderProps) {
  return (
    <header className={joinClassNames("page-header", className)}>
      <div className="page-header__row">
        <div className="page-header__text">
          <TitleTag className="page-header__title">{title}</TitleTag>
          {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
