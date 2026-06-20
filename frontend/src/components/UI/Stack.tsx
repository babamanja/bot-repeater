import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { joinClassNames } from "./joinClassNames";
import "./layout.scss";

type StackGap = "sm" | "md" | "lg" | "xl";
type StackDirection = "column" | "row";

type StackProps<E extends ElementType = "div"> = {
  as?: E;
  children: ReactNode;
  gap?: StackGap;
  direction?: StackDirection;
  className?: string;
} & Omit<ComponentPropsWithoutRef<E>, "as" | "children" | "className" | "gap" | "direction">;

export default function Stack<E extends ElementType = "div">({
  as,
  children,
  gap = "md",
  direction = "column",
  className,
  ...rest
}: StackProps<E>) {
  const Component = as ?? "div";

  return (
    <Component
      className={joinClassNames(
        "stack",
        direction === "row" && "stack--row",
        gap !== "md" && `stack--gap-${gap}`,
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
