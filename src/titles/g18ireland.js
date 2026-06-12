import { defaults } from './defaults.js'

export const g18ireland = {
  ...defaults,
  maturity: 3, testQuality: 1, titleId: 'g18ireland',
  unsoldShareDividends: 'ipo', // Charter shares pay corp, bank pool pays nothing
  gameInfo: '• 14 minors (40/20/20/20 shares) merge into 7 majors after 4H phase • Majors can IPO only after 6H train purchased • Incremental capitalization, 20% float for majors, 40% for minors • 2D grid market (8x15), £4,000 bank (optional £5,000 variant) • 6 phases (2/4/6/8/10/D), minors cannot start after 8H • Waterfall auction for 11 privates, DKR private starts a minor • Narrow gauge tile abilities on several privates • 3-6 players, merger timing is the strategic crux',
  specialties: 'Narrow gauge tiles • Minors → majors • DKR private starts minor',
  implemented: 'Shares • Dividends • Auto stock movement • Minor→Major mergers',
  title: '18Ireland', subtitle: 'Railways of Ireland', designer: 'Ian Scrivins',
  location: 'Ireland', minPlayers: 3, maxPlayers: 6,
  bankCash: 4000, startingCash: { 3: 330, 4: 250, 5: 200, 6: 160 },
  certLimit: { 3: 16, 4: 12, 5: 10, 6: 8 },
  currencyFormat: '£', capitalization: 'incremental', floatPercent: 20, sellBuyOrder: 'sell_buy',

  market: [
    ['','62','68','76','84','92','100p','110','122','134','148','170','196','225','260e'],
    ['','58','64','70','78','85p','94','102','112','124','136','150','172','198'],
    ['','55','60','65','70p','78','86','95','104','114','125','138'],
    ['','50','55','60p','66','72','80','88','96','106'],
    ['','38y','50p','55','60','66','72','80'],
    ['','30y','38y','50','55','60'],
    ['','24y','30y','38y','50'],
    ['0c','20y','24y','30y','38y'],
  ],

  phases: [
    { name: '2', trainLimit: 2, tiles: ['yellow'], operatingRounds: 2 },
    { name: '4', on: '4H', trainLimit: { minor: 2, major: 4 }, tiles: ['yellow','green'], operatingRounds: 2, events: ['corporations_can_merge'] },
    { name: '6', on: '6H', trainLimit: { minor: 2, major: 3 }, tiles: ['yellow','green'], operatingRounds: 2, events: ['majors_can_ipo'] },
    { name: '8', on: '8H', trainLimit: { minor: 1, major: 2 }, tiles: ['yellow','green','brown'], operatingRounds: 2, events: ['close_companies','minors_cannot_start'] },
    { name: '10', on: '10H', trainLimit: { minor: 1, major: 2 }, tiles: ['yellow','green','brown'], operatingRounds: 2 },
    { name: 'D', on: 'D', trainLimit: { minor: 1, major: 2 }, tiles: ['yellow','green','brown','gray'], operatingRounds: 2 },
  ],

  trains: [
    { name: '2H', distance: 2, price: 80, rustsOn: '6H', num: 7 },
    { name: '4H', distance: 4, price: 180, rustsOn: '8H', num: 5, events: ['corporations_can_merge'] },
    { name: '6H', distance: 6, price: 300, rustsOn: '10H', num: 4, events: ['majors_can_ipo'] },
    { name: '8H', distance: 8, price: 440, num: 3, events: ['close_companies','minors_cannot_start'] },
    { name: '10H', distance: 10, price: 550, num: 2 },
    { name: 'D', distance: 99, price: 770, num: 29 },
  ],

  corporations: [
    // Majors (available after 6H train)
    { sym: 'GSWR', name: 'Great Southern & Western Railway', tokens: [0,20,50], color: '#d81e3e', type: 'major', floatPercent: 20 },
    { sym: 'GNRI', name: 'Great Northern Railway (Ireland)', tokens: [0,20,50], color: '#3DAAD6', type: 'major', floatPercent: 20 },
    { sym: 'DSER', name: 'Dublin & South Eastern Railway', tokens: [0,20,50], color: '#111', type: 'major', floatPercent: 20 },
    { sym: 'MGWR', name: 'Midland Great Western Railway', tokens: [0,20,50], color: '#237333', type: 'major', floatPercent: 20 },
    { sym: 'MRNCC', name: 'Midland Railway NCC', tokens: [0,20,50], color: '#DB7093', type: 'major', floatPercent: 20 },
    { sym: 'WLWR', name: 'Waterford, Limerick & Western Railway', tokens: [0,20,50], color: '#FFF500', textColor: '#000', type: 'major', floatPercent: 20 },
    { sym: 'CBSCR', name: 'Cork, Bandon & South Coast Railway', tokens: [0,20,50], color: '#7b352a', type: 'major', floatPercent: 20 },

    // Minors (available from start)
    { sym: 'LER', name: 'Londonderry & Enniskillen', tokens: [0], color: '#8B4513', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
    { sym: 'CBPR', name: 'Cork, Blackrock & Passage Railway', tokens: [0], color: '#111', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
    { sym: 'EBSR', name: 'Enniskillen, Bundoran & Sligo Railway', tokens: [0], color: '#F5DEB3', textColor: '#000', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
    { sym: 'SLNCR', name: 'Sligo, Leitrim & Northern Counties Railway', tokens: [0], color: '#808080', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
    { sym: 'DDR', name: 'Dublin & Drogheda Railway', tokens: [0], color: '#98FB98', textColor: '#000', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
    { sym: 'DKR', name: 'Dublin & Kingstown Railway', tokens: [0], color: '#800080', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
    { sym: 'GJR', name: 'Grand Junction Railway', tokens: [0], color: '#fff', textColor: '#000', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
    { sym: 'UR', name: 'Ulster Railway', tokens: [0], color: '#FF7F50', textColor: '#000', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
    { sym: 'DER', name: 'Dundalk & Enniskillen Railway', tokens: [0], color: '#FFB6C1', textColor: '#000', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
    { sym: 'GNWR', name: 'Great Northern & Western Railway', tokens: [0], color: '#9370DB', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
    { sym: 'WKR', name: 'Waterford & Kilkenny Railway', tokens: [0], color: '#ADD8E6', textColor: '#000', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
    { sym: 'CIR', name: 'Central Ireland Railway', tokens: [0], color: '#556B2F', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
    { sym: 'KJR', name: 'Kilkenny Junction Railway', tokens: [0], color: '#DDA0DD', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
    { sym: 'WLR', name: 'Waterford & Limerick Railway', tokens: [0], color: '#d81e3e', type: 'minor', floatPercent: 40, shares: [40,20,20,20] },
  ],

  pregame: [{ id: 'auction', label: 'Private Auction', type: 'waterfall' }],

  companies: [
    { sym: 'DAR', name: 'Dalkey Atmospheric Railway', value: 20, revenue: 5, desc: 'Blocks Wicklow hex until bought or closed.' },
    { sym: 'DR', name: 'Donegal Railway', value: 30, revenue: 7, desc: 'Place two connected narrow gauge tiles in Donegal. Closes when used.' },
    { sym: 'BoW', name: 'Board of Works', value: 40, revenue: 9, desc: 'Place yellow tiles without terrain cost (2 uses). Closes when used.' },
    { sym: 'CDSPC', name: 'City of Dublin Steam Packet Company', value: 45, revenue: 10, desc: 'Place +£10 token on a port (Belfast, Londonderry, or Rosslare). Closes when used.' },
    { sym: 'TDR', name: 'Tralee & Dingle Railway', value: 50, revenue: 10, desc: 'Place two narrow gauge tiles in Tralee/Dingle. Closes when used.' },
    { sym: 'DCR', name: 'Drumglass Colliery Railway', value: 60, revenue: 12, desc: 'Blocks H4 until bought. Owning corp may place free yellow tile on H4.' },
    { sym: 'TASPS', name: 'Trans-Atlantic Steam Packet Station', value: 75, revenue: 15, desc: 'Place +£20 token on Galway. Closes when used.' },
    { sym: 'RSSC', name: 'River Shannon Shipping Co', value: 80, revenue: 10, desc: 'River link between Dromod and Limerick. Adds other city value to one train.' },
    { sym: 'WDE', name: 'William Dargan Esq.', value: 90, revenue: 10, desc: 'Upgrade second track tile each OR for £30 from treasury.' },
    { sym: 'TIM', name: 'The Irish Mail', value: 110, revenue: 20, desc: 'Place off-board location tile adjacent to specified hex. Closes when used.' },
    { sym: 'DK', name: 'Dublin & Kingstown Railway', value: 120, revenue: 0,
      desc: 'Take DKR directorship, set share price at half bid, place 2H train on DKR.' },
  ],

  // Merger: minors can merge into majors after 4H train (corporations_can_merge event)
  // Majors can be IPO'd after 6H train (majors_can_ipo event)
  merger: {
    type: '1867_minor_major',
    fromPhase: '4',
    minorOwnerGetsShare: true,
  },

  variants: {
    'larger_bank': {
      label: 'Larger Bank',
      desc: '£5,000 bank instead of £4,000.',
      bankCash: 5000,
    },
  },
}
