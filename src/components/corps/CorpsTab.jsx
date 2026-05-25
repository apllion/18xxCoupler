import { useState, useMemo, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { useDispatch } from '../../hooks/useDispatch.js'
import { formatCurrency } from '../../utils/currency.js'
import { corpPrice } from '../../engine/stockMarket.js'
import { playerSharePercent } from '../../engine/player.js'
import { currentPhase, trainLimit, operatingRounds } from '../../engine/phase.js'
import { nextAvailableTrains, remainingCount } from '../../engine/depot.js'
import { calculateDividend } from '../../engine/rules/dividend.js'
import { dividendComparison } from '../../engine/rules/dividendAdvisor.js'
import { trainRushAnalysis } from '../../engine/rules/trainRush.js'
import { currentInterestRate, interestDue, maxLoansForCorp } from '../../engine/loans.js'
import { corpAdvisorTips } from '../../engine/rules/advisorTips.js'
import { AdvisorSection } from '../shared/AdvisorSection.jsx'

export default function CorpsTab() {
  const game = useGameStore((s) => s.game)
  const dispatch = useDispatch()
  const [corpIndex, setCorpIndex] = useState(0)
  const turnTracking = useUIStore((s) => s.turnTracking)
  const plusPlus = useUIStore((s) => s.plusPlus)
  const isWhatIf = !!useGameStore((s) => s.whatIfSnapshot)
  const turnQueue = game?.turnQueue || []
  const turnIndex = game?.turnIndex || 0

  // Navigate from PlayersTab cross-link
  const activeCorpSym = useUIStore((s) => s.activeCorpSym)

  if (!game) return null

  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const phase = currentPhase(game.phaseManager)
  const orCount = operatingRounds(game.phaseManager)

  // Operating order: floated corps sorted by share price descending
  const operatingOrder = useMemo(() => {
    return game.corporations
      .filter((c) => c.floated)
      .map((c) => ({ ...c, price: corpPrice(game.stockMarket, c.sym) || 0 }))
      .sort((a, b) => b.price - a.price)
  }, [game.corporations, game.stockMarket])

  // Auto-sync with turn tracking in OR (disabled in what-if mode)
  const isOR = game.roundTracker?.type === 'operating' && !game.roundTracker?.inPregame
  const currentTurnCorp = isOR && turnTracking === 'on' && !isWhatIf && turnQueue.length > 0
    ? turnQueue[turnIndex]
    : null

  useEffect(() => {
    if (currentTurnCorp) {
      const idx = operatingOrder.findIndex((c) => c.sym === currentTurnCorp)
      if (idx >= 0 && idx !== corpIndex) setCorpIndex(idx)
    }
  }, [currentTurnCorp, operatingOrder])

  useEffect(() => {
    if (activeCorpSym) {
      const idx = operatingOrder.findIndex(c => c.sym === activeCorpSym)
      if (idx >= 0) setCorpIndex(idx)
      useUIStore.getState().setActiveCorp(null)
    }
  }, [activeCorpSym, operatingOrder])

  // Unfloated corps
  const unfloatedCorps = game.corporations.filter(c => !c.floated)

  if (operatingOrder.length === 0) {
    return (
      <div className="p-6 text-center text-broker-text-muted">
        No corporations have floated yet
      </div>
    )
  }

  const safeIndex = Math.min(corpIndex, operatingOrder.length - 1)
  const selected = operatingOrder[safeIndex]

  function nextCorp() {
    setCorpIndex((i) => (i + 1) % operatingOrder.length)
  }
  function prevCorp() {
    setCorpIndex((i) => (i - 1 + operatingOrder.length) % operatingOrder.length)
  }

  function handleSoldOutAdjust() {
    dispatch({ type: 'SOLD_OUT_ADJUST' })
  }

  function handleCollectAll() {
    dispatch({ type: 'COLLECT_ALL_REVENUE' })
  }

  return (
    <div className="p-3 space-y-3">
      {/* OR info bar */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-broker-text-muted">
          Phase <span className="text-white font-medium">{phase.name}</span>
          {' · '}ORs: {orCount}
          {' · '}Train limit: {typeof phase.trainLimit === 'number' ? phase.trainLimit : '—'}
        </div>
        <div className="flex gap-2">
          {game.companies?.length > 0 && (
            <button
              onClick={handleCollectAll}
              className="text-xs bg-green-900 hover:bg-green-800 text-green-200 px-2 py-1 rounded"
            >
              Collect Privates
            </button>
          )}
          <button
            onClick={handleSoldOutAdjust}
            className="text-xs bg-broker-green hover:bg-broker-green-light text-broker-gold px-2 py-1 rounded"
          >
            Sold-out ↑
          </button>
        </div>
      </div>

      {/* Corp operating order with nav */}
      <div className="flex items-center gap-2">
        <button onClick={prevCorp} className="text-broker-text-muted hover:text-broker-gold px-2 py-1">◀</button>
        <div className="flex gap-1 overflow-x-auto flex-1">
          {operatingOrder.map((c, i) => (
            <button
              key={c.sym}
              onClick={() => setCorpIndex(i)}
              className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium transition-colors ${
                i === safeIndex
                  ? 'ring-2 ring-white'
                  : i < safeIndex ? 'opacity-40' : 'opacity-80'
              }`}
              style={c.stripeColor
                ? { background: `linear-gradient(135deg, ${c.color} 50%, ${c.stripeColor} 50%)`, color: c.textColor || '#fff' }
                : { backgroundColor: c.color, color: c.textColor || '#fff' }
              }
            >
              {c.sym}
            </button>
          ))}
        </div>
        <button onClick={nextCorp} className="text-broker-text-muted hover:text-broker-gold px-2 py-1">▶</button>
      </div>

      <div className="text-xs text-broker-text-muted text-center">
        {safeIndex + 1} of {operatingOrder.length} · {selected.sym} operating
      </div>

      {/* Corp detail */}
      <CorpDetail game={game} corp={selected} dispatch={dispatch} fmt={fmt} onNext={nextCorp} plusPlus={plusPlus} />

      {/* Unfloated corps */}
      {unfloatedCorps.length > 0 && (
        <div className="mt-4">
          <div className="text-broker-text-muted text-[10px] uppercase tracking-widest border-b border-broker-border pb-1 mb-2">
            Not Yet Floated
          </div>
          <div className="space-y-1">
            {unfloatedCorps.map(c => (
              <div key={c.sym} className="flex items-center gap-2 text-sm bg-broker-surface rounded px-3 py-1.5">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                <span className="font-medium w-12">{c.sym}</span>
                <span className="text-broker-text-muted flex-1 truncate">{c.name}</span>
                {c.type && <span className="text-xs text-broker-text-muted">{c.type}</span>}
                {c.ipoed && <span className="text-xs text-broker-text-muted">par {fmt(c.parPrice)}</span>}
                <span className="text-xs text-broker-text-muted">IPO {c.ipoShares}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CorpDetail({ game, corp, dispatch, fmt, onNext, plusPlus }) {
  const [revenue, setRevenue] = useState('')

  const price = corpPrice(game.stockMarket, corp.sym)
  const limit = trainLimit(game.phaseManager)
  const president = game.players.find((p) =>
    p.shares.some((s) => s.corpSym === corp.sym && s.isPresident)
  )

  const goToPlayer = (playerId) => {
    useUIStore.getState().setActivePlayer(playerId)
    useUIStore.getState().setActiveTab('players')
  }
  const goToCorp = (corpSym) => {
    useUIStore.getState().setActiveCorp(corpSym)
  }

  const tips = useMemo(() => plusPlus ? corpAdvisorTips(game, corp.sym) : [], [game, corp.sym, plusPlus])

  const revNum = parseInt(revenue, 10) || 0
  const perShare = revNum > 0 ? Math.floor(revNum / 10) : 0
  const dividendPreview = revNum > 0 ? calculateDividend(game, corp.sym, revNum) : null
  const advisor = revNum > 0 ? dividendComparison(game, corp.sym, revNum) : null
  const isDoubleJump = price && perShare >= price

  function handlePay() {
    if (revNum <= 0) return
    dispatch({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: revNum })
    setRevenue('')
  }

  function handleWithhold() {
    if (revNum <= 0) return
    dispatch({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: revNum })
    setRevenue('')
  }

  function handleHalfPay() {
    if (revNum <= 0) return
    dispatch({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: revNum })
    setRevenue('')
  }

  function handleBuyTrain(trainName, trainPrice) {
    dispatch({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName, price: trainPrice })
  }

  function handleBuyFromCorp(fromCorpSym, trainName, negotiatedPrice) {
    dispatch({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName, price: negotiatedPrice, fromCorpSym })
  }

  // Quick revenue presets based on common values
  const presets = []
  for (let v = 20; v <= 400; v += 20) presets.push(v)

  // Other corps' trains available for purchase
  const otherCorpTrains = game.corporations
    .filter((c) => c.sym !== corp.sym && c.floated && c.trains.length > 0)
    .map((c) => ({ sym: c.sym, color: c.color, textColor: c.textColor, trains: c.trains }))

  return (
    <div className="space-y-3">
      {/* Corp info */}
      <div className="bg-broker-surface rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-bold text-lg" style={{ color: corp.color }}>{corp.sym}</span>
            <span className="text-broker-text-muted text-sm ml-2">{corp.name}</span>
          </div>
          <div className="text-right text-sm">
            <div className="text-broker-text">Price: {price ? fmt(price) : '—'}</div>
            <div className="text-broker-text-muted">Par: {fmt(corp.parPrice)}</div>
          </div>
        </div>
        <div className="flex gap-4 text-sm text-broker-text flex-wrap">
          <div>Treasury: <span className="font-medium text-white">{fmt(corp.cash)}</span></div>
          <div>President: {president
            ? <button onClick={() => goToPlayer(president.id)} className="font-medium hover:underline">{president.name}</button>
            : <span className="font-medium">—</span>
          }</div>
          <div>Tokens: {corp.tokensPlaced}/{corp.tokens.length}</div>
          {corp.loans > 0 && <div>Loans: <span className="text-red-300 font-medium">{corp.loans}</span></div>}
          {corp.corpSize && <div className="text-xs text-broker-text-muted">{corp.corpSize}</div>}
          {corp.liquidated && <span className="text-xs bg-red-900 text-red-300 px-1 rounded">LIQUIDATED</span>}
        </div>
        {/* Shareholders */}
        <div className="flex gap-2 mt-1 text-xs text-broker-text-muted flex-wrap">
          {game.players.filter(p => playerSharePercent(p, corp.sym) > 0).map(p => {
            const pct = playerSharePercent(p, corp.sym)
            const isPres = p.shares.some(s => s.corpSym === corp.sym && s.isPresident)
            return (
              <button key={p.id} onClick={() => goToPlayer(p.id)} className="hover:underline">
                {p.name} {pct}%{isPres ? 'P' : ''}
              </button>
            )
          })}
          {corp.ipoShares > 0 && <span>IPO {corp.ipoShares}%</span>}
          {corp.marketShares > 0 && <span>Pool {corp.marketShares}%</span>}
        </div>
      </div>


      {/* Train Rush Indicator */}
      <TrainRushPanel game={game} corpSym={corp.sym} fmt={fmt} />

      {/* Trains */}
      <div className="bg-broker-surface rounded-lg p-3">
        <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">
          Trains ({corp.trains.length}/{limit})
        </div>
        <div className="flex flex-wrap gap-2">
          {corp.trains.length === 0 ? (
            <span className="text-broker-text-muted text-sm">No trains</span>
          ) : (
            corp.trains.map((t) => (
              <span key={t.id} className="bg-broker-surface-hover px-3 py-1 rounded text-sm font-medium">
                {t.name}
                {t.multiplier > 1 && (
                  <span className="text-xs ml-1 text-green-300">×{t.multiplier}</span>
                )}
                {t.attachment && (
                  <span className="text-xs ml-1 text-yellow-300" title={t.attachment.permit || t.attachment.name}>
                    +{t.attachment.type === 'card' ? t.attachment.color : 'EC'}
                  </span>
                )}
              </span>
            ))
          )}
        </div>

        {/* Executive Car purchase (DaiHan) */}
        {game.title.executiveCars && corp.trains.some((t) => !t.attachment) && (
          <div className="mt-2 space-y-1">
            <div className="text-xs text-broker-text-muted">Attach Executive Car:</div>
            {corp.trains.filter((t) => !t.attachment).map((t) => (
              <button
                key={t.id}
                onClick={() => dispatch({
                  type: 'BUY_EXECUTIVE_CAR',
                  corpSym: corp.sym,
                  trainId: t.id,
                  price: game.title.executiveCars.price ?? 0,
                })}
                className="text-xs bg-yellow-900 hover:bg-yellow-800 text-yellow-200 px-2 py-1 rounded mr-1"
              >
                {t.name} +EC
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Revenue & Dividends */}
      <div className="bg-broker-surface rounded-lg p-3">
        <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">Revenue</div>
        <input
          type="number"
          value={revenue}
          onChange={(e) => setRevenue(e.target.value)}
          placeholder="Enter revenue"
          className="w-full bg-broker-bg border border-broker-border rounded px-3 py-2 text-white text-lg text-center mb-2 focus:outline-none focus:border-gray-500"
        />

        <div className="flex flex-wrap gap-1 mb-3">
          {presets.filter((v) => v <= 300).map((v) => (
            <button
              key={v}
              onClick={() => setRevenue(String(v))}
              className="bg-broker-surface-hover hover:bg-broker-surface-hover text-xs px-2 py-1 rounded"
            >
              {v}
            </button>
          ))}
        </div>

        {/* Dividend Advisor */}
        {advisor && (
          <DividendAdvisorPanel advisor={advisor} fmt={fmt} />
        )}

        <div className="flex gap-2">
          <button
            onClick={handlePay}
            disabled={revNum <= 0}
            className="flex-1 bg-green-800 hover:bg-green-700 disabled:opacity-30 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
          >
            <div>Pay {revNum > 0 ? fmt(revNum) : ''}</div>
            <div className="text-xs opacity-70">
              {isDoubleJump ? 'price ↗↗' : 'price ↗'}
            </div>
          </button>
          {game.title.halfPay && (
            <button
              onClick={handleHalfPay}
              disabled={revNum <= 0}
              className="flex-1 bg-yellow-900 hover:bg-yellow-800 disabled:opacity-30 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
            >
              <div>Half</div>
              <div className="text-xs opacity-70">½ each</div>
            </button>
          )}
          <button
            onClick={handleWithhold}
            disabled={revNum <= 0}
            className="flex-1 bg-orange-900 hover:bg-orange-800 disabled:opacity-30 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
          >
            <div>Withhold</div>
            <div className="text-xs opacity-70">price ↙</div>
          </button>
        </div>
      </div>

      {/* Buy train from depot */}
      <div className="bg-broker-surface rounded-lg p-3">
        <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">Buy Train from Depot</div>
        <div className="space-y-1">
          {nextAvailableTrains(game.depot).map((t) => {
            const canAfford = corp.cash >= t.price
            const count = remainingCount(game.depot, t.name)
            return (
              <button
                key={t.name}
                onClick={() => canAfford && handleBuyTrain(t.name, t.price)}
                disabled={!canAfford}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm ${
                  canAfford
                    ? 'bg-broker-surface-hover hover:bg-broker-surface-hover text-white'
                    : 'bg-broker-bg text-broker-text-muted cursor-not-allowed'
                }`}
              >
                <span className="font-medium">{t.name}-train</span>
                <span>
                  {fmt(t.price)}
                  {t.rustsOn && <span className="text-xs text-red-400 ml-1">rusts on {t.rustsOn}</span>}
                  <span className="text-xs text-broker-text-muted ml-2">({count} left)</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Buy train from other corp */}
      {otherCorpTrains.length > 0 && (
        <BuyFromCorpPanel
          otherCorpTrains={otherCorpTrains}
          buyerCash={corp.cash}
          onBuy={handleBuyFromCorp}
          fmt={fmt}
        />
      )}

      {/* Corp share buy/sell (21Moon, PTG, 18India) */}
      {game.title.corpCanBuyShares && (
        <CorpSharePanel game={game} corp={corp} dispatch={dispatch} fmt={fmt} />
      )}

      {/* Merger panel */}
      {game.title.merger && (
        <MergerPanel game={game} corp={corp} dispatch={dispatch} fmt={fmt} />
      )}

      {/* Loans panel (1817, 1867) */}
      {game.title.loans && (
        <LoanPanel game={game} corp={corp} dispatch={dispatch} fmt={fmt} />
      )}

      {/* Corp conversion panel (1817) */}
      {game.title.corpSizing?.enabled && (
        <ConversionPanel game={game} corp={corp} dispatch={dispatch} />
      )}

      {/* ++ Analysis */}
      {plusPlus && tips.length > 0 && (
        <div className="bg-broker-surface rounded-lg p-3">
          <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">Advisor</div>
          <AdvisorSection tips={tips} skin="broker" onCorpClick={goToCorp} onPlayerClick={goToPlayer} />
        </div>
      )}

      {/* Next corp button */}
      <button
        onClick={onNext}
        className="w-full bg-broker-surface-hover hover:bg-broker-surface-hover text-white py-3 rounded-lg font-medium transition-colors"
      >
        Done — Next Corp ▶
      </button>
    </div>
  )
}

function CorpSharePanel({ game, corp, dispatch, fmt }) {
  const title = game.title

  // Shares this corp currently holds
  const holdings = {}
  for (const s of (corp.sharesHeld || [])) {
    holdings[s.corpSym] = (holdings[s.corpSym] || 0) + s.percent
  }

  // Available shares to buy: from IPO and market of other (or own) corps
  const buyOptions = game.corporations
    .filter((c) => c.ipoed)
    .map((c) => {
      const price = corpPrice(game.stockMarket, c.sym)
      const hasIPO = c.ipoShares > 0
      const hasMarket = c.marketShares > 0
      const isSelf = c.sym === corp.sym
      if (!price) return null
      if (isSelf && !title.corpCanBuyOwnShares) return hasMarket || hasIPO ? null : null
      // Filter out president-only shares if not allowed
      return { corp: c, price, hasIPO, hasMarket, isSelf }
    })
    .filter(Boolean)
    // Filter self shares based on title rules
    .filter((o) => !o.isSelf || title.corpCanBuyOwnShares)

  // Holdings this corp can sell
  const sellOptions = Object.entries(holdings).map(([sym, pct]) => {
    const target = game.corporations.find((c) => c.sym === sym)
    const price = corpPrice(game.stockMarket, sym)
    return { sym, pct, price, color: target?.color, textColor: target?.textColor }
  }).filter((o) => o.price)

  function handleCorpBuy(targetCorpSym, source) {
    const shareSize = title.shares?.[1] ?? 10
    dispatch({
      type: 'CORP_BUY_SHARE',
      buyerCorpSym: corp.sym,
      targetCorpSym,
      source,
      percent: shareSize,
    })
  }

  function handleCorpSell(targetCorpSym) {
    const shareSize = title.shares?.[1] ?? 10
    dispatch({
      type: 'CORP_SELL_SHARES',
      sellerCorpSym: corp.sym,
      targetCorpSym,
      percent: shareSize,
    })
  }

  return (
    <div className="bg-broker-surface rounded-lg p-3">
      <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">
        Corp Share Trading
      </div>

      {/* Current holdings */}
      {Object.keys(holdings).length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-broker-text-muted mb-1">Holdings:</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(holdings).map(([sym, pct]) => (
              <span key={sym} className="text-xs bg-broker-surface-hover px-2 py-1 rounded">
                {sym}: {pct}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Buy shares */}
      {buyOptions.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-broker-text-muted mb-1">Buy Share:</div>
          <div className="space-y-1">
            {buyOptions.map(({ corp: c, price, hasIPO, hasMarket, isSelf }) => {
              const shareSize = title.shares?.[1] ?? 10
              const cost = (price * shareSize) / 10
              const canAfford = corp.cash >= cost
              return (
                <div key={c.sym} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-sm font-medium w-12">
                    {c.sym}{isSelf ? '*' : ''}
                  </span>
                  {hasIPO && (
                    <button
                      onClick={() => canAfford && handleCorpBuy(c.sym, 'ipo')}
                      disabled={!canAfford}
                      className={`text-xs px-2 py-1 rounded ${
                        canAfford
                          ? 'bg-blue-800 hover:bg-blue-700 text-blue-200'
                          : 'bg-broker-surface-hover text-broker-text-muted cursor-not-allowed'
                      }`}
                    >
                      IPO {fmt(c.parPrice ?? price)}
                    </button>
                  )}
                  {hasMarket && (
                    <button
                      onClick={() => canAfford && handleCorpBuy(c.sym, 'market')}
                      disabled={!canAfford}
                      className={`text-xs px-2 py-1 rounded ${
                        canAfford
                          ? 'bg-blue-800 hover:bg-blue-700 text-blue-200'
                          : 'bg-broker-surface-hover text-broker-text-muted cursor-not-allowed'
                      }`}
                    >
                      Mkt {fmt(price)}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sell shares */}
      {title.corpCanSellShares && sellOptions.length > 0 && (
        <div>
          <div className="text-xs text-broker-text-muted mb-1">Sell Share:</div>
          <div className="space-y-1">
            {sellOptions.map(({ sym, pct, price, color, textColor }) => (
              <div key={sym} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-medium w-12">{sym}</span>
                <span className="text-xs text-broker-text-muted">{pct}%</span>
                <button
                  onClick={() => handleCorpSell(sym)}
                  className="text-xs px-2 py-1 rounded bg-red-900 hover:bg-red-800 text-red-200"
                >
                  Sell → +{fmt(price)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {buyOptions.length === 0 && sellOptions.length === 0 && (
        <div className="text-xs text-broker-text-muted">No shares available to trade</div>
      )}
    </div>
  )
}

function MergerPanel({ game, corp, dispatch, fmt }) {
  const [mergeTarget, setMergeTarget] = useState(null)
  const [paymentShares, setPaymentShares] = useState(0)
  const [cashDiff, setCashDiff] = useState('')
  const [selectedMajor, setSelectedMajor] = useState(null)
  const [selectedIdentity, setSelectedIdentity] = useState(null)

  const merger = game.title.merger
  if (!merger) return null

  // Check phase eligibility
  const phase = currentPhase(game.phaseManager)
  if (merger.fromPhase) {
    const phaseNames = game.phaseManager.phases.map((p) => p.name)
    const currentIdx = phaseNames.indexOf(phase.name)
    const fromIdx = phaseNames.indexOf(merger.fromPhase)
    if (currentIdx < fromIdx) return null
  }

  // Can't merge if already merged (PTG)
  if (corp.isMerged && !merger.canReMerge) return null

  const mergerType = merger.type

  // Eligible merge targets
  let targets = []
  if (mergerType === 'ptg_combine') {
    // Other floated, non-merged companies
    targets = game.corporations.filter((c) =>
      c.sym !== corp.sym && c.floated && !c.isMerged
    )
  } else if (mergerType === '1862_peer') {
    // Other floated corps
    targets = game.corporations.filter((c) =>
      c.sym !== corp.sym && c.floated
    )
  } else if (mergerType === '1822_acquire') {
    // Minors that the major can acquire
    targets = game.corporations.filter((c) =>
      c.type === 'minor' && c.floated && c.sym !== corp.sym
    )
    // Only show if current corp is a major
    if (corp.type === 'minor') return null
  } else if (mergerType === '1867_minor_major') {
    // Majors available for conversion (current corp must be a minor)
    if (corp.type !== 'minor') return null
    targets = game.corporations.filter((c) =>
      c.type === 'major' && !c.floated
    )
  } else if (mergerType === 'rla_merge') {
    // Other floated minors (current corp must be a minor)
    if (corp.type !== 'minor') return null
    targets = game.corporations.filter((c) =>
      c.sym !== corp.sym && c.type === 'minor' && c.floated
    )
  }

  if (targets.length === 0 && !mergeTarget) return null

  function handlePTGMerge(targetSym) {
    dispatch({
      type: 'MERGE_CORPS',
      topCorpSym: corp.sym,
      bottomCorpSym: targetSym,
    })
    setMergeTarget(null)
  }

  function handle1862Merge(nonsurvivorSym) {
    dispatch({
      type: 'MERGE_CORPS',
      survivorSym: corp.sym,
      nonsurvivorSym,
    })
    setMergeTarget(null)
  }

  function handle1822Acquire() {
    if (!mergeTarget) return
    const diff = parseInt(cashDiff, 10) || 0
    dispatch({
      type: 'ACQUIRE_MINOR',
      majorSym: corp.sym,
      minorSym: mergeTarget,
      paymentShares,
      cashDifference: diff,
    })
    setMergeTarget(null)
    setPaymentShares(0)
    setCashDiff('')
  }

  function handle1867Convert(majorSym) {
    dispatch({
      type: 'CONVERT_MINOR',
      minorSym: corp.sym,
      majorSym,
    })
    setMergeTarget(null)
  }

  // Label for the panel
  const panelLabel = mergerType === '1822_acquire' ? 'Acquire Minor' :
    mergerType === '1867_minor_major' ? 'Convert to Major' : 'Merge'

  return (
    <div className="bg-broker-surface rounded-lg p-3">
      <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">{panelLabel}</div>

      {/* Target selection */}
      {!mergeTarget && (
        <div className="space-y-1">
          {targets.map((t) => {
            const tPrice = corpPrice(game.stockMarket, t.sym)
            return (
              <div key={t.sym} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <span className="text-sm font-medium w-12">{t.sym}</span>
                <span className="text-xs text-broker-text-muted">
                  {t.name} {tPrice ? fmt(tPrice) : ''}
                </span>
                {(mergerType === 'ptg_combine') && (
                  <button
                    onClick={() => handlePTGMerge(t.sym)}
                    className="ml-auto text-xs bg-purple-800 hover:bg-purple-700 px-2 py-1 rounded text-purple-200"
                  >
                    Merge
                  </button>
                )}
                {(mergerType === '1862_peer') && (
                  <button
                    onClick={() => handle1862Merge(t.sym)}
                    className="ml-auto text-xs bg-purple-800 hover:bg-purple-700 px-2 py-1 rounded text-purple-200"
                  >
                    Merge (absorb)
                  </button>
                )}
                {(mergerType === '1822_acquire') && (
                  <button
                    onClick={() => setMergeTarget(t.sym)}
                    className="ml-auto text-xs bg-purple-800 hover:bg-purple-700 px-2 py-1 rounded text-purple-200"
                  >
                    Acquire
                  </button>
                )}
                {(mergerType === '1867_minor_major') && (
                  <button
                    onClick={() => handle1867Convert(t.sym)}
                    className="ml-auto text-xs bg-purple-800 hover:bg-purple-700 px-2 py-1 rounded text-purple-200"
                  >
                    Convert
                  </button>
                )}
                {(mergerType === 'rla_merge') && (
                  <button
                    onClick={() => setMergeTarget(t.sym)}
                    className="ml-auto text-xs bg-purple-800 hover:bg-purple-700 px-2 py-1 rounded text-purple-200"
                  >
                    Merge
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 1822 payment options */}
      {mergeTarget && mergerType === '1822_acquire' && (
        <div className="mt-2 space-y-2">
          <div className="text-sm text-broker-text">
            Acquiring <span className="font-medium">{mergeTarget}</span>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-broker-text-muted">Shares:</label>
            {(merger.paymentOptions || [0, 1, 2]).map((n) => (
              <button
                key={n}
                onClick={() => setPaymentShares(n)}
                className={`text-xs px-2 py-1 rounded ${
                  paymentShares === n
                    ? 'bg-purple-700 text-white'
                    : 'bg-broker-surface-hover text-broker-text-muted'
                }`}
              >
                {n} share{n !== 1 ? 's' : ''}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-broker-text-muted">Cash difference:</label>
            <input
              type="number"
              value={cashDiff}
              onChange={(e) => setCashDiff(e.target.value)}
              placeholder="0"
              className="w-24 bg-broker-bg border border-broker-border rounded px-2 py-1 text-sm text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handle1822Acquire}
              className="text-xs bg-purple-800 hover:bg-purple-700 px-3 py-1 rounded text-white"
            >
              Confirm Acquisition
            </button>
            <button
              onClick={() => { setMergeTarget(null); setPaymentShares(0); setCashDiff('') }}
              className="text-xs text-broker-text-muted hover:text-broker-text px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* RLA merge: choose Major Corp + identity */}
      {mergeTarget && mergerType === 'rla_merge' && (
        <div className="mt-2 space-y-2">
          <div className="text-sm text-broker-text">
            Merging <span className="font-medium">{corp.sym}</span> + <span className="font-medium">{mergeTarget}</span>
          </div>

          {/* Step 1: Choose Major Corporation */}
          <div className="text-xs text-broker-text-muted">Choose Corporation:</div>
          <div className="space-y-1">
            {game.corporations
              .filter((c) => c.type === 'major' && !c.floated)
              .map((c) => (
                <button
                  key={c.sym}
                  onClick={() => { setSelectedMajor(c.sym); setSelectedIdentity(null) }}
                  className={`w-full text-left text-xs px-2 py-1 rounded flex items-center gap-2 ${
                    selectedMajor === c.sym
                      ? 'bg-purple-700 text-white'
                      : 'bg-broker-surface-hover text-broker-text-muted hover:text-white'
                  }`}
                  style={{ borderLeft: `3px solid ${c.color}` }}
                >
                  <span className="font-medium">{c.sym}</span>
                  {c.identityOptions && (
                    <span className="opacity-70">{c.identityOptions.join(' / ')}</span>
                  )}
                </button>
              ))}
          </div>

          {/* Step 2: Choose identity (if applicable) */}
          {selectedMajor && (() => {
            const majorCorp = game.corporations.find((c) => c.sym === selectedMajor)
            if (!majorCorp?.identityOptions) return null
            return (
              <div>
                <div className="text-xs text-broker-text-muted">Choose Identity:</div>
                <div className="flex gap-2 mt-1">
                  {majorCorp.identityOptions.map((name) => (
                    <button
                      key={name}
                      onClick={() => setSelectedIdentity(name)}
                      className={`text-xs px-2 py-1 rounded ${
                        selectedIdentity === name
                          ? 'bg-purple-700 text-white'
                          : 'bg-broker-surface-hover text-broker-text-muted hover:text-white'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Confirm */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!selectedMajor) return
                dispatch({
                  type: 'MERGE_CORPS',
                  minorSymA: corp.sym,
                  minorSymB: mergeTarget,
                  majorCorpSym: selectedMajor,
                  chosenIdentity: selectedIdentity,
                })
                setMergeTarget(null)
                setSelectedMajor(null)
                setSelectedIdentity(null)
              }}
              disabled={!selectedMajor}
              className="text-xs bg-purple-800 hover:bg-purple-700 disabled:opacity-30 px-3 py-1 rounded text-white"
            >
              Confirm Merger
            </button>
            <button
              onClick={() => { setMergeTarget(null); setSelectedMajor(null); setSelectedIdentity(null) }}
              className="text-xs text-broker-text-muted hover:text-broker-text px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LoanPanel({ game, corp, dispatch, fmt }) {
  const config = game.title.loans || {}
  const loanValue = config.loanValue || 100
  const max = maxLoansForCorp(corp, game.title)
  const loans = corp.loans || 0
  const rate = currentInterestRate(game)
  const interest = interestDue(game, corp.sym)
  const canTake = loans < max
  const canRepay = loans > 0 && corp.cash >= loanValue

  return (
    <div className="bg-broker-surface rounded-lg p-3">
      <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">Loans</div>
      <div className="flex gap-4 text-sm mb-2">
        <div>Loans: <span className="font-medium text-white">{loans}/{max}</span></div>
        <div>Rate: <span className="font-medium text-yellow-300">{rate}%</span></div>
        {interest > 0 && <div>Interest due: <span className="font-medium text-red-300">{fmt(interest)}</span></div>}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => dispatch({ type: 'TAKE_LOAN', corpSym: corp.sym })}
          disabled={!canTake}
          className="text-xs bg-blue-800 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded"
        >
          Take Loan (+{fmt(loanValue)})
        </button>
        <button
          onClick={() => dispatch({ type: 'REPAY_LOAN', corpSym: corp.sym })}
          disabled={!canRepay}
          className="text-xs bg-green-800 hover:bg-green-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded"
        >
          Repay Loan (-{fmt(loanValue)})
        </button>
        {interest > 0 && (
          <button
            onClick={() => dispatch({ type: 'PAY_INTEREST', corpSym: corp.sym })}
            className="text-xs bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded"
          >
            Pay Interest ({fmt(interest)})
          </button>
        )}
      </div>
    </div>
  )
}

function ConversionPanel({ game, corp, dispatch }) {
  const sizing = game.title.corpSizing
  if (!sizing?.enabled) return null

  const phase = currentPhase(game.phaseManager)
  const allowedSizes = phase.corpSizes || []
  const currentSize = corp.corpSize || '2share'

  const canConvertTo5 = currentSize === '2share' && allowedSizes.includes('5share')
  const canConvertTo10 = currentSize === '5share' && allowedSizes.includes('10share')

  if (!canConvertTo5 && !canConvertTo10) return null

  return (
    <div className="bg-broker-surface rounded-lg p-3">
      <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">
        Corp Conversion ({currentSize})
      </div>
      <div className="flex gap-2">
        {canConvertTo5 && (
          <button
            onClick={() => dispatch({ type: 'CONVERT_CORP', corpSym: corp.sym, targetSize: '5share' })}
            className="text-xs bg-purple-800 hover:bg-purple-700 text-white px-3 py-1.5 rounded"
          >
            Convert to 5-share
          </button>
        )}
        {canConvertTo10 && (
          <button
            onClick={() => dispatch({ type: 'CONVERT_CORP', corpSym: corp.sym, targetSize: '10share' })}
            className="text-xs bg-purple-800 hover:bg-purple-700 text-white px-3 py-1.5 rounded"
          >
            Convert to 10-share
          </button>
        )}
      </div>
    </div>
  )
}

function BuyFromCorpPanel({ otherCorpTrains, buyerCash, onBuy, fmt }) {
  const [buyingFrom, setBuyingFrom] = useState(null) // { corpSym, trainName }
  const [negotiatedPrice, setNegotiatedPrice] = useState('')

  function handleConfirm() {
    const price = parseInt(negotiatedPrice, 10)
    if (!price || !buyingFrom) return
    onBuy(buyingFrom.corpSym, buyingFrom.trainName, price)
    setBuyingFrom(null)
    setNegotiatedPrice('')
  }

  return (
    <div className="bg-broker-surface rounded-lg p-3">
      <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">Buy Train from Corporation</div>
      <div className="space-y-1">
        {otherCorpTrains.map((c) =>
          c.trains.map((t) => (
            <div key={`${c.sym}-${t.id}`} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-sm font-medium w-10">{c.sym}</span>
              <span className="text-sm">{t.name}-train</span>
              <button
                onClick={() => setBuyingFrom({ corpSym: c.sym, trainName: t.name })}
                className="ml-auto text-xs bg-broker-surface-hover hover:bg-broker-surface-hover px-2 py-1 rounded"
              >
                Buy
              </button>
            </div>
          ))
        )}
      </div>

      {buyingFrom && (
        <div className="mt-2 flex gap-2 items-center">
          <span className="text-xs text-broker-text-muted">
            {buyingFrom.trainName} from {buyingFrom.corpSym} for:
          </span>
          <input
            type="number"
            value={negotiatedPrice}
            onChange={(e) => setNegotiatedPrice(e.target.value)}
            placeholder="Price"
            className="w-24 bg-broker-bg border border-broker-border rounded px-2 py-1 text-sm text-white"
          />
          <button
            onClick={handleConfirm}
            className="text-xs bg-blue-800 hover:bg-blue-700 px-3 py-1 rounded text-white"
          >
            Confirm
          </button>
          <button
            onClick={() => setBuyingFrom(null)}
            className="text-xs text-broker-text-muted hover:text-broker-text px-2 py-1"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

function TrainRushPanel({ game, corpSym, fmt }) {
  const rush = useMemo(() => trainRushAnalysis(game), [game])
  const info = rush.corpAnalysis.find(c => c.sym === corpSym)
  if (!info) return null

  // Only show if there's something interesting
  const hasRisk = info.rustRisk.length > 0
  const hasPressure = rush.nextPhase && rush.tiers.some(t => t.triggersPhase && t.remaining <= 3 && t.remaining > 0)
  if (!hasRisk && !hasPressure && info.permanentCount > 0) return null

  return (
    <div className={`rounded-lg p-3 text-sm ${
      info.emergencyBuyExposed
        ? 'bg-red-900/30 border border-red-800/50'
        : hasRisk
          ? 'bg-amber-900/20 border border-amber-800/40'
          : 'bg-broker-surface'
    }`}>
      <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">Train Outlook</div>

      {/* Rust warnings */}
      {info.rustRisk.map(r => (
        <div key={r.trigger} className="mb-1">
          <span className={`text-xs ${r.willBeTrainless ? 'text-red-300 font-medium' : 'text-amber-300'}`}>
            {r.affectedTrains.join(', ')}-train{r.affectedTrains.length > 1 ? 's' : ''} rust{r.affectedTrains.length === 1 ? 's' : ''} when {r.trigger} is bought
          </span>
          <span className="text-xs text-broker-text-muted ml-1">
            ({r.remaining} left in depot{r.remaining <= 2 ? ' — imminent' : ''})
          </span>
          {r.willBeTrainless && (
            <div className="text-xs text-red-400 mt-0.5">
              Will be trainless — {info.presidentCanCover
                ? `president can cover (${fmt(info.treasuryVsCheapest)} short)`
                : 'emergency buy risk'}
            </div>
          )}
        </div>
      ))}

      {/* Phase pressure */}
      {rush.nextPhase && rush.tiers.filter(t => t.triggersPhase && t.remaining > 0).map(t => (
        <div key={t.name} className="text-xs text-broker-text-muted">
          Next phase ({rush.nextPhase.name}): {t.remaining} {t.name}-train{t.remaining !== 1 ? 's' : ''} left · {fmt(t.price)}
          {t.events.length > 0 && (
            <span className="text-amber-400 ml-1">[{t.events.join(', ')}]</span>
          )}
        </div>
      ))}

      {/* Permanent train status */}
      {info.permanentCount === 0 && info.rustRisk.length === 0 && (
        <div className="text-xs text-amber-300">No permanent trains</div>
      )}
      {info.permanentCount > 0 && (
        <div className="text-xs text-green-400">{info.permanentCount} permanent train{info.permanentCount !== 1 ? 's' : ''}</div>
      )}
    </div>
  )
}

function DividendAdvisorPanel({ advisor, fmt }) {
  const options = [advisor.payout, advisor.halfPay, advisor.withhold].filter(Boolean)

  return (
    <div className="mb-3 space-y-1">
      {/* Per-share info */}
      <div className="text-xs text-broker-text-muted">
        {fmt(advisor.perShare)}/share
        {advisor.payout.isDoubleJump && <span className="text-yellow-400 font-medium ml-1">(double jump!)</span>}
      </div>

      {/* Comparison table */}
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map(opt => (
          <div key={opt.label} className={`rounded p-2 text-xs ${
            opt.label === 'Pay' ? 'bg-green-900/30' :
            opt.label === 'Half' ? 'bg-yellow-900/30' :
            'bg-orange-900/30'
          }`}>
            <div className="font-medium text-white mb-1">{opt.label}</div>
            <div className="space-y-0.5 text-broker-text-muted">
              <div>
                Price: {fmt(opt.newPrice)}
                <span className={`ml-1 ${opt.priceChange > 0 ? 'text-green-400' : opt.priceChange < 0 ? 'text-red-400' : 'text-broker-text-muted'}`}>
                  {opt.priceChange > 0 ? '+' : ''}{fmt(opt.priceChange)}
                </span>
              </div>
              <div>Players: +{fmt(opt.toPlayers)}</div>
              <div>Treasury: {fmt(opt.treasuryAfter)}</div>
              {advisor.trainInfo && (
                <div className={opt.canAffordTrain ? 'text-green-400' : 'text-red-400'}>
                  {opt.canAffordTrain ? 'Can' : "Can't"} buy {advisor.trainInfo.name} ({fmt(advisor.trainInfo.cost)})
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Player breakdown */}
      <details className="text-xs">
        <summary className="text-broker-text-muted cursor-pointer">Per-player breakdown</summary>
        <div className="mt-1 space-y-0.5">
          {advisor.payout.playerPayouts.map(p => {
            const half = advisor.halfPay?.playerPayouts.find(hp => hp.name === p.name)
            return (
              <div key={p.name} className="text-broker-text-muted flex justify-between">
                <span>{p.name} ({p.percent}%)</span>
                <span>
                  <span className="text-green-400">+{fmt(p.amount)}</span>
                  {half && <span className="text-yellow-400 ml-2">+{fmt(half.amount)}</span>}
                </span>
              </div>
            )
          })}
        </div>
      </details>
    </div>
  )
}
