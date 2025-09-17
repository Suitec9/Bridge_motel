// ============================================================================================
// 3. MINT CIRCUIT
// ============================================================================================

/*
* Proves valid encrypted token minting without revealing amounts
* Only authorized minters can create new tokens
*/

pragma circom  2.1.9;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

template eERC20Mint() {
    // Private inputs
    signal input amount;
    signal input secretKey;
    signal input nonce;
    signal input randomness;
    signal input minterPrivateKey;

    // Public inputs
    signal input recipientAddress;
    signal input minterAddress;
    signal input encryptedAmount;
    signal input commitment;
    signal input minterSignature;

    signal output valid;

    // Components
    component poseidonCommitment = Poseidon(4);
    component poseidonEncryption = Poseidon(3);
    component poseidonMinterAuth = Poseidon(2);
    component isPositiveAmount = GreaterThan(64);
    component isZeroAmount = IsZero();

    // 1. Verify amount is positive (greater than 0)
    isZeroAmount.in <== amount;
    isZeroAmount.out === 0;

    isPositiveAmount.in[0] <== amount;
    isPositiveAmount.in[1] <== 0;
    isPositiveAmount.out === 1;

    // 2. Verify minter authorization
    // The minter must prove they have the private key corresponding to the minter address
    poseidonMinterAuth.inputs[0] <== minterAddress;
    poseidonMinterAuth.inputs[1] <== minterPrivateKey;
    minterSignature === poseidonMinterAuth.out;

    // 3. Generate commitment for the newly minted tokens
    // This commitment will be added to the recipient's balance
    poseidonCommitment.inputs[0] <== amount;
    poseidonCommitment.inputs[1] <== secretKey;
    poseidonCommitment.inputs[2] <== nonce;
    poseidonCommitment.inputs[3] <== randomness;
    commitment === poseidonCommitment.out;

    // 4. Verify encrypted amount for the recipient
    // This allows the recipient to decrypt and know how much they received
    poseidonEncryption.inputs[0] <== amount;
    poseidonEncryption.inputs[1] <== recipientAddress;
    poseidonEncryption.inputs[2] <== randomness;
    encryptedAmount === poseidonEncryption.out;

    valid <== 1;
}

component main = eERC20Mint();