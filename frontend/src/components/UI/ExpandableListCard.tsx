import { type ReactNode, useId, useState } from "react";

import Card from "./Card";
import { joinClassNames } from "./joinClassNames";
import "./ExpandableListCard.scss";

type ExpandableListCardProps = {
  className?: string;
  defaultOpen?: boolean;
  summary: ReactNode;
  children: ReactNode;
};

export default function ExpandableListCard({
  className,
  defaultOpen = false,
  summary,
  children,
}: ExpandableListCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <Card
      className={joinClassNames(
        "list-expandable-card",
        isOpen && "list-expandable-card--open",
        className,
      )}
      padding="none"
    >
      <button
        type="button"
        className="list-expandable-card__summary"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        {summary}
      </button>
      <div
        id={panelId}
        className={joinClassNames(
          "list-expandable-card__panel",
          isOpen && "list-expandable-card__panel--open",
        )}
      >
        <div className="list-expandable-card__body">{children}</div>
      </div>
    </Card>
  );
}
