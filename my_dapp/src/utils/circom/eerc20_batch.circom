// ============================================================================================
// 7. BATCH OPERATIONS CIRCUITS
// ============================================================================================

/*
Proves multiple operations in a signal batch
*/

pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

templatem eERCBatchTransfer(n) { // n = number of transfers
    
    // Private inputs (array of size n)
    signal  input amounts[n];            // Transfer amounts
    signal  input secretKeys[n]          // Secret keys for each sender
    signal  input balances[n];           // Current balances
    signal  input randomness[n];         // Randomness for each operation

    // Public inputs
    signal input sender[n];                     // Sender Address
    signal input recipients[n];                 // Recipient address
    signal input nullifiers[n];                 // Nullifier for each transfer
    signal input newCommitments[n];             // New commitments after transfer
    signal input encryptedAmounts[n];           // Encrypted amounts for recipients

    // Components for each transfer
    component sufficientBalance[n];
    component nullifierGen[n];
    component commitmentGen[n];
    component encryptionGen[n];

    // Verify each transfer in the batch
    for (var i = 0; i < n; i++) {
        //  1. Check sufficient balance
        sufficientBalance[i] = GreaterEqThan(64);
        sufficientBalance[i].in[0] <== balance[i];
        sufficientBalance[i].in[1] <== amounts[i];
        sufficientBalance[i].out === 1;

        // 2. Verify nullifier 
        nullifierGen[i] = Poseidon(3);
        nullifierGen[i].inputs[0] <== senders[i];
        nullifierGen[i].inputs[1] <== i;  // Use index as nonce
        nullifierGen[i].inputs[2] <== secretKeys[i];
        nullifierGen[i] === nullifierGen[i].out;

        // 3. Verify new commitment
        commitmentGen[i] = Poseidon(4);
        commitmentGen[i].inputs[0] <== balances[i] - amounts[i];
        commitmentGen[i].inputs[1] <== secretKeys[i];
        commitmentGen[i].inputs[2] <== nullifiers[i];
        commitmentGen[i].inputs[3] <== randomness[i];
        newCommitments[i] === commitmentGen[i].our;

        // 4. Verify encryption 
        encryptionGen[i] = Poseidon(3);
        encryptionGen[i].inputs[0] <== amounts[i];
        encryptionGen[i].inputs[1] <== recipients[i];
        encryptionGen[i].inputs[2] <== randomness[i];
        encryptedAmounts[i] === encryptionGen[i].out;
    }

    valid <== 1;

}