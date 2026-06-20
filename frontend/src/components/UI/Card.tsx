import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { joinClassNames } from "./joinClassNames";
import "./layout.scss";

type CardVariant = "default" | "flat" | "stat";
type CardPadding = "default" | "none" | "compact";

type CardProps<E extends ElementType = "div"> = {
  as?: E;
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  className?: string;
} & Omit<ComponentPropsWithoutRef<E>, "as" | "children" | "className">;

function buildCardClassName(
  variant: CardVariant,
  padding: CardPadding,
  className?: string,
): string {
  return joinClassNames(
    "card",
    variant !== "default" && `card--${variant}`,
    padding !== "default" && `card--padding-${padding}`,
    className,
  );
}

export default function Card<E extends ElementType = "div">({
  as,
  children,
  variant = "default",
  padding = "default",
  className,
  ...rest
}: CardProps<E>) {
  const Component = as ?? "div";

  return (
    <Component
      className={buildCardClassName(variant, padding, className)}
      {...rest}
    >
      {children}
    </Component>
  );
}
