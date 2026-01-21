import { NextRequest, NextResponse } from "next/server";
import * as fs from 'fs';
import * as path from 'path';

const snarkjs = require('snarkjs');
/**
 *  Convert string inputs back to proper types for snarkjs
 *  snarkjs expects strings for BigInt, but we need to ensure proper format
 * @param inputs inputs to handle
 * @returns 
 */
function parseCircuitInputs(inputs: any): any {
    const parsed: any = {};

    for (const [key, value] of Object.entries(inputs)) {
        if (Array.isArray(value)) {
            // Handles arrays (like public key coordinates)
            // Keep as string - snarkjs handle this
            parsed[key] = value;
        } else if (typeof value === 'string') {
            // Keep as string - snarkjs expects string representtion of BigInt
            parsed[key] = value;
        } else {

            parsed[key] = value;
        }
    }

    return parsed;
}

/**
 * 
 * @param filePath Path to file 
 * 
 */
async function readFileToBuffer(filePath: string): Promise<Uint8Array> {
    try {
        const buffer =  fs .readFileSync(filePath);
        return new Uint8Array(buffer)
    } catch (err: any) {
        throw new Error(`Failed to read file ${filePath}: ${err.message}`);
    }
}

// This runs server-side where Node.js modules are available
export async function POST(req: NextRequest) {
    let wasmBuffer: Uint8Array | null = null;
    let zkeyBuffer: Uint8Array | null = null;
    try {
        const { circuitType, inputs, wasmPath, zkeyPath, vkeyPath} = await req.json();

        console.log(`Generating 🔄${circuitType} proof...`);
        console.log('Raw inputs received:', inputs);

        // Parse inputs to ensure correct format
        const parsedInputs = parseCircuitInputs(inputs);

        console.log('Parsed inputs for circuit:', parsedInputs);

        if (!circuitType || !inputs || !wasmPath || !zkeyPath) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }
        
        // Resolve paths to circuits files in public directory
        const publicDir = path.join(process.cwd(), '/public');// my_dapp/public
        const fullWasmPath = path.join(publicDir, wasmPath);
        const fullZkeyPath = path.join(publicDir, zkeyPath);
        const fullVkeyPath = path.join(publicDir, vkeyPath);
//        const fullWtnsCalc = path.join(publicDir, wtns_calc);

        // Verify wasm file exist
        if (!fs.existsSync(fullWasmPath)) {
            return NextResponse.json(
                { error: `wasm file not found: ${wasmPath}`},
                { status: 404}
            );
        }

        // Verify zkey file exist
        if (!fs.existsSync(fullZkeyPath)) {
            return NextResponse.json(
                { error: `zkey file not found: ${zkeyPath}`},
                { status: 404}
            );
        }

        // Verify vkey file exist
        if (!fs.existsSync(fullVkeyPath)) {
            return NextResponse.json(
                { error: `vkey file not found: ${vkeyPath}`},
                { status: 404}
            )
        }

        console.log(`Generating ${circuitType} proof...`);
        console.log('Inputs:', JSON.stringify(inputs, null, 2));

        console.log("📂WASM path:", fullWasmPath);
        console.log("📂Zkey path:", fullZkeyPath);
        console.log("📂Vkey Path:", fullVkeyPath);

        // Read files into memory buffers 
        console.log('📖 Reading circuit files into memory...');
        wasmBuffer = await readFileToBuffer(fullWasmPath);
        zkeyBuffer = await readFileToBuffer(fullZkeyPath);
        
        console.log(` WASM loaded: ${wasmBuffer.length} bytes `);
        console.log(`Zkey loaded: ${zkeyBuffer.length} bytes`);
        
        const logger = {
            debug: (msg: any) => console.log(`[DEBUG] ${msg}`),
            info: (msg: any) => console.log(`[INFO] ${msg}`),
            warn: (msg: any) => console.warn(`[WARN] ${msg}`),
            error: (msg: any) => console.error(`[ERROR] ${msg}`)
        }

        // Generate proof using snarkjs
        // snarkjs.groth16.fullProve(inputs, wasmBuffer, zkeyBuffer, logger)
        const { proof, publicSignals} = await snarkjs.groth16.fullProve(
            parsedInputs,           // circuit inputs first
            new Uint8Array(wasmBuffer),             // WebAssembly buffer (Uint8Array)
            new Uint8Array(zkeyBuffer),             // zkey buffer (Uint8Array)
            logger                  // logger
            );

        console.log(`✅ ${circuitType} proof generated successfully`);
        console.log('📊 Public signals:', publicSignals);

        // Load the verification key and verify
        console.log('🔍 Verifying proof...');
        const vkeyContent = JSON.parse(fs.readFileSync(fullVkeyPath, 'utf-8'));
        console.log('Vkey loaded: verification key parsed');

        // Verify proof using the vkey (vkey is JSON, not binary)
        const isValid = await snarkjs.groth16.verify(
            vkeyContent,        // verification key (JSON object, not binary)
            publicSignals, 
            proof
        );

        if (isValid) {
            console.log('✅ Proof verification successful')
        } else {
            console.error('❌ Proof verification failed');

            return NextResponse.json(
                {
                    error: 'Proof verification failed',
                    success: false
                },
                { status: 400}
            );
        }

        // Clear buffer to help with garbage collection
        wasmBuffer = null;
        zkeyBuffer = null;

        // Force garbage collection if available (Node.js with --expose-gc flag)
        if (global.gc) {
            global.gc();
        }

        return NextResponse.json({
            success: true,
            proof,
            publicSignals
        });
        

    } catch (error: any) {
        console.error('❌ Proof generation failed:', error);

        // Clear buffers on error
        wasmBuffer = null;
        zkeyBuffer = null;

        let errorMessage = error.message || 'Unknown error'

        // Circuit check assertion failures
        if (errorMessage.includes('Assert failed')) {
            console.error('⚠️ Circuit assertion failed - input values do not satisfy circuit constraints')
            console.error('Full error:', error);

            // Extract more details from the error
            const lines = errorMessage.split('\n');
            const relavantLines = lines.filter((line: string | any) => 
                line.includes('Error in template') || 
                line.includes('line:') || 
                line.includes("Asser Failed")
            );

            return NextResponse.json(
                {
                    error: 'Circuit constraint violation',
                    details: relavantLines.join('\n'),
                    fullError: errorMessage,
                    success: false
                },
                { status: 400}
            )
        }
        return NextResponse.json(
            { 
                error: 'Proof generation failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        )
    }
}
