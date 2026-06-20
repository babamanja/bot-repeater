import { useTranslation } from 'react-i18next'

import { trackUiCtaClick } from '../../../analytics'
import Button from '../../../components/UI/Button/Button'
import ButtonLink from '../../../components/UI/Button/ButtonLink'
import { isAuthenticatedUser, useSession } from '../../../hooks/useSession'
import { homePathForRole } from '../../../paths'

type CtaSectionProps = {
  onGetStarted: () => void
}

export function CtaSection({ onGetStarted }: CtaSectionProps) {
  const { t } = useTranslation()
  const { user, token } = useSession()
  const isLoggedIn = isAuthenticatedUser(user?.role, token)
  const appPath = homePathForRole(user?.role)

  return (
    <section
      className="qb-cta"
      id="cta"
      aria-labelledby="cta-section-title"
    >
      <div className="qb-cta__grid">
        <div>
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
                data-cta-id="landing_cta_go_to_app"
                onClick={() => trackUiCtaClick('landing_cta_go_to_app')}
              >
                {t('landing.ctaSection.buttonLoggedIn')}
              </ButtonLink>
            ) : (
              <Button
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
        <figure className="qb-cta__figure">
          <img
            className="qb-cta__image"
            src="/mascots/cool.png"
            alt="Cool mascot"
            loading="lazy"
            decoding="async"
          />
        </figure>
      </div>
    </section>
  )
}
