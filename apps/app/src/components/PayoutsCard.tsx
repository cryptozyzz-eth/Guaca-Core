'use client'

import { useEffect, useRef, useState } from 'react'
import { PollarProvider, usePollar } from '@pollar/react'
import '@pollar/react/styles.css'
import { Button } from '@guaca/ui'

/**
 * "Activate payouts" — Pollar creates the spotter's wallet behind a normal
 * email-code login (no seed phrase, fees sponsored). Testnet demo only.
 */
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY ?? ''

function ActivateButton({ active, onLinked, lang }: { active: boolean; onLinked: () => void; lang: 'es' | 'en' }) {
  const { openLoginModal, isAuthenticated, wallet, logout } = usePollar()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const linked = useRef(false)
  const es = lang === 'es'

  useEffect(() => {
    if (active || linked.current || !isAuthenticated || !wallet?.address) return
    linked.current = true
    setBusy(true)
    fetch('/api/spotter/wallet', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: wallet.address }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('link failed')
        onLinked()
      })
      .catch(() => {
        linked.current = false
        setError(es ? 'No se pudo activar. Intenta de nuevo.' : 'Could not activate. Try again.')
      })
      .finally(() => setBusy(false))
  }, [active, isAuthenticated, wallet?.address, onLinked, es])

  if (active) {
    return (
      <p className="text-[12px] font-black text-guaca-palm">
        {es ? 'Cobros activados' : 'Payouts active'}
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <Button type="button" disabled={busy} onClick={() => (isAuthenticated ? logout() : openLoginModal())}>
        {busy ? (es ? 'Activando…' : 'Activating…') : es ? 'Activar cobros' : 'Activate payouts'}
      </Button>
      {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  )
}

export function PayoutsCard({ active, onLinked, lang }: { active: boolean; onLinked: () => void; lang: 'es' | 'en' }) {
  if (!PUBLISHABLE_KEY.startsWith('pub_testnet_')) return null
  const es = lang === 'es'
  return (
    <div className="rounded-[28px] bg-white p-5 text-center shadow-sm ring-1 ring-guaca-sand/75">
      <p className="text-[11px] font-black uppercase tracking-[.1em] text-guaca-ink/50">
        {es ? 'Tus cobros' : 'Your payouts'}
      </p>
      <p className="mt-1 mb-3 text-[12px] font-semibold text-guaca-ink/70">
        {es
          ? 'Activa tu cuenta de cobros con tu correo. Sin claves ni pasos extra.'
          : 'Activate your payout account with your email. No keys, no extra steps.'}
      </p>
      <PollarProvider client={{ apiKey: PUBLISHABLE_KEY }}>
        <ActivateButton active={active} onLinked={onLinked} lang={lang} />
      </PollarProvider>
    </div>
  )
}
