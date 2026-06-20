import type { TextareaHTMLAttributes } from "react";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function TextArea({ className = "", ...rest }: TextAreaProps) {
  return <textarea className={className} {...rest} />;
}
