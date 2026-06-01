import { defaults } from './defaults.js'

export const g1822ca = {
  ...defaults,
  maturity: 1, titleId: 'g1822ca',
  gameInfo: '• 1822 system adapted for Canada: 30 minors + 10 majors with acquisition • Bid box auction for concessions, privates, and minors • Grain trains deliver grain from prairie elevators to port cities for bonus revenue • Incremental cap (full at phase 6), 20% float, half pay, most-cash SR order • 1D single-row market (35 spaces), must sell in blocks • 7 phases (1-7), separate L and 2-trains plus E-train endgame • Eastern and Western Regional Scenario variants for shorter games • $12,000 bank, 2-7 players, heavy-weight game',
  implemented: 'Shares • Dividends • Concessions • Minor acquisition mergers',
  title: '1822CA', subtitle: 'The Railways of Canada', designer: 'Robert Lecuyer & Simon Cutforth',
  location: 'Canada', minPlayers: 2, maxPlayers: 7,
  bankCash: 12000, startingCash: { 2: 1000, 3: 700, 4: 525, 5: 420, 6: 350, 7: 300 },
  certLimit: { 2: 40, 3: 26, 4: 20, 5: 16, 6: 13, 7: 11 },
  currencyFormat: '$', capitalization: 'incremental', floatPercent: 20, sellBuyOrder: 'sell_buy',
  mustSellInBlocks: true, nextSRPlayerOrder: 'most_cash', halfPay: true,

  market: [
    ['5y','10y','15y','20y','25y','30y','35y','40y','45y','50p','60xp','70xp','80xp','90xp','100xp','110','120','135','150','165','180','200','220','245','270','300','330','360','400','450','500','550','600','650','700e'],
  ],

  phases: [
    { name: '1', trainLimit: { minor: 2, major: 4 }, tiles: ['yellow'], operatingRounds: 1 },
    { name: '2', on: '2', trainLimit: { minor: 2, major: 4 }, tiles: ['yellow'], operatingRounds: 2 },
    { name: '3', on: '3', trainLimit: { minor: 2, major: 4 }, tiles: ['yellow','green'], operatingRounds: 2 },
    { name: '4', on: '4', trainLimit: { minor: 1, major: 3 }, tiles: ['yellow','green'], operatingRounds: 2 },
    { name: '5', on: '5', trainLimit: { minor: 1, major: 2 }, tiles: ['yellow','green','brown'], operatingRounds: 2, events: ['close_concessions'] },
    { name: '6', on: '6', trainLimit: { minor: 1, major: 2 }, tiles: ['yellow','green','brown'], operatingRounds: 2, events: ['full_capitalisation'] },
    { name: '7', on: '7', trainLimit: { minor: 1, major: 2 }, tiles: ['yellow','green','brown','gray'], operatingRounds: 2 },
  ],

  trains: [
    { name: 'L', distance: 1, price: 60, rustsOn: '3', num: 22 },
    { name: '2', distance: 2, price: 120, rustsOn: '4', num: 22 },
    { name: '3', distance: 3, price: 200, rustsOn: '6', num: 9 },
    { name: '4', distance: 4, price: 300, rustsOn: '7', num: 6 },
    { name: '5', distance: 5, price: 500, num: 3, events: ['close_concessions'] },
    { name: '6', distance: 6, price: 600, num: 3, events: ['full_capitalisation'] },
    { name: '7', distance: 7, price: 750, num: 20 },
    { name: 'E', distance: 99, price: 1000, num: 20 },
  ],

  corporations: [
    // 10 Majors
    { sym: 'CNoR', name: 'Canadian Northern Railway', tokens: [0,100], color: '#9fce63', textColor: '#000', type: 'major', floatPercent: 20 },
    { sym: 'CPR', name: 'Canadian Pacific Railway', tokens: [0,100], color: '#ed242a', type: 'major', floatPercent: 20 },
    { sym: 'GNWR', name: 'Great North West Railway', tokens: [0,100], color: '#8dd8f8', textColor: '#000', type: 'major', floatPercent: 20 },
    { sym: 'GT', name: 'Grand Trunk Railway', tokens: [0,100], color: '#000', type: 'major', floatPercent: 20 },
    { sym: 'GTP', name: 'Grand Trunk Pacific Railway', tokens: [0,100], color: '#f47d20', type: 'major', floatPercent: 20 },
    { sym: 'GWR', name: 'Great Western Railway', tokens: [0,100], color: '#395aa8', type: 'major', floatPercent: 20 },
    { sym: 'ICR', name: 'Intercolonial Railway', tokens: [0,100], color: '#eee91e', textColor: '#000', type: 'major', floatPercent: 20 },
    { sym: 'NTR', name: 'National Transcontinental Railway', tokens: [0,100], color: '#9a6733', type: 'major', floatPercent: 20 },
    { sym: 'PGE', name: 'Pacific Great Eastern Railway', tokens: [0,100], color: '#199d4a', type: 'major', floatPercent: 20 },
    { sym: 'QMOO', name: 'Québec, Montréal, Ottawa & Occidental Railway', tokens: [0,100], color: '#7f3881', type: 'major', floatPercent: 20 },

    // 30 Minors (numbered 1-30)
    ...Array.from({ length: 30 }, (_, i) => ({
      sym: `${i+1}`, name: `Minor ${i+1}`, tokens: [0], color: '#fff', textColor: '#000', type: 'minor', floatPercent: 100, shares: [100],
    })),
  ],

  pregame: [{ id: 'bidbox', label: 'Bid Box Auction', type: 'bidbox' }],

  companies: [
    { sym: 'C1', name: 'Concession: CNoR', value: 100, revenue: 10, desc: 'Converts to CNoR director certificate.' },
    { sym: 'C2', name: 'Concession: CPR', value: 100, revenue: 10, desc: 'Converts to CPR director certificate.' },
    { sym: 'C3', name: 'Concession: GNWR', value: 100, revenue: 10, desc: 'Converts to GNWR director certificate.' },
    { sym: 'C4', name: 'Concession: GT', value: 100, revenue: 10, desc: 'Converts to GT director certificate.' },
    { sym: 'C5', name: 'Concession: GTP', value: 100, revenue: 10, desc: 'Converts to GTP director certificate.' },
    { sym: 'C6', name: 'Concession: GWR', value: 100, revenue: 10, desc: 'Converts to GWR director certificate.' },
    { sym: 'C7', name: 'Concession: ICR', value: 100, revenue: 10, desc: 'Converts to ICR director certificate.' },
    { sym: 'C8', name: 'Concession: NTR', value: 100, revenue: 10, desc: 'Converts to NTR director certificate.' },
    { sym: 'C9', name: 'Concession: PGE', value: 100, revenue: 10, desc: 'Converts to PGE director certificate.' },
    { sym: 'C10', name: 'Concession: QMOO', value: 100, revenue: 10, desc: 'Converts to QMOO director certificate.' },
    { sym: 'P1', name: 'P1 (5-Train)', value: 0, revenue: 5, desc: 'Comes with a 5-train.' },
    { sym: 'P2', name: 'P2 (Permanent L-Train)', value: 0, revenue: 0, desc: 'Comes with a permanent L-train.' },
    { sym: 'P3', name: 'P3 (Permanent 2-Train)', value: 0, revenue: 0, desc: 'Comes with a permanent 2-train.' },
    { sym: 'P4', name: 'P4 (Permanent 2-Train)', value: 0, revenue: 0, desc: 'Comes with a permanent 2-train.' },
    { sym: 'P5', name: 'P5 (Pullman)', value: 0, revenue: 10, desc: 'Pullman car.' },
    { sym: 'P6', name: 'P6 (Pullman)', value: 0, revenue: 10, desc: 'Pullman car.' },
    { sym: 'P7', name: 'P7 (Declare 2× Cash)', value: 0, revenue: 10, desc: 'Declare 2× Cash Holding.' },
    { sym: 'P8', name: 'P8 ($10× Phase)', value: 0, revenue: 0, desc: '$10 × current phase revenue.' },
    { sym: 'P9', name: 'P9 ($5× Phase)', value: 0, revenue: 0, desc: '$5 × current phase revenue.' },
    { sym: 'P10', name: 'P10 (Winnipeg Station)', value: 0, revenue: 10, desc: 'Extra station in Winnipeg.' },
    { sym: 'P11', name: 'P11 (Tax Haven)', value: 0, revenue: 0, desc: 'Tax haven — cannot be acquired.' },
    { sym: 'P12', name: 'P12 (Advanced Tile Lay)', value: 0, revenue: 10, desc: 'Advanced tile lay ability.' },
    { sym: 'P13', name: 'P13 (Sawmill Bonus)', value: 0, revenue: 10, desc: 'Sawmill bonus.' },
    { sym: 'P14', name: 'P14 (Free Toronto Upgrades)', value: 0, revenue: 10, desc: 'Free tile lays and upgrades to Toronto.' },
    { sym: 'P15', name: 'P15 (Free Ottawa Upgrades)', value: 0, revenue: 10, desc: 'Free tile lays and upgrades to Ottawa.' },
    { sym: 'P16', name: 'P16 (Free Montréal Upgrades)', value: 0, revenue: 10, desc: 'Free tile lays and upgrades to Montréal.' },
    { sym: 'P17', name: 'P17 (Free Québec Upgrades)', value: 0, revenue: 10, desc: 'Free tile lays and upgrades to Québec.' },
    { sym: 'P18', name: 'P18 (Free Winnipeg Upgrades)', value: 0, revenue: 10, desc: 'Free tile lays and upgrades to Winnipeg.' },
    { sym: 'P19', name: 'P19 (Crowsnest Pass Tile)', value: 0, revenue: 10, desc: 'Place tile in Crowsnest Pass, ignoring terrain fee.' },
    { sym: 'P20', name: 'P20 (Yellowhead Pass Tile)', value: 0, revenue: 10, desc: 'Place tile in Yellowhead Pass, ignoring terrain fee.' },
    { sym: 'P21', name: 'P21 (3-Tile Grant)', value: 0, revenue: 10, desc: 'Place three extra yellow tiles, exempt from terrain fees.' },
    { sym: 'P22', name: 'P22 (Large Mail Contract)', value: 0, revenue: 10, desc: 'Half base value of start and end stations from one train.' },
    { sym: 'P23', name: 'P23 (Large Mail Contract)', value: 0, revenue: 10, desc: 'Half base value of start and end stations from one train.' },
    { sym: 'P24', name: 'P24 (Small Mail Contract)', value: 0, revenue: 10, desc: 'Phase-based subsidy: $10/$20/$30/$40 per operating round.' },
    { sym: 'P25', name: 'P25 (Small Mail Contract)', value: 0, revenue: 10, desc: 'Phase-based subsidy: $10/$20/$30/$40 per operating round.' },
    { sym: 'P26', name: 'P26 (Grain Train)', value: 0, revenue: 10, desc: 'Grain train — delivers grain from elevators to port cities.' },
    { sym: 'P27', name: 'P27 (Grain Train)', value: 0, revenue: 10, desc: 'Grain train — delivers grain from elevators to port cities.' },
    { sym: 'P28', name: 'P28 (Station Token Swap)', value: 0, revenue: 10, desc: 'Move token between exchange and available areas.' },
    { sym: 'P29', name: 'P29 (Remove Single Town)', value: 0, revenue: 10, desc: 'Replace town with plain track tile.' },
    { sym: 'P30', name: 'P30 (Remove Single Town)', value: 0, revenue: 10, desc: 'Replace town with plain track tile.' },
  ],

  // Same merger type as 1822 — major acquires minor
  merger: {
    type: '1822_acquire',
    requireMajorOperated: 2,
    requireMinorOperated: 1,
    bidboxPrice: 200,
    paymentOptions: [0, 1, 2],
  },

  variants: {
    'ers': { label: 'Eastern Regional Scenario', desc: 'Shorter game on the eastern half of the map.' },
    'wrs': { label: 'Western Regional Scenario', desc: 'Shorter game on the western half of the map.' },
  },
}
