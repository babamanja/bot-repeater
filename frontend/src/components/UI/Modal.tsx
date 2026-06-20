import type { ReactNode } from "react";

import "./style.scss";

type ModalProps = {
  open: boolean;
  children: ReactNode;
  buttons: ReactNode;
};

export default function Modal({ open, children, buttons }: ModalProps) {
  if (!open) {
    return null;
  }
  return (
    <section className="modal">
      <section className="modal__content">
        {children}
        <section className="modal__buttons">{buttons}</section>
      </section>
    </section>
  );
}
