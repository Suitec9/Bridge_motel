pragma circom 2.1.9;

 include "circomlib/circuits/eddsaposeidon.circom";
 include "circomlib/circuits/poseidon.circom";
 include "circomlib/circuits/bitify.circom";
 include "circomlib/circuits/comparators.circom";


template eERC20Registration() {
    // Private inputs (not revealed)
    signal input secretKey; // User's secret key
    signal input randomness; // Randomness for commitment
    
    // Public inputs (revealed on-chain)
    signal input userAddress; // Ethereum address field
    signal input chainId; // Chain identifier
    signal input publicKeyX; // Public key X coordinate
    signal input publicKeyY; // Public key Y coordinate
    signal input commitment; // Commitment to registration data
    
    // Outputs
    signal output valid; // 1 if proof is valid, 0 otherwise
    
    // Define the base point for Baby Jubjub curve (generator point)
    var BASE[2] = [
        5299619240641551281634865583518297030282874472190772894086521144482721001553,
        16950150798460657717958625567821834550301663161624707787222815936182638968203
    ];
    
    // Components
    component poseidon = Poseidon(5);
    component secretToPublic = EscalarMulFix(254, BASE);
    component secretKeyBits = Num2Bits(254);  // Convert secret key to binary

    // 1. Convert secret key to binary format (required by EscalarMulFix)
    secretKeyBits.in <== secretKey;

    // 2. Verify public key corresponds to secret key
    // This uses proper EdDSA point multiplication
    for (var i = 0; i < 254; i++) {
        secretToPublic.e[i] <== secretKeyBits.out[i];
    }

    publicKeyX === secretToPublic.out[0];
    publicKeyY === secretToPublic.out[1];
    
    //  Verify commitment
    poseidon.inputs[0] <== publicKeyX;
    poseidon.inputs[1] <== publicKeyY;
    poseidon.inputs[2] <== userAddress;
    poseidon.inputs[3] <== chainId;
    poseidon.inputs[4] <== randomness;
    commitment === poseidon.out;
    
    // 3. Ensure chain ID is valid (non-zero)
    component chainIdCheck = IsZero();
    chainIdCheck.in <== chainId;
    chainIdCheck.out === 0;
    
    // Set valid output to 1 if all checks pass
    valid <== 1;
}

component main { 
    public [ 
        userAddress, 
        chainId, 
        publicKeyX, 
        publicKeyY, 
        commitment 
        ] 
        } = eERC20Registration();