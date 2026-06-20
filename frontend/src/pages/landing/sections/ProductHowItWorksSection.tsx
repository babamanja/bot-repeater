import { useTranslation } from 'react-i18next'

type ProductStep = {
  title: string
  bullets: string[]
  imagePlaceholder: string
}

export function ProductHowItWorksSection() {
  const { t } = useTranslation()
  const steps = t('landing.product.steps', {
    returnObjects: true,
  }) as ProductStep[]

  return (
    <section className="qb-section" id="how-it-works" aria-labelledby="product-title">
      <div className="qb-section__head">
        <h2 className="qb-heading--h2" id="product-title">
          {t('landing.product.title')}
        </h2>
        <p className="qb-lead">{t('landing.product.subtitle')}</p>
      </div>
      <div className="qb-product__grid">
        {steps.map((step, index) => (
          <ProductStepBlock key={step.title} stepNumber={index + 1} step={step} />
        ))}
      </div>
    </section>
  )
}

function ProductStepBlock({
  stepNumber,
  step,
}: {
  stepNumber: number
  step: ProductStep
}) {
  const headingId = `product-step-${stepNumber}-title`
  // const firstTileImage = '/mascots/unsorted-docs.png'
  const firstTileImage = '/mascots/unsorted-docs.png'
  const secondTileImage = '/mascots/sort-docs.png'
  const thirdTileImage = '/mascots/quizzing.png'
  const fourthTileImage = '/mascots/editing.png'
  const fifthTileImage = '/mascots/calendar.png'
  const tileImages = [firstTileImage, secondTileImage, thirdTileImage, fourthTileImage, fifthTileImage]
  const tileImage = tileImages[stepNumber - 1]

  return (
    <article className="qb-step" aria-labelledby={headingId}>
      <p className="qb-step__num">{stepNumber}</p>
      <h3 className="qb-heading--h3" id={headingId}>
        {step.title}
      </h3>
      <ul>
        {step.bullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {tileImage ? (
        <img
          className="qb-step__image"
          src={tileImage}
          alt={step.imagePlaceholder}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="qb-placeholder"
          role="img"
          aria-label={step.imagePlaceholder}
        >
          {step.imagePlaceholder}
        </div>
      )}
    </article>
  )
}
