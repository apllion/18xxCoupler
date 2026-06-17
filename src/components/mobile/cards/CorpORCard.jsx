// Corp OR Card — one per corp the player presides. Revenue, trains, tokens.

import { useState } from 'react'
import { nextAvailableTrains } from '../../../engine/depot.js'

export default function CorpORCard({ data, corp }) {
  const { game, fmt, dispatch } = data
  const [revInput, setRevInput] = useState('')

  const rev = parseInt(revInput, 10) || 0

  return (
    <div className="flex flex-col h-full">
      {/* Corp header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-1 rounded font-bold text-sm"
          style={corp.stripeColor
            ? { background: `linear-gradient(135deg, ${corp.color} 50%, ${corp.stripeColor} 50%)`, color: corp.textColor }
            : { backgroundColor: corp.color, color: corp.textColor }
          }>{corp.sym}</span>
        <span className="text-sky-300 font-bold text-lg">{fmt(corp.cash)}</span>
        <span className="text-xs text-broker-text-muted">@ {fmt(corp.price)}</span>
        {corp.operated && <span className="text-[10px] text-green-400">✓ operated</span>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="bg-broker-surface rounded-lg p-2 text-center">
          <div className="text-broker-text-muted">Trains</div>
          <div className="font-bold text-white">{corp.trains.length > 0 ? corp.trains.map(t => t.name).join(' ') : 'none'}</div>
        </div>
        <div className="bg-broker-surface rounded-lg p-2 text-center">
          <div className="text-broker-text-muted">Tokens</div>
          <div className="font-bold text-white">{corp.tokensPlaced}/{corp.tokens.length}</div>
        </div>
        <div className="bg-broker-surface rounded-lg p-2 text-center">
          <div className="text-broker-text-muted">IPO</div>
          <div className="font-bold text-white">{corp.ipoShares}%</div>
        </div>
      </div>

      {/* Revenue */}
      <div className="bg-broker-surface rounded-lg p-3 mb-3">
        <div className="text-xs text-broker-text-muted mb-1">Revenue</div>
        <div className="flex items-center gap-2">
          <input type="number" value={revInput} onChange={e => setRevInput(e.target.value)}
            placeholder="0" className="w-20 bg-broker-bg border border-broker-border rounded px-2 py-2 text-white text-center" />
          {corp.trains.length === 0 && <button onClick={() => dispatch({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: 0 })}
            className="text-sm bg-red-800 text-white px-3 py-2 rounded-lg font-medium">No Trains</button>}
          {rev > 0 && (
            <>
              <button onClick={() => { dispatch({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }); setRevInput('') }}
                className="text-sm bg-green-700 text-white px-4 py-2 rounded-lg font-medium">Payout</button>
              <button onClick={() => { dispatch({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }); setRevInput('') }}
                className="text-sm bg-red-700 text-white px-4 py-2 rounded-lg font-medium">Withhold</button>
              {game.title.halfPay && (
                <button onClick={() => { dispatch({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }); setRevInput('') }}
                  className="text-xs bg-amber-700 text-white px-3 py-2 rounded">½</button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Train buy */}
      <div className="bg-broker-surface rounded-lg p-3 mb-3">
        <div className="text-xs text-broker-text-muted mb-1">Buy Train</div>
        <div className="flex gap-1 flex-wrap">
          {(game.depot ? nextAvailableTrains(game.depot) : []).map(t => (
            <button key={t.name}
              onClick={() => dispatch({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName: t.name, price: t.price })}
              disabled={corp.cash < t.price}
              className="text-xs bg-blue-800 hover:bg-blue-700 disabled:opacity-30 text-white px-3 py-2 rounded">
              {t.name} {fmt(t.price)}
            </button>
          ))}
        </div>
      </div>

      {/* Token */}
      {corp.tokensPlaced < corp.tokens.length && (
        <div className="bg-broker-surface rounded-lg p-3">
          <div className="text-xs text-broker-text-muted mb-1">Place Token</div>
          <button onClick={() => dispatch({ type: 'PLACE_TOKEN', corpSym: corp.sym, price: corp.tokens[corp.tokensPlaced] || 0 })}
            className="text-xs bg-green-700 text-white px-3 py-2 rounded">
            Place {fmt(corp.tokens[corp.tokensPlaced] || 0)}
          </button>
        </div>
      )}
    </div>
  )
}
