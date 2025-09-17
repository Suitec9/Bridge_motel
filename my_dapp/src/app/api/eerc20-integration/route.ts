import { eERC20ZKProofGenerator } from "@/utils/zkProofInputs";
import { ethers } from "ethers";
import { NextResponse } from "next/server";

export async function POST() {
    try {

        console.log('🚀️ Initializing eERC20 integration for Motel Smart Wallet...');
        
        // Get provided and signer from wagmi
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        //const signer = provider.getSigner();
        
        // Initialize proof generator
        const pg = new eERC20ZKProofGenerator(provider);
        
        // Initialize with circuits
        const circuits = ['REGISTRATION', 'TRANSFER', 'BALANCE_PROOF', 'MINT_PROOF'] as const;
        
        for (const circuit of circuits) {
            const circuitName = circuit.toLowerCase().replace('_proof', '').replace('_', '_');
            const files = {
                wasmPath: `./src/utils/circom/build/eerc20_keys/${circuitName}.wasm`,
                zkeyPath: `./src/utils/circom/build/eerc20_keys/${circuitName}_final.zkey`,
                vkeyPath: `./src/utils/circom/build/errc20_keys/${circuitName}.vkey.json`
            };
        
        const proofGenerator = await pg.intializeCircuit(circuit, files);
        return NextResponse.json({proofGenerator, success: true});
            
        }           
            
    } catch (error: unknown) {
        console.error('Initialization failed', error);

        return NextResponse.json({error: 'Initialization failed'}, {status: 500});
    }
}