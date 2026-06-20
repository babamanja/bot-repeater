import { useTranslation } from 'react-i18next'

export function PainSection() {
  const { t } = useTranslation()
  const items = t('landing.pains.items', { returnObjects: true }) as string[]
  const topLeftTiles = items.slice(0, 2)
  const bottomRightTiles = items.slice(2, 5)

  return (
    <section className="qb-section" id="pains" aria-labelledby="pains-title">
      <div className="qb-section__head">
        <h2 className="qb-heading--h2" id="pains-title">
          {t('landing.pains.title')}
        </h2>
      </div>

      <div className="qb-pain-layout">
          <ul className="qb-pain-tiles">
            {topLeftTiles.map((text) => (
              <li key={text}>
                <article className="qb-card qb-card--pain">
                  <p>&ldquo;{text}&rdquo;</p>
                </article>
              </li>
            ))}
          </ul>
          <img className="qb-pain-illustration" src="/mascots/sinking.png" alt="Sinking mascot" />
          <img className="qb-pain-illustration" src="/mascots/late.png" alt="Study materials mascot" />
          <ul className="qb-pain-tiles">
            {bottomRightTiles.map((text) => (
              <li key={text}>
                <article className="qb-card qb-card--pain">
                  <p>&ldquo;{text}&rdquo;</p>
                </article>
              </li>
            ))}
          </ul>
          <p className="qb-outcome">{t('landing.pains.outcome')}</p>
      </div>
    </section>
  )
}
