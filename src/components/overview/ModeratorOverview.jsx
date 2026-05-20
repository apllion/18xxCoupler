// ModeratorOverview — terminal retro skin with selectable color themes.

import { useState } from 'react'
import { useOverviewData, playerSharePercent, playerCertCount, isPresident } from './useOverviewData.js'
import { useUIStore } from '../../store/uiStore.js'
import { ActionPanel } from './ActionPanel.jsx'

const THEMES = {
  dos:    { id: 'dos',    label: 'DOS',    bg: 'bg-blue-950',  bar: 'bg-blue-900',  head: 'text-green-400',  text: 'text-blue-300',  bright: 'text-white',  player: 'text-yellow-300', dim: 'text-blue-900/60', sep: 'bg-green-700', cursor: 'bg-green-900 ring-1 ring-green-500', colHi: 'bg-blue-900/30', rowHi: 'bg-blue-900/60', input: 'bg-black border-green-800', btn: 'bg-green-900/80 text-green-300 hover:bg-green-800', depot: 'bg-blue-900', depotTrain: 'text-green-300', depotPrice: 'text-yellow-300', actionBar: 'bg-gray-900 border-green-800', border: 'border-blue-900/40' },
  green:  { id: 'green',  label: 'Green',  bg: 'bg-black',     bar: 'bg-gray-950',  head: 'text-green-500',  text: 'text-green-700',  bright: 'text-green-300', player: 'text-green-400', dim: 'text-green-900/40', sep: 'bg-green-800', cursor: 'bg-green-950 ring-1 ring-green-600', colHi: 'bg-green-950/30', rowHi: 'bg-green-950/50', input: 'bg-black border-green-700', btn: 'bg-green-950 text-green-400 hover:bg-green-900', depot: 'bg-gray-950', depotTrain: 'text-green-400', depotPrice: 'text-green-600', actionBar: 'bg-gray-950 border-green-900', border: 'border-green-900/30' },
  amber:  { id: 'amber',  label: 'Amber',  bg: 'bg-black',     bar: 'bg-gray-950',  head: 'text-amber-500',  text: 'text-amber-700',  bright: 'text-amber-300', player: 'text-amber-400', dim: 'text-amber-900/30', sep: 'bg-amber-800', cursor: 'bg-amber-950 ring-1 ring-amber-600', colHi: 'bg-amber-950/30', rowHi: 'bg-amber-950/50', input: 'bg-black border-amber-700', btn: 'bg-amber-950 text-amber-400 hover:bg-amber-900', depot: 'bg-gray-950', depotTrain: 'text-amber-400', depotPrice: 'text-amber-600', actionBar: 'bg-gray-950 border-amber-900', border: 'border-amber-900/30' },
  white:  { id: 'white',  label: 'White',  bg: 'bg-black',     bar: 'bg-gray-950',  head: 'text-gray-400',   text: 'text-gray-500',   bright: 'text-white',     player: 'text-gray-300',  dim: 'text-gray-800/40',  sep: 'bg-gray-700',  cursor: 'bg-gray-900 ring-1 ring-gray-500',  colHi: 'bg-gray-900/20',  rowHi: 'bg-gray-900/40',  input: 'bg-black border-gray-600',  btn: 'bg-gray-900 text-gray-300 hover:bg-gray-800',    depot: 'bg-gray-950', depotTrain: 'text-gray-300',  depotPrice: 'text-gray-500',  actionBar: 'bg-gray-950 border-gray-800',  border: 'border-gray-800/30' },
}

export default function ModeratorOverview() {
  const d = useOverviewData()
  const [themeId, setThemeId] = useState('dos')
  if (!d.game) return null
  const { game, fmt, phase, label, limit, corps, unfloated, depotGroups, lastRevenue, corpPrivates, playerPrivates, lastAction, selPlayer, myPlayerId, selCorp, curRow, setCurRow, curCol, setCurCol, panel, setPanel, revenueInput, setRevenueInput, revRef, rootRef, cursorRef, onKeyDown, closePanel, doAction, inReplay, fullLog, enterReplay, exitReplay, replayTo, enterWhatIf, isWhatIf, exitWhatIf, canUndo, undo, isSR, isOR, isPre, rt } = d

  const t = THEMES[themeId]
  const barBg = isSR ? 'bg-green-900' : isOR ? 'bg-amber-900' : isPre ? 'bg-purple-900' : t.bar
  const labelColor = isSR ? 'text-green-300' : isOR ? 'text-amber-300' : isPre ? 'text-purple-300' : t.head
  const curIdx = game.actionLog.length - 1

  return (
    <div ref={rootRef} tabIndex={0} onKeyDown={onKeyDown}
      onClick={(e) => { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') rootRef.current?.focus() }}
      className={`font-mono text-xs leading-tight select-none h-full flex flex-col ${t.bg} outline-none`}>

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
          <select value={myPlayerId || ''} onChange={e => useUIStore.getState().setMyPlayer(e.target.value || null)}
            className="text-xs bg-blue-900 border border-blue-700 rounded px-1 py-0 text-yellow-300 font-mono">
            <option value="">Umpire</option>
            {game.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => canUndo() && undo()} className="text-blue-400 hover:text-white">[U]ndo</button>
          <select value={themeId} onChange={e => setThemeId(e.target.value)}
            className={`${t.bg} border border-current rounded px-0.5 py-0 ${t.head}`}>
            {Object.values(THEMES).map(th => <option key={th.id} value={th.id}>{th.label}</option>)}
          </select>
          <button onClick={() => useUIStore.getState().setActiveTab('market')} className={`${t.player} hover:${t.bright}`}>[Tab]</button>
          <button onClick={() => useUIStore.getState().setActiveTab('overview')} className={`${t.head} hover:${t.bright}`}>Broker</button>
        </span>
      </div>

      {/* Nav tabs */}
      <div className={`${t.bar} px-2 py-0.5 flex items-center gap-1 flex-shrink-0 border-b ${t.border}`}>
        {[
          { key: 'F1', id: 'moderator', label: 'Overview' },
          { key: 'F2', id: 'market', label: 'Market' },
          { key: 'F3', id: 'corps', label: 'Corps' },
          { key: 'F4', id: 'players', label: 'Players' },
          ...(game.companies?.length > 0 ? [{ key: 'F5', id: 'privates', label: 'Privates' }] : []),
          { key: 'F6', id: 'summary', label: 'Summary' },
        ].map(tab => {
          const active = useUIStore.getState().activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => useUIStore.getState().setActiveTab(tab.id)}
              className={`text-xs px-1.5 py-0.5 ${active ? `${t.bright} font-bold` : `${t.text} hover:${t.bright}`}`}>
              {tab.key}:{tab.label}
            </button>
          )
        })}
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
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className={`${t.bg} ${t.head}`}>
              <th className={`text-left px-1 py-0.5 sticky left-0 ${t.bg} z-30 min-w-[80px]`}></th>
              <th className="px-1 text-right min-w-[44px]">Cash</th>
              <th className="px-1 text-right min-w-[28px] cursor-pointer hover:text-purple-300" onClick={() => setPanel('private')}>Prv</th>
              <th className="px-1 text-center min-w-[32px]">Cert</th>
              {corps.map((c, ci) => (
                <th key={c.sym} className={`px-1 text-center min-w-[44px] cursor-pointer ${ci === curCol ? t.colHi : ''} ${!c.ipoed && !c.floated ? 'opacity-40' : ''}`}
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
              const privs = playerPrivates[p.id]
              return (
                <tr key={p.id} className={`border-t ${t.border} ${isRow ? t.rowHi : t.bg}`}>
                  <td className={`px-1 py-0.5 sticky left-0 z-10 cursor-pointer ${isRow ? t.rowHi : t.bg} ${t.player}`}
                    onClick={() => { setCurRow(pi); setPanel('playerdetail') }}>
                    <span className={`${t.text} mr-0.5`}>{pi + 1}</span>
                    {p.id === game.priorityDeal && <span className={t.bright}>{'\u00BB'}</span>}
                    {p.name}
                  </td>
                  <td className={`px-1 text-right ${t.bright}`}>{fmt(p.cash)}</td>
                  <td className="px-1 text-right text-purple-300" title={privs?.map(c => c.sym).join(', ')}>{privs ? privs.length : '—'}</td>
                  <td className={`px-1 text-center ${playerCertCount(p) > game.certLimit ? 'text-red-400 font-bold' : t.text}`}>{playerCertCount(p)}/{game.certLimit}</td>
                  {corps.map((c, ci) => {
                    const pct = playerSharePercent(p, c.sym)
                    const pres = isPresident(p, c.sym)
                    const isCursor = pi === curRow && ci === curCol
                    return (
                      <td key={c.sym} ref={isCursor ? cursorRef : undefined}
                        className={`px-1 text-center cursor-pointer ${isCursor ? t.cursor : ci === curCol ? t.colHi : ''}`}
                        onClick={() => { setCurRow(pi); setCurCol(ci) }}>
                        {pct === 0 ? <span className={t.dim}>·</span>
                          : <span className="text-white">{pres && <span className="text-yellow-400">{'\u00BB'}</span>}{pct}</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            <tr><td colSpan={4 + corps.length} className="h-0.5 bg-green-700"></td></tr>
            <MRow t={t} label="Price" corps={corps} cc={curCol} r={c => !c.ipoed ? '—' : <span className="text-cyan-300">{c.price}{c.pos && <span className="text-blue-500">/{c.pos.row}</span>}</span>} />
            <MRow t={t} label="Par" corps={corps} cc={curCol} r={c => !c.ipoed ? '—' : <span className="text-blue-300">{c.parPrice}</span>} />
            <MRow t={t} label="Treas" corps={corps} cc={curCol} r={c => !c.ipoed ? '—' : <span className={c.cash < 0 ? 'text-red-400' : 'text-green-300'}>{fmt(c.cash)}</span>} />
            <MRow t={t} label="IPO" corps={corps} cc={curCol} r={c => <span className="text-blue-300">{c.ipoShares < 100 ? `${c.ipoShares}%` : '—'}</span>} />
            <MRow t={t} label="Pool" corps={corps} cc={curCol} r={c => c.marketShares > 0 ? <span className="text-yellow-300">{c.marketShares}%</span> : '—'} />
            <MRow t={t} label="Trains" corps={corps} cc={curCol} onClick={(sym, ci) => { setCurCol(ci); setPanel('train') }} r={c => !c.floated ? '—' : c.trains.length === 0 ? <span className="text-red-500 font-bold">!</span> : <span className="text-white font-bold">{c.trains.map(t => t.name).join('')}</span>} />
            <MRow t={t} label="Rev" corps={corps} cc={curCol} onClick={(sym, ci) => { setCurCol(ci); setPanel('revenue'); setTimeout(() => revRef.current?.focus(), 50) }} r={c => { if (!c.floated) return '—'; const rev = lastRevenue[c.sym]; if (!rev) return '—'; const sign = rev.type === 'WITHHOLD_DIVIDEND' ? '-' : rev.type === 'HALF_DIVIDEND' ? '~' : '+'; return <span className={rev.type === 'WITHHOLD_DIVIDEND' ? 'text-red-300' : 'text-green-300'}>{sign}{rev.amount}</span> }} />
            <MRow t={t} label="Tokens" corps={corps} cc={curCol} r={c => !c.floated ? '—' : <span className="text-blue-300">{c.tokensPlaced}/{c.tokens.length}</span>} />
            <MRow t={t} label="Pres" corps={corps} cc={curCol} r={c => { if (!c.ipoed) return '—'; const pr = game.players.find(p => isPresident(p, c.sym)); return <span className="text-yellow-400">{pr ? pr.name.slice(0, 6) : '—'}</span> }} />
            {game.title.loans && <MRow t={t} label="Loans" corps={corps} cc={curCol} r={c => !c.floated ? '—' : <span className={c.loans ? 'text-red-300 font-bold' : ''}>{c.loans || 0}</span>} />}
            {game.title.corpSizing?.enabled && <MRow t={t} label="Size" corps={corps} cc={curCol} r={c => !c.ipoed ? '—' : <span className="text-cyan-300">{c.corpSize || '2sh'}</span>} />}
          </tbody>
        </table>
      </div>

      {/* Depot */}
      <div className={`${t.depot} ${t.bright} px-2 py-0.5 flex items-center gap-1 flex-wrap flex-shrink-0`}>
        <span className={t.text}>Depot:</span>
        {depotGroups.map(g => (
          <span key={g.name}><span className={`${t.depotTrain} font-bold`}>{String(g.name).repeat(Math.min(g.count, 12))}</span><span className={`${t.depotPrice} ml-0.5`}>{fmt(g.price)}</span>{g.rustsOn && <span className="text-red-400 ml-0.5">r{g.rustsOn}</span>}<span className={`${t.dim} mx-0.5`}>|</span></span>
        ))}
      </div>

      {/* Actions / Bottom bar */}
      {panel ? (
        <ActionPanel panel={panel} game={game} player={selPlayer} corp={selCorp} unfloated={unfloated}
          fmt={fmt} revenueInput={revenueInput} setRevenueInput={setRevenueInput}
          revRef={revRef} onClose={closePanel} doAction={doAction} skin="moderator" />
      ) : inReplay ? (
        <div className="bg-gray-900 border-t border-purple-800 px-1 py-1 flex-shrink-0 flex items-center gap-1 flex-wrap">
          <Mb t="[<]Prev" o={() => replayTo(Math.max(-1, curIdx - 1))} /><Mb t="[>]Next" o={() => curIdx < fullLog.length - 1 && replayTo(curIdx + 1)} />
          <Mb t="[{]Start" o={() => replayTo(-1)} /><Mb t="[}]End" o={() => replayTo(fullLog.length - 1)} />
          <Mb t="[W]hat-if" o={() => { exitReplay(); enterWhatIf() }} /><Mb t="[E]xit" o={() => exitReplay()} />
          <span className="text-blue-400 text-xs truncate ml-1">{curIdx < 0 ? 'Start' : `${curIdx + 1}/${fullLog.length}: ${lastAction?.description || ''}`}</span>
        </div>
      ) : (
        <div className={`${t.actionBar} border-t px-1 py-1 flex-shrink-0 flex items-center gap-1 flex-wrap`}>
          <span className={`${t.player} text-xs`}>{selPlayer?.name}</span>
          {selCorp && <span className="text-xs font-bold" style={{ color: selCorp.color }}>{selCorp.sym}</span>}
          <span className={t.dim}>|</span>
          <Mb t="[B]uy" o={() => { if (!selCorp) return; if (!selCorp.ipoed) { setPanel('par'); return } if (selCorp.ipoShares > 0) doAction({ type: 'BUY_SHARE', playerId: selPlayer?.id, corpSym: selCorp.sym, source: 'ipo', percent: 10 }); else if (selCorp.marketShares > 0) doAction({ type: 'BUY_SHARE', playerId: selPlayer?.id, corpSym: selCorp.sym, source: 'market', percent: 10 }) }} />
          <Mb t="[S]ell" o={() => selPlayer && selCorp && playerSharePercent(selPlayer, selCorp.sym) > 0 && doAction({ type: 'SELL_SHARES', playerId: selPlayer.id, corpSym: selCorp.sym, percent: 10 })} />
          <Mb t="[R]ev" o={() => { setPanel('revenue'); setTimeout(() => revRef.current?.focus(), 50) }} />
          <Mb t="[T]rain" o={() => setPanel('train')} />
          {unfloated.length > 0 && <Mb t="[N]ew" o={() => setPanel('par')} />}
          <Mb t="[P]riv" o={() => setPanel('buyprivate')} />
          <Mb t="Sel[v]" o={() => setPanel('private')} />
          {game.title.loans && selCorp?.floated && <Mb t="[L]oan" o={() => setPanel('loan')} />}
          {game.title.corpCanBuyShares && selCorp?.floated && <Mb t="[G]corp" o={() => setPanel('corpshare')} />}
          <span className="text-blue-800">|</span>
          <Mb t="[A]dv" o={() => doAction({ type: 'ADVANCE_ROUND' })} /><Mb t="[C]oll" o={() => doAction({ type: 'COLLECT_ALL_REVENUE' })} />
          <Mb t="S[o]ld" o={() => doAction({ type: 'SOLD_OUT_ADJUST' })} /><Mb t="[U]ndo" o={() => canUndo() && undo()} />
          {game.actionLog.length > 0 && <Mb t="R[e]play" o={() => enterReplay()} />}
          <span className="text-blue-400 text-xs truncate ml-1 flex-1">{lastAction?.description || ''}</span>
        </div>
      )}
    </div>
  )
}

function MRow({ label, corps, cc, r, onClick, t }) {
  return (
    <tr className={`${t?.bg || 'bg-blue-950'} border-t ${t?.border || 'border-blue-900/20'}`}>
      <td colSpan={4} className={`px-1 py-px ${t?.head || 'text-green-600'} sticky left-0 ${t?.bg || 'bg-blue-950'} z-10`}>{label}</td>
      {corps.map((c, ci) => (
        <td key={c.sym}
          className={`px-1 text-center py-px ${ci === cc ? (t?.colHi || 'bg-blue-900/30') : ''} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={onClick ? () => onClick(c.sym, ci) : undefined}>
          {r(c)}
        </td>
      ))}
    </tr>
  )
}

function Mb({ t, o }) {
  return <button onClick={o} className="px-1.5 py-0.5 rounded text-xs font-mono bg-green-900/80 text-green-300 hover:bg-green-800">{t}</button>
}
