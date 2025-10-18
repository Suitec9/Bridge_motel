import { NextRequest, NextResponse } from "next/server";
import * as fs from 'fs';
import * as path from 'path';

const snarkjs = require('snarkjs');

// This runs server-side where Node.js modules are available
export async function POST(req: NextRequest) {
    try {
        const { circuitType, inputs, wasmPath, zkeyPath} = await req.json();

        if (!circuitType || !inputs || !wasmPath || !zkeyPath) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }
        
        // Resolve paths to circuits files in public directory
        const publicDir = path.join(process.cwd(), 'public');
        const fullWasmPath = path.join(publicDir, wasmPath);
        const fullZkeyPath = path.join(publicDir, zkeyPath);

        // Verify file exist
        if (!fs.existsSync(fullWasmPath)) {
            return NextResponse.json(
                { error: `zkey file not found: ${zkeyPath}`},
                { status: 404}
            );
        }

        if (!fs.existsSync(fullZkeyPath)) {
            return NextResponse.json(
                { error: `zkey file not found: ${zkeyPath}`},
                { status: 404}
            );
        }

        console.log(`Generating ${circuitType} proof...`);
        console.log('Inputs:', JSON.stringify(inputs, null, 2));

        // Generate proof using snarkjs
        const { proof, publicSignals} = await snarkjs.groth16.fullProve(
            inputs,
            fullWasmPath,
            fullZkeyPath
        );

        console.log(`✅ ${circuitType} proof generated successfully`);

        return NextResponse.json({
            success: true,
            proof,
            publicSignals
        });

    } catch (error: unknown) {
        console.error('Proof generation failed:', error);
        return NextResponse.json(
            { 
                error: 'Proof generation failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        )
    }
}
