import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  formatUsd,
  getTokenTopupPriceUsd,
  TOKEN_PACKS,
  type TokenPackRow,
} from "../../config/pricing";

function TokenPackOptionLabel({
  pack,
  isPremiumPlan,
}: {
  pack: TokenPackRow;
  isPremiumPlan: boolean;
}) {
  const { t } = useTranslation();
  const displayPrice = getTokenTopupPriceUsd(pack.priceUsd, isPremiumPlan);

  return (
    <span className="subscription-page__token-pack-option">
      <span className="subscription-page__token-pack-option-amount">
        {t("subscription.tokenPackAmountLabel", {
          amount: pack.amount.toLocaleString("en-US"),
        })}
      </span>
      {isPremiumPlan ? (
        <span className="subscription-page__token-pack-option-prices">
          <span
            className="subscription-page__token-pack-option-old"
            aria-label={t("subscription.originalPriceLabel")}
          >
            {formatUsd(pack.priceUsd)}
          </span>
          <span className="subscription-page__token-pack-option-new">
            {formatUsd(displayPrice)}
          </span>
        </span>
      ) : (
        <span className="subscription-page__token-pack-option-new">
          {formatUsd(displayPrice)}
        </span>
      )}
    </span>
  );
}

type TokenPackSelectProps = {
  id: string;
  value: string;
  isPremiumPlan: boolean;
  onChange: (amount: string) => void;
};

export default function TokenPackSelect({
  id,
  value,
  isPremiumPlan,
  onChange,
}: TokenPackSelectProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedPack =
    TOKEN_PACKS.find((pack) => String(pack.amount) === value) ?? TOKEN_PACKS[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={rootRef}
      className={`subscription-page__token-pack-select${
        isOpen ? " subscription-page__token-pack-select--open" : ""
      }`}
    >
      <button
        id={id}
        type="button"
        className="subscription-page__token-pack-trigger upload-file__textarea"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <TokenPackOptionLabel pack={selectedPack} isPremiumPlan={isPremiumPlan} />
        <span className="subscription-page__token-pack-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {isOpen ? (
        <ul
          id={`${id}-listbox`}
          className="subscription-page__token-pack-menu"
          role="listbox"
          aria-label={t("subscription.tokensToBuy")}
        >
          {TOKEN_PACKS.map((pack) => {
            const isSelected = String(pack.amount) === value;
            return (
              <li key={pack.amount} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`subscription-page__token-pack-menu-item${
                    isSelected ? " subscription-page__token-pack-menu-item--selected" : ""
                  }`}
                  onClick={() => {
                    onChange(String(pack.amount));
                    setIsOpen(false);
                  }}
                >
                  <TokenPackOptionLabel pack={pack} isPremiumPlan={isPremiumPlan} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
