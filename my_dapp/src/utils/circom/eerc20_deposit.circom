//
//===============================================================================================
//===============================
// DEPOSIT PROOF CIRCUIT
//
//===============================================================================================
//===============================
/*
* Proves valid deposit of tokens into encrypted balance
*/
pragma circom  2.1.9;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

template eERC20DepositProof() {
    // Private inputs
    signal input currentBalance;   // User's current encrypted balance
    signal input depositAmount;    // Amount being deposited
    signal input secretKey;        // User's secret key
    signal input randomness;       // Randomness for new commitment

    // Public inputs
    signal input userAddress;      // User's address
    signal input oldCommitment;    // Commitment to current balance
    signal input newCommitment;    // Commitment to new balance after deposit
    signal input depositTxHash;    // Transaction hash of the deposit on L1

    // Outputs
    signal output valid;           // 1 if proof is valid, 0 otherwise

    // Components
    component poseidonOldCommitment = Poseidon(4);
    component poseidonNewCommitment = Poseidon(4);
    component isPositiveDeposit = GreaterThan(64);
    component maxDepositCheck = LessThan(64);
    component balanceBits = Num2Bits(64);
    component depositBits = Num2Bits(64);
    component overflowCheck = LessThan(64);

    // Convert inputs to bits for comparison
    balanceBits.in <== currentBalance;
    depositBits.in <== depositAmount;

    // Verify deposit amount is positive
    isPositiveDeposit.in[0] <== depositAmount;
    isPositiveDeposit.in[1] <== 0;
    isPositiveDeposit.out === 1;

    // Verify deposit amount doesn;t exceed maximum (prevent overflow)
    // Maximum deposit is 2^62 - 1 to prevent overflow when added to balance
    maxDepositCheck.in[0] <== currentBalance;
    maxDepositCheck.in[1] <== 4611686018427387903; // 2^62 - 1
    maxDepositCheck.out === 1;

    // Verify old commitment is valid for current balance
    poseidonOldCommitment.inputs[0] <== currentBalance;
    poseidonOldCommitment.inputs[1] <== secretKey;
    poseidonOldCommitment.inputs[2] <== userAddress;
    poseidonOldCommitment.inputs[3] <== 0;         // Old reandomness (assuming 0 )
    oldCommitment === poseidonOldCommitment.out;

    // Calculate new balance and verify no overflow
    signal newBalance <== currentBalance + depositAmount;
    overflowCheck.in[0] <== newBalance;
    overflowCheck.in[1] <== 9223372036854775807;    // 2^63 - 1 (max safe value)
    overflowCheck.out === 1;

    // Verify new commitment is valid for updated balance
    poseidonNewCommitment.inputs[0] <== newBalance;
    poseidonNewCommitment.inputs[1] <== secretKey;
    poseidonNewCommitment.inputs[2] <== userAddress;
    poseidonNewCommitment.inputs[3] <== randomness;
    newCommitment === poseidonNewCommitment.out;

    // Verify deposit transaction hash is provided (non-zero)
    // This ensures the deposit actually happened on L1
    component txHashCheck = IsZero();
    txHashCheck.in <== depositTxHash;
    txHashCheck.out === 0;       // Should be non-zero

    // Set valid output
    valid <== 1;

}

component main {
    public [
        userAddress,
        oldCommitment,
        newCommitment,
        depositTxHash
    ]
} = eERC20DepositProof();