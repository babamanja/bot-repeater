import { useCallback, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Faq } from './components/Faq'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { BenefitsSection } from './sections/BenefitsSection'
import { CtaSection } from './sections/CtaSection'
import { HeroSection } from './sections/HeroSection'
import { PainSection } from './sections/PainSection'
import { PricingSection } from './sections/PricingSection'
import { ProductHowItWorksSection } from './sections/ProductHowItWorksSection'
import AuthModal from '../../components/auth/AuthModal'
import type { AuthMode } from '../../components/auth/AuthPanel'
import type { AuthSession } from '../../types'
import { homePathForRole } from '../../paths'
import LegalDocumentModal from '../legal/LegalDocumentModal'
import { LEGAL_QUERY_KEY, parseLegalDocumentId } from '../legal/legalQuery'

type AuthPurpose = 'signup-check' | 'login-continue' | null

export function LandingPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const legalDocumentId = parseLegalDocumentId(searchParams.get(LEGAL_QUERY_KEY))

  const [authModal, setAuthModal] = useState<{ open: boolean; mode: AuthMode }>({
    open: false,
    mode: 'login',
  })

  const closeLegalModal = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete(LEGAL_QUERY_KEY)
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])

  const authPurposeRef = useRef<AuthPurpose>(null)

  const openAuthModal = useCallback((mode: AuthMode, purpose: AuthPurpose = null) => {
    authPurposeRef.current = purpose
    setAuthModal({ open: true, mode })
  }, [])

  const closeAuthModal = useCallback(() => {
    setAuthModal((state) => ({ ...state, open: false }))
  }, [])

  const signupHandlerRef = useRef<((session: AuthSession) => Promise<void>) | null>(null)
  const continueHandlerRef = useRef<((session: AuthSession) => Promise<void>) | null>(null)

  const registerSignupHandler = useCallback((handler: (session: AuthSession) => Promise<void>) => {
    signupHandlerRef.current = handler
  }, [])

  const registerContinueHandler = useCallback((handler: (session: AuthSession) => Promise<void>) => {
    continueHandlerRef.current = handler
  }, [])

  const handleLandingAuthSuccess = useCallback(
    async (session: AuthSession) => {
      const purpose = authPurposeRef.current
      authPurposeRef.current = null
      closeAuthModal()
      if (purpose === 'signup-check') {
        await signupHandlerRef.current?.(session)
        return
      }
      if (purpose === 'login-continue') {
        await continueHandlerRef.current?.(session)
        return
      }
      navigate(homePathForRole(session.user.role), { replace: true })
    },
    [closeAuthModal, navigate],
  )

  return (
    <div className="landing">
      <Header onOpenAuth={(mode) => openAuthModal(mode, null)} />
      <main className="landing__main">
        <HeroSection
          onRequireSignup={() => openAuthModal('signup', 'signup-check')}
          onRequireLoginToContinue={() => openAuthModal('login', 'login-continue')}
          registerSignupHandler={registerSignupHandler}
          registerContinueHandler={registerContinueHandler}
        />
        <PainSection />
        <BenefitsSection />
        <ProductHowItWorksSection />
        <CtaSection onGetStarted={() => openAuthModal('signup', null)} />
        <PricingSection />
        <Faq />
      </main>
      <Footer />
      <AuthModal
        open={authModal.open}
        initialMode={authModal.mode}
        onClose={closeAuthModal}
        onAuthSuccess={handleLandingAuthSuccess}
        redirectOnSuccess={false}
      />
      {legalDocumentId ? (
        <LegalDocumentModal documentId={legalDocumentId} onClose={closeLegalModal} />
      ) : null}
    </div>
  )
}
