// Production ZK Proof Implementation for eERC20 Integration
// Supports Fhenix FHE and other encrypted smart contract platforms

import {  babyJub, poseidon } from "@iden3/js-crypto";
import { buildBabyjub, buildPedersenHash } from "circomlibjs"
import { ethers } from "ethers";
import { loadZKLibraries } from "../../lib/zkLoader";
import { sign } from "crypto";
import { localConfig } from "@/hooks/config/bridge_Networkish";
import { derivePublicKey, generateSecretKetFromSignature, provider_, validatePrivateKey } from "@/hooks/config/configs";

//import { CircomWasm, CircomKey } from "@types/snarkjs";

export interface ProofPoints {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
}

export interface RegisterProof {
    proofPoints: ProofPoints;
    publicSignals: [string, string, string, string, string] // [pubKeyX, pubKeY, address, chainId, registrationHash]
}

export interface TransferProof {
    proofPoints: ProofPoints;
    publicSignals: string[];
}

export interface WithdrawProof {
    proofPoints: ProofPoints;
    publicSignals: string[];
}

export interface BurnProof {
    proofPoints: ProofPoints;
    publicSignals: string[];
}

export interface MintProof {
    proofPoints: ProofPoints;
    publicSignals: string[];
}

// ElGamal ciphertext (two curve points)
export type CipherText = [string, string]; // [C1, C2]

// PCT = Pedersen Commitment (7-element array for homorphic properties)
export type BalancePCT = [string, string, string, string, string, string, string];

interface EGCT {
    c1x: string;
    c1y: string;
    c2x: string;
    c2y: string;
}

interface AmountPCT {
    pct: [ string, string, string, string, string, string, string];
    timestamp: number;
}
//////////////////////////////////////////////////////////////
// CIRCUITS INPUTS TYPES
//////////////////////////////////////////////////////////////

export interface RegistrationCircuitInputs {
    // Private inputs
    SenderPrivateKey: bigint;
    SenderPublicKey: [bigint, bigint];

    // Public inputs
    SenderAddress: bigint;
    ChainID: bigint;
    RegistrationHash: any;
}

export interface TranferCircuitInputs {
    // Private inputs
    // Value and sender info
    ValueToTransfer: string;
    SenderPrivateKey: string;
    SenderPublicKey: [string, string];
    SenderBalance: string;

    // Sender's encrypted balance (ElGamal)
    SenderBalanceC1: [string, string];
    SenderBalanceC2: [string, string];
    
    // Sender's encrypted value to transfer
    SenderVTTC1: [string, string];
    SenderVTTC2: [string, string];

    // Receiver info
    ReceiverPublicKey: [string, string];
    ReceiverVTTC1: [string, string];
    ReceiverVTTC2: [string, string];
    ReceiverVTTRandom: string;

    // Receiver PCT (Pedersen Commitment)
    ReceiverPCT: BalancePCT;
    ReceiverPCTAuthKey: string;
    ReceiverPCTNonce: string;
    ReceiverPCTRandom: string;

    // Auditor info
    AuditorPublicKey: [string, string];
    AuditorPCT: BalancePCT;
    AuditorPCTAuthKey: string;
    AuditorPCTNonce: string;
    AuditorPCTRandom: string;
}

export interface WitdrawCircuitInputs {
    // Private inputs
    ValueToWithdraw: string;
    SenderPrivateKey: string;
    SenderPublicKey: [string, string];
    SenderBalance: string;

    // Sender's encrypted balance
    SenderBalanceC1: [string,string];
    SenderBalanceC2: [string, string];

    // Auditor info
    AuditorPublicKey: [string, string];
    AuditorPCT: BalancePCT;
    AuditorPCTAuthKey: string;
    AuditorPCTNonce: string;
    AuditorPCTRandom: string;
}

export interface BurnCircuitInputs {
    ValueToBurn: string;
    SenderPrivateKey: string;
    SenderPublicKey: [string, string];
    SenderBalance: string;

    // Sender's encrypted balance
    SenderBalanceC1: [string, string];
    SenderBalanceC2: [string, string];

    // Sender's encrypted burn value
    SenderVTBC1: [string, string];
    SenderVTBC2: [string, string];

    // Auditor info
    AuditorPublicKey: [string, string];
    AuditorPCT: BalancePCT;
    AuditorPCTAuthKey: string,
    AuditorPCTNonce: string;
    AuditorPCTRandom: string;
}

export interface MintCircuitInputs {
    // Private inputs
    ValueToMint: string;
    ChainId: string;
    NullifierHash: string;

    // Reciever info
    ReceiverPublicKey: [string, string];
    ReceiverVTTC1: [string, string];
    ReceiverVTTC2: [string, string];
    ReceiverVTTRandom: string;

    // Receiver PCT
    ReceiverPCT: BalancePCT;
    ReceiverPCTAuth: string;
    ReceiverPCTNonce: string;
    ReceiverPCTRandom: string;

    // Auditor info
    AuditorPublicKey: [string, string];
    AuditorPCT: BalancePCT;
    AuditorPCTAuthKey: string;
    AuditorPCTNonce: string;
    AuditorPCTRandom: string;
}

export interface CircuitFiles {
    wasmPath: string;
    zkeyPath: string;
    vkeyPath: string;
}

// Circuit configurations for different eERC20 operations
export const CIRCUIT_CONFIGS = {
    REGISTRATION: {
        name: 'eerc20_registration', 
        wasmPath: '/circom/build/eerc20_registration_js/eerc20_registration.wasm',//my_dapp/src/utils/circom/build/eerc20_registration_js 
        zkeyPath: '/circom/build/eerc20_registration_final.zkey', //my_dapp/src/utils/circom/build/eerc20_registration_final.zkey
        vkeyPath: '/circom/build/eerc20_registration.vkey.json', //my_dapp/src/utils/circom/build/eerc20_registration.vkey.json
        description: 'Proves user can register for encrypted token operation',
    }, 
    TRANSFER: {
        name: 'eerc20_transfer',
        wasmPath: '/circom/build/eerc20_transfer_js/eerc20_transfer.wasm',
        zkeyPath: '/circom/build/eerc20_transfer_final.zkey',
        vkeyPath: '/circom/build/eerc20_transfer.vkey.json',
        description: 'Process Valid encrypted token transfer',
    },
    WITHDRAW: {
        name: 'eerc20_withdraw',
        wasmPath: '/circom/build/eerc20_withdraw_js/eerc20_withdraw.wasm',
        zkeyPath: '/circom/build/eerc20_withdraw_final.zkey',
        vkeyPath: '/circom/build/eerc20_withdraw.vkey.json',
        description: 'Proves valid withdrawal of encrypted tokens',
    },
    BURN: {
        name: 'eerc20_burn',
        wasmPath: '/circom/build/eerc20_burn_js/eerc20_burn.wasm',
        zkeyPath: '/circom/build/eerc20_burn_final.zkey',
        vkeyPath: '/circom/build/eerc20_burn.vkey.json',
        description: 'Proves valid burning of encrypted tokens',
    },
    MINT: {
        name: 'eerc20_mint',
        wasmPath: '/circom/build/eerc20_mint_js/eerc20_mint.wasm',
        zkeyPath: '/circom/build/eerc20_mint_final.zkey',
        vkeyPath: '/circom/build/eerc20_mint.vkey.json',
        description: 'Proves valid minting of encrypted tokens',
    }

} as const;

export type CircuitType = keyof typeof CIRCUIT_CONFIGS;

export interface EncryptedBalance {
    C1: [string, string]; // First ciphertext component
    C2: [string, string]; // Second ciphertext component
}

const auditorAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
// Production ZK Proof Generator
export class eERC20ZKProofGenerator {
    private circuitFiles: Map<CircuitType, CircuitFiles>;
    private provider:ethers.providers.Provider;
    private babyJubJub: any;
    private pedersen: any;
    private auditorPublicKey: [string, string];

    constructor(provider: ethers.providers.Provider, auditorPublicKey?: [string, string]) {
        this.provider = provider;
        this.circuitFiles = new Map();
        this.babyJubJub = loadZKLibraries().then(baby => baby.buildBabyjub);
        this.pedersen = loadZKLibraries().then(per => per.buildPedersenHash);

        // Default auditor publicKey
        this.auditorPublicKey = auditorPublicKey || ["0", "0"];
            
        // Initialize circuit files
        Object.entries(CIRCUIT_CONFIGS).forEach(([key, config]) => {
            this.circuitFiles.set(key as CircuitType, {
                wasmPath: config.wasmPath,
                zkeyPath: config.zkeyPath,
                vkeyPath: config.vkeyPath
            });
        });
    }

    /**
     * Generate registration proof for eERC20 system
     */
    async generateRegisterationProof(
        userAddress: string,
        chainId: number,
        secretKey?: string
    ): Promise<RegisterProof> {
        const circuitFiles = this.circuitFiles.get('REGISTRATION');
        if (!circuitFiles) {
            throw new Error('Registration circuit not initialized');
        }

        try {
            // Generate or derive secret key
            const actualSecretKey = secretKey || await this.generateSecretKey(userAddress);
            
            // Verify private key
            const validKey = validatePrivateKey(actualSecretKey);
            if (!validKey.valid) {
                console.error("Private key validation failed:", validKey.errors);
                throw new Error(`Invalid private key: ${validKey.errors.join(', ')}`);
                
            }
            console.log("actual secret key:", actualSecretKey);

            // Derive public key from secret key (EdDSA/Baby JubJub)
            const  publicKey  = await this.derivePublicKey(actualSecretKey);
            console.log("public key derived:", publicKey);

            const isValid = await this.verifyKeyPair(actualSecretKey, [publicKey.pubKeyX, publicKey.pubKeyY]);

            if (!isValid) {
                throw new Error("key pair not valid");
            }

            const network = await this.provider.getNetwork();
            chainId = network.chainId;
            console.log("Chain ID:", network.chainId);

            // Convert address "string" to field element FIRST
            const addressFieldElement = this.addressToFieldElement(userAddress);
            console.log("address as field element:", addressFieldElement.toString());

            // Generate registration hash using Poseidon
            const registrationHash = await this.generateRegistrationHash(
                chainId,
                actualSecretKey,
                addressFieldElement
            );
            console.log("Registration Hash:", registrationHash);

            // Prepare circuit inputs - ALL as BigInts
            const inputs: RegistrationCircuitInputs = {
                // Private inputs
                SenderPrivateKey: BigInt(actualSecretKey),
                SenderPublicKey: [BigInt(publicKey.pubKeyX), BigInt(publicKey.pubKeyY)],

                // Public inputs
                SenderAddress: addressFieldElement,
                ChainID: BigInt(chainId),
                RegistrationHash: registrationHash
            };

            console.log("Circuit inputs: Prepared",{
                senderPrivateKey: inputs.SenderPrivateKey.toString(),
                SenderPublicKey: inputs.SenderPublicKey.toString(),
                SenderAddress: inputs.SenderAddress.toString(),
                ChainId: inputs.ChainID.toString(),
                RegistrationHash: inputs.RegistrationHash.toString()
            });

            const serializedInputs = this.prepareCircuitInputs(inputs);

            const response = await fetch('/api/generate-proof', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    circuitType: 'REGISTRATION',
                    inputs: serializedInputs,
                    wasmPath: CIRCUIT_CONFIGS.REGISTRATION.wasmPath,
                    zkeyPath: CIRCUIT_CONFIGS.REGISTRATION.zkeyPath,
                    vkeyPath: CIRCUIT_CONFIGS.REGISTRATION.vkeyPath
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Registration failed');
            }
            console.log("response ok");
            console.log("response:", response);

            const result = await response.json();
            console.log("result:", result);
            return this.formatRegisterProof(result.proof, result.publicSignals);
        } catch (error: any) {
            console.error('Registry proof failed', error);
            throw new Error(`Registration proof failed: ${error.message}`);
        }
    }

    /**
     *  Generate transfer proof for encrypted token transfers
     */
    async generateTransferProof(
        senderAddress: string,
        senderPrivateKey: string,
        senderBalance: string,
        senderEncryptedBalance: EncryptedBalance,
        recipientAddress: string,
        transferAmount: string
    ): Promise<{proof: TransferProof; balancePCT: BalancePCT}> {
        const circuitFiles = this.circuitFiles.get('TRANSFER');
        if (!circuitFiles) {
            throw new Error('Transfer circuit not initialized');
        }
        
        try {
            // Validate transfer is possible
            if (BigInt(transferAmount) > BigInt(senderBalance)) {
                throw new Error('Insufficient balance for transfer');
            }

            // Derive keys
            const senderPublicKey = await this.derivePublicKey(senderPrivateKey);
            const recipientPrivateKey = await this.generateSecretKey(recipientAddress);
            const recipientPublicKey = await this.derivePublicKey(recipientPrivateKey);
            const auditorPrivateKey = await this.generateSecretKey(auditorAddress);

            // Encrypted amount for sender and receiver
            const encryptedAmountSender = await this.encryptValue(transferAmount, {x: senderPublicKey.pubKeyX, y: senderPublicKey.pubKeyY});
            const encryptedAmountReceiverRandom = this.generateRandomness();
            const encryptedAmountReceiver = await this.encryptValue(transferAmount, {x: recipientPublicKey.pubKeyX, y: recipientPublicKey.pubKeyY}, encryptedAmountReceiverRandom);

            // Generate pedersen commitments for balance
            const receiverPCT = await this.generateBalancePCT(transferAmount, senderAddress);
            const receiverPCTAuthKey = this.generateRandomness();
            const receiverPCTNonce = this.generateRandomness();
            const receiverPCTRandom = this.generateRandomness();

            const auditorPCT = await this.generateBalancePCT(transferAmount, auditorPrivateKey);
            const auditorPCTAuthKey = this.generateRandomness();
            const auditorPCTNonce = this.generateRandomness();
            const auditorPCTRandom = this.generateRandomness();

            const inputs: TranferCircuitInputs = {
                ValueToTransfer: transferAmount,
                SenderPrivateKey: senderPrivateKey,
                SenderPublicKey: [senderPublicKey.pubKeyX, senderPublicKey.pubKeyY],
                SenderBalance: senderBalance,
                SenderBalanceC1: senderEncryptedBalance.C1,
                SenderBalanceC2: senderEncryptedBalance.C2,
                SenderVTTC1: encryptedAmountSender.C1,
                SenderVTTC2: encryptedAmountSender.C2,
                ReceiverPublicKey: [recipientPublicKey.pubKeyX, recipientPublicKey.pubKeyY],
                ReceiverVTTC1: encryptedAmountReceiver.C1,
                ReceiverVTTC2: encryptedAmountReceiver.C2,
                ReceiverVTTRandom: encryptedAmountReceiverRandom,
                ReceiverPCT: receiverPCT,
                ReceiverPCTAuthKey: receiverPCTAuthKey,
                ReceiverPCTNonce: receiverPCTNonce,
                ReceiverPCTRandom: receiverPCTRandom,
                AuditorPublicKey: this.auditorPublicKey,
                AuditorPCT: auditorPCT,
                AuditorPCTAuthKey: auditorPCTAuthKey,
                AuditorPCTNonce: auditorPCTNonce,
                AuditorPCTRandom: auditorPCTRandom
            };
            
            const response = await fetch('/api/generate-proof', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    circuitType: 'TRNASFER',
                    inputs: inputs,
                    wasmPath: CIRCUIT_CONFIGS.TRANSFER.wasmPath,
                    zkeyPath: CIRCUIT_CONFIGS.TRANSFER.zkeyPath,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'transfer proof failed');
            }
            const result = await response.json()
            const balancePCT = await this.generateBalancePCT(transferAmount, senderPrivateKey);
 
            return {
                proof: this.formatTransferProof(result.proof, result.publicSignals),
                balancePCT
            };
        } catch (error: any) {
            console.error('Transfer proof generation failed', error);
            throw new Error(`Transfer proof generation failed: ${error.message}`);
        }
    }

    /**
     * WITHDRAW PROOF
     */
    async generateWithdrawProof(
        userAddress: string,
        userPrivateKey: string,
        userBalance: string,
        userEncryptedBalance: EncryptedBalance,
        withdrawAmount: string
    ): Promise<{ proof: WithdrawProof, balancePCT: BalancePCT}> {
        try {
            if (BigInt(withdrawAmount) > BigInt(userBalance)) {
                throw new Error('Insufficient balance for withdrawl');
            }

            const userPublicKey = await this.derivePublicKey(userPrivateKey);

            // Generate auditor PCT
            const auditorPCT = await this.generateBalancePCT(withdrawAmount, userAddress);
            const auditorPCTAuthKey = this.generateRandomness();
            const auditorPCTNonce = this.generateRandomness();
            const auditorPCTRandom = this.generateRandomness();


            const inputs: WitdrawCircuitInputs = {
                ValueToWithdraw: withdrawAmount,
                SenderPrivateKey: userPrivateKey,
                SenderPublicKey: [userPublicKey.pubKeyX, userPublicKey.pubKeyY],
                SenderBalance: userBalance,
                SenderBalanceC1: userEncryptedBalance.C1,
                SenderBalanceC2: userEncryptedBalance.C2,
                AuditorPublicKey: this.auditorPublicKey,
                AuditorPCT: auditorPCT,
                AuditorPCTAuthKey: auditorPCTAuthKey,
                AuditorPCTNonce: auditorPCTNonce,
                AuditorPCTRandom: auditorPCTRandom
            }

            const response = await fetch('/api/generate-proof', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({
                    circuitType: 'WITHDRAW',
                    inputs,
                    wasmPath: CIRCUIT_CONFIGS.WITHDRAW.wasmPath,
                    zkeyPath: CIRCUIT_CONFIGS.WITHDRAW.zkeyPath
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Withdraw proof generation failed');
            }

            const result = await response.json();
            const newBalance = (BigInt(userBalance) - BigInt(withdrawAmount)).toString();
            const balancePCT = await this.generateBalancePCT(newBalance, auditorPCTRandom);

            return {
                proof: this.formatWithdrawProof(result.proof, result.publicSignals),
                balancePCT
            };
        } catch (error: any) {
            throw new Error(`Withdraw proof failed: ${error.message}`);
        }
    }

    /**
     * BURN PROOF
     */
    async generateBurnProof(
        userAddress: string,
        userPrivateKey: string,
        userBalance: string,
        userEncryptedBalance: EncryptedBalance,
        burnAmount: string
    ): Promise<{ proof: BurnProof; balancePCT: BalancePCT}> {
        
        try {
            if (BigInt(burnAmount) > BigInt(userBalance)) {
                throw new Error('Insufficient balance for burn');
            }

            const userPublicKey = await this.derivePublicKey(userPrivateKey);
            const encryptedBurnAmount = await this.encryptValue(burnAmount, {x: userPublicKey.pubKeyX, y: userPublicKey.pubKeyY});

            // Generate auditor PCT
            const auditorPCT = await this.generateBalancePCT(burnAmount, userAddress);
            const auditorPCTAuthKey = this.generateRandomness();
            const auditorPCTNonce = this.generateRandomness();
            const auditorPCTRandom = this.generateRandomness();

            const inputs: BurnCircuitInputs = {
                ValueToBurn: burnAmount,
                SenderPrivateKey: userPrivateKey,
                SenderPublicKey: [userPublicKey.pubKeyX, userPublicKey.pubKeyY],
                SenderBalance: userBalance,
                SenderBalanceC1: userEncryptedBalance.C1,
                SenderBalanceC2: userEncryptedBalance.C2,
                SenderVTBC1: encryptedBurnAmount.C1,
                SenderVTBC2: encryptedBurnAmount.C2,
                AuditorPublicKey: this.auditorPublicKey,
                AuditorPCT: auditorPCT,
                AuditorPCTAuthKey: auditorPCTAuthKey,
                AuditorPCTNonce: auditorPCTNonce,
                AuditorPCTRandom: auditorPCTRandom
            }

            const response = await fetch('/api/generate-proof', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    circuitType: 'BURN',
                    inputs,
                    wasmPath: CIRCUIT_CONFIGS.BURN.wasmPath,
                    zkeyPath: CIRCUIT_CONFIGS.BURN.zkeyPath
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Burn proof generation failed');
            }

            const result = await response.json();
            const newBalance = (BigInt(userBalance) - BigInt(burnAmount)).toString();
            const balancePCT = await this.generateBalancePCT(newBalance, auditorPCTRandom);

            return {
                proof: this.formatBurnProof(result.proof, result.publicSignals),
                balancePCT
            };
        } catch (error: any) {
            throw new Error(`Burn proof failed: ${error.message}`);
        }
    }

    /**
     *  Generate minting proof for token creation
     */
    async generateMintingProof(
        recipientAddress: string,
        mintAmount: string,
        chainId: number,
        nullifierHash: string
    ): Promise<MintProof> {
        
        try {
            
            const receiverPrivateKey = await this.generateSecretKey(recipientAddress);
            const recipientPublicKey = await this.derivePublicKey(receiverPrivateKey);

            const encryptedAmountRandom = this.generateRandomness();
            const encryptedAmount = await this.encryptValue(mintAmount, {x: recipientPublicKey.pubKeyX, y: recipientPublicKey.pubKeyY}, encryptedAmountRandom);

            // Generate PCTs
            const receiverPCT = await this.generateBalancePCT(mintAmount, receiverPrivateKey);
            const receiverPCTAuthKey = this.generateRandomness();
            const receiverPCTNonce = this.generateRandomness();
            const receiverPCTRandom = this.generateRandomness();

            const auditorPCT = await this.generateBalancePCT(mintAmount, receiverPrivateKey);
            const auditorPCTAuthKey = this.generateRandomness();
            const auditorPCTNonce = this.generateRandomness();
            console.log("auditorPCTNonce:", auditorPCTNonce);
            const auditorPCTRandom = this.generateRandomness();
            const nonce = await this.provider.getTransactionCount(recipientAddress);
            const anyChainId = await this.provider.getNetwork();
            nullifierHash = await this.generateNullifier(recipientAddress, nonce.toString(), receiverPrivateKey);
            chainId = (await anyChainId).chainId;

            const inputs: MintCircuitInputs = {
                ValueToMint: mintAmount,
                ChainId: chainId.toString(),
                NullifierHash: nullifierHash,
                ReceiverPublicKey: [recipientPublicKey.pubKeyX, recipientPublicKey.pubKeyY],
                ReceiverVTTC1: encryptedAmount.C1,
                ReceiverVTTC2: encryptedAmount.C2,
                ReceiverVTTRandom: encryptedAmountRandom,
                ReceiverPCT: receiverPCT,
                ReceiverPCTAuth: receiverPCTAuthKey,
                ReceiverPCTNonce: receiverPCTNonce,
                ReceiverPCTRandom: receiverPCTRandom,
                AuditorPublicKey: this.auditorPublicKey,
                AuditorPCT: auditorPCT,
                AuditorPCTAuthKey: auditorPCTAuthKey,
                AuditorPCTNonce: auditorPCTNonce,
                AuditorPCTRandom: auditorPCTRandom
            };

            const response = await fetch('/api/generate-proof', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    circuitType: 'MINT',
                    inputs,
                    wasmPath: CIRCUIT_CONFIGS.MINT.wasmPath,
                    zkeyPath: CIRCUIT_CONFIGS.MINT.zkeyPath
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'mint proof failed');
            }

            const result = await response.json();

            return this.formatMintProof(result.proof, result.publicSignal);
        } catch (error: any) {
            throw new Error(`Mint proof generation failed: ${error.message}`);
        }
    }

    /**
     * 
     * @param userAddress user address to compute the private key signing a message
     * @returns returns private key that fits in the babyjubjub field
     */
    public async generateSecretKey(userAddress: string): Promise<string> {
        
        const signer_ = provider_.getSigner();
        return await generateSecretKetFromSignature(signer_, userAddress);
    }

    /**
     * Helper to prepare circuit inputs - converts all values to strings
     * for JSON serialization while preserving precision
     * @param inputs inputs meant for the circuit
     */
    public prepareCircuitInputs(inputs: any): any {
        const prepared: any = {};

        for (const [key, value] of Object.entries(inputs)) {
            if (typeof value === 'bigint') {
                // Convert BigInt to strings for JSON serialization
                prepared[key] = value.toString();
            } else if (Array.isArray(value)) {
                // Handle arrays (like public key coordinates)
                prepared[key] = value.map(v => 
                    typeof v === 'bigint' ? v.toString() : v
                );
            } else { 
                prepared[key] = value;
            }
        }

        return prepared;
    }

    public async generateRegistrationHash(
        chainId: number,
        privateKey: string,
        address: bigint
    ): Promise<string> {
        
        // Convert inputs to BigInt format that Poseidon expects
        const chainIdBigInt = BigInt(chainId);

        const privateKeyBigInt = BigInt(privateKey);
        console.log("privateKeyBigInt:", privateKeyBigInt);
        console.log("BigInt PK", BigInt(privateKey));

        // Poseidon hash the inputs
        const hash =  poseidon.hash([chainIdBigInt, privateKeyBigInt, address]);
        console.log("poseidon hash output:", hash);

        // Convert hash output to string
        // Use poesidon F.toObject instead of F.toString() to avoid negative numbers
        // poseidon.F.toObject converts field element to decimal string
        const hashString =  poseidon.F.toString(hash);
        console.log("registration hash string:", hashString);

        return hash.toString();
    }

    /**
     * Generate Baby JubJub public key from private key
     * Returns the public key as a point [x, y] in string format
     * @param secretKey private key as string
     * @returns Public key point {pubKeyX, pubKeyY}
     */
    public async derivePublicKey(secretKey: string): Promise<{pubKeyX: string; pubKeyY: string}> {
        return await derivePublicKey(secretKey);   
    }

    public async verifyKeyPair(
        privateKey: string,
        publicKey: [string, string]
    ): Promise<boolean> {
        try {
            console.log("privateKey:", privateKey);

            const computedPubKey = await derivePublicKey(privateKey);
            console.log("Computed Public Key:", computedPubKey);
            console.log("Provided Public Key:", publicKey);
            const comp = computedPubKey.pubKeyX
            const comp1 = computedPubKey.pubKeyY
            const compMatch = comp === publicKey[0] && comp1 === publicKey[1];
            console.log("compMatch:", compMatch);

            const match = computedPubKey.pubKeyX === publicKey[0] && computedPubKey.pubKeyY === publicKey[1];

            if (!match) {
                console.error("Key pair mismatch!");
                console.error("Expected:", publicKey);
                console.error("Compputed:", computedPubKey);
            }

            return match;
        } catch (error: any) {
            console.error("Error verifying key:", error);
            return false;
        }
    }

    /**
     * 
     * Generate cryptographically secure randomness for field elements
     * @returns Random field element as bytes
     */
    public generateRandomness(): string {
        // Cryptographically secure randomness
        const randomBytes = crypto.getRandomValues(new Uint32Array(32));

        let randomBigInt = BigInt(0);
        for (let i = 0; i < randomBytes.length; i++) {
            randomBigInt = (randomBigInt << BigInt(8)) | BigInt(randomBytes[i]);
        }
        const fieldSize = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
        return (randomBigInt % fieldSize).toString();
    }

    /**
     * Generate pedersen commitment for balance
     * @returns 7 field elements for homomorphic properties
     * @param balance The balance to commit to
     * @param randomness The blinding factor (should be kept secret)
     */
    public async generateBalancePCT(
        balance: string,
        randomness: string
    ): Promise<BalancePCT> {
        const pedersen = await ( await loadZKLibraries()).buildPedersenHash();
        const babyJubJub = await (await loadZKLibraries()).buildBabyjub();
        if (!pedersen || !babyJubJub) {
            throw new Error('Service not initialized.');
        }

       try {
         // Convert inputs to buffers for Pedersen hash
        const balanceBigInt = BigInt(balance);
        console.log("balance:", balanceBigInt);

        const randomnessBigInt = BigInt(randomness);
        console.log("randomness:", randomness);

        // Create input array for Pedersen commitment
        // Format: [balance, randomness]
        const balanceBuffer = this.bigIntToBuffer(balanceBigInt);
        console.log("balanceBuffer check", balanceBuffer);

        const randomnessBuffer = this.bigIntToBuffer(randomnessBigInt);
        console.log("randomnessBigInt check:" ,randomnessBigInt);

        const combined = Buffer.concat([balanceBuffer, randomnessBuffer]);
        console.log("combined check", combined);

        // Generate base Pedersen hash
        const hash = pedersen.hash(combined);
        console.log("hash check:", hash);

        const baseCommitmentBigInt: bigint =  babyJubJub.F.fromRprBE(hash, 0);
        console.log("baseCommitmentBigInt check:", baseCommitmentBigInt);

        const baseCommitment: string = babyJubJub.F.toString(baseCommitmentBigInt);
        console.log("baseCommitment check:", baseCommitment);

        // Generate 7 commitments for homomorphic operation
        // Each commitment is derived from the base using different offsets
        const pct: BalancePCT = [
            baseCommitment,
            this.deriveCommitment(baseCommitment, 1),
            this.deriveCommitment(baseCommitment, 2),
            this.deriveCommitment(baseCommitment, 3),
            this.deriveCommitment(baseCommitment, 4),
            this.deriveCommitment(baseCommitment, 5),
            this.deriveCommitment(baseCommitment, 6),
        ];
        console.log("commitment for pct:", pct);

        return pct;
       } catch (error: any) {
        console.error('failed to generate Balance pedersen commitment', error.message);
        throw new Error('failed to commit', error);
       }
    }

    /**
     * Generate amouint PCT (Pedersen Commitment with Timestamp)
     * @param amount The amount to commit to
     * @param randomness The blinding factor
     */
    public async generateAmountPCT(
        amount: string,
        randomness: string
    ): Promise<AmountPCT> {
        const pct = await this.generateBalancePCT(amount, randomness);

        return {
            pct,
            timestamp: Date.now()
        }
    }

    /**
     * Encrypted amount using ElGamal encryption on BabyJubJub curve
     * @param value The amount to encrypt
     * @param publicKeyX Recipient's public key (point on Baby Jub Jub curve)
     * @param randomness Optional randomness (generated if not provided)
     * @returns ElGamal: Encrypted balance with C1 and C2 as curve points
     */
    public async encryptValue(
        value: string,
        publicKey: {x: string, y: string},
        randomness?: string
    ): Promise<EncryptedBalance> {
        const babyJubJub = await (await loadZKLibraries()).buildBabyjub();

        if (!babyJubJub) {
            throw new Error('Service not initialized');
        }

        // Step 1: Get or generate randomness (ephemeral private key: 'r')
        const r = randomness || this.generateRandomness();
        const rBuffer = this.bigIntToBuffer(BigInt(r));

        // Step 2: Calculate C1 = r * G
        // This is the "ephemeral public key" - anyone can see this
        const C1 = await babyJubJub.mulPointEScalar(babyJubJub.Base8, rBuffer);

        // Step3: Reconstruct recipient's public key as a curve on point
        const recipientPublicKey = [
            await babyJubJub.F.e(BigInt(publicKey.x)),
            await babyJubJub.F.e(BigInt(publicKey.y))
        ];

        // Step 4: Calculate shared secret: r * PK
        // This is the "encryption mask" - only the recipient can compute this
        // because only they know sk where PK = sk * G
        const sharedSecret = await babyJubJub.mulPointEScalar(recipientPublicKey, rBuffer);

        // Step 5: Encode the message as a curve point: m * G
        const valueToBigInt = BigInt(value);
        const valueBuffer = this.bigIntToBuffer(valueToBigInt);
        const messagePoint = await babyJubJub.mulPointEScalar(babyJubJub.Base8, valueBuffer);

        // Step 6: Calculate C2 = (m * G) + (r * PK)
        // This "hides" the message by adding the shared secret
        const C2 = await babyJubJub.addPoint(messagePoint, sharedSecret);
        // Step 7: Extract x, y coordinates and return as string
        return {
            C1: [
                await babyJubJub.F.toString(C1[0]), // C1.x
                await babyJubJub.F.toString(C1[1]) // C1.y
            ],  

            C2: [
                await babyJubJub.F.toString(C2[0]), // C2.x
                await babyJubJub.F.toString(C2[1]) // C2.y
            ]
        };
    }


    /**
     * Retrive balance from smart contract
     * @param contractAddress The eERC20 contract address
     * @param userAddress The user's address
     * @param tokenId TokenId (0 for standalone tokens)
     */
    public async getEncryptedBalance(
        contractAddress: any, // ethers Contract instance
        userAddress: string,
        tokenId: 0
    ): Promise<{
        eGCT: EGCT;
        nonce: bigint;
        amountPCTs: AmountPCT[];
        balancePCT: BalancePCT;
        transactionIndex: bigint;
    }> {
        // For standalone tokens, toeknId is always 0\
        const result = await contractAddress.balancOf(userAddress, tokenId);

        // Parse the result
        const eGCT: EGCT = {
            c1x: result.eGCT.c1x.toString(),
            c1y: result.eGCT.c1y.toString(),
            c2x: result.eGCT.c2x.toString(),
            c2y: result.eGCT.c2y.toString()
        };

        // Parse amount PCTs
        const amountPCTs: AmountPCT[] = result.amountPCTs.map((pct: any) => ({
            pct: [
                pct.pct[0].toString(),
                pct.pct[1].toString(),
                pct.pct[2].toString(),
                pct.pct[3].toString(),
                pct.pct[4].toString(),
                pct.pct[5].toString(),
                pct.pct[6].toString()
            ] as BalancePCT,
            timestamp: pct.timestamp ? Number(pct.timestamp) : 0
        }));

        // Parse balance PCT
        const balancePCT: BalancePCT = [
            result.balancePCT[0].toString(),
            result.balancePCT[1].toString(),
            result.balancePCT[2].toString(),
            result.balancePCT[3].toString(),
            result.balancePCT[4].toString(),
            result.balancePCT[5].toString(),
            result.balancePCT[6].toString(),
        ];

        return {
            eGCT,
            nonce: BigInt(result.nonce.toString()),
            amountPCTs,
            balancePCT,
            transactionIndex: BigInt(result.transactionIndex.toString())
        };
    }

    /**
     * Helper: Convert BigInt to 32-byte buffer (little-endian)
     */
    private bigIntToBuffer(value: bigint): Buffer {
        const buffer = Buffer.alloc(32);
        let val = value;
        for (let i = 0; i < 32; i++) {
            buffer[i] = Number(val & BigInt(0xff));
            val = val >> BigInt(8);
        }

        return buffer;
    }

    /**
     * Helper: Derive commitment with offset for homomorphoc properties
     * 
     */
    public  deriveCommitment(base: string, offsets: number): string {
        // Pedersen commitment or similar

        const fieldSize = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
        const baseBigInt = BigInt(base);
        const derived = (baseBigInt + BigInt(offsets)) % fieldSize;
        return derived.toString();
    }

    public async generateNullifier(address: string, nonce: string, secretKey: string): Promise<string> {

        // Convert address to BigInt (remove 0x prefix
        const addressClean = address.toLowerCase().replace('0x', '');
        const addressBigInt = BigInt('0x' + addressClean);

        // Convert nonce to BigInt
        const nonceBigInt = BigInt(nonce);

        // Convert secret key to BigInt
        const secretKeyBigInt = BigInt(secretKey);

        // Hash with poseidon: hash(]address, nonceBigInt, secretKeyBigInt)
        const hash = poseidon.hash([addressBigInt, nonceBigInt, secretKeyBigInt]);

        return poseidon.F.toString(hash);
    
    }    
    
    public addressToFieldElement(address: string): bigint {
        // Convert Ethereum address to field element
        const fieldSize = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
        return (BigInt(address) % fieldSize);
    }

    private formatRegisterProof(proof: any, publicSignals: string[]): RegisterProof {
        if (!proof.pi_a && !proof.pi_b && !proof.pi_c && !publicSignals) {
            console.error("no proof");
            console.warn("proof.pi_a undefin0ed");
        }
        return {
            proofPoints: {
                a: [proof.pi_a[0], proof.pi_a[1]],
                b: [
                    [proof.pi_b[0][1], proof.pi_b[0][0]],
                    [proof.pi_b[1][1], proof.pi_b[1][0]]
                ],
                c: [proof.pi_c[0], proof.pi_c[1]]
            },
            publicSignals: publicSignals as [string, string, string, string, string]
        }
    }

    private formatTransferProof(proof: any, publicSignals: string[]):TransferProof {
        return {
            proofPoints: {
                a: [proof.pi_a[0], proof.pi_a[1]],
                b: [
                    [proof.pi_b[0][1], proof.pi_b[0][0]],
                    [proof.pi_b[1][1], proof.pi_b[1][0]]
                ],
                c: [proof.pi_c[0], proof.pi_c[1]]
            },
            publicSignals
        }
    };

    private formatWithdrawProof(proof: any, publicSignals: string[]):WithdrawProof {
        return {
            proofPoints: {
                a: [proof.pi_a[0], proof.pi_a[1]],
                b: [
                    [proof.pi_b[0][1], proof.pi_b[0][0]],
                    [proof.pi_b[1][1], proof.pi_b[1][0]]
                ],
                c: [proof.pi_c[0], proof.pi_c[1]]
            },
            publicSignals
        }
    };

    private formatBurnProof(proof: any, publicSignals: string[]):BurnProof {
        return {
            proofPoints: {
                a: [proof.pi_a[0], proof.pi_a[1]],
                b: [
                    [proof.pi_b[0][1], proof.pi_b[0][0]],
                    [proof.pi_b[1][1], proof.pi_b[1][0]]
                ],
                c: [proof.pi_c[0], proof.pi_c[1]]
            },
            publicSignals
        }
    };


    private formatMintProof(proof: any, publicSignals: string[]):MintProof {
        return {
            proofPoints: {
                a: [proof.pi_a[0], proof.pi_a[1]],
                b: [
                    [proof.pi_b[0][1], proof.pi_b[0][0]],
                    [proof.pi_b[1][1], proof.pi_b[1][0]]
                ],
                c: [proof.pi_c[0], proof.pi_c[1]]
            },
            publicSignals
        }
    };
}

// Utility functions for eERC20 integration

/**
 *  Smart contract integgration helper
 */
export class eERC20ContractInterface {
    private contract: ethers.Contract;
    private proofGenerator: eERC20ZKProofGenerator;

    constructor(
        contractAddress: string,
        abi: ethers.ContractInterface,
        signer: ethers.Signer,
        proofGenerator: eERC20ZKProofGenerator
    ) {
        this.contract = new ethers.Contract(contractAddress, abi, signer);
        this.proofGenerator = proofGenerator;

         const requiredMethods = ['deposit', 'transfer', 'withdraw', 'register'];
         const availableMethods = Object.keys(this.contract.functions);
         
        console.log('Available contract methods:', availableMethods);
            
        requiredMethods.forEach(method => {
                if (!this.contract[method]) {
                    console.error(`Missing method: ${method}`);
                    console.warn(`Contract ABI missing required method: ${method}`);
                }
        });

    }

    /**
     *  Register user for encrypted token operations
     */
    async register(
        userAddress: string, 
        chainId: number, 
        privateKey: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const proof = await this.proofGenerator.generateRegisterationProof(
                userAddress, 
                chainId, 
                privateKey
            );
            console.log("Registration proof generated:", proof);

            return await this.contract.register(proof)
        } catch (error: any) {
            throw new Error(`Registration failed: ${error.message}`);
        }
    }

    /**
     *  Execute encrypted token transfer
     */
    async transfer(
        to: string,
        tokenId: string,
        amount: string,
        senderBalance: string,
        senderEncryptedBalance: EncryptedBalance,
        privateKey: string,
        message?: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const senderAddress = await this.contract.signer.getAddress();
            const { proof, balancePCT} = await this.proofGenerator.generateTransferProof(
                senderAddress,
                privateKey,
                senderBalance,
                senderEncryptedBalance,
                to,
                amount
            );

            if (message) {
                return await this.contract.transfer(to, tokenId, proof, balancePCT, ethers.utils.toUtf8Bytes(message));
            }

            return await this.contract.transfer(to, tokenId, proof, balancePCT)
        } catch (error: any) {
            throw new Error(`Transfer failed: ${error.message}`);
        }

    }

    async withdraw(
        tokenId: string,
        amount: string,
        currentBalance: string,
        encryptedBalance: EncryptedBalance,
        privateKey: string,
        message?: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const userAddress = await this.contract.signer.getAddress();
            const { proof, balancePCT } = await this.proofGenerator.generateWithdrawProof(
                userAddress,
                privateKey,
                currentBalance,
                encryptedBalance,
                amount
            );

            if (message) {
                return await this.contract.withdraw(tokenId, proof, balancePCT, ethers.utils.toUtf8Bytes(message));
            }
            return await this.contract.withdraw(tokenId, proof, balancePCT);
        } catch (error: any) {
            throw new Error(`Withdraw failed: ${error.message}`);
        }
    }

    public async deposit(
        amount: string,
        tokenAddress: string,
        amountPCT: BalancePCT,
        message?: string
    ): Promise<ethers.ContractTransaction> {
        try {
            // Additional Runtime Validation
            if (!this.contract.deposit) {
                throw new Error('Deposit method is undefined at runtime');
            }

            // Logging Input Parameters
            console.log('<b>Deposit Method Input</b>', {
                amount,
                tokenAddress,
                amountPCTLength: amountPCT.length,
                message: message || 'No message'
            });

            if (message) {
                return await this.contract.deposit(
                    amount,
                    tokenAddress,
                    amountPCT,
                    ethers.utils.toUtf8Bytes(message)
                );
            }
            return await this.contract.deposit(amount, tokenAddress, amountPCT);
        } catch (error: any) {
            console.error('<b>Deposit Error Details:</b>', {
                errorMessage: error.message,
                errorStack: error.stack,
                contractAddress: this.contract.address
            });
            throw new Error(`Deposit failed: ${error.message}`);
        }
    }

    /**
     * Burn encrypted tokens
     */
    async privateBurn(
        burnAmount: string,
        currentBalance: string,
        encryptedAmount: EncryptedBalance,
        privateKey: string,
        message?: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const userAddress = await this.contract.signer.getAddress();
            const { proof, balancePCT } = await this.proofGenerator.generateBurnProof(
                userAddress,
                privateKey,
                currentBalance,
                encryptedAmount,
                burnAmount,
            );

            if (message) {
                return await this.contract.privateBurn(proof, balancePCT, ethers.utils.toUtf8Bytes(message));
            }
            return await this.contract.privateBurn(proof, balancePCT);
        } catch (error: any) {
            throw new Error(`Burn failed: ${error.message}`);
        }
    }

    /**
     * Mint encrypted tokens
     */
    async privateMint(
        user: string,
        mintAmount: string,
        chainId: number,
        nullifierHash: string,
        message?: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const proof = await this.proofGenerator.generateMintingProof(user, mintAmount, chainId, nullifierHash);

            if (message) {
                return await this.contract.privateMint(user, proof, ethers.utils.toUtf8Bytes(message));
            }
            return await this.contract.privateMint(user, proof);
        } catch (error: any) {
            throw new Error(`Mint failed: ${error.message}`);
        }
    }

    async getBalance(user: string, tokenAddress: string):Promise<string> {
        return await this.contract.getBalanceFromTokenAddress(user, tokenAddress);
    }

}

/**
 * Helper function to initialize the proof generator
 */
export const initializeProofGenerator = async (
    provider: ethers.providers.Provider,
    auditorPublicKey?: [string, string]
): Promise<eERC20ZKProofGenerator> => {
    return new eERC20ZKProofGenerator(provider, auditorPublicKey);
}

export const initializeContractInterface = async (
    contractAddress: string,
    abi: ethers.ContractInterface,
    signer: ethers.Signer,
    proofGenerator: eERC20ZKProofGenerator
): Promise<eERC20ContractInterface> => {

    return new eERC20ContractInterface(contractAddress, abi, signer, proofGenerator);
}
