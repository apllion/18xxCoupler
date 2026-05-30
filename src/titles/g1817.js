import { defaults } from './defaults.js'

export const g1817 = {
  ...defaults,
  maturity: 1, titleId: 'g1817',
  gameInfo: '• Loans & short selling • Corp sizing 2/5/10 share • Train export • Selection auction • No sell movement', title: '1817', subtitle: 'NYSE', designer: 'Craig Bartell, Tim Flowers',
  location: 'Northeast USA', minPlayers: 3, maxPlayers: 12,
  bankCash: 99999,
  startingCash: { 3: 420, 4: 315, 5: 252, 6: 210, 7: 180, 8: 158, 9: 140, 10: 126, 11: 115, 12: 105 },
  certLimit: { 3: 21, 4: 16, 5: 13, 6: 11, 7: 9, 8: 8, 9: 7, 10: 6, 11: 6, 12: 5 },
  currencyFormat: '$', capitalization: 'incremental', floatPercent: 20, sellBuyOrder: 'sell_buy', seedMoney: 200,
  ebuyPresSwap: false, sellAfter: 'after_sr_floated',
  sellMovement: 'none', // selling shares causes NO stock price movement in 1817
  halfPay: true,
  marketShareLimit: 1000, // effectively unlimited

  market: [
    ['0l','0a','0a','0a','40','45','50p','55s','60p','65p','70s','80p','90p','100p','110p','120s','135p','150p','165p','180p','200p','220','245','270','300','330','360','400','440','490','540','600'],
  ],

  phases: [
    { name: '2', trainLimit: 4, tiles: ['yellow'], operatingRounds: 2, corpSizes: ['2share'] },
    { name: '2+', on: '2+', trainLimit: 4, tiles: ['yellow'], operatingRounds: 2, corpSizes: ['2share'] },
    { name: '3', on: '3', trainLimit: 4, tiles: ['yellow','green'], operatingRounds: 2, corpSizes: ['2share','5share'] },
    { name: '4', on: '4', trainLimit: 3, tiles: ['yellow','green'], operatingRounds: 2, corpSizes: ['5share'] },
    { name: '5', on: '5', trainLimit: 3, tiles: ['yellow','green','brown'], operatingRounds: 2, corpSizes: ['5share','10share'] },
    { name: '6', on: '6', trainLimit: 2, tiles: ['yellow','green','brown'], operatingRounds: 2, corpSizes: ['10share'] },
    { name: '7', on: '7', trainLimit: 2, tiles: ['yellow','green','brown','gray'], operatingRounds: 2, corpSizes: ['10share'] },
    { name: '8', on: '8', trainLimit: 2, tiles: ['yellow','green','brown','gray'], operatingRounds: 2, corpSizes: ['10share'], status: ['no_new_shorts'] },
  ],

  trains: [
    { name: '2', distance: 2, price: 100, rustsOn: '4', num: 40 },
    { name: '2+', distance: 2, price: 100, num: 4, obsoleteOn: '4' },
    { name: '3', distance: 3, price: 250, rustsOn: '6', num: 12 },
    { name: '4', distance: 4, price: 400, rustsOn: '8', num: 8 },
    { name: '5', distance: 5, price: 600, num: 5 },
    { name: '6', distance: 6, price: 750, num: 4 },
    { name: '7', distance: 7, price: 900, num: 3 },
    { name: '8', distance: 8, price: 1100, num: 40, events: ['signal_end_game'] },
  ],

  // All 20 corps start as 2-share. Can convert to 5-share then 10-share.
  // 2-share: president 20% + 1 regular 10% (total 30% sold to float, rest in treasury)
  shares: [20, 10],
  corporations: [
    { sym: 'A&S', name: 'Alton & Southern Railway', tokens: [0], color: '#FF69B4', corpSize: '2share' },
    { sym: 'A&A', name: 'Arcade and Attica', tokens: [0], color: '#FFD700', textColor: '#000', corpSize: '2share' },
    { sym: 'Belt', name: 'Belt Railway of Chicago', tokens: [0], color: '#FF8C00', corpSize: '2share' },
    { sym: 'Bess', name: 'Bessemer and Lake Erie', tokens: [0], color: '#111', corpSize: '2share' },
    { sym: 'B&A', name: 'Boston and Albany', tokens: [0], color: '#d81e3e', corpSize: '2share' },
    { sym: 'DL&W', name: 'Delaware, Lackawanna & Western', tokens: [0], color: '#7b352a', corpSize: '2share' },
    { sym: 'J', name: 'Elgin, Joliet & Eastern', tokens: [0], color: '#237333', corpSize: '2share' },
    { sym: 'GT', name: 'Grand Trunk Western', tokens: [0], color: '#8B008B', corpSize: '2share' },
    { sym: 'H', name: 'Housatonic', tokens: [0], color: '#ADD8E6', textColor: '#000', corpSize: '2share' },
    { sym: 'ME', name: 'Morristown and Erie', tokens: [0], color: '#D2B48C', textColor: '#000', corpSize: '2share' },
    { sym: 'NYOW', name: 'New York, Ontario & Western', tokens: [0], color: '#40E0D0', textColor: '#000', corpSize: '2share' },
    { sym: 'NYSW', name: 'New York, Susquehanna & Western', tokens: [0], color: '#FFF500', textColor: '#000', corpSize: '2share' },
    { sym: 'PSNR', name: 'Pittsburgh, Shawmut & Northern', tokens: [0], color: '#00FF7F', textColor: '#000', corpSize: '2share' },
    { sym: 'PLE', name: 'Pittsburgh and Lake Erie', tokens: [0], color: '#90EE90', textColor: '#000', corpSize: '2share' },
    { sym: 'PW', name: 'Providence and Worcester', tokens: [0], color: '#C0C0C0', textColor: '#000', corpSize: '2share' },
    { sym: 'R', name: 'Rutland', tokens: [0], color: '#006400', corpSize: '2share' },
    { sym: 'SR', name: 'Strasburg', tokens: [0], color: '#FF0000', corpSize: '2share' },
    { sym: 'UR', name: 'Union Railroad', tokens: [0], color: '#000080', corpSize: '2share' },
    { sym: 'WT', name: 'Warren & Trumbull', tokens: [0], color: '#9370DB', corpSize: '2share' },
    { sym: 'WC', name: 'West Chester', tokens: [0], color: '#8B7355', corpSize: '2share' },
  ],

  pregame: [{ id: 'auction', label: 'Private Auction', type: 'selection' }],

  companies: [
    { sym: 'PSM', name: 'Pittsburgh Steel Mill', value: 40, revenue: 0, desc: 'Place special tile X00 on Pittsburgh for free.' },
    { sym: 'ME', name: 'Mountain Engineers', value: 40, revenue: 0, desc: '$20 income after laying yellow in mountain.' },
    { sym: 'OBC', name: 'Ohio Bridge Company', value: 40, revenue: 0, desc: '$10 river fee discount. Place 1 bridge token.' },
    { sym: 'UBC', name: 'Union Bridge Company', value: 80, revenue: 0, desc: '$10 river fee discount. Place 2 bridge tokens.' },
    { sym: 'TS', name: 'Train Station', value: 80, revenue: 0, desc: 'Provides 1 additional station token for corp.' },
    { sym: 'MINC', name: 'Minor Coal Mine', value: 30, revenue: 0, desc: 'Place 1 coal mine tile on mountain.' },
    { sym: 'CM', name: 'Coal Mine', value: 60, revenue: 0, desc: 'Place 2 coal mine tiles on mountains.' },
    { sym: 'MAJC', name: 'Major Coal Mine', value: 90, revenue: 0, desc: 'Place 3 coal mine tiles on mountains.' },
    { sym: 'MINM', name: 'Minor Mail Contract', value: 60, revenue: 10, desc: '$10/OR if corp has train.' },
    { sym: 'MAIL', name: 'Mail Contract', value: 90, revenue: 15, desc: '$15/OR if corp has train.' },
    { sym: 'MAJM', name: 'Major Mail Contract', value: 120, revenue: 20, desc: '$20/OR if corp has train.' },
  ],

  // Loan system
  loans: {
    loanValue: 100,       // $100 per loan
    baseRate: 5,          // 5% base interest
    rateStep: 5,          // +5% per tier
    loansPerTier: 5,      // 5 loans per interest tier
    maxRate: 70,          // max 70% interest
  },

  // Short selling
  shorts: {
    enabled: true,
    minCorpSize: '5share', // can't short 2-share corps
    noNewShortsPhase: '8', // no new shorts in phase 8
  },

  // Corp sizing: corps start as 2-share, can convert
  corpSizing: {
    enabled: true,
    sizes: ['2share', '5share', '10share'],
    conversionRound: true, // Merger & Conversion Round after ORs
  },

  // Merger: same-size corps can merge during Merger & Conversion Round
  merger: {
    type: '1817_merge',
    mergerRound: true,
    sameSize: true, // only same-size corps can merge
  },

  // Train export: end of each OR, if no train bought, export next available
  trainExport: true,

  // Game end: first 8-train triggers end (3 more ORs if in round 1, 2 if round 2)
  gameEndCheck: {
    bankrupt: 'immediate',
    finalTrain: 'signal_end_game',
  },

  variants: {
    'short_squeeze': {
      label: 'Short Squeeze',
      desc: 'Corps with >100% player ownership move stock price twice at end of SR.',
    },
    '5_shorts': {
      label: '5 Shorts Limit',
      desc: 'Limit shorts to 5 per 10-share corporation.',
      shorts: { enabled: true, maxPerCorp: 5, minCorpSize: '5share', noNewShortsPhase: '8' },
    },
    'modern_trains': {
      label: 'Modern Trains',
      desc: '7-trains earn $10/token, 8-trains earn $20/token owned.',
    },
    'volatility': {
      label: 'Volatility Expansion',
      desc: '13 additional private companies and modified initial auction.',
    },
  },
}
