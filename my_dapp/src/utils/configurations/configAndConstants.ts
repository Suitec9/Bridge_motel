
// ============================================================================
// CONFIGURATION AND CONSTANTS
// ============================================================================

export const EERC20_CONFIG = {
  CIRCUITS: {
    REGISTRATION: {
      name: 'eerc20_registration',
      publicSignals: 5,
      constraints: 1000, // Approximate
      description: 'User registration with key verification'
    },
    TRANSFER: {
      name: 'eerc20_transfer',
      publicSignals: 5,
      constraints: 2000,
      description: 'Encrypted token transfer'
    },
    BALANCE: {
      name: 'eerc20_balance',
      publicSignals: 3,
      constraints: 800,
      description: 'Balance proof without revelation'
    },
    MINT: {
      name: 'eerc20_mint',
      publicSignals: 3,
      constraints: 1200,
      description: 'Authorized token minting'
    },
    BURN: {
      name: 'eerc20_burn',
      publicSignals: 4,
      constraints: 1500,
      description: 'Token burning with proof'
    },
    DEPOSIT: {
      name: 'eerc20_deposit',
      publicSignals: 4,
      constraints: 885,
      description: 'Deposit token into encrypted token'
    }
  },
  GAS_LIMITS: {
    REGISTRATION: 500000,
    TRANSFER: 800000,
    BALANCE_PROOF: 300000,
    MINT: 600000,
    BURN: 700000
  },
  FIELD_SIZE: '21888242871839275222246405745257275088548364400416034343698204186575808495617'
};

