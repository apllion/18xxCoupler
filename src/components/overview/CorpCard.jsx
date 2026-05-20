// CorpCard — compact corp detail for both skins.
// Shows everything about one corp in a dense, readable card.

import { corpPrice } from '../../engine/stockMarket.js'
import { playerSharePercent, isPresident } from '../../engine/player.js'
import { formatCurrency } from '../../utils/currency.js'

export function CorpCard({ game, corpSym, skin }) {
  const m = skin === 'moderator'
  const corp = game.corporations.find(c => c.sym === corpSym)
  if (!corp) return null

  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const price = corpPrice(game.stockMarket, corp.sym) || 0
  const president = game.players.find(p => isPresident(p, corp.sym))

  // Shareholders
  const holders = game.players
    .map(p => ({ name: p.name, pct: playerSharePercent(p, corp.sym), pres: isPresident(p, corp.sym) }))
    .filter(h => h.pct > 0)

  // Corp-held shares
  const corpHoldings = (corp.sharesHeld || []).reduce((acc, s) => {
    acc[s.corpSym] = (acc[s.corpSym] || 0) + s.percent
    return acc
  }, {})

  // Privates owned by this corp
  const privates = (game.companies || []).filter(c => c.ownerType === 'corporation' && c.ownerId === corp.sym && !c.closed)

  // Last revenue
  let lastRev = null
  for (let i = game.actionLog.length - 1; i >= 0; i--) {
    const a = game.actionLog[i].action
    if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && a.corpSym === corp.sym) {
      lastRev = { amount: a.totalRevenue, type: a.type }
      break
    }
  }

  if (m) return (
    <div className="bg-blue-950 border border-blue-800 p-2 text-xs font-mono">
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold text-sm" style={{ color: corp.color }}>{corp.sym} <span className="text-blue-400 font-normal">{corp.name}</span></span>
        {corp.liquidated && <span className="text-red-400">LIQUIDATED</span>}
      </div>
      <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 text-blue-300">
        <div>Price: <span className="text-cyan-300">{price ? fmt(price) : '—'}</span></div>
        <div>Par: <span className="text-cyan-300">{corp.parPrice ? fmt(corp.parPrice) : '—'}</span></div>
        <div>Treas: <span className={corp.cash < 0 ? 'text-red-400' : 'text-green-300'}>{fmt(corp.cash)}</span></div>
        <div>Pres: <span className="text-yellow-300">{president?.name || '—'}</span></div>
        <div>IPO: {corp.ipoShares < 100 ? `${corp.ipoShares}%` : '—'}</div>
        <div>Pool: {corp.marketShares > 0 ? <span className="text-yellow-300">{corp.marketShares}%</span> : '—'}</div>
        <div>Tokens: {corp.tokensPlaced}/{corp.tokens.length}</div>
        {corp.loans > 0 && <div>Loans: <span className="text-red-300">{corp.loans}</span></div>}
      </div>
      {/* Trains */}
      <div className="mt-1">
        <span className="text-green-600">Trains: </span>
        {corp.trains.length === 0
          ? <span className="text-red-500">none</span>
          : corp.trains.map(t => (
            <span key={t.id} className="text-white font-bold mr-1">
              {t.name}{t.rustsOn && <span className="text-red-400 text-[10px]">r{t.rustsOn}</span>}
              {t.attachment && <span className="text-yellow-300">+{t.attachment.type === 'card' ? t.attachment.color : 'EC'}</span>}
            </span>
          ))
        }
      </div>
      {/* Revenue */}
      {lastRev && (
        <div className="mt-0.5">
          <span className="text-green-600">Rev: </span>
          <span className={lastRev.type === 'WITHHOLD_DIVIDEND' ? 'text-red-300' : 'text-green-300'}>
            {lastRev.type === 'WITHHOLD_DIVIDEND' ? 'W' : lastRev.type === 'HALF_DIVIDEND' ? 'H' : 'P'} {fmt(lastRev.amount)}
          </span>
          <span className="text-blue-400 ml-1">({fmt(Math.floor(lastRev.amount / 10))}/sh)</span>
        </div>
      )}
      {/* Shareholders */}
      <div className="mt-1">
        <span className="text-green-600">Shares: </span>
        {holders.map(h => (
          <span key={h.name} className="mr-2">
            <span className={h.pres ? 'text-yellow-300' : 'text-white'}>{h.name}</span>
            <span className="text-blue-300 ml-0.5">{h.pct}%</span>
          </span>
        ))}
      </div>
      {/* Privates */}
      {privates.length > 0 && (
        <div className="mt-0.5">
          <span className="text-green-600">Privates: </span>
          {privates.map(c => <span key={c.sym} className="text-purple-300 mr-1">{c.sym}</span>)}
        </div>
      )}
      {/* Corp holdings */}
      {Object.keys(corpHoldings).length > 0 && (
        <div className="mt-0.5">
          <span className="text-green-600">Holds: </span>
          {Object.entries(corpHoldings).map(([sym, pct]) => <span key={sym} className="text-cyan-300 mr-1">{sym} {pct}%</span>)}
        </div>
      )}
    </div>
  )

  // Broker skin
  return (
    <div className="bg-broker-surface rounded-lg p-3 text-sm">
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="font-bold text-lg" style={{ color: corp.color }}>{corp.sym}</span>
          <span className="text-broker-text-muted ml-2">{corp.name}</span>
        </div>
        <div className="text-right">
          <div className="text-white font-medium">{price ? fmt(price) : '—'}</div>
          <div className="text-broker-text-muted text-xs">Par {corp.parPrice ? fmt(corp.parPrice) : '—'}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>Treasury: <span className={`font-medium ${corp.cash < 0 ? 'text-red-400' : 'text-white'}`}>{fmt(corp.cash)}</span></div>
        <div>President: <span className="text-white font-medium">{president?.name || '—'}</span></div>
        <div>IPO: {corp.ipoShares < 100 ? `${corp.ipoShares}%` : '—'} / Pool: {corp.marketShares > 0 ? <span className="text-amber-400">{corp.marketShares}%</span> : '—'}</div>
        <div>Tokens: {corp.tokensPlaced}/{corp.tokens.length}{corp.loans > 0 && <span className="text-red-400 ml-2">Loans: {corp.loans}</span>}</div>
      </div>
      {/* Trains */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="text-broker-text-muted text-xs">Trains:</span>
        {corp.trains.length === 0
          ? <span className="text-red-400 text-xs font-bold">none</span>
          : corp.trains.map(t => (
            <span key={t.id} className="bg-broker-surface-hover px-2 py-0.5 rounded text-xs font-medium text-white">
              {t.name}
              {t.rustsOn && <span className="text-red-400 ml-0.5 text-[10px]">r{t.rustsOn}</span>}
              {t.attachment && <span className="text-yellow-300 ml-0.5">+{t.attachment.type === 'card' ? t.attachment.color : 'EC'}</span>}
            </span>
          ))
        }
      </div>
      {/* Revenue */}
      {lastRev && (
        <div className="mt-1 text-xs">
          <span className="text-broker-text-muted">Last revenue: </span>
          <span className={lastRev.type === 'WITHHOLD_DIVIDEND' ? 'text-red-400' : 'text-green-400'}>
            {fmt(lastRev.amount)} {lastRev.type === 'WITHHOLD_DIVIDEND' ? '(W)' : lastRev.type === 'HALF_DIVIDEND' ? '(H)' : '(P)'}
          </span>
          <span className="text-broker-text-muted ml-1">= {fmt(Math.floor(lastRev.amount / 10))}/sh</span>
        </div>
      )}
      {/* Shareholders */}
      <div className="mt-2 flex gap-2 flex-wrap text-xs">
        {holders.map(h => (
          <span key={h.name} className={`${h.pres ? 'text-white font-bold' : 'text-broker-text'}`}>
            {h.name} {h.pct}%{h.pres && ' P'}
          </span>
        ))}
      </div>
      {/* Privates + holdings */}
      {(privates.length > 0 || Object.keys(corpHoldings).length > 0) && (
        <div className="mt-1 text-xs text-broker-text-muted">
          {privates.length > 0 && <span>Privates: {privates.map(c => c.sym).join(', ')}</span>}
          {Object.keys(corpHoldings).length > 0 && <span className="ml-2">Holds: {Object.entries(corpHoldings).map(([s, p]) => `${s} ${p}%`).join(', ')}</span>}
        </div>
      )}
    </div>
  )
}
