import { useTranslation } from 'react-i18next'

type BenefitItem = {
  title: string
  description: string
}

export function BenefitsSection() {
  const { t } = useTranslation()
  const items = t('landing.benefits.items', {
    returnObjects: true,
  }) as BenefitItem[]

  return (
    <section className="qb-section qb-benefits" id="benefits" aria-labelledby="benefits-title">
      <div className="qb-section__head">
        <h2 className="qb-heading--h2" id="benefits-title">
          {t('landing.benefits.title')}
        </h2>
        <p className="qb-lead">{t('landing.benefits.subtitle')}</p>
      </div>
      <ul className="qb-grid-cards qb-grid-cards--2">
        {items.map((item) => (
          <li key={item.title}>
            <article className="qb-card">
              <h3 className="qb-heading--h3">{item.title}</h3>
              <p>{item.description}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
