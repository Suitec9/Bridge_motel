// app/api/verify-proof/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readVerificationKey } from '@/utils/serverValidation/severProps';
const snarkjs = require("../../../../node_modules/snarkjs");
export async function POST(request: NextRequest) {
    try {
        const { proof, publicSignals, vkeyPath } = await request.json();
        
        if (!proof || !publicSignals || !vkeyPath) {
            return NextResponse.json(
                { error: 'Missing required parameters' }, 
                { status: 400 }
            );
        }

        // Load verification key from server filesystem
        const vkey = await readVerificationKey(vkeyPath);
        
        // Verify proof using snarkjs (server-side only)
        const isValid = await snarkjs.groth16.verify(
            vkey,
            publicSignals,
            proof
        );
        
        return NextResponse.json({ isValid, success: true });
    } catch (error: unknown) {
        console.error('Proof verification failed:', error);
        return NextResponse.json(
            { error: 'Verification failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}