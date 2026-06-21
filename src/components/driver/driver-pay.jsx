// Pay Card — transfer money between bank, players, and corps

import { useState } from 'react'

export default function PayCard({ data }) {
  const { game, fmt, dispatch, me, myPlayerId } = data
  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState(null)
  const [to, setTo] = useState(null)

  const floatedCorps = game.corporations.filter(c => c.floated)

  const entities = [
    { type: 'bank', id: 'bank', label: 'Bank', cash: game.bank.cash },
    ...game.players.map(p => ({ type: 'player', id: p.id, label: p.name, cash: p.cash, color: null })),
    ...floatedCorps.map(c => ({ type: 'corporation', id: c.sym, label: c.sym, cash: c.cash, color: c.color, textColor: c.textColor })),
  ]

  // Default from = current player
  if (!from && myPlayerId) {
    const p = entities.find(e => e.id === myPlayerId)
    if (p) setFrom(p)
  }

  const v = parseInt(amount, 10) || 0

  function doPay() {
    if (v <= 0 || !from || !to) return
    dispatch({ type: 'ADJUST_CASH', entityId: from.id, entityType: from.type, amount: -v })
    dispatch({ type: 'ADJUST_CASH', entityId: to.id, entityType: to.type, amount: v })
    setAmount('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-lg font-bold mb-3">Pay</div>

      {/* From */}
      <div className="text-sm text-broker-text-muted mb-1">From:</div>
      <div className="flex gap-2 flex-wrap mb-3">
        {entities.map(e => (
          <button key={e.id} onClick={() => setFrom(e)}
            className={`text-sm px-3 py-2 rounded-lg font-medium ${
              from?.id === e.id ? 'ring-2 ring-broker-gold bg-broker-surface-hover' : 'bg-broker-surface'
            }`}
            style={e.color ? { backgroundColor: e.color, color: e.textColor } : undefined}>
            {e.label} <span className="text-xs opacity-60">{fmt(e.cash)}</span>
          </button>
        ))}
      </div>

      {/* To */}
      <div className="text-sm text-broker-text-muted mb-1">To:</div>
      <div className="flex gap-2 flex-wrap mb-3">
        {entities.filter(e => !(e.id === from?.id && e.type === from?.type)).map(e => (
          <button key={e.id} onClick={() => setTo(e)}
            className={`text-sm px-3 py-2 rounded-lg font-medium ${
              to?.id === e.id ? 'ring-2 ring-broker-gold bg-broker-surface-hover' : 'bg-broker-surface'
            }`}
            style={e.color ? { backgroundColor: e.color, color: e.textColor } : undefined}>
            {e.label}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="text-sm text-broker-text-muted mb-1">Amount:</div>
      <div className="flex gap-2 items-center mb-3">
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="0" className="w-28 bg-broker-surface border border-broker-border rounded-lg px-3 py-3 text-white text-center text-lg" />
        {[10, 20, 50, 100].map(n => (
          <button key={n} onClick={() => setAmount(String(n))}
            className="text-sm bg-broker-surface hover:bg-broker-surface-hover text-white px-3 py-2 rounded-lg">{n}</button>
        ))}
      </div>

      {/* Confirm */}
      {v > 0 && from && to && (
        <button onClick={doPay}
          className="w-full bg-green-700 hover:bg-green-600 text-white py-3 rounded-lg font-bold text-sm">
          Pay {fmt(v)}: {from.label} → {to.label}
        </button>
      )}
    </div>
  )
}
