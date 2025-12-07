import twilioService from './twilioService.js';  // ✅ CORRECT - same directory

class StateService {
  constructor() {
    this.stateAreaCodes = {
      'Alabama': ['205', '251', '256', '334'],
      'Alaska': ['907'],
      'Arizona': ['480', '520', '602', '623', '928'],
      'Arkansas': ['479', '501', '870'],
      'California': ['209', '213', '310', '323', '408', '415', '424', '510', '530', '559', '562', '619', '626', '650', '657', '661', '707', '714', '725', '747', '805', '818', '831', '858', '909', '916', '925', '949', '951'],
      'Colorado': ['303', '719', '720', '970'],
      'Connecticut': ['203', '860'],
      'Delaware': ['302'],
      'Florida': ['305', '321', '352', '386', '407', '561', '727', '754', '772', '786', '813', '850', '904', '941', '954'],
      'Georgia': ['229', '404', '470', '478', '678', '706', '762', '770', '912'],
      'Hawaii': ['808'],
      'Idaho': ['208', '986'],
      'Illinois': ['217', '224', '309', '312', '331', '618', '630', '708', '773', '779', '815', '847', '872'],
      'Indiana': ['219', '260', '317', '463', '574', '765', '812', '930'],
      'Iowa': ['319', '515', '563', '641', '712'],
      'Kansas': ['316', '620', '785', '913'],
      'Kentucky': ['270', '364', '502', '606', '859'],
      'Louisiana': ['225', '318', '337', '504', '985'],
      'Maine': ['207'],
      'Maryland': ['240', '301', '410', '443', '667'],
      'Massachusetts': ['339', '351', '413', '508', '617', '774', '781', '857'],
      'Michigan': ['231', '248', '269', '313', '517', '586', '616', '734', '810', '906', '947', '989'],
      'Minnesota': ['218', '320', '507', '612', '651', '763', '952'],
      'Mississippi': ['228', '601', '662', '769'],
      'Missouri': ['314', '417', '573', '636', '660', '816'],
      'Montana': ['406'],
      'Nebraska': ['308', '402', '531'],
      'Nevada': ['702', '725', '775'],
      'New Hampshire': ['603'],
      'New Jersey': ['201', '551', '609', '732', '848', '856', '862', '908', '973'],
      'New Mexico': ['505', '575'],
      'New York': ['212', '315', '332', '347', '516', '518', '585', '607', '631', '646', '680', '718', '838', '845', '914', '917', '929', '934'],
      'North Carolina': ['252', '336', '704', '743', '828', '910', '919', '980', '984'],
      'North Dakota': ['701'],
      'Ohio': ['216', '220', '234', '283', '330', '380', '419', '440', '513', '567', '614', '740', '937'],
      'Oklahoma': ['405', '539', '572', '580', '918'],
      'Oregon': ['458', '503', '541', '971'],
      'Pennsylvania': ['215', '223', '267', '272', '412', '445', '484', '570', '610', '717', '724', '814', '878'],
      'Rhode Island': ['401'],
      'South Carolina': ['803', '843', '854', '864'],
      'South Dakota': ['605'],
      'Tennessee': ['423', '615', '629', '731', '865', '901', '931'],
      'Texas': ['210', '214', '254', '281', '325', '346', '361', '409', '430', '432', '469', '512', '682', '713', '726', '737', '806', '817', '830', '832', '903', '915', '936', '940', '956', '972', '979'],
      'Utah': ['385', '435', '801'],
      'Vermont': ['802'],
      'Virginia': ['276', '434', '540', '571', '703', '757', '804'],
      'Washington': ['206', '253', '360', '425', '509'],
      'West Virginia': ['304', '681'],
      'Wisconsin': ['262', '274', '414', '534', '608', '715', '920'],
      'Wyoming': ['307']
    };
  }

  // Get all 50 US states
  getAllStates() {
    return Object.keys(this.stateAreaCodes).map(state => ({
      name: state,
      areaCodes: this.stateAreaCodes[state]
    }));
  }

  // Get area codes for a specific state
  getStateAreaCodes(stateName) {
    return this.stateAreaCodes[stateName] || [];
  }

  // Search for ONE available number in a state (random area code)
  async searchNumberForState(stateName) {
    const areaCodes = this.getStateAreaCodes(stateName);
    
    if (areaCodes.length === 0) {
      throw new Error(`No area codes found for state: ${stateName}`);
    }

    // Shuffle area codes for random selection
    const shuffled = [...areaCodes].sort(() => Math.random() - 0.5);

    // Try each area code until we find an available number
    for (const areaCode of shuffled) {
      try {
        const numbers = await twilioService.searchAvailableNumbers(areaCode, 1);
        if (numbers.length > 0) {
          return {
            state: stateName,
            areaCode: areaCode,
            number: numbers[0]
          };
        }
      } catch (error) {
        console.log(`No numbers available for ${stateName} in area code ${areaCode}`);
        continue;
      }
    }

    throw new Error(`No available numbers found for ${stateName} in any area code`);
  }

  // Search for numbers in multiple states (for bulk purchase)
  async searchNumbersForStates(stateNames) {
    const results = {
      success: [],
      failed: []
    };

    for (const stateName of stateNames) {
      try {
        const result = await this.searchNumberForState(stateName);
        results.success.push(result);
      } catch (error) {
        results.failed.push({
          state: stateName,
          error: error.message
        });
      }
    }

    return results;
  }
}

export default new StateService();