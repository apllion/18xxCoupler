import { defaults } from './defaults.js'

export const g18ms = {
  ...defaults,
  maturity: 4, testQuality: 1, titleId: 'g18ms',
  gameInfo: '• Full capitalization, 60% float, 70% max player ownership • Draft-based private selection (5 privates) instead of auction • Trains have salvage value when replaced (2+=$20, 3+=$30, 4+=$60) • Double-header D trains (2D/4D/5D) multiply route revenue • 5 corps with 2-4 tokens, sell/buy stock rounds • 2D grid market (5x14), 4 phases with fixed OR count • Game ends after fixed round count, $10,000 bank • Best at 2-4 players, fast-playing at about 2 hours',
  specialties: 'Draft privates • Salvage train values • Multiplier D-trains 2D/4D/5D • 70% max ownership',
  implemented: 'Shares • Dividends • Auto stock movement • Salvage trains • Multiplier D-trains',
  title: '18MS', subtitle: 'The Railroads Come to Mississippi', designer: 'Mark Derrick',
  location: 'Mississippi, USA', minPlayers: 2, maxPlayers: 4,

  bankCash: 10000,
  startingCash: { 2: 900, 3: 625, 4: 525 },
  certLimit: { 2: 20, 3: 14, 4: 10 },
  currencyFormat: '$',

  capitalization: 'full',
  floatPercent: 60,
  maxOwnership: 70,
  ebuyPresSwap: false,
  ebuyDepotCheapest: false,

  market: [
    ['65y','70','75','80','90p','100','110','130','150','170','200','230','265','300'],
    ['60y','65y','70p','75p','80p','90','100','110','130','150','170','200','230','265'],
    ['50y','60y','65y','70','75','80','90','100','110','130','150'],
    ['45y','50y','60y','65y','70','75','80'],
    ['40y','45y','50y','60y'],
  ],

  phases: [
    { name: '2', trainLimit: 3, tiles: ['yellow'], operatingRounds: 2 },
    { name: '3', on: '3+', trainLimit: 3, tiles: ['yellow','green'], operatingRounds: 2 },
    { name: '6', on: '6', trainLimit: 3, tiles: ['yellow','green','brown'], operatingRounds: 2 },
    { name: 'D', on: '2D', trainLimit: 3, tiles: ['yellow','green','brown','gray'], operatingRounds: 2 },
  ],

  trains: [
    { name: '2+', distance: 2, price: 80, num: 5, salvageValue: 20 },
    { name: '3+', distance: 3, price: 180, num: 4, salvageValue: 30 },
    { name: '4+', distance: 4, price: 300, num: 3, salvageValue: 60 },
    { name: '5', distance: 5, price: 500, num: 2 },
    { name: '6', distance: 6, price: 550, num: 2, events: ['close_companies','remove_tokens'] },
    { name: '2D', distance: 2, price: 500, num: 4, availableOn: '6', multiplier: 2, variants: [{ name: '4D', price: 750, distance: 4, multiplier: 2 }] },
    { name: '5D', distance: 5, price: 850, num: 1, availableOn: '6', multiplier: 2 },
  ],

  corporations: [
    { sym: 'GMO', name: 'Gulf, Mobile and Ohio Railroad', tokens: [0,40,100,100], color: '#000000', coordinates: 'H6' },
    { sym: 'IC', name: 'Illinois Central Railroad', tokens: [0,40,100], color: '#397641', coordinates: 'A1' },
    { sym: 'L&N', name: 'Louisville and Nashville Railroad', tokens: [0,40,100], color: '#0d5ba5', coordinates: 'C9' },
    { sym: 'Fr', name: 'Frisco', tokens: [0,40,100], color: '#ed1c24', coordinates: 'E1' },
    { sym: 'WRA', name: 'Western Railway of Alabama', tokens: [0,40,100], color: '#c7c4e2', textColor: '#000', coordinates: 'E11' },
  ],

  terrainCosts: [20, 40],

  pregame: [{ id: 'draft', label: 'Draft', type: 'draft' }],

  companies: [
    { sym: 'AGS', name: 'Alabama Great Southern Railroad', value: 30, revenue: 15,
      desc: 'Extra free yellow tile lay adjacent to Birmingham.' },
    { sym: 'BS', name: 'Birmingham Southern Railroad', value: 40, revenue: 10,
      desc: 'Can lay 1–2 extra free yellow tiles.' },
    { sym: 'M&M', name: 'Meridian and Memphis Railway', value: 50, revenue: 15,
      desc: 'Half-price token placement.' },
    { sym: 'MC', name: 'Mississippi Central Railway', value: 60, revenue: 5,
      desc: 'Free 2+ train exchange.' },
    { sym: 'M&O', name: 'Mobile & Ohio Railway', value: 70, revenue: 5,
      desc: '$100 discount on 3+/4+ train purchase.' },
  ],

  // Fixed round game end
  gameEndCheck: { fixed_round: 'current_or' },
}
