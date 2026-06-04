import { useState } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useDispatch } from '../../hooks/useDispatch.js'
import { formatCurrency } from '../../utils/currency.js'

export default function PrivatesTab() {
  const game = useGameStore((s) => s.game)
  const dispatch = useDispatch()

  if (!game) return null

  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)

  function handleCollectAll() {
    dispatch({ type: 'COLLECT_ALL_REVENUE' })
  }

  const openCompanies = game.companies.filter((c) => !c.closed)
  const closedCompanies = game.companies.filter((c) => c.closed)

  return (
    <div className="p-3 space-y-4">
      {openCompanies.length > 0 && (
        <button
          onClick={handleCollectAll}
          className="w-full bg-green-800 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
        >
          Collect All Revenue
        </button>
      )}

      <div className="space-y-2">
        {openCompanies.map((c) => (
          <PrivateCard key={c.sym} company={c} game={game} dispatch={dispatch} fmt={fmt} />
        ))}
      </div>

      {closedCompanies.length > 0 && (
        <div>
          <div className="text-xs text-broker-text-muted font-medium uppercase mb-2">Closed</div>
          {closedCompanies.map((c) => (
            <div key={c.sym} className="text-sm text-broker-gold-dim py-1 flex items-center justify-between">
              <span>{c.sym} — {c.name}</span>
              <button onClick={() => dispatch({ type: 'ASSIGN_PRIVATE', companySym: c.sym, toType: 'player', toId: game.players[0]?.id })}
                className="text-[10px] text-broker-text-muted hover:text-white px-1">reopen</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PrivateCard({ company, game, dispatch, fmt }) {
  const [sellMode, setSellMode] = useState(false)
  const [sellPrice, setSellPrice] = useState(String(company.value))

  const ownerName = company.ownerId
    ? (company.ownerType === 'player'
      ? game.players.find((p) => p.id === company.ownerId)?.name
      : company.ownerId)
    : null

  return (
    <div className="bg-broker-surface rounded-lg p-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{company.sym} — {company.name}</div>
          <div className="text-xs text-broker-text-muted mt-0.5">
            Value: {fmt(company.value)}
            {company.revenue > 0 && <> · Revenue: {fmt(company.revenue)}/OR</>}
            {company.activeInPhase && <span className="text-yellow-400"> · Active in {company.activeInPhase} phase</span>}
            {company.neverCloses && <span className="text-green-400"> · Never closes</span>}
          </div>
          {company.sharesGranted && (
            <div className="text-xs text-blue-300 mt-0.5">
              Grants: {company.sharesGranted.map((s) => `${s.percent}% ${s.corpSym}`).join(', ')}
            </div>
          )}
          {company.desc && <div className="text-xs text-broker-text-muted mt-1">{company.desc}</div>}
        </div>
        <div className="text-sm flex-shrink-0 ml-3">
          {ownerName
            ? <span className="text-broker-text">{ownerName}</span>
            : <span className="text-broker-text-muted">Unowned</span>
          }
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 mt-2 flex-wrap">
        {/* Unowned: assign to player */}
        {!company.ownerId && game.players.map(p => (
          <button key={p.id}
            onClick={() => dispatch({ type: 'ASSIGN_PRIVATE', companySym: company.sym, toId: p.id, toType: 'player' })}
            className="text-[10px] px-2 py-1 rounded bg-broker-surface-hover text-broker-text-muted hover:text-white">
            → {p.name}
          </button>
        ))}

        {/* Unowned: assign to corp */}
        {!company.ownerId && game.corporations.filter(c => c.floated).map(c => (
          <button key={c.sym}
            onClick={() => dispatch({ type: 'ASSIGN_PRIVATE', companySym: company.sym, toId: c.sym, toType: 'corporation' })}
            className="text-[10px] px-2 py-1 rounded font-bold"
            style={{ backgroundColor: c.color, color: c.textColor || '#fff' }}>
            → {c.sym}
          </button>
        ))}

        {/* Owned by player: sell to corp */}
        {company.ownerId && company.ownerType === 'player' && company.canSellToCorp !== false && (
          <button onClick={() => setSellMode(!sellMode)}
            className="text-[10px] px-2 py-1 rounded bg-broker-surface-hover text-broker-text-muted hover:text-white">
            Sell to Corp
          </button>
        )}

        {/* Owned: return to bank */}
        {company.ownerId && (
          <button onClick={() => dispatch({ type: 'RETURN_PRIVATE', companySym: company.sym })}
            className="text-[10px] px-2 py-1 rounded bg-broker-surface-hover text-broker-text-muted hover:text-white">
            Return
          </button>
        )}

        {/* Close */}
        {company.ownerId && !company.neverCloses && (
          <button onClick={() => dispatch({ type: 'CLOSE_PRIVATE', companySym: company.sym })}
            className="text-[10px] px-2 py-1 rounded bg-broker-surface-hover text-red-400/70 hover:text-red-400">
            Close
          </button>
        )}
      </div>

      {/* Sell to corp flow */}
      {sellMode && (
        <div className="mt-2 flex gap-2 items-center flex-wrap">
          <input type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)}
            className="w-20 bg-broker-bg border border-broker-border rounded px-2 py-1 text-sm text-white" />
          <span className="text-xs text-broker-text-muted">to</span>
          {game.corporations.filter((c) => c.floated).map((c) => (
            <button key={c.sym}
              onClick={() => {
                const price = parseInt(sellPrice, 10)
                if (!price || !company.ownerId) return
                dispatch({ type: 'SELL_PRIVATE', companySym: company.sym, fromPlayerId: company.ownerId, toCorpSym: c.sym, price })
                setSellMode(false)
              }}
              className="text-xs px-2 py-1 rounded font-medium"
              style={{ backgroundColor: c.color, color: c.textColor || '#fff' }}>
              {c.sym}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
