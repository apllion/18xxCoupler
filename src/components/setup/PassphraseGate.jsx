// PassphraseGate — SHA-256 hashed passphrase, legal links accessible before entry.
// German DDG compliant: Impressum/Privacy visible without authentication.
// Private distribution of passphrase = "rein privat" exemption argument.

import { useState, useEffect } from 'react'
import { sha256, GATE_HASH } from '../../utils/passphrase.js'

const STORAGE_KEY = '18xxCoupler_access'

export default function PassphraseGate({ children }) {
  const [granted, setGranted] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(true)
  const [showImpressum, setShowImpressum] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === GATE_HASH) setGranted(true)
    } catch {}
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

  if (checking) return null
  if (granted) return children

  return (
    <div className="min-h-screen flex flex-col bg-black text-gray-300">
      {/* Main gate — centered */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
            <img src={import.meta.env.BASE_URL + 'logo.png'} alt="" className="w-20 mx-auto mb-4 opacity-80" />
            <h1 className="text-xl font-bold text-white text-center mb-1">18xxCoupler</h1>
            <p className="text-gray-500 text-sm text-center mb-6">
              Private invitation only
            </p>

            <input
              type="password"
              value={input}
              onChange={e => { setInput(e.target.value); setError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Enter passphrase"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-center placeholder-gray-600 focus:outline-none focus:border-gray-500 mb-3"
            />

            <button onClick={handleSubmit}
              className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white py-3 rounded-lg font-medium transition-colors">
              Enter
            </button>

            {error && (
              <p className="text-red-400/80 text-sm text-center mt-3">
                Invalid passphrase
              </p>
            )}

            <div className="mt-6 pt-4 border-t border-gray-800 space-y-2 text-center">
              <p className="text-xs text-gray-600">
                Private non-commercial hobby project.
              </p>
              <p className="text-xs text-amber-500/70">
                Work in progress — testers wanted!
              </p>
              <p className="text-xs text-gray-700">
                Access is by personal invitation only.
                If you received a passphrase from the developer,
                enter it above. This app is not publicly accessible.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Legal footer — always visible, accessible without passphrase */}
      <footer className="border-t border-gray-900 px-6 py-4 text-center space-y-2">
        <div className="flex justify-center gap-4">
          <button onClick={() => setShowImpressum(!showImpressum)}
            className="text-xs text-gray-600 hover:text-gray-400 underline">
            Impressum
          </button>
          <button onClick={() => setShowPrivacy(!showPrivacy)}
            className="text-xs text-gray-600 hover:text-gray-400 underline">
            Datenschutz / Privacy
          </button>
        </div>

        {showImpressum && (
          <div className="text-xs text-gray-500 mt-2 max-w-md mx-auto text-left bg-gray-900/50 rounded-lg p-4">
            <p className="font-medium text-gray-400 mb-1">Impressum (§ 5 DDG)</p>
            <p>Karsten Droste<br />Tannenstraße 43<br />67655 Kaiserslautern</p>
            <p className="mt-1">E-Mail: spieldroesig@gmail.com</p>
            <p className="mt-1">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: Karsten Droste</p>
            <p className="mt-1 text-gray-600">Privates, nicht-kommerzielles Hobby-Projekt. Keine Abmahnungen ohne vorherigen Kontakt.</p>
            <p className="mt-2 text-gray-600 italic">
              Note: This is a private, invitation-only application distributed exclusively via
              personal contact. It is not publicly accessible or advertised. The operator argues
              this qualifies as a purely private offering under German digital services law.
              The Impressum is provided voluntarily as a courtesy.
            </p>
          </div>
        )}

        {showPrivacy && (
          <div className="text-xs text-gray-500 mt-2 max-w-md mx-auto text-left bg-gray-900/50 rounded-lg p-4 space-y-2">
            <p className="font-medium text-gray-400">Datenschutzerklärung / Privacy Policy</p>

            <p><strong>Data Controller:</strong> Karsten Droste, Tannenstraße 43, 67655 Kaiserslautern. E-Mail: spieldroesig@gmail.com</p>

            <p><strong>Local Data:</strong> Game data and settings are stored in your browser's localStorage only. This data never leaves your device. Legal basis: Art. 6(1)(f) GDPR.</p>

            <p><strong>P2P Sync:</strong> When you create or join a room, your browser connects to public Nostr relay servers for WebRTC signaling. This transmits your IP address to relay operators and peer devices. This connection requires your explicit action. Legal basis: Art. 6(1)(a) GDPR (consent).</p>

            <p><strong>18xx.games API:</strong> When you browse or import games, requests are routed through a CORS proxy on Cloudflare Workers (Cloudflare, Inc., USA) to the 18xx.games API. This transmits your IP address to Cloudflare and 18xx.games servers. The proxy does not store or log data. Only public game data is retrieved. <a href="https://www.cloudflare.com/privacypolicy/" className="underline hover:text-gray-300" target="_blank" rel="noopener">Cloudflare Privacy Policy</a>. Legal basis: Art. 6(1)(a) GDPR (consent — user-initiated).</p>

            <p><strong>Hosting:</strong> GitHub Pages (GitHub/Microsoft, USA). GitHub may log IP addresses. <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" className="underline hover:text-gray-300" target="_blank" rel="noopener">GitHub Privacy Statement</a>. EU-US Data Privacy Framework.</p>

            <p><strong>No tracking:</strong> No cookies, no analytics, no advertising, no user accounts.</p>

            <p><strong>Your rights:</strong> Access, rectification, erasure, restriction, portability, objection. Contact: spieldroesig@gmail.com. Supervisory authority: LfDI Rheinland-Pfalz, Hintere Bleiche 34, 55116 Mainz.</p>
          </div>
        )}
      </footer>
    </div>
  )
}
