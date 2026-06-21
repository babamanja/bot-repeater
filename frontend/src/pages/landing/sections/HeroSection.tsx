import { useTranslation } from 'react-i18next'

type HeroSectionProps = {
  onRequireSignup: () => void
  onRequireLoginToContinue: () => void
}

export function HeroSection({ onRequireSignup, onRequireLoginToContinue }: HeroSectionProps) {
  const { t } = useTranslation()

  return (
    <section className="qb-section qb-hero" id="top" aria-labelledby="hero-title">
      <div className="qb-hero__grid">
        <div>
          <div className="qb-section__head">
            <h1 className="qb-heading--h1" id="hero-title">
              {t('landing.hero.title')}
            </h1>
            <p className="qb-lead">{t('landing.hero.subtitle')}</p>
          </div>
          <p className="qb-persona">{t('landing.hero.persona')}</p>
          <div className="qb-hero__cta">
            <button type="button" className="qb-button qb-button--primary" onClick={onRequireSignup}>
              {t('landing.hero.cta')}
            </button>
            <button
              type="button"
              className="qb-button qb-button--secondary"
              onClick={onRequireLoginToContinue}
            >
              {t('auth.logIn')}
            </button>
          </div>
        </div>
        <div
          className="qb-hero__visual"
          role="group"
          aria-label={t('landing.hero.visualAriaLabel')}
        >
          <img
            className="qb-hero__step-image"
            src="/mascots/suggesting.png"
            alt=""
            loading="eager"
            decoding="async"
          />
          <img
            className="qb-hero__step-image"
            src="/answer.jpg"
            alt={t('landing.hero.imageAlt')}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  )
}
