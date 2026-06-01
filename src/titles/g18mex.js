import { defaults } from './defaults.js'

export const g18mex = {
  ...defaults,
  maturity: 3, titleId: 'g18mex',
  gameInfo: '• Full capitalization, 50% float, NdM national merges at phase 5 • 3 minors (A/B/C) close at phase 3.5, owners get 5-10% NdM/UdY shares • NdM has non-standard shares including 5% certs, MNR private forces NdM par • 8 corps (1-4 tokens each), 7 privates, sell/buy stock rounds • 2D grid market (8x15), sell drops one row per 10% sold • 8 phases (2/3/3.5/4/5/6/6.5/4D), 4D replaces D-train • Game ends on bank break, bankruptcy, or stock market ceiling hit • $9,000 bank, best at 3-5 players, sweet spot 4p',
  implemented: 'Shares • Dividends • Auto stock movement • NdM merger • 5% shares',
  title: '18MEX', subtitle: 'National Railways of Mexico', designer: 'Mark Derrick',
  location: 'Mexico', minPlayers: 3, maxPlayers: 5,
  bankCash: 9000, startingCash: { 3: 625, 4: 500, 5: 450 },
  certLimit: { 3: 19, 4: 14, 5: 11 },
  currencyFormat: '$', capitalization: 'full', floatPercent: 50, sellBuyOrder: 'sell_buy',
  sellMovement: 'down_per_10',

  market: [
    ['60','65','70','75','80p','90p','100','110','120','130','140','150','165','180','200e'],
    ['55','60','65','70p','75p','80','90','100','110','120','130','140','150','165','180'],
    ['50','55','60p','65','70','75','80','90','100','110','120','130','140','150'],
    ['45','50','55','60','65','70','75','80','90','100','110','120'],
    ['40y','45','50','55','60','65','70','75','80'],
    ['30y','40y','45y','50y','55y'],
    ['20y','30y','40y','45y','50y'],
    ['10y'],
  ],

  phases: [
    { name: '2', trainLimit: 3, tiles: ['yellow'], operatingRounds: 1 },
    { name: '3', on: '3', trainLimit: 3, tiles: ['yellow','green'], operatingRounds: 2 },
    { name: '3½', on: "3'", trainLimit: 3, tiles: ['yellow','green'], operatingRounds: 2, events: ['minors_closed'] },
    { name: '4', on: '4', trainLimit: 2, tiles: ['yellow','green'], operatingRounds: 2 },
    { name: '5', on: '5', trainLimit: 2, tiles: ['yellow','green','brown'], operatingRounds: 3, events: ['close_companies','ndm_merger'] },
    { name: '6', on: '6', trainLimit: 2, tiles: ['yellow','green','brown'], operatingRounds: 3 },
    { name: '6½', on: "6'", trainLimit: 2, tiles: ['yellow','green','brown'], operatingRounds: 3 },
    { name: '4D', on: '4D', trainLimit: 2, tiles: ['yellow','green','brown','gray'], operatingRounds: 3 },
  ],

  trains: [
    { name: '2', distance: 2, price: 100, rustsOn: '4', num: 9 },
    { name: '3', distance: 3, price: 180, rustsOn: '6', num: 4, events: ['companies_buyable'] },
    { name: "3'", distance: 3, price: 180, rustsOn: '6', num: 2, events: ['minors_closed'] },
    { name: '4', distance: 4, price: 300, num: 3, obsoleteOn: "6'" },
    { name: '5', distance: 5, price: 450, num: 2, events: ['close_companies','ndm_merger'] },
    { name: '6', distance: 6, price: 600, num: 1 },
    { name: "6'", distance: 6, price: 600, num: 1 },
    { name: '4D', distance: 4, price: 700, num: 7 },
  ],

  corporations: [
    { sym: 'CHI', name: 'Chihuahua Pacific Railway', tokens: [0,40,60,80], color: '#FF4136', coordinates: 'E6' },
    { sym: 'NdM', name: 'National Railways of Mexico', tokens: [0,40,60,80], color: '#00AC00', coordinates: 'O10',
      shares: [20,10,10,10,10,10,10,5,5,10] },
    { sym: 'MC', name: 'Mexican Central Railway', tokens: [0,40], color: '#232b2b', coordinates: 'I8' },
    { sym: 'FCP', name: 'Pacific Railroad', tokens: [0,40,60,80], color: '#FFF128', textColor: '#000', coordinates: 'B3' },
    { sym: 'TM', name: 'Texas-Mexican Railway', tokens: [0,40], color: '#FFC502', textColor: '#000', coordinates: 'I12' },
    { sym: 'MEX', name: 'Mexican Railway', tokens: [0,40,60], color: '#555', coordinates: 'P13' },
    { sym: 'SPM', name: 'Southern Pacific Railroad of Mexico', tokens: [0,40,60], color: '#0080FF', coordinates: 'O8' },
    { sym: 'UdY', name: 'United Railways of Yucatan', tokens: [0,40], color: '#8B008B', coordinates: 'Q14' },
  ],

  pregame: [{ id: 'auction', label: 'Private Auction', type: 'waterfall' }],

  gameEndCheck: {
    bankrupt: 'immediate',
    stockMarket: 'current_or',
    bank: 'current_or',
  },

  companies: [
    { sym: 'MCAR', name: 'Mexico City-Acapulco Railroad', value: 20, revenue: 5, desc: 'No special abilities.' },
    { sym: 'KCMO', name: 'Kansas City, Mexico & Orient Railroad', value: 40, revenue: 10,
      desc: 'Can place Copper Canyon tile in F5 for $60 (vs $120). Closes when used.' },
    { sym: 'A', name: 'Interoceanic Railroad', value: 50, revenue: 0, canSellToCorp: false,
      desc: 'Controls Minor A (Tampico). Closes at Phase 3½, owner gets 5% NdM share.' },
    { sym: 'B', name: 'Sonora-Baja California Railway', value: 50, revenue: 0, canSellToCorp: false,
      desc: 'Controls Minor B (Mazatlán). Closes at Phase 3½, owner gets 5% NdM share.' },
    { sym: 'C', name: 'Southeastern Railway', value: 50, revenue: 0, canSellToCorp: false,
      desc: 'Controls Minor C (Oaxaca). Closes at Phase 3½, owner gets 10% UdY share.' },
    { sym: 'MIR', name: 'Mexican International Railroad', value: 100, revenue: 20,
      desc: 'Comes with 10% share of CHI. Blocks hexes K11, J12.',
      sharesGranted: [{ corpSym: 'CHI', percent: 10 }] },
    { sym: 'MNR', name: 'Mexican National Railroad', value: 140, revenue: 20, canSellToCorp: false,
      desc: "Comes with President's Certificate of NdM. Owner must set NdM par price immediately. Closes when NdM buys a train." },
  ],
}
