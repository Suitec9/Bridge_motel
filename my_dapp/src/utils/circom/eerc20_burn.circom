// ============================================================================================
// 5. BURN PROOF CIRCUIT
// ============================================================================================

/*
Proves valid burning of encrypted tokens
*/

pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

template eERC20BurnProof() {
    // Private inputs
    signal input balance;         // User's current balance
    signal input burnAmount;      // Amount to burn
    signal input secretKey;       // User's secret key
    signal input nonce;           // Transaction nonce
    signal input randomness;       // Randomness for commitment

    // Public inputs
    signal input userAddress;             // User's address
    signal input nullifier;               // Nullifier to prevent double-spending
    signal input newCommitment;            // New commitment after burn

    signal output valid; 

    // Components
    component poseidonNullifier = Poseidon(3);
    component poseidonCommitment = Poseidon(4);
    component sufficientBalance = GreaterEqThan(64);
    component isPositiveBurn = GreaterThan(64);
    component balanceBits = Num2Bits(64);
    component burnBits = Num2Bits(64);

    // Convert inputs to bits for comparison
    balanceBits.in <== balance;
    burnBits.in <== burnAmount;

    // 1. Check user has sufficient balance to burn
    sufficientBalance.in[0] <== balance;
    sufficientBalance.in[1] <== burnAmount;
    sufficientBalance.out === 1;

    // 2. Check burn amount is positive
    isPositiveBurn.in[0] <== burnAmount;
    isPositiveBurn.in[1] <== 0;
    isPositiveBurn.out === 1;

    // 3. Verify nullifier (prevent double-spending)
    poseidonNullifier.inputs[0] <== userAddress;
    poseidonNullifier.inputs[1] <== nonce;
    poseidonNullifier.inputs[2] <== secretKey;
    nullifier === poseidonNullifier.out;

    // 4. Verify new commitment for remaining balance
    signal newBalance <== balance - burnAmount;
    poseidonCommitment.inputs[0] <== newBalance;
    poseidonCommitment.inputs[1] <== secretKey;
    poseidonCommitment.inputs[2] <== userAddress;
    poseidonCommitment.inputs[3] <== randomness;
    newCommitment === poseidonCommitment.out;

    // 5. Set valid output
    valid <== 1;

}

component main {
    public [
        userAddress, 
        nullifier,
        newCommitment 
    ]
} = eERC20BurnProof();