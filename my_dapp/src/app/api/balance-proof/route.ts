import { NextRequest, NextResponse } from "next/server";
import { CircuitFiles, eERC20ProofInputs, eERC20ZKProofGenerator } from "@/utils/zkProofInputs";
import { providers } from "ethers";
const snarkjs = require("../../../../node_modules/snarkjs");

export async function POST( 
    files: CircuitFiles, 
    _inputs: eERC20ProofInputs,
    balance: string,
    minBalance: string
) {
    try {
        const provider = new providers.Web3Provider(window.ethereum);
        const proof = new eERC20ZKProofGenerator(provider);

        const inputs = {
                // Private inputs
                actualBalance: balance, 
                secretKey: _inputs.secretKey,
                randomness: _inputs.randomness,

                // Public Inputs
                userAddress: _inputs.userAddress,
                minRequiredBalance: minBalance,
                commitment: _inputs.commitment
            };
        
        const {_proof, publicSignals} = snarkjs.groth16.fullProve(
            inputs,
            files.wasmPath,
            files.vkeyPath
        )

        const formatPr = proof.formatProof(_proof, publicSignals);

        return NextResponse.json({formatPr, success: true});
    } catch (error: unknown) {
        console.error('balance proof failed', error);

        return NextResponse.json({ error: 'Balance proof generation failed'}, {status: 500});
    }
}