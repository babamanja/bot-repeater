import type { ReactNode } from "react";

import { joinClassNames } from "./joinClassNames";
import "./layout.scss";

type PageSectionGap = "sm" | "md" | "lg" | "xl";

type PageSectionProps = {
  children: ReactNode;
  title?: ReactNode;
  titleAs?: "h2" | "h3" | "h4";
  titleId?: string;
  gap?: PageSectionGap;
  className?: string;
};

export default function PageSection({
  children,
  title,
  titleAs: TitleTag = "h2",
  titleId,
  gap = "md",
  className,
}: PageSectionProps) {
  return (
    <section
      className={joinClassNames(
        "page-section",
        gap !== "md" && `page-section--gap-${gap}`,
        className,
      )}
      aria-labelledby={title && titleId ? titleId : undefined}
    >
      {title ? (
        <TitleTag id={titleId} className="page-section__title">
          {title}
        </TitleTag>
      ) : null}
      {children}
    </section>
  );
}
