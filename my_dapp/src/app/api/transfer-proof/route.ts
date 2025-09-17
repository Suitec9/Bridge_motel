import { NextRequest, NextResponse } from 'next/server';
import { CircuitFiles, eERC20ZKProofGenerator } from '@/utils/zkProofInputs';
const snarkjs = require("../../../../node_modules/snarkjs");
import { eERC20ProofInputs } from '@/utils/zkProofInputs';
import { providers } from 'ethers';
import { error } from 'console';


export async function POST( _inputs: eERC20ProofInputs, files: CircuitFiles) {
    try {

        const provider = new providers.Web3Provider(window.ethereum);

        const proof = new eERC20ZKProofGenerator(provider);
         
        const inputs = {
                // Private inputs
                balance: _inputs.balance,
                amount: _inputs.amount,
                secretKey: _inputs.secretKey,
                nonce: _inputs.nonce, 
                randomness: proof.generateRandomness(),

                // Public inputs
                senderAddress: proof.addressToFieldElement(_inputs.userAddress),
                recipientAddress: proof.addressToFieldElement(_inputs.recipientAddress),
                encryptedAmount: proof.encryptForRecipient(_inputs.amount, _inputs.recipientAddress),
                nullifier: proof.generateNullifier(_inputs.userAddress, _inputs.nonce, _inputs.secretKey),
                newCommitment: proof.generateCommitment()
        };

        

        if (!inputs || !proof || !files) {
            return NextResponse.json(
                {error: 'Missing required inputs'},
                { status: 400}
            );
        }

        const { _proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            files.wasmPath,
            files.zkeyPath
        );

        const formatPr = proof.formatProof(_proof, publicSignals)

        return NextResponse.json({formatPr, success: true});
    } catch (error: unknown) {
        console.error('Proof failed to generate', error);
        return NextResponse.json({ error:'generation failed'}, 
        ), {status: 500}
    }
}
