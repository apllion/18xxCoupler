import { defaults } from './defaults.js'

export const g18depot = {
  ...defaults,

  maturity: 3, testQuality: 1, titleId: 'g18depot',
  gameInfo: '• Generic 18xx template — works for any game • All actions always available, no phase gates • Manual stock movement via action buttons • Toggle features on/off: half pay, loans, corp trading • No title-specific rules enforced • Pure recording tool',
  specialties: 'Generic sandbox title • Configurable rules',
  implemented: 'All basic actions • Pay/Receive • Par • Buy/Sell shares • Revenue/Dividends • Manual stock movement • Place token • Buy train • Loans (optional) • Half pay (optional) • Corp trading (optional)',
  title: '18Depot',
  subtitle: 'Universal 18xx Depot',
  designer: 'Universal',
  location: 'Any',
  minPlayers: 2,
  maxPlayers: 8,

  bankCash: 99999,
  startingCash: { 2: 1200, 3: 800, 4: 600, 5: 480, 6: 400, 7: 350, 8: 300 },
  certLimit: { 2: 28, 3: 20, 4: 16, 5: 13, 6: 11, 7: 9, 8: 8 },
  currencyFormat: '$',

  capitalization: 'full',
  floatPercent: 60,
  sellBuyOrder: 'sell_buy',
  sellMovement: 'down_share',
  emergencyBuy: 'president_pays',
  marketShareLimit: 50,
  halfPay: true,

  // Generous stock market — covers most price ranges
  market: [
    ['350','350','350','350','350','350','350','350','350','350'],
    ['300','300','300','300','300','300','300','300','300','300'],
    ['250','250','250','250','250','250','250','250','250','250'],
    ['200','200','200','200','200','200','200','200','200','200'],
    ['180','180','180','180','180','180','180','180','180','180'],
    ['160','160','160','160','160','160','160','160','160','160'],
    ['140','140','140','140','140','140','140','140','140','140'],
    ['120p','120','120','120','120','120','120','120','120','120'],
    ['110p','110','110','110','110','110','110','110','110','110'],
    ['100p','100','100','100','100','100','100','100','100','100'],
    ['90p','90','90','90','90','90','90','90','90','90'],
    ['80p','80','80','80','80','80','80','80','80','80'],
    ['70p','70','70','70','70','70','70','70','70','70'],
    ['60p','60','60','60','60','60','60','60','60','60'],
    ['50','50','50','50','50','50','50','50','50','50'],
    ['40','40','40','40','40','40','40','40','40','40'],
  ],

  phases: [
    { name: '2', trainLimit: 4, tiles: ['yellow'], operatingRounds: 1 },
    { name: '3', on: '3', trainLimit: 4, tiles: ['yellow', 'green'], operatingRounds: 2 },
    { name: '4', on: '4', trainLimit: 3, tiles: ['yellow', 'green', 'brown'], operatingRounds: 2 },
    { name: '5', on: '5', trainLimit: 3, tiles: ['yellow', 'green', 'brown'], operatingRounds: 3 },
    { name: '6', on: '6', trainLimit: 2, tiles: ['yellow', 'green', 'brown', 'gray'], operatingRounds: 3 },
    { name: 'D', on: 'D', trainLimit: 2, tiles: ['yellow', 'green', 'brown', 'gray'], operatingRounds: 3 },
  ],

  trains: [
    { name: '2', distance: 2, price: 80, rustsOn: '4', num: 6 },
    { name: '3', distance: 3, price: 180, rustsOn: '6', num: 5 },
    { name: '4', distance: 4, price: 300, rustsOn: 'D', num: 4 },
    { name: '5', distance: 5, price: 450, num: 3 },
    { name: '6', distance: 6, price: 630, num: 3 },
    { name: 'D', distance: 99, price: 900, num: 20 },
  ],

  // 10 generic corps — user can rename
  corporations: [
    { sym: 'A', name: 'Company A', tokens: [0, 40, 80], color: '#d81e3e', floatPercent: 60 },
    { sym: 'B', name: 'Company B', tokens: [0, 40, 80], color: '#0189d1', floatPercent: 60 },
    { sym: 'C', name: 'Company C', tokens: [0, 40, 80], color: '#237333', floatPercent: 60 },
    { sym: 'D', name: 'Company D', tokens: [0, 40, 80], color: '#FFF500', textColor: '#000', floatPercent: 60 },
    { sym: 'E', name: 'Company E', tokens: [0, 40, 80], color: '#800080', floatPercent: 60 },
    { sym: 'F', name: 'Company F', tokens: [0, 40, 80], color: '#ff8c00', floatPercent: 60 },
    { sym: 'G', name: 'Company G', tokens: [0, 40, 80], color: '#808080', floatPercent: 60 },
    { sym: 'H', name: 'Company H', tokens: [0, 40, 80], color: '#00bcd4', floatPercent: 60 },
    { sym: 'I', name: 'Company I', tokens: [0, 40, 80], color: '#795548', floatPercent: 60 },
    { sym: 'J', name: 'Company J', tokens: [0, 40, 80], color: '#e91e63', floatPercent: 60 },
  ],

  pregame: [],

  // 6 generic privates
  companies: [
    { sym: 'P1', name: 'Private 1', value: 20, revenue: 5 },
    { sym: 'P2', name: 'Private 2', value: 40, revenue: 10 },
    { sym: 'P3', name: 'Private 3', value: 70, revenue: 15 },
    { sym: 'P4', name: 'Private 4', value: 110, revenue: 20 },
    { sym: 'P5', name: 'Private 5', value: 160, revenue: 25 },
    { sym: 'P6', name: 'Private 6', value: 220, revenue: 30 },
  ],

  // Optional features — all enabled by default, user can toggle in settings
  corpCanBuyShares: true,
  corpCanSellShares: true,
  loans: {
    loanValue: 100,
    baseRate: 5,
    rateStep: 5,
    loansPerTier: 5,
    maxRate: 70,
  },
}
