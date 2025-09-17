// ============================================================================================
// 3. BALANCE PROOF CIRCUIT
// ============================================================================================

/*
Proves minimum balance without revealing actual balance
*/

pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

template eERC20BalanceProof() {
    // Private inputs
    signal input actualBalance;     // User's actual balance
    signal input secretKey;         // User's secret key
    signal input randomness;        // Randomness for commitment
 
    // Public inputs
    signal input userAddress;               // User's address
    signal input minRequiredBalance;        // Minimum required balance
    signal input commitment;                // Commitment to actual balance

    signal output valid;

    // Components
    component poseidonCommitment = Poseidon(4);
    component balanceCheck = GreaterEqThan(64);
    component maxBalanceCheck = LessThan(64);
    component actualBalanceBits = Num2Bits(64);
    component minBalancBits = Num2Bits(64);

    // 1. Convert balance to bits for comparison
    actualBalanceBits.in <== actualBalance;
    minBalancBits.in <== minRequiredBalance;

    // 2. Verify actual balance is greater than or equal to minimum required balance
    balanceCheck.in[0] <== actualBalance;
    balanceCheck.in[1] <== minRequiredBalance;
    balanceCheck.out === 1;

    // 3. Verify actual balance is within reasonable limits (prevent overflow)
    // Maximum is 2 ^ 63 - 1 to stay within safe integer range
    maxBalanceCheck.in[0] <== actualBalance;
    maxBalanceCheck.in[1] <== 9223372036854775807;
    maxBalanceCheck.out === 1;

    // 4. Verify commitment to actual amount
    // Commitment = Poseidon(actualBalance, secretKey, userAddress, randomness)
    poseidonCommitment.inputs[0] <== actualBalance;
    poseidonCommitment.inputs[1] <== secretKey;
    poseidonCommitment.inputs[2] <== userAddress;
    poseidonCommitment.inputs[3] <== randomness;
    commitment === poseidonCommitment.out;

    // 5. Set valid output to 1 if all checks pass
    valid <== 1;
}


component main { 
    public [ 
        userAddress, 
        minRequiredBalance, 
        commitment 
        ] } = eERC20BalanceProof();