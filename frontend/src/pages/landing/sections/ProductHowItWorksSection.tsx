import {
  faBrain,
  faMobileScreenButton,
  faSeedling,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useTranslation } from 'react-i18next'

type ProductStep = {
  title: string
  description: string
}

const STEP_ICONS = [faMobileScreenButton, faBrain, faSeedling, faTrophy] as const

export function ProductHowItWorksSection() {
  const { t } = useTranslation()
  const steps = t('landing.product.steps', {
    returnObjects: true,
  }) as ProductStep[]

  return (
    <section className="qb-section qb-how" id="how-it-works" aria-labelledby="product-title">
      <div className="qb-section__head qb-section__head--center">
        <h2 className="qb-heading--h2" id="product-title">
          {t('landing.product.title')}
        </h2>
        <p className="qb-lead">{t('landing.product.subtitle')}</p>
      </div>
      <ol className="qb-how__steps">
        {steps.map((step, index) => (
          <li key={step.title} className="qb-how__step">
            <article aria-labelledby={`product-step-${index + 1}-title`}>
              <span className="qb-how__step-icon" aria-hidden>
                <FontAwesomeIcon icon={STEP_ICONS[index] ?? faMobileScreenButton} />
              </span>
              <span className="qb-how__step-num">{index + 1}</span>
              <h3 className="qb-heading--h3" id={`product-step-${index + 1}-title`}>
                {step.title}
              </h3>
              <p>{step.description}</p>
            </article>
          </li>
        ))}
      </ol>
    </section>
  )
}
