// AboutPage — legal disclaimers, credits, impressum.

import { allTitles } from '../../titles/index.js'

export default function AboutPage({ onEnter }) {
  const titles = allTitles()

  return (
    <div className="min-h-screen bg-broker-bg text-broker-text p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">18xxBroker</h1>
      <p className="text-broker-text-muted mb-6">A table companion app for 18xx board games</p>

      <button onClick={onEnter}
        className="w-full bg-broker-gold/20 text-broker-gold hover:bg-broker-gold/30 rounded-lg py-4 text-lg font-bold mb-8 transition-colors">
        Enter App
      </button>

      <section className="space-y-6 text-sm">

        <div>
          <h2 className="text-lg font-bold text-white mb-2">What is this?</h2>
          <p>
            18xxBroker is a free, open-source financial moderator for 18xx railroad board games.
            It tracks money, shares, trains, and stock prices at your game table.
            It does not replace the board game — you still need the physical game to play.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-2">Disclaimer</h2>
          <p>
            This is a private, non-commercial hobby project. The author is not affiliated with,
            employed by, or working on behalf of any game designer, publisher, or the 18xx.games
            platform. This software is not endorsed by or associated with any game company.
          </p>
          <p className="mt-2">
            This software is provided as-is, without warranty of any kind. It is a game aid, not
            a rules engine — it does not enforce game rules. The players at the table are
            responsible for correct play. Financial calculations are advisory and may contain errors.
          </p>
          <p className="mt-2">
            No game content (maps, tiles, artwork, rules text) is included or distributed.
            Only financial tracking mechanics are implemented.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-2">Game Credits & Intellectual Property</h2>
          <p className="mb-2">
            18xx games are the intellectual property of their respective designers and publishers.
            18xxBroker is a financial tracking tool and does not include any copyrighted game
            content. The following titles are supported, with acknowledgment to their creators:
          </p>
          <div className="bg-broker-surface rounded-lg p-3 space-y-1 max-h-64 overflow-y-auto">
            {titles.map(t => (
              <div key={t.titleId} className="flex justify-between text-xs border-b border-broker-border/20 py-0.5">
                <span className="text-white font-medium">{t.title}</span>
                <span className="text-broker-text-muted">{t.designer || 'Unknown'}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-broker-text-muted">
            If you are a game designer or publisher and have concerns about the inclusion
            of your title, please contact us via GitHub.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-2">18xx.games Integration</h2>
          <p>
            18xxBroker can import game data from{' '}
            <a href="https://18xx.games" className="text-broker-gold hover:underline" target="_blank" rel="noopener">18xx.games</a>,
            an open-source platform by Toby Mao (MIT License). Game import replays financial
            actions only — no map, tile, or route data is used. This feature requires an
            internet connection and is subject to 18xx.games API availability.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-2">Datenschutzerklärung / Privacy Policy</h2>

          <p className="font-medium mt-2">1. Verantwortlicher / Data Controller</p>
          <p>Karsten Droste, Tannenstraße 43, 67655 Kaiserslautern. E-Mail: spieldroesig@gmail.com</p>

          <p className="font-medium mt-3">2. Overview</p>
          <p>
            18xxBroker runs entirely in your browser. We do not operate servers, do not
            create user accounts, and do not collect personal data for our own purposes.
            No cookies, no analytics, no advertising.
          </p>

          <p className="font-medium mt-3">3. Local Data (localStorage)</p>
          <p>
            Game data (player names, game state, settings, passphrase acknowledgment) is
            stored in your browser's localStorage. This data never leaves your device and
            is not accessible to us or any third party. You can clear it at any time via
            your browser settings. Legal basis: Art. 6(1)(f) GDPR (legitimate interest —
            technical necessity for the app to function).
          </p>

          <p className="font-medium mt-3">4. P2P Synchronization (WebRTC / Nostr Relays)</p>
          <p>
            When you create or join a room for multi-device sync, your browser connects to
            public Nostr relay servers operated by third parties for WebRTC signaling. This
            transmits your <strong>IP address</strong> to:
          </p>
          <ul className="list-disc ml-5 mt-1 space-y-1">
            <li>Nostr relay operators (for signaling — establishing the peer connection)</li>
            <li>Other devices in the same room (direct peer-to-peer connection via WebRTC)</li>
          </ul>
          <p className="mt-1">
            No game content or personal data beyond IP addresses is transmitted to relay
            operators. The P2P connection is only established when you explicitly create or
            join a room. Auto-rejoin from a previous session requires your consent (see below).
            Legal basis: Art. 6(1)(a) GDPR (consent — you initiate the connection).
          </p>

          <p className="font-medium mt-3">5. 18xx.games API</p>
          <p>
            When you browse or import games from 18xx.games, your browser makes requests to
            the 18xx.games API (operated by Toby Mao). This transmits your <strong>IP address</strong>{' '}
            to 18xx.games servers. Only publicly available game data is retrieved. This
            connection is only made when you explicitly request it (clicking Browse or Import).
            Legal basis: Art. 6(1)(a) GDPR (consent — you initiate the request).
          </p>

          <p className="font-medium mt-3">6. GitHub Pages Hosting</p>
          <p>
            This site is hosted on GitHub Pages (GitHub, Inc. / Microsoft Corp., USA).
            GitHub may process IP addresses in server logs as part of providing the hosting
            service. See{' '}
            <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
              className="text-broker-gold hover:underline" target="_blank" rel="noopener">
              GitHub's Privacy Statement
            </a>.
            Legal basis: Art. 6(1)(f) GDPR (legitimate interest — necessary for web hosting).
            Transfer to USA under EU-US Data Privacy Framework.
          </p>

          <p className="font-medium mt-3">7. Your Rights</p>
          <p>
            Under GDPR, you have the right to access, rectification, erasure, restriction of
            processing, data portability, and objection. Since we do not store personal data
            on our servers, most of these rights are exercised through your browser (clearing
            localStorage) or through the third parties listed above.
          </p>
          <p className="mt-1">
            For questions or complaints, contact: spieldroesig@gmail.com.
            You also have the right to lodge a complaint with the supervisory authority:
            Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit
            Rheinland-Pfalz, Hintere Bleiche 34, 55116 Mainz.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-2">Hosting</h2>
          <p>
            This application is hosted on{' '}
            <a href="https://pages.github.com" className="text-broker-gold hover:underline" target="_blank" rel="noopener">GitHub Pages</a>
            {' '}as a static web application. No backend server is involved. All computation
            happens in your browser.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-2">Open Source</h2>
          <p>
            18xxBroker is open source. Source code is available on{' '}
            <a href="https://github.com/droste/18xxBroker" className="text-broker-gold hover:underline" target="_blank" rel="noopener">GitHub</a>.
            Contributions welcome.
          </p>
          <p className="mt-1">
            Inspired by Lemmi's 18xx/PC moderator by Dirk Clemens — the gold standard
            of 18xx table software for over 25 years.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-2">Impressum</h2>
          <p><strong>Angaben gemäß § 5 DDG</strong></p>
          <p className="mt-1">
            Karsten Droste<br />
            Tannenstraße 43<br />
            67655 Kaiserslautern
          </p>
          <p className="mt-2">
            <strong>Kontakt</strong><br />
            E-Mail: spieldroesig@gmail.com
          </p>
          <p className="mt-2">
            <strong>Hinweis</strong><br />
            Privates, nicht-kommerzielles Hobby-Projekt. Keine Abmahnungen ohne vorherigen Kontakt.
          </p>
          <p className="mt-1 text-xs text-broker-text-muted">
            Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: Karsten Droste, Anschrift wie oben.
          </p>
        </div>

        <div className="text-xs text-broker-text-muted pt-4 border-t border-broker-border">
          <p>MIT License. © 2026. No warranties expressed or implied.</p>
          <p className="mt-1">
            18xx is a collective term for a series of board games. Each game title is the
            property of its respective designer and publisher. This software is an independent
            fan-made tool and is not affiliated with or endorsed by any game publisher.
          </p>
        </div>
      </section>
    </div>
  )
}
