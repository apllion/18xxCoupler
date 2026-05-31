// BrokerOverview — Modern slim overview. Broker theme colors, clean typography.

import { useOverviewData, playerSharePercent, playerCertCount, isPresident } from './useOverviewData.js'
import { useUIStore } from '../../store/uiStore.js'
import { ActionPanel } from './ActionPanel.jsx'
import { ContextBar } from './ContextBar.jsx'
import { InlineEdit } from './InlineEdit.jsx'

export default function BrokerOverview() {
  const d = useOverviewData()
  if (!d.game) return null
  const { game, fmt, phase, label, limit, corps, unfloated, depotGroups, lastRevenue, corpPrivates, playerPrivates, lastAction, selPlayer, myPlayerId, selCorp, curRow, setCurRow, curCol, setCurCol, panel, setPanel, revenueInput, setRevenueInput, revRef, rootRef, cursorRef, onKeyDown, closePanel, doAction, inReplay, fullLog, enterReplay, exitReplay, replayTo, enterWhatIf, isWhatIf, exitWhatIf, canUndo, undo, isSR, isOR, isPre, superUmpire } = d
  const su = superUmpire

  const curIdx = game.actionLog.length - 1

  return (
    <div ref={rootRef} tabIndex={0} onKeyDown={onKeyDown}
      onClick={(e) => { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') rootRef.current?.focus() }}
      className={`text-sm select-none h-full flex flex-col bg-broker-bg outline-none ${su ? 'ring-2 ring-orange-500/50' : ''}`}>

      {/* Header */}
      <div className={`px-3 py-2 flex items-center justify-between flex-shrink-0 border-b ${
        isSR ? 'bg-green-900/20 border-green-800/30' : isOR ? 'bg-amber-900/20 border-amber-800/30' : 'bg-broker-surface border-broker-border'
      }`}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg text-white">{game.title.title}</span>
          <span className={`text-sm font-medium px-2 py-0.5 rounded ${
            isSR ? 'bg-green-800 text-green-200' : isOR ? 'bg-amber-800 text-amber-200' : 'bg-broker-surface-hover text-broker-text-muted'
          }`}>{isSR ? label : isOR ? label : 'Setup'}</span>
          <span className="text-xs text-broker-text-muted">Phase {phase.name} / Limit {limit}</span>
        </div>
        <div className="flex items-center gap-2">
          {inReplay && <span className="text-xs font-medium text-purple-300 bg-purple-900/40 px-2 py-0.5 rounded">{curIdx + 1}/{fullLog.length}</span>}
          <span className={`text-sm font-medium ${game.bank.cash <= 0 ? 'text-red-400' : 'text-broker-text'}`}>Bank <InlineEdit value={game.bank.cash} enabled={su} skin="broker"
            onSave={v => doAction({ type: 'SET_CASH', entityId: 'bank', entityType: 'bank', value: v })}>{fmt(game.bank.cash)}</InlineEdit></span>
          <span className="flex items-center gap-0.5">
            <button onClick={() => useUIStore.getState().setMyPlayer(null)}
              className={`text-xs px-1.5 py-0.5 rounded ${!myPlayerId ? 'bg-broker-gold/20 text-broker-gold font-bold' : 'bg-broker-surface-hover text-broker-text-muted hover:text-white'}`}>
              Umpire
            </button>
            {game.players.map(p => (
              <button key={p.id} onClick={() => useUIStore.getState().setMyPlayer(p.id)}
                className={`text-xs px-1.5 py-0.5 rounded ${myPlayerId === p.id ? 'bg-broker-gold/20 text-broker-gold font-bold' : 'bg-broker-surface-hover text-broker-text-muted hover:text-white'}`}>
                {p.name.slice(0, 4)}
              </button>
            ))}
          </span>
          <button onClick={() => canUndo() && undo()} className="text-xs text-broker-text-muted hover:text-white px-1">Undo</button>
          <button onClick={() => setPanel('settings')} className="text-xs text-broker-text-muted hover:text-white bg-broker-surface-hover px-2 py-0.5 rounded">Settings</button>
        </div>
      </div>

      {/* Mode indicator banners */}
      {isWhatIf && (
        <div className="bg-purple-900 border-b border-purple-600 px-3 py-1.5 flex items-center justify-between flex-shrink-0">
          <span className="text-purple-200 text-sm font-bold">WHAT-IF — exploring, nothing saved</span>
          <div className="flex gap-2">
            <button onClick={() => exitWhatIf(true)} className="text-xs bg-purple-700 hover:bg-purple-600 text-white px-2 py-0.5 rounded">Discard</button>
            <button onClick={() => exitWhatIf(false)} className="text-xs text-purple-300 hover:text-white px-2">Keep</button>
          </div>
        </div>
      )}
      {inReplay && !isWhatIf && (
        <div className="bg-blue-900 border-b border-blue-600 px-3 py-1.5 flex items-center justify-between flex-shrink-0">
          <span className="text-blue-200 text-sm font-bold">REPLAY {curIdx + 1}/{fullLog.length} — {lastAction?.description || 'Game start'}</span>
          <div className="flex gap-2">
            <button onClick={() => { exitReplay(); enterWhatIf() }} className="text-xs bg-purple-700 hover:bg-purple-600 text-white px-2 py-0.5 rounded">What-if</button>
            <button onClick={() => exitReplay()} className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 py-0.5 rounded">Exit</button>
          </div>
        </div>
      )}

      {/* Matrix */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-20">
            <tr className="bg-broker-surface text-broker-text-muted">
              <th className="text-left px-2 py-1 sticky left-0 bg-broker-surface z-30 min-w-[90px] font-medium">Player</th>
              <th className="px-2 text-right min-w-[50px] font-medium">Cash</th>
              <th className="px-2 text-center min-w-[36px] font-medium">Cert</th>
              {game.title.taxThresholds && <th className="px-1 text-center text-[10px] font-medium text-red-400">Tax</th>}
              {corps.map((c, ci) => (
                <th key={c.sym} className={`px-2 text-center min-w-[48px] font-bold cursor-pointer bg-broker-surface ${ci === curCol ? '!bg-broker-surface-hover' : ''} ${!c.ipoed ? 'opacity-30' : ''}`}
                  style={{ color: c.color }}
                  onClick={() => {
                    setCurCol(ci)
                    if (!c.ipoed && !c.floated) setPanel('par')
                    else setPanel('corpdetail')
                  }}>{c.sym}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {game.players.map((p, pi) => {
              const isRow = pi === curRow
              return (
                <tr key={p.id} className={`border-t border-broker-border/30 ${isRow ? 'bg-broker-surface-hover/50' : ''} hover:bg-broker-surface-hover/30`}>
                  <td className={`px-2 py-1 sticky left-0 z-10 cursor-pointer ${isRow ? 'bg-broker-surface-hover/50' : 'bg-broker-bg'} ${p.id === game.priorityDeal ? 'text-broker-gold font-bold' : 'text-broker-text font-medium'}`}
                    onClick={() => { setCurRow(pi); setPanel('playerdetail') }}>
                    {p.name}
                  </td>
                  <td className="px-2 text-right text-broker-text font-medium">
                    <InlineEdit value={p.cash} enabled={su} skin="broker"
                      onSave={v => doAction({ type: 'SET_CASH', entityId: p.id, entityType: 'player', value: v })}>
                      {fmt(p.cash)}
                    </InlineEdit>
                  </td>
                  <td className={`px-2 text-center ${playerCertCount(p) > game.certLimit ? 'text-red-400 font-bold' : 'text-broker-text-muted'}`}>{playerCertCount(p)}/{game.certLimit}</td>
                  {game.title.taxThresholds && (() => {
                    let totalTax = 0
                    for (const c of corps) {
                      const pct = playerSharePercent(p, c.sym)
                      for (const t of game.title.taxThresholds) {
                        if (pct >= t.minPercent && pct <= t.maxPercent) { totalTax += t.tax; break }
                      }
                    }
                    return totalTax > 0 ? (
                      <td className="px-1 text-red-400 text-[10px] font-bold">T{totalTax}</td>
                    ) : <td className="px-1" />
                  })()}
                  {corps.map((c, ci) => {
                    const pct = playerSharePercent(p, c.sym)
                    const pres = isPresident(p, c.sym)
                    const isCursor = pi === curRow && ci === curCol
                    return (
                      <td key={c.sym} ref={isCursor ? cursorRef : undefined}
                        className={`px-2 text-center cursor-pointer ${isCursor ? 'bg-broker-gold/20 ring-1 ring-broker-gold/50' : ci === curCol ? 'bg-broker-surface-hover/20' : ''} ${su && pct > 0 ? 'hover:ring-1 hover:ring-orange-400/50' : ''}`}
                        onClick={() => {
                          setCurRow(pi); setCurCol(ci)
                          if (su) setPanel('movecert')
                        }}>
                        {pct === 0 ? <span className="text-broker-text-muted/20">·</span>
                          : <span className={pres ? 'text-white font-bold' : 'text-broker-text'}>{pct}{pres && '%P'}</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {/* Separator */}
            <tr><td colSpan={3 + corps.length} className="h-px bg-broker-border"></td></tr>

            {/* Corp rows */}
            <BRow extraCols={game.title.taxThresholds ? 1 : 0} l="Price" corps={corps} cc={curCol} r={c => !c.ipoed ? '' :
              <InlineEdit value={`${c.pos?.row ?? 0},${c.pos?.col ?? 0}`} type="text" enabled={su} skin="broker"
                onSave={v => { const [r, cl] = v.split(',').map(Number); if (!isNaN(r) && !isNaN(cl)) doAction({ type: 'SET_MARKET_POSITION', corpSym: c.sym, row: r, col: cl }) }}>
                <span className="text-white font-medium">{fmt(c.price)}</span>
              </InlineEdit>} />
            <BRow extraCols={game.title.taxThresholds ? 1 : 0} l="Par" corps={corps} cc={curCol} r={c => !c.ipoed ? '' :
              <InlineEdit value={c.parPrice} enabled={su} skin="broker"
                onSave={v => doAction({ type: 'SET_CORP_FIELD', corpSym: c.sym, field: 'parPrice', value: v })}>
                <span className="text-broker-text-muted">{fmt(c.parPrice)}</span>
              </InlineEdit>} />
            <BRow extraCols={game.title.taxThresholds ? 1 : 0} l="Treasury" corps={corps} cc={curCol} r={c => !c.ipoed ? '' :
              <InlineEdit value={c.cash} enabled={su} skin="broker"
                onSave={v => doAction({ type: 'SET_CASH', entityId: c.sym, entityType: 'corporation', value: v })}>
                <span className={c.cash < 0 ? 'text-red-400' : 'text-broker-text'}>{fmt(c.cash)}</span>
              </InlineEdit>} />
            <BRow extraCols={game.title.taxThresholds ? 1 : 0} l="IPO" corps={corps} cc={curCol} r={c => c.ipoShares < 100 ?
              <InlineEdit value={c.ipoShares} enabled={su} skin="broker"
                onSave={v => doAction({ type: 'SET_CORP_FIELD', corpSym: c.sym, field: 'ipoShares', value: v })}>
                {c.ipoShares}%
              </InlineEdit> : ''} />
            <BRow extraCols={game.title.taxThresholds ? 1 : 0} l="Pool" corps={corps} cc={curCol} r={c => c.marketShares > 0 ?
              <InlineEdit value={c.marketShares} enabled={su} skin="broker"
                onSave={v => doAction({ type: 'SET_CORP_FIELD', corpSym: c.sym, field: 'marketShares', value: v })}>
                <span className="text-amber-400">{c.marketShares}%</span>
              </InlineEdit> : ''} />
            <BRow extraCols={game.title.taxThresholds ? 1 : 0} l="Trains" corps={corps} cc={curCol} onClick={(sym, ci) => { setCurCol(ci); setPanel('train') }} r={c => {
              if (!c.floated) return ''
              if (c.trains.length === 0) return <span className="text-red-400 font-bold">none</span>
              return <span className="font-medium text-white">{c.trains.map(t => t.name).join(' ')}</span>
            }} />
            <BRow extraCols={game.title.taxThresholds ? 1 : 0} l="Revenue" corps={corps} cc={curCol} onClick={(sym, ci) => { setCurCol(ci); setPanel('revenue'); setTimeout(() => revRef.current?.focus(), 50) }} r={c => {
              if (!c.floated) return ''
              const rev = lastRevenue[c.sym]
              if (!rev) return ''
              const color = rev.type === 'WITHHOLD_DIVIDEND' ? 'text-red-400' : 'text-green-400'
              return <span className={color}>{rev.type === 'WITHHOLD_DIVIDEND' ? 'W' : rev.type === 'HALF_DIVIDEND' ? 'H' : ''} {fmt(rev.amount)}</span>
            }} />
            <BRow extraCols={game.title.taxThresholds ? 1 : 0} l="Tokens" corps={corps} cc={curCol} r={c => !c.floated ? '' :
              <InlineEdit value={c.tokensPlaced} enabled={su} skin="broker"
                onSave={v => doAction({ type: 'SET_CORP_FIELD', corpSym: c.sym, field: 'tokensPlaced', value: v })}>
                {c.tokensPlaced}/{c.tokens.length}
              </InlineEdit>} />
            {game.title.loans && <BRow extraCols={game.title.taxThresholds ? 1 : 0} l="Loans" corps={corps} cc={curCol} r={c => !c.floated ? '' : c.loans ? <span className="text-red-400 font-bold">{c.loans}</span> : '0'} />}
          </tbody>
        </table>
      </div>

      {/* Depot strip */}
      <div className="bg-broker-surface border-t border-broker-border px-3 py-1.5 flex items-center gap-3 flex-wrap flex-shrink-0 text-xs">
        <span className="text-broker-text-muted font-medium">Depot</span>
        {depotGroups.map(g => (
          <span key={g.name} className="flex items-center gap-1">
            <span className="font-bold text-white">{g.name}</span>
            <span className="text-broker-text-muted">{g.count}x</span>
            <span className="text-broker-text">{fmt(g.price)}</span>
            {g.rustsOn && <span className="text-red-400/70">r{g.rustsOn}</span>}
          </span>
        ))}
      </div>

      {/* Action bar */}
      {panel ? (
        <ActionPanel panel={panel} game={game} player={selPlayer} corp={selCorp} unfloated={unfloated}
          fmt={fmt} revenueInput={revenueInput} setRevenueInput={setRevenueInput}
          revRef={revRef} onClose={closePanel} doAction={doAction} skin="broker" />
      ) : inReplay ? (
        <div className="bg-broker-surface border-t border-broker-border px-3 py-2 flex-shrink-0 flex items-center gap-2 flex-wrap">
          <Bb t="Prev" o={() => replayTo(Math.max(-1, curIdx - 1))} />
          <Bb t="Next" o={() => curIdx < fullLog.length - 1 && replayTo(curIdx + 1)} />
          <Bb t="Start" o={() => replayTo(-1)} />
          <Bb t="End" o={() => replayTo(fullLog.length - 1)} />
          <Bb t="What-if" v="purple" o={() => { exitReplay(); enterWhatIf() }} />
          <Bb t="Exit" v="red" o={() => exitReplay()} />
          <span className="text-broker-text-muted text-xs truncate ml-1 flex-1">{curIdx < 0 ? 'Game start' : `${curIdx + 1}/${fullLog.length} — ${lastAction?.description || ''}`}</span>
        </div>
      ) : (
        <ContextBar game={game} selPlayer={selPlayer} selCorp={selCorp} myPlayerId={myPlayerId}
          setPanel={setPanel} doAction={doAction} revRef={revRef} canUndo={canUndo} undo={undo}
          enterReplay={enterReplay} lastAction={lastAction} skin="broker" />
      )}
    </div>
  )
}

function BRow({ l, corps, cc, r, onClick, extraCols = 0 }) {
  return (
    <tr className="border-t border-broker-border/20">
      <td colSpan={3 + extraCols} className="px-2 py-0.5 text-broker-text-muted sticky left-0 bg-broker-bg z-10 text-xs">{l}</td>
      {corps.map((c, ci) => (
        <td key={c.sym}
          className={`px-2 text-center py-0.5 text-xs ${ci === cc ? 'bg-broker-surface-hover/20' : ''} ${onClick ? 'cursor-pointer hover:bg-broker-surface-hover/30' : ''}`}
          onClick={onClick ? () => onClick(c.sym, ci) : undefined}>
          {r(c)}
        </td>
      ))}
    </tr>
  )
}

function Bb({ t, v, o }) {
  const styles = {
    undefined: 'bg-broker-surface-hover text-white hover:bg-broker-gold/20',
    red: 'bg-red-900/50 text-red-300 hover:bg-red-800',
    purple: 'bg-purple-900/50 text-purple-300 hover:bg-purple-800',
    muted: 'bg-broker-surface-hover/50 text-broker-text-muted hover:text-white hover:bg-broker-surface-hover',
  }
  return <button onClick={o} className={`px-2 py-1 rounded text-xs font-medium ${styles[v] || styles[undefined]}`}>{t}</button>
}
