import { faBrain, faBullseye, faChartColumn, faLeaf } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useTranslation } from 'react-i18next'

type BenefitItem = {
  title: string
  description: string
}

const BENEFIT_ICONS = [faLeaf, faBrain, faBullseye, faChartColumn] as const

export function BenefitsSection() {
  const { t } = useTranslation()
  const items = t('landing.benefits.items', {
    returnObjects: true,
  }) as BenefitItem[]

  return (
    <section className="qb-section qb-benefits" id="features" aria-labelledby="benefits-title">
      <div className="qb-section__head qb-section__head--center">
        <h2 className="qb-heading--h2" id="benefits-title">
          {t('landing.benefits.title')}
        </h2>
        <p className="qb-lead">{t('landing.benefits.subtitle')}</p>
      </div>
      <ul className="qb-features-grid">
        {items.map((item, index) => (
          <li key={item.title}>
            <article className="qb-feature-card">
              <span className="qb-feature-card__icon" aria-hidden>
                <FontAwesomeIcon icon={BENEFIT_ICONS[index] ?? faLeaf} />
              </span>
              <h3 className="qb-heading--h3">{item.title}</h3>
              <p>{item.description}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
