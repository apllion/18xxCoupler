// Export game state as PDF — for restoring physical board position.

import { jsPDF } from 'jspdf'
import { corpPrice } from '../engine/stockMarket.js'
import { playerSharePercent, playerCertCount, isPresident } from '../engine/player.js'
import { currentPhase, trainLimit } from '../engine/phase.js'
import { roundLabel } from '../engine/roundTracker.js'
import { formatCurrency } from './currency.js'
import { remainingCount } from '../engine/depot.js'

export function exportGamePdf(game) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const phase = currentPhase(game.phaseManager)
  const label = game.roundTracker ? roundLabel(game.roundTracker) : ''
  const limit = trainLimit(game.phaseManager)
  const now = new Date().toLocaleString()

  const W = 297, H = 210
  let y = 10

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`${game.title.title} — Game State Snapshot`, 10, y)
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${label} | Phase ${phase.name} | Train Limit ${limit} | Bank ${fmt(game.bank.cash)} | ${now}`, 10, y)
  y += 4
  doc.text(`Actions: ${game.actionLog.length} | ${game.importSource ? 'Imported from 18xx.games #' + game.importSource.gameId : 'Local game'}`, 10, y)
  y += 8

  // Players table
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Players', 10, y)
  y += 5

  const playerCols = ['Name', 'Cash', 'Certs', 'Privates', 'Share Holdings']
  const colX = [10, 45, 75, 95, 140]
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  playerCols.forEach((col, i) => doc.text(col, colX[i], y))
  y += 1
  doc.line(10, y, W - 10, y)
  y += 4

  doc.setFont('helvetica', 'normal')
  for (const p of game.players) {
    const isPriority = p.id === game.priorityDeal
    const certs = playerCertCount(p)
    const privs = p.privates.join(', ') || '—'

    // Share holdings — show individual certificates
    const holdings = []
    for (const c of game.corporations) {
      if (!c.ipoed) continue
      const playerCerts = p.shares.filter(s => s.corpSym === c.sym)
      if (playerCerts.length === 0) continue
      // Group by percent: e.g. "1x20%P + 2x10%"
      const groups = {}
      for (const cert of playerCerts) {
        const key = cert.percent + (cert.isPresident ? 'P' : '')
        groups[key] = (groups[key] || 0) + 1
      }
      const parts = Object.entries(groups).map(([key, count]) => `${count}x${key}%`)
      holdings.push(`${c.sym}[${parts.join('+')}]`)
    }

    doc.text(`${isPriority ? '>> ' : ''}${p.name}${p.bankrupt ? ' [BANKRUPT]' : ''}`, colX[0], y)
    doc.text(fmt(p.cash), colX[1], y)
    doc.text(`${certs}/${game.certLimit}`, colX[2], y)
    doc.text(privs, colX[3], y)
    doc.text(holdings.join('  ') || '—', colX[4], y)
    y += 4
  }
  y += 4

  // Corporations table
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Corporations', 10, y)
  y += 5

  const corpCols = ['Corp', 'Price', 'Par', 'Treasury', 'IPO', 'Pool', 'Trains', 'Tokens', 'President', 'Revenue']
  const corpX = [10, 30, 50, 68, 92, 108, 124, 160, 180, 220]
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  corpCols.forEach((col, i) => doc.text(col, corpX[i], y))
  y += 1
  doc.line(10, y, W - 10, y)
  y += 4

  doc.setFont('helvetica', 'normal')
  for (const c of game.corporations) {
    if (!c.ipoed && !c.floated) continue
    const price = corpPrice(game.stockMarket, c.sym) || 0
    const pos = game.stockMarket.corpPositions[c.sym]

    // Find last revenue
    let lastRev = '—'
    for (let i = game.actionLog.length - 1; i >= 0; i--) {
      const a = game.actionLog[i].action
      if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && a.corpSym === c.sym) {
        const prefix = a.type === 'WITHHOLD_DIVIDEND' ? 'W' : a.type === 'HALF_DIVIDEND' ? 'H' : 'P'
        lastRev = `${prefix} ${fmt(a.totalRevenue)}`
        break
      }
    }

    // President
    const pres = game.players.find(p => isPresident(p, c.sym))

    doc.text(`${c.sym}${c.type === 'minor' ? ' (m)' : c.type === 'national' ? ' (n)' : ''}`, corpX[0], y)
    doc.text(price ? `${fmt(price)}${pos ? ' [' + pos.row + ',' + pos.col + ']' : ''}` : '—', corpX[1], y)
    doc.text(c.parPrice ? fmt(c.parPrice) : '—', corpX[2], y)
    doc.text(fmt(c.cash), corpX[3], y)
    doc.text(c.ipoShares < 100 ? `${c.ipoShares}%` : '—', corpX[4], y)
    doc.text(c.marketShares > 0 ? `${c.marketShares}%` : '—', corpX[5], y)
    doc.text(c.trains.length > 0 ? c.trains.map(t => t.name).join(', ') : 'none', corpX[6], y)
    doc.text(`${c.tokensPlaced}/${c.tokens.length}`, corpX[7], y)
    doc.text(pres?.name || '—', corpX[8], y)
    doc.text(lastRev, corpX[9], y)
    y += 4

    if (y > H - 20) { doc.addPage(); y = 10 }
  }
  y += 4

  // Stock market position (text summary)
  if (y > H - 40) { doc.addPage(); y = 10 }
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Stock Market Positions', 10, y)
  y += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  for (const c of game.corporations.filter(c => c.ipoed)) {
    const pos = game.stockMarket.corpPositions[c.sym]
    const price = pos ? game.stockMarket.grid[pos.row]?.[pos.col]?.price : null
    if (pos) {
      doc.text(`${c.sym}: row ${pos.row}, col ${pos.col} = ${fmt(price)}`, 10, y)
      y += 3.5
    }
  }
  y += 4

  // Train depot
  if (y > H - 30) { doc.addPage(); y = 10 }
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Train Depot', 10, y)
  y += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const seen = new Set()
  for (const t of game.depot.upcoming) {
    if (!seen.has(t.name)) {
      seen.add(t.name)
      const count = remainingCount(game.depot, t.name)
      doc.text(`${t.name}: ${count} remaining @ ${fmt(t.price)}${t.rustsOn ? ' (rusts on ' + t.rustsOn + ')' : ''}`, 10, y)
      y += 3.5
    }
  }
  y += 4

  // Private companies
  const ownedPrivates = (game.companies || []).filter(c => c.ownerId && !c.closed)
  if (ownedPrivates.length > 0) {
    if (y > H - 30) { doc.addPage(); y = 10 }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Private Companies', 10, y)
    y += 5
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    for (const c of ownedPrivates) {
      const owner = c.ownerType === 'player'
        ? game.players.find(p => p.id === c.ownerId)?.name
        : c.ownerId
      doc.text(`${c.sym} (${c.name}) — Owner: ${owner} | Value: ${fmt(c.value)} | Revenue: ${fmt(c.revenue)}/OR`, 10, y)
      y += 3.5
    }
    y += 4
  }

  // Last 10 actions
  if (y > H - 30) { doc.addPage(); y = 10 }
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Recent Actions', 10, y)
  y += 5
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const recent = game.actionLog.slice(-10)
  for (const entry of recent) {
    doc.text(`${entry.id + 1}. ${entry.description}`, 10, y)
    y += 3
  }

  // Footer
  doc.setFontSize(7)
  doc.setTextColor(128)
  doc.text('Generated by 18xxBroker — https://apllion.github.io/18xxBroker/', 10, H - 5)

  // Save
  const filename = `${game.title.titleId}_${new Date().toISOString().slice(0, 10)}_action${game.actionLog.length}.pdf`
  doc.save(filename)
  return filename
}
