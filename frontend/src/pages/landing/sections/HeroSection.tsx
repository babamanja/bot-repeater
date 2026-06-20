import { useTranslation } from 'react-i18next'

import type { AuthSession } from '../../../types'
import { HeroLandingQuiz } from '../components/HeroLandingQuiz'

type HeroSectionProps = {
  onRequireSignup: () => void
  onRequireLoginToContinue: () => void
  registerSignupHandler: (handler: (session: AuthSession) => Promise<void>) => void
  registerContinueHandler: (handler: (session: AuthSession) => Promise<void>) => void
}

export function HeroSection({
  onRequireSignup,
  onRequireLoginToContinue,
  registerSignupHandler,
  registerContinueHandler,
}: HeroSectionProps) {
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
            alt=""
            loading="lazy"
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
      <section
        className="qb-hero__step-images-wrapper"
        aria-labelledby="hero-demo-title"
      >
        <h2 className="qb-hero__demo-title qb-heading--h2" id="hero-demo-title">
          {t('landing.hero.demoTitle')}
        </h2>
        <HeroLandingQuiz
          onRequireSignup={onRequireSignup}
          onRequireLoginToContinue={onRequireLoginToContinue}
          registerSignupHandler={registerSignupHandler}
          registerContinueHandler={registerContinueHandler}
        />
      </section>
      
    </section>
  )
}
