import { NextResponse } from "next/server";
import { CircuitFiles, eERC20ProofInputs, eERC20ZKProofGenerator } from "@/utils/zkProofInputs";
import { providers } from "ethers";

const snarkjs = require("../../../../node_modules/snarkjs");

export async function POST(
    input: eERC20ProofInputs, 
    files: CircuitFiles, 
    encryptedAmount:  string,
    mintAmount: string
) {
    try {
        const provider = new providers.Web3Provider(window.ethereum);

        const proof = new eERC20ZKProofGenerator(provider);

        const inputs = {
            // Private inputs
            mintAmount,
            secretKey: input.secretKey,
            randomness: input.randomness,

            // Publoic inputs
            userAddress: input.userAddress,
            encryptedAmount,
            commitment: input.commitment
        };

        const { _proof, publicSignals} = await snarkjs.groth16.fullProve(
            inputs,
            files.wasmPath,
            files.zkeyPath
        )

        const formatPr =  proof.formatProof(_proof, publicSignals);

        return NextResponse.json({formatPr, success: true});

    } catch (error: any) {
        console.error('Mint proof failed', error);

        return NextResponse.json({error: 'Mint generation proof failed'}, {status: 500});
    }
}