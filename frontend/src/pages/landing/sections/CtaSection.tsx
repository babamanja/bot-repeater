import { useTranslation } from 'react-i18next'

import { trackUiCtaClick } from '../../../analytics'
import Button from '../../../components/UI/Button/Button'
import ButtonLink from '../../../components/UI/Button/ButtonLink'
import { isAuthenticatedUser, useSession } from '../../../hooks/useSession'
import { homePathForRole } from '../../../paths'

type CtaSectionProps = {
  onGetStarted: () => void
}

function PhoneMockup({ variant }: { variant: 'dashboard' | 'quiz' }) {
  if (variant === 'quiz') {
    return (
      <div className="qb-phone-mockup qb-phone-mockup--quiz" aria-hidden>
        <div className="qb-phone-mockup__screen">
          <p className="qb-phone-mockup__label">Quiz</p>
          <p className="qb-phone-mockup__question">perro</p>
          <ul className="qb-phone-mockup__options">
            <li>dog</li>
            <li>cat</li>
            <li>bird</li>
            <li>fish</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="qb-phone-mockup qb-phone-mockup--dashboard" aria-hidden>
      <div className="qb-phone-mockup__screen">
        <div className="qb-phone-mockup__header">
          <span className="qb-phone-mockup__avatar" />
          <span>Today</span>
        </div>
        <div className="qb-phone-mockup__progress">
          <span style={{ width: '72%' }} />
        </div>
        <div className="qb-phone-mockup__stats">
          <div>
            <strong>24</strong>
            <span>words</span>
          </div>
          <div>
            <strong>8</strong>
            <span>due</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CtaSection({ onGetStarted }: CtaSectionProps) {
  const { t } = useTranslation()
  const { user, token } = useSession()
  const isLoggedIn = isAuthenticatedUser(user?.role, token)
  const appPath = homePathForRole(user?.role)

  return (
    <section className="qb-cta" id="about" aria-labelledby="cta-section-title">
      <div className="qb-cta__grid">
        <div className="qb-cta__copy">
          <div className="qb-section__head">
            <h2 className="qb-heading--h2" id="cta-section-title">
              {t('landing.ctaSection.title')}
            </h2>
            <p className="qb-lead">{t('landing.ctaSection.subtitle')}</p>
          </div>
          <p>
            {isLoggedIn ? (
              <ButtonLink
                to={appPath}
                className="qb-cta__btn"
                data-cta-id="landing_cta_go_to_app"
                onClick={() => trackUiCtaClick('landing_cta_go_to_app')}
              >
                {t('landing.ctaSection.buttonLoggedIn')}
              </ButtonLink>
            ) : (
              <Button
                className="qb-cta__btn"
                data-cta-id="landing_cta_get_started"
                onClick={() => {
                  trackUiCtaClick('landing_cta_get_started')
                  onGetStarted()
                }}
              >
                {t('landing.ctaSection.button')}
              </Button>
            )}
          </p>
          <p className="qb-hint">
            {isLoggedIn
              ? t('landing.ctaSection.buttonHintLoggedIn')
              : t('landing.ctaSection.buttonHint')}
          </p>
        </div>
        <div className="qb-cta__phones" aria-hidden>
          <PhoneMockup variant="dashboard" />
          <PhoneMockup variant="quiz" />
        </div>
      </div>
    </section>
  )
}
