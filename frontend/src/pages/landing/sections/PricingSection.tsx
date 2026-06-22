import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { formatUsd, PREMIUM_USD_MONTHLY } from '../../../config/pricing'

type PlanCopy = {
  name: string
  period: string
  features: string[]
  badge?: string
}

type Plan = PlanCopy & {
  price: string
}

export function PricingSection() {
  const { t } = useTranslation()

  const plans = useMemo((): Plan[] => {
    const basic = t('landing.pricing.basic', { returnObjects: true }) as PlanCopy
    const premium = t('landing.pricing.premium', { returnObjects: true }) as PlanCopy

    return [
      {
        ...basic,
        price: t('mySubscription.plans.basic.price'),
      },
      {
        ...premium,
        price: formatUsd(PREMIUM_USD_MONTHLY),
        badge: premium.badge,
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
          <li key={plan.name}>
            <article
              className={
                plan.badge ? 'qb-pricing-card qb-pricing-card--featured' : 'qb-pricing-card'
              }
            >
              {plan.badge ? <p className="qb-tag">{plan.badge}</p> : null}
              <h3 className="qb-heading--h3">{plan.name}</h3>
              <p>
                <span className="qb-price">{plan.price}</span>{' '}
                <span className="qb-price-period">{plan.period}</span>
              </p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
