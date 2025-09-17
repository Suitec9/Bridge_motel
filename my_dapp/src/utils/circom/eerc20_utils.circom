// ============================================================================================
// 6. UTILITY CIRCUITS
// ============================================================================================
/**
 * Utility templates for eERC20 operations
 */
pragma circom 2.1.9;

include "circomlib/circuits/eddsaposeidon.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

// Template for range proofs (prove value is within range)
template RangeProof(n) {
    signal input value;
    signal input minValue;
    signal input maxValue;
    signal output valid;
    
    component minCheck = GreaterEqThan(n);
    component maxCheck = LessThan(n);
    
    minCheck.in[0] <== value;
    minCheck.in[1] <== minValue;
    maxCheck.in[0] <== value;
    maxCheck.in[1] <== maxValue + 1; // LessThan is strict
    
    valid <== minCheck.out * maxCheck.out;
}

// Template for commitment verification
template CommitmentVerify() {
    signal input value;
    signal input secretKey;
    signal input randomness;
    signal input commitment;
    signal output valid;
    
    component poseidon = Poseidon(3);
    poseidon.inputs[0] <== value;
    poseidon.inputs[1] <== secretKey;
    poseidon.inputs[2] <== randomness;
    
    component isEqual = IsEqual();
    isEqual.in[0] <== poseidon.out;
    isEqual.in[1] <== commitment;
    
    valid <== isEqual.out;
}

// Template for EdDSA signature verification in circuits
template EdDSAVerifyCustom() {
    signal input publicKeyX;
    signal input publicKeyY;
    signal input signatureR8x;
    signal input signatureR8y;
    signal input signatureS;
    signal input message;
    signal output valid;
    
    component verifier = EdDSAPoseidonVerifier();
    verifier.enabled <== 1;
    verifier.Ax <== publicKeyX;
    verifier.Ay <== publicKeyY;
    verifier.R8x <== signatureR8x;
    verifier.R8y <== signatureR8y;
    verifier.S <== signatureS;  // Fixed typo: was "signatueS"
    verifier.M <== message;
    
    valid <== 1; // Will constraint fail if signature invalid
}

// Template for encrypted amount verification
template EncryptionVerify() {
    signal input plaintext;
    signal input recipientKey;
    signal input randomness;
    signal input ciphertext;
    signal output valid;
    
    // Simplified encryption using Poseidon
    // In production, use proper FHE schemes
    component poseidon = Poseidon(3);
    poseidon.inputs[0] <== plaintext;
    poseidon.inputs[1] <== recipientKey;
    poseidon.inputs[2] <== randomness;
    
    component isEqual = IsEqual();
    isEqual.in[0] <== poseidon.out;
    isEqual.in[1] <== ciphertext;
    
    valid <== isEqual.out;
}