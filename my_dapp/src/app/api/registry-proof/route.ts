import { NextRequest, NextResponse } from "next/server";
import { CircuitFiles, eERC20ProofInputs, eERC20ZKProofGenerator } from "@/utils/zkProofInputs";
import { providers } from "ethers";
const snarkjs = require("snarkjs");

export async function POST(
    req: NextRequest,
    input: eERC20ProofInputs, 
    files: CircuitFiles,
):Promise<void | NextResponse> {
    try {
        const provider = new providers.Web3Provider(window.ethereum);
        const _proof = new eERC20ZKProofGenerator(provider);

        const {publicKeyX, publicKeyY} = await _proof.derivePublicKey(input.secretKey);

        const inputs = {
            // Private inputs
            secretKey: input.secretKey,
            randomness: input.randomness,

            // Public inputs
            userAddress:  input.userAddress,
            chainId: input.chainId.toString(),
            publicKeyX: publicKeyX,
            publicKeyY: publicKeyY,
            commitment: input.commitment
        };

        const { proof, publicSignals} = await snarkjs.groth16.fullProve(
            inputs,
            files.wasmPath,
            files.zkeyPath
        );

        const formatPr = _proof.formatProof(proof, publicSignals);

        return NextResponse.json({formatPr, success: true});
    } catch (error: unknown) {
        console.error('registration proof failed', error);

        return NextResponse.json({});
    }
}