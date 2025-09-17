
// ============================================================================================
// 2. TRANSFER CIRCUIT
// ===========================================================================================

/*
Proves valid encrypted token transfer without revealing amounts or balances
*/

pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

template eERC20Transfer() {
    // Private inputs
    signal input balance;
    signal input amount;
    signal input secretKey;
    signal input nonce;
    signal input randomness;

    // Public inputs
    signal input senderAddress;
    signal input recipientAddress;
    signal input encryptedAmount;
    signal input nullifier;
    signal input newCommitment;
    
    signal output valid;

    // Components
    component poseidonNullifier = Poseidon(3);
    component poseidonCommitment = Poseidon(4);
    component poseidonEncryption = Poseidon(3);
    component sufficientBalance = GreaterEqThan(64);
    component isZeroAmount = IsZero();

    // 1. Check sender has sufficient balance
    sufficientBalance.in[0] <== balance;
    sufficientBalance.in[1] <== amount;
    sufficientBalance.out === 1;

    // 2. Check sender has sufficient balance
    isZeroAmount.in <== amount;
    isZeroAmount.out === 0;

    // 3. Verify nullifier is correctly generated
    poseidonNullifier.inputs[0] <== senderAddress;
    poseidonNullifier.inputs[1] <== nonce;
    poseidonNullifier.inputs[2] <== secretKey;
    nullifier === poseidonNullifier.out;

    // 4. Verify new commitment for remaining balance
    signal newBalance <== balance - amount;
    poseidonCommitment.inputs[0] <== newBalance;
    poseidonCommitment.inputs[1] <== secretKey;
    poseidonCommitment.inputs[2] <== nullifier;
    poseidonCommitment.inputs[3] <== randomness;
    newCommitment === poseidonCommitment.out;

    // 5. Verify encrypted amount for recipient
    poseidonEncryption.inputs[0] <== amount;
    poseidonEncryption.inputs[1] <== recipientAddress;
    poseidonEncryption.inputs[2] <== randomness;
    encryptedAmount === poseidonEncryption.out;

    valid <== 1;
}

component main = eERC20Transfer();