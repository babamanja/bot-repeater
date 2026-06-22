import { useTranslation } from 'react-i18next'

import { trackUiCtaClick } from '../../../analytics'
import Button from '../../../components/UI/Button/Button'

type HeroSectionProps = {
  onRequireSignup: () => void
  onRequireLoginToContinue: () => void
}

export function HeroSection({ onRequireSignup, onRequireLoginToContinue }: HeroSectionProps) {
  const { t } = useTranslation()

  return (
    <section className="qb-section qb-hero" id="top" aria-labelledby="hero-title">
      <div className="qb-hero__decor" aria-hidden />
      <div className="qb-hero__grid">
        <div className="qb-hero__copy">
          <div className="qb-section__head">
            <h1 className="qb-heading--h1" id="hero-title">
              {t('landing.hero.title')}
            </h1>
            <p className="qb-lead">{t('landing.hero.subtitle')}</p>
          </div>
          <div className="qb-hero__actions">
            <Button
              className="qb-hero__cta-btn"
              data-cta-id="landing_hero_get_started"
              onClick={() => {
                trackUiCtaClick('landing_hero_get_started')
                onRequireSignup()
              }}
            >
              {t('landing.hero.cta')}
            </Button>
            {/* <p className="qb-hero__cta-hint">{t('landing.hero.ctaHint')}</p> */}
          </div>
          {/* <div className="qb-hero__stores" aria-label={t('landing.hero.storeComingSoon')}>
            <span className="qb-store-badge qb-store-badge--apple" title={t('landing.hero.storeComingSoon')}>
              {t('landing.hero.storeAppStore')}
            </span>
            <span className="qb-store-badge qb-store-badge--google" title={t('landing.hero.storeComingSoon')}>
              {t('landing.hero.storeGooglePlay')}
            </span>
          </div> */}
          {/* <button
            type="button"
            className="qb-hero__login-link"
            onClick={onRequireLoginToContinue}
          >
            {t('auth.logIn')}
          </button> */}
        </div>
        <div
          className="qb-hero__visual"
          role="group"
          aria-label={t('landing.hero.visualAriaLabel')}
        >
          <img
            className="qb-hero__mascot"
            src="/landing/mascot-hero.png"
            alt={t('landing.hero.imageAlt')}
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </section>
  )
}
