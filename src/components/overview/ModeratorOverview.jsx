// ModeratorOverview — DOS retro skin. Blue bg, monospace, green/cyan/yellow text.

import { useOverviewData, playerSharePercent, playerCertCount, isPresident } from './useOverviewData.js'
import { useUIStore } from '../../store/uiStore.js'
import { ActionPanel } from './ActionPanel.jsx'

export default function ModeratorOverview() {
  const d = useOverviewData()
  if (!d.game) return null
  const { game, fmt, phase, label, limit, corps, unfloated, depotGroups, lastRevenue, corpPrivates, playerPrivates, lastAction, selPlayer, selCorp, curRow, setCurRow, curCol, setCurCol, panel, setPanel, revenueInput, setRevenueInput, revRef, rootRef, onKeyDown, closePanel, doAction, inReplay, fullLog, enterReplay, exitReplay, replayTo, enterWhatIf, isWhatIf, exitWhatIf, canUndo, undo, isSR, isOR, isPre, rt } = d

  const barBg = isSR ? 'bg-green-900' : isOR ? 'bg-amber-900' : isPre ? 'bg-purple-900' : 'bg-blue-900'
  const labelColor = isSR ? 'text-green-300' : isOR ? 'text-amber-300' : isPre ? 'text-purple-300' : 'text-blue-300'
  const curIdx = game.actionLog.length - 1

  return (
    <div ref={rootRef} tabIndex={0} onKeyDown={onKeyDown}
      onClick={(e) => { if (e.target.tagName !== 'INPUT') rootRef.current?.focus() }}
      className="font-mono text-xs leading-tight select-none h-full flex flex-col bg-blue-950 outline-none">

      {/* Title bar */}
      <div className={`${barBg} text-blue-200 px-2 py-1 flex justify-between flex-shrink-0`}>
        <span>
          <span className="text-white font-bold">{game.title.title}</span>
          <span className={`ml-2 font-bold ${labelColor}`}>{isPre ? 'Setup' : label}</span>
          <span className="text-cyan-300 ml-2">Ph.{phase.name}</span>
          <span className="text-blue-400 ml-2">Lim:{limit}</span>
        </span>
        <span className="flex items-center gap-2">
          {inReplay && <span className="text-purple-300 font-bold">REPLAY {curIdx + 1}/{fullLog.length}</span>}
          <span className={game.bank.cash <= 0 ? 'text-red-400 font-bold' : 'text-green-300'}>Bank:{fmt(game.bank.cash)}</span>
          <button onClick={() => canUndo() && undo()} className="text-blue-400 hover:text-white">[U]ndo</button>
          <button onClick={() => useUIStore.getState().setActiveTab('market')} className="text-yellow-400 hover:text-yellow-200">[Tab]</button>
          <button onClick={() => useUIStore.getState().setActiveTab('overview')} className="text-cyan-400 hover:text-cyan-200">Broker</button>
        </span>
      </div>

      {/* Mode banners */}
      {isWhatIf && (
        <div className="bg-purple-900 px-2 py-0.5 flex items-center justify-between flex-shrink-0 text-xs">
          <span className="text-purple-200 font-bold">WHAT-IF — exploring, nothing saved</span>
          <span className="flex gap-1">
            <button onClick={() => exitWhatIf(true)} className="text-purple-300 hover:text-white">Discard</button>
            <button onClick={() => exitWhatIf(false)} className="text-purple-400 hover:text-white">Keep</button>
          </span>
        </div>
      )}
      {inReplay && !isWhatIf && (
        <div className="bg-blue-800 px-2 py-0.5 flex items-center justify-between flex-shrink-0 text-xs">
          <span className="text-blue-200 font-bold">REPLAY {curIdx + 1}/{fullLog.length} — {lastAction?.description || 'Start'}</span>
          <span className="flex gap-1">
            <button onClick={() => { exitReplay(); enterWhatIf() }} className="text-purple-300 hover:text-white">What-if</button>
            <button onClick={() => exitReplay()} className="text-blue-300 hover:text-white">Exit</button>
          </span>
        </div>
      )}

      {/* Matrix */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-950 text-green-400">
              <th className="text-left px-1 py-0.5 sticky left-0 bg-blue-950 z-10 min-w-[80px]"></th>
              <th className="px-1 text-right min-w-[44px]">Cash</th>
              <th className="px-1 text-right min-w-[28px]">Prv</th>
              <th className="px-1 text-center min-w-[32px]">Cert</th>
              {corps.map((c, ci) => (
                <th key={c.sym} className={`px-1 text-center min-w-[44px] cursor-pointer ${ci === curCol ? 'bg-blue-800' : ''} ${!c.ipoed && !c.floated ? 'opacity-40' : ''}`}
                  style={{ color: c.color }} onClick={() => setCurCol(ci)}>{c.sym}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {game.players.map((p, pi) => {
              const isRow = pi === curRow
              const privs = playerPrivates[p.id]
              return (
                <tr key={p.id} className={`border-t border-blue-900/40 ${isRow ? 'bg-blue-900/60' : 'bg-blue-950'}`}>
                  <td className={`px-1 py-0.5 sticky left-0 z-10 cursor-pointer ${isRow ? 'bg-blue-900/60' : 'bg-blue-950'} text-yellow-300`} onClick={() => setCurRow(pi)}>
                    <span className="text-blue-500 mr-0.5">{pi + 1}</span>
                    {p.id === game.priorityDeal && <span className="text-white">{'\u00BB'}</span>}
                    {p.name}
                  </td>
                  <td className="px-1 text-right text-green-300">{fmt(p.cash)}</td>
                  <td className="px-1 text-right text-purple-300" title={privs?.map(c => c.sym).join(', ')}>{privs ? privs.length : '—'}</td>
                  <td className={`px-1 text-center ${playerCertCount(p) > game.certLimit ? 'text-red-400 font-bold' : 'text-blue-300'}`}>{playerCertCount(p)}/{game.certLimit}</td>
                  {corps.map((c, ci) => {
                    const pct = playerSharePercent(p, c.sym)
                    const pres = isPresident(p, c.sym)
                    const isCursor = pi === curRow && ci === curCol
                    return (
                      <td key={c.sym} className={`px-1 text-center cursor-pointer ${isCursor ? 'bg-green-900 ring-1 ring-green-500' : ci === curCol ? 'bg-blue-900/30' : ''}`}
                        onClick={() => { setCurRow(pi); setCurCol(ci) }}>
                        {pct === 0 ? <span className="text-blue-900/60">·</span>
                          : <span className="text-white">{pres && <span className="text-yellow-400">{'\u00BB'}</span>}{pct}</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            <tr><td colSpan={4 + corps.length} className="h-0.5 bg-green-700"></td></tr>
            <MRow label="Price" corps={corps} cc={curCol} r={c => !c.ipoed ? '—' : <span className="text-cyan-300">{c.price}{c.pos && <span className="text-blue-500">/{c.pos.row}</span>}</span>} />
            <MRow label="Par" corps={corps} cc={curCol} r={c => !c.ipoed ? '—' : <span className="text-blue-300">{c.parPrice}</span>} />
            <MRow label="Treas" corps={corps} cc={curCol} r={c => !c.ipoed ? '—' : <span className={c.cash < 0 ? 'text-red-400' : 'text-green-300'}>{fmt(c.cash)}</span>} />
            <MRow label="IPO" corps={corps} cc={curCol} r={c => <span className="text-blue-300">{c.ipoShares < 100 ? `${c.ipoShares}%` : '—'}</span>} />
            <MRow label="Pool" corps={corps} cc={curCol} r={c => c.marketShares > 0 ? <span className="text-yellow-300">{c.marketShares}%</span> : '—'} />
            <MRow label="Trains" corps={corps} cc={curCol} r={c => !c.floated ? '—' : c.trains.length === 0 ? <span className="text-red-500 font-bold">!</span> : <span className="text-white font-bold">{c.trains.map(t => t.name).join('')}</span>} />
            <MRow label="Rev" corps={corps} cc={curCol} r={c => { if (!c.floated) return '—'; const rev = lastRevenue[c.sym]; if (!rev) return '—'; const sign = rev.type === 'WITHHOLD_DIVIDEND' ? '-' : rev.type === 'HALF_DIVIDEND' ? '~' : '+'; return <span className={rev.type === 'WITHHOLD_DIVIDEND' ? 'text-red-300' : 'text-green-300'}>{sign}{rev.amount}</span> }} />
            <MRow label="Tokens" corps={corps} cc={curCol} r={c => !c.floated ? '—' : <span className="text-blue-300">{c.tokensPlaced}/{c.tokens.length}</span>} />
            <MRow label="Pres" corps={corps} cc={curCol} r={c => { if (!c.ipoed) return '—'; const pr = game.players.find(p => isPresident(p, c.sym)); return <span className="text-yellow-400">{pr ? pr.name.slice(0, 6) : '—'}</span> }} />
            {game.title.loans && <MRow label="Loans" corps={corps} cc={curCol} r={c => !c.floated ? '—' : <span className={c.loans ? 'text-red-300 font-bold' : ''}>{c.loans || 0}</span>} />}
            {game.title.corpSizing?.enabled && <MRow label="Size" corps={corps} cc={curCol} r={c => !c.ipoed ? '—' : <span className="text-cyan-300">{c.corpSize || '2sh'}</span>} />}
          </tbody>
        </table>
      </div>

      {/* Depot */}
      <div className="bg-blue-900 text-white px-2 py-0.5 flex items-center gap-1 flex-wrap flex-shrink-0">
        <span className="text-blue-400">Depot:</span>
        {depotGroups.map(g => (
          <span key={g.name}><span className="text-green-300 font-bold">{String(g.name).repeat(Math.min(g.count, 12))}</span><span className="text-yellow-300 ml-0.5">{fmt(g.price)}</span>{g.rustsOn && <span className="text-red-400 ml-0.5">r{g.rustsOn}</span>}<span className="text-blue-800 mx-0.5">|</span></span>
        ))}
      </div>

      {/* Actions / Bottom bar */}
      {panel ? (
        <ActionPanel panel={panel} game={game} player={selPlayer} corp={selCorp} unfloated={unfloated}
          fmt={fmt} revenueInput={revenueInput} setRevenueInput={setRevenueInput}
          revRef={revRef} onClose={closePanel} doAction={doAction} skin="moderator" />
      ) : inReplay ? (
        <div className="bg-gray-900 border-t border-purple-800 px-1 py-1 flex-shrink-0 flex items-center gap-1 flex-wrap">
          <Mb t="Prev" o={() => replayTo(Math.max(-1, curIdx - 1))} /><Mb t="Next" o={() => curIdx < fullLog.length - 1 && replayTo(curIdx + 1)} />
          <Mb t="Start" o={() => replayTo(-1)} /><Mb t="End" o={() => replayTo(fullLog.length - 1)} />
          <Mb t="What-if" o={() => { exitReplay(); enterWhatIf() }} /><Mb t="Exit" o={() => exitReplay()} />
          <span className="text-blue-400 text-xs truncate ml-1">{curIdx < 0 ? 'Start' : `${curIdx + 1}/${fullLog.length}: ${lastAction?.description || ''}`}</span>
        </div>
      ) : (
        <div className="bg-gray-900 border-t border-green-800 px-1 py-1 flex-shrink-0 flex items-center gap-1 flex-wrap">
          <Mb t="Buy" o={() => { if (!selCorp) return; if (!selCorp.ipoed) { setPanel('par'); return } if (selCorp.ipoShares > 0) doAction({ type: 'BUY_SHARE', playerId: selPlayer?.id, corpSym: selCorp.sym, source: 'ipo', percent: 10 }); else if (selCorp.marketShares > 0) doAction({ type: 'BUY_SHARE', playerId: selPlayer?.id, corpSym: selCorp.sym, source: 'market', percent: 10 }) }} />
          <Mb t="Sell" o={() => selPlayer && selCorp && playerSharePercent(selPlayer, selCorp.sym) > 0 && doAction({ type: 'SELL_SHARES', playerId: selPlayer.id, corpSym: selCorp.sym, percent: 10 })} />
          <Mb t="Rev" o={() => { setPanel('revenue'); setTimeout(() => revRef.current?.focus(), 50) }} />
          <Mb t="Train" o={() => setPanel('train')} />
          {unfloated.length > 0 && <Mb t="New" o={() => setPanel('par')} />}
          <Mb t="Priv" o={() => setPanel('private')} />
          {game.title.loans && selCorp?.floated && <Mb t="Loan" o={() => setPanel('loan')} />}
          <span className="text-blue-800">|</span>
          <Mb t="Adv" o={() => doAction({ type: 'ADVANCE_ROUND' })} /><Mb t="Coll" o={() => doAction({ type: 'COLLECT_ALL_REVENUE' })} />
          <Mb t="Sold" o={() => doAction({ type: 'SOLD_OUT_ADJUST' })} /><Mb t="Undo" o={() => canUndo() && undo()} />
          {game.actionLog.length > 0 && <Mb t="Replay" o={() => enterReplay()} />}
          <span className="text-blue-400 text-xs truncate ml-1 flex-1">{lastAction?.description || ''}</span>
        </div>
      )}
    </div>
  )
}

function MRow({ label, corps, cc, r }) {
  return (
    <tr className="bg-blue-950 border-t border-blue-900/20">
      <td colSpan={4} className="px-1 py-px text-green-600 sticky left-0 bg-blue-950 z-10">{label}</td>
      {corps.map((c, ci) => <td key={c.sym} className={`px-1 text-center py-px ${ci === cc ? 'bg-blue-900/30' : ''}`}>{r(c)}</td>)}
    </tr>
  )
}

function Mb({ t, o }) {
  return <button onClick={o} className="px-1.5 py-0.5 rounded text-xs font-mono bg-green-900/80 text-green-300 hover:bg-green-800">{t}</button>
}
