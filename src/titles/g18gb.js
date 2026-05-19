import { defaults } from './defaults.js'

export const g18gb = {
  ...defaults,
  titleId: 'g18gb', title: '18GB', subtitle: 'Railways of Great Britain', designer: 'Dave Berry',
  location: 'Great Britain', minPlayers: 2, maxPlayers: 6,
  bankCash: 99999, startingCash: { 2: 500, 3: 400, 4: 350, 5: 300, 6: 250 },
  certLimit: { 2: 20, 3: 16, 4: 14, 5: 12, 6: 10 },
  currencyFormat: '£', capitalization: 'full', floatPercent: 40, sellBuyOrder: 'sell_buy',
  marketShareLimit: 100,

  // 5-share corporations: shares = [40, 20, 20, 20] for 5-share; converts to 10-share later
  shares: [40, 20, 20, 20],

  market: [
    ['50b','55b','60b','65b','70p','75p','80p','90p','100p','115','130','145','160','180','200','220','240','265','290','320','350e','380e'],
  ],

  phases: [
    { name: '2+1', trainLimit: { '5share': 3, '10share': 4 }, tiles: ['yellow'], operatingRounds: 2 },
    { name: '3+1', on: '3+1', trainLimit: { '5share': 3, '10share': 4 }, tiles: ['yellow','green'], operatingRounds: 2 },
    { name: '4+2', on: '4+2', trainLimit: { '5share': 2, '10share': 3 }, tiles: ['yellow','green','blue'], operatingRounds: 2 },
    { name: '5+2', on: '5+2', trainLimit: { '5share': 2, '10share': 3 }, tiles: ['yellow','green','blue','brown'], operatingRounds: 2 },
    { name: '4X', on: '4X', trainLimit: 2, tiles: ['yellow','green','blue','brown'], operatingRounds: 2 },
    { name: '5X', on: '5X', trainLimit: 2, tiles: ['yellow','green','blue','brown'], operatingRounds: 2 },
    { name: '6X', on: '6X', trainLimit: 2, tiles: ['yellow','green','blue','brown','gray'], operatingRounds: 2 },
  ],

  trains: [
    { name: '2+1', distance: 2, price: 80, rustsOn: '4+2', num: 8 },
    { name: '3+1', distance: 3, price: 200, rustsOn: '4X', num: 5 },
    { name: '4+2', distance: 4, price: 300, rustsOn: '6X', num: 4 },
    { name: '5+2', distance: 5, price: 500, num: 3 },
    { name: '4X', distance: 4, price: 550, num: 3 },
    { name: '5X', distance: 5, price: 650, num: 2, availableOn: '4X' },
    { name: '6X', distance: 6, price: 700, num: 99, availableOn: '5X', events: ['remove_unstarted'] },
  ],

  corporations: [
    { sym: 'CR', name: 'Caledonian Railway', tokens: [0,20], color: '#0a70b3', coordinates: 'G4' },
    { sym: 'GER', name: 'Great Eastern Railway', tokens: [0,20], color: '#37b2e2', coordinates: 'J25' },
    { sym: 'GSWR', name: 'Glasgow & South Western Railway', tokens: [0,20], color: '#ec767c', coordinates: 'F5' },
    { sym: 'GWR', name: 'Great Western Railway', tokens: [0,20], color: '#008f4f', coordinates: 'D23' },
    { sym: 'LNWR', name: 'London & North Western Railway', tokens: [0,20], color: '#0a0a0a', coordinates: 'F21' },
    { sym: 'LSWR', name: 'London & South Western Railway', tokens: [0,20], color: '#fcea18', textColor: '#000', coordinates: 'D25' },
    { sym: 'LYR', name: 'Lancashire & Yorkshire Railway', tokens: [0], color: '#baa4cb', coordinates: 'H15' },
    { sym: 'MR', name: 'Midland Railway', tokens: [0,20], color: '#dd0030', coordinates: 'H19' },
    { sym: 'MSLR', name: 'Manchester, Sheffield & Lincolnshire Railway', tokens: [0], color: '#881a1e', coordinates: 'H17' },
    { sym: 'NBR', name: 'North British Railway', tokens: [0,20], color: '#eb6f0e', coordinates: 'I6' },
    { sym: 'NER', name: 'North Eastern Railway', tokens: [0,20], color: '#7bb137', coordinates: 'J13' },
    { sym: 'SWR', name: 'South Wales Railway', tokens: [0,20], color: '#9a9a9d', coordinates: 'A20' },
  ],

  pregame: [{ id: 'auction', label: 'Private Auction', type: 'waterfall' }],

  companies: [
    { sym: 'LB', name: 'London & Birmingham', value: 40, revenue: 10, desc: 'Blocks Birmingham while open. Priority to start LNWR.' },
    { sym: 'AF', name: 'Arbroath & Forfar', value: 30, revenue: 10, desc: 'Extra tile action in Perth. Blocks K2 while open.' },
    { sym: 'GN', name: 'Great Northern', value: 70, revenue: 25, desc: 'Extra station token in York. Blocks I18 while open.' },
    { sym: 'SD', name: 'Stockton & Darlington', value: 35, revenue: 12, desc: '£10 bonus for Middlesbrough. Blocks I12 while open.' },
    { sym: 'LM', name: 'Liverpool & Manchester', value: 45, revenue: 15, desc: '£30 bonus for Liverpool. Blocks F15 while open.' },
    { sym: 'LS', name: 'Leicester & Swannington', value: 30, revenue: 10, desc: 'Extra tile action in Leicester. Blocks H21 while open.' },
    { sym: 'TV', name: 'Taff Vale', value: 60, revenue: 25, desc: 'Waive cost of Severn Tunnel tile. Blocks C20 while open.' },
    { sym: 'MC', name: 'Maryport & Carlisle', value: 50, revenue: 20, desc: 'Extra station token in Carlisle. Blocks G10 while open.' },
    { sym: 'CH', name: 'Chester & Holyhead', value: 30, revenue: 10, desc: '£20 bonus for Holyhead. Blocks E16 while open.' },
  ],
}
