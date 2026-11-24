// PassphraseGate — SHA-256 hashed passphrase, legal links accessible before entry.
// German DDG compliant: Impressum/Privacy visible without authentication.
// Private distribution of passphrase = "rein privat" exemption argument.

import { useState, useEffect } from 'react'
import { sha256, GATE_HASH } from '../../utils/passphrase.js'

const STORAGE_KEY = 'laytrack_access'

export default function PassphraseGate({ children }) {
  const [granted, setGranted] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(true)
  const [legalPanel, setLegalPanel] = useState(null) // null | 'impressum' | 'privacy'

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === GATE_HASH) setGranted(true)
    } catch { /* no-op */ }
    setChecking(false)
  }, [])

  async function handleSubmit() {
    setError(false)
    const hash = await sha256(input)
    if (hash === GATE_HASH) {
      localStorage.setItem(STORAGE_KEY, hash)
      setGranted(true)
    } else {
      setError(true)
    }
  }

  function toggleLegal(panel) {
    setLegalPanel(prev => prev === panel ? null : panel)
  }

  if (checking) return null
  if (granted) return children

  return (
    <div className="min-h-screen flex flex-col bg-broker-bg text-broker-text">
      {/* Main gate — centered */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs">
          {/* Logo — no border-radius, the PNG already has rounded corners */}
          <img src={import.meta.env.BASE_URL + 'logo.png'} alt=""
            className="w-24 h-24 mx-auto mb-6 shadow-lg shadow-black/40" />

          {/* Brand */}
          <h1 className="text-2xl font-bold text-white text-center tracking-wide mb-0.5">Laytrack</h1>
          <p className="text-sm text-broker-accent text-center italic mb-8">
            Lay track. I do the numbers.
          </p>

          {/* Input — left-aligned so cursor doesn't land mid-placeholder */}
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Passphrase"
            autoFocus
            className="w-full bg-broker-surface border border-broker-border rounded-lg px-4 py-3 text-white placeholder-broker-text-muted focus:outline-none focus:border-broker-gold transition-colors mb-3"
          />

          <button onClick={handleSubmit}
            className="w-full bg-broker-gold hover:bg-broker-gold-dim text-broker-bg py-3 rounded-lg font-semibold transition-colors">
            Enter
          </button>

          {error && (
            <p className="text-red-400/80 text-sm text-center mt-3">
              Invalid passphrase
            </p>
          )}

          {/* Info */}
          <div className="mt-8 space-y-1.5 text-center">
            <p className="text-xs text-broker-text-muted">
              Private non-commercial hobby project.
            </p>
            <p className="text-xs text-broker-gold/70">
              Work in progress — testers wanted!
            </p>
            <p className="text-xs text-broker-text-muted/80 leading-relaxed">
              Access by personal invitation only.
              If you received a passphrase from the developer, enter it above.
            </p>
          </div>
        </div>
      </div>

      {/* Legal footer — always visible, accessible without passphrase */}
      <footer className="border-t border-broker-border/50 px-6 py-4 text-center space-y-2">
        <div className="flex justify-center gap-4">
          <button onClick={() => toggleLegal('impressum')}
            className={`text-xs underline transition-colors ${legalPanel === 'impressum' ? 'text-broker-text' : 'text-broker-text-muted/60 hover:text-broker-text-muted'}`}>
            Impressum
          </button>
          <button onClick={() => toggleLegal('privacy')}
            className={`text-xs underline transition-colors ${legalPanel === 'privacy' ? 'text-broker-text' : 'text-broker-text-muted/60 hover:text-broker-text-muted'}`}>
            Datenschutz / Privacy
          </button>
        </div>

        {legalPanel === 'impressum' && (
          <div className="text-xs text-broker-text-muted mt-2 max-w-md mx-auto text-left bg-broker-surface rounded-lg p-4">
            <p className="font-medium text-broker-text mb-1">Impressum (§ 5 DDG)</p>
            <p>Karsten Droste<br />Tannenstraße 43<br />67655 Kaiserslautern</p>
            <p className="mt-1">E-Mail: spieldroesig@gmail.com</p>
            <p className="mt-1">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: Karsten Droste</p>
            <p className="mt-1 text-broker-text-muted/60">Privates, nicht-kommerzielles Hobby-Projekt. Keine Abmahnungen ohne vorherigen Kontakt.</p>
            <p className="mt-2 text-broker-text-muted/60 italic">
              Note: This is a private, invitation-only application distributed exclusively via
              personal contact. It is not publicly accessible or advertised. The operator argues
              this qualifies as a purely private offering under German digital services law.
              The Impressum is provided voluntarily as a courtesy.
            </p>
          </div>
        )}

        {legalPanel === 'privacy' && (
          <div className="text-xs text-broker-text-muted mt-2 max-w-md mx-auto text-left bg-broker-surface rounded-lg p-4 space-y-2">
            <p className="font-medium text-broker-text">Datenschutzerklärung / Privacy Policy</p>

            <p><strong>Data Controller:</strong> Karsten Droste, Tannenstraße 43, 67655 Kaiserslautern. E-Mail: spieldroesig@gmail.com</p>

            <p><strong>Local Data:</strong> Game data and settings are stored in your browser's localStorage only. This data never leaves your device. Legal basis: Art. 6(1)(f) GDPR.</p>

            <p><strong>P2P Sync:</strong> When you create or join a room, your browser connects to public Nostr relay servers for WebRTC signaling. This transmits your IP address to relay operators and peer devices. This connection requires your explicit action. Legal basis: Art. 6(1)(a) GDPR (consent).</p>

            <p><strong>Hosting:</strong> GitHub Pages (GitHub/Microsoft, USA). GitHub may log IP addresses. <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" className="underline hover:text-broker-text" target="_blank" rel="noopener">GitHub Privacy Statement</a>. EU-US Data Privacy Framework.</p>

            <p><strong>No tracking:</strong> No cookies, no analytics, no advertising, no user accounts.</p>

            <p><strong>Your rights:</strong> Access, rectification, erasure, restriction, portability, objection. Contact: spieldroesig@gmail.com. Supervisory authority: LfDI Rheinland-Pfalz, Hintere Bleiche 34, 55116 Mainz.</p>
          </div>
        )}
      </footer>
    </div>
  )
}
