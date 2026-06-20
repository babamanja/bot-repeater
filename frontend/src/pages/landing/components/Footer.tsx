import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { PRIVACY_POLICY_PATH, REFUND_POLICY_PATH, TERMS_OF_SERVICE_PATH } from '../../../paths'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  const productLinks = t('landing.footer.columns.product.links', {
    returnObjects: true,
  }) as string[]
  const legalLinks = t('landing.footer.columns.legal.links', {
    returnObjects: true,
  }) as string[]

  const productHrefs = ['#benefits', '#how-it-works', '#pricing', '#']
  const legalHrefs = [PRIVACY_POLICY_PATH, TERMS_OF_SERVICE_PATH, REFUND_POLICY_PATH]

  return (
    <footer className="qb-footer" id="contact">
      <div className="qb-footer__inner">
        <p className="qb-footer__tagline">{t('landing.footer.tagline')}</p>
        <nav className="qb-footer__grid" aria-label="Footer">
          <div>
            <h3>{t('landing.footer.columns.product.title')}</h3>
            <ul>
              {productLinks.map((label, index) => (
                <li key={label}>
                  <a href={productHrefs[index] ?? '#'}>{label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>{t('landing.footer.columns.legal.title')}</h3>
            <ul>
              {legalLinks.map((label, index) => {
                const href = legalHrefs[index] ?? '#'
                return (
                  <li key={label}>
                    {href.startsWith('/') ? (
                      <Link to={href}>{label}</Link>
                    ) : (
                      <a href={href}>{label}</a>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>
        <p className="qb-footer__copy">
          {t('landing.footer.copyright', { year })}
        </p>
      </div>
    </footer>
  )
}
