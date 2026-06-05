// PrivateCompany — ownership, revenue, closing.

export function createPrivateCompany(def) {
  return {
    sym: def.sym,
    name: def.name,
    value: def.value,
    revenue: def.revenue,
    desc: def.desc,
    ownerId: null,      // player id or corp sym
    ownerType: null,     // 'player' or 'corporation'
    closed: false,

    // Enriched fields (optional, from title def)
    activeInPhase: def.activeInPhase || null,   // phase name when revenue activates (null = always)
    canSellToCorp: def.canSellToCorp !== false,  // default true; false = player-only
    sharesGranted: def.sharesGranted || null,     // [{ corpSym, percent }] — share-proxy privates
    neverCloses: def.neverCloses || false,        // immune to close_companies events
  }
}

export function assignPrivate(company, ownerId, ownerType) {
  company.ownerId = ownerId
  company.ownerType = ownerType
}

export function closePrivate(company) {
  company.closed = true
  company.ownerId = null
  company.ownerType = null
}

export function collectRevenue(state, companySym) {
  const company = state.companies.find((c) => c.sym === companySym)
  if (!company || company.closed || !company.ownerId) return null

  // Phase-gated: only collect if current phase matches
  if (company.activeInPhase && state.phaseManager) {
    const currentPhase = state.phaseManager.phases[state.phaseManager.currentIndex]
    if (!currentPhase || currentPhase.name !== company.activeInPhase) return null
  }

  const amount = company.revenue
  if (amount <= 0) return null

  if (company.ownerType === 'player') {
    const player = state.players.find((p) => p.id === company.ownerId)
    if (player) {
      player.cash += amount
      state.bank.cash -= amount
    }
  } else if (company.ownerType === 'corporation') {
    const corp = state.corporations.find((c) => c.sym === company.ownerId)
    if (corp) {
      corp.cash += amount
      state.bank.cash -= amount
    }
  }
  return amount
}

export function collectAllRevenue(state) {
  const results = []
  for (const company of state.companies) {
    if (!company.closed && company.ownerId) {
      const amount = collectRevenue(state, company.sym)
      if (amount) {
        results.push({ sym: company.sym, amount, ownerId: company.ownerId })
      }
    }
  }

  // CEO salary: pay each player holding a president share
  const ceoIncome = state.title.ceoIncome
  if (ceoIncome) {
    for (const player of state.players) {
      const ceoShares = player.shares.filter((s) => s.isPresident)
      if (ceoShares.length > 0) {
        const total = ceoIncome * ceoShares.length
        player.cash += total
        state.bank.cash -= total
        for (const s of ceoShares) {
          results.push({ sym: `${s.corpSym} CEO`, amount: ceoIncome, ownerId: player.id })
        }
      }
    }
  }

  return results
}

export function closeAllCompanies(state) {
  for (const company of state.companies) {
    if (!company.closed && !company.neverCloses) {
      closePrivate(company)
    }
  }
  // Remove closed privates from player holdings
  const closedSyms = new Set(state.companies.filter((c) => c.closed).map((c) => c.sym))
  for (const player of state.players) {
    player.privates = player.privates.filter((sym) => !closedSyms.has(sym))
  }
}
