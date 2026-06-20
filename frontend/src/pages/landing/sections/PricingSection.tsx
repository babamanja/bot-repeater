import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  formatUsd,
  getPaygPacksForDisplay,
  PREMIUM_USD_MONTHLY,
} from '../../../config/pricing'

type PlanCopy = {
  name: string
  period: string
  features: string[]
  badge?: string
  packSelectorLabel?: string
  tokensLabel?: string
  packagePriceLabel?: string
}

type Plan = PlanCopy & {
  price: string
  kind?: 'subscription' | 'payg'
  tokenPacks?: Array<{
    tokens: string
    price: string
  }>
}

export function PricingSection() {
  const { t } = useTranslation()
  const [selectedPackByPlan, setSelectedPackByPlan] = useState<Record<string, number>>({})

  const plans = useMemo((): Plan[] => {
    const basic = t('landing.pricing.basic', { returnObjects: true }) as PlanCopy
    const premium = t('landing.pricing.premium', { returnObjects: true }) as PlanCopy
    const payg = t('landing.pricing.payAsYouGo', { returnObjects: true }) as PlanCopy
    const packs = getPaygPacksForDisplay().map((row) => ({
      tokens: row.tokensLabel,
      price: row.priceLabel,
    }))

    return [
      {
        ...basic,
        price: t('mySubscription.plans.basic.price'),
        kind: 'subscription',
      },
      {
        ...premium,
        price: formatUsd(PREMIUM_USD_MONTHLY),
        badge: premium.badge,
        kind: 'subscription',
      },
      {
        ...payg,
        price: formatUsd(0),
        kind: 'payg',
        tokenPacks: packs,
      },
    ]
  }, [t])

  return (
    <section className="qb-section" id="pricing" aria-labelledby="pricing-title">
      <div className="qb-section__head">
        <h2 className="qb-heading--h2" id="pricing-title">
          {t('landing.pricing.title')}
        </h2>
        <p className="qb-lead">{t('landing.pricing.subtitle')}</p>
      </div>
      <ul className="qb-pricing-grid">
        {plans.map((plan) => (
          <PricingCard
            key={plan.name}
            plan={plan}
            selectedPackByPlan={selectedPackByPlan}
            onSelectPack={(planName, index) => {
              setSelectedPackByPlan((prev) => ({
                ...prev,
                [planName]: index,
              }))
            }}
          />
        ))}
      </ul>
    </section>
  )
}

function PricingCard({
  plan,
  selectedPackByPlan,
  onSelectPack,
}: {
  plan: Plan
  selectedPackByPlan: Record<string, number>
  onSelectPack: (planName: string, index: number) => void
}) {
  const packIndex = selectedPackByPlan[plan.name] ?? 0
  const selectedPack =
    plan.kind === 'payg' && plan.tokenPacks ? plan.tokenPacks[packIndex] : null

  return (
    <li>
      <article
        className={
          plan.badge ? 'qb-pricing-card qb-pricing-card--featured' : 'qb-pricing-card'
        }
      >
        {plan.badge ? <p className="qb-tag">{plan.badge}</p> : null}
        <h3 className="qb-heading--h3">{plan.name}</h3>

        {selectedPack ? (
          <>
            <label className="qb-pricing-pack-label" htmlFor={`pack-${plan.name}`}>
              {plan.packSelectorLabel ?? 'Select point package'}
            </label>
            <select
              id={`pack-${plan.name}`}
              className="qb-pricing-pack-select"
              value={packIndex}
              onChange={(event) => onSelectPack(plan.name, Number(event.target.value))}
            >
              {plan.tokenPacks?.map((pack, index) => (
                <option key={`${pack.tokens}-${pack.price}`} value={index}>
                  {pack.tokens} points - {pack.price} / pack
                </option>
              ))}
            </select>
            <p className="qb-pricing-pack-info">
              <strong>{plan.tokensLabel ?? 'Points'}:</strong> {selectedPack.tokens}
            </p>
            <p className="qb-pricing-pack-info">
              <strong>{plan.packagePriceLabel ?? 'Package price'}:</strong>{' '}
              {selectedPack.price}
            </p>
          </>
        ) : (
          <p>
            <span className="qb-price">{plan.price}</span>{' '}
            <span className="qb-price-period">{plan.period}</span>
          </p>
        )}

        <ul>
          {plan.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </article>
    </li>
  )
}
