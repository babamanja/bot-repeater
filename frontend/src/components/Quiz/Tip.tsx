import type { ReactNode } from "react";

type TipProps = {
  children: ReactNode;
};

export default function Tip({ children }: TipProps) {
  return (
    <p className="answer-card__tip" role="note">
      {children}
    </p>
  );
}
