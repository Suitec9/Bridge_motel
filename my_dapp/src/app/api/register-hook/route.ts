import { NextRequest, NextResponse } from "next/server";
import { useEERC } from "@avalabs/eerc-sdk";
import { publicClient, walletClient, CONTRACTS, CIRCUIT_CONFIG } from "../ava-hook/route";
import { error } from "console";
import { generateCompleteRegistrationProof, validateProof } from "@/utils/mockZKProofs";

export async function POST(request: NextRequest) {
    try {
        const { walletAddress, decryptionKey } = await request.json();
        
        if (!walletAddress || !decryptionKey) {
            return NextResponse.json(
                { error: 'Wallet address and decryption key are required' },
                { status: 400 }
            );
        }

        // Initialize eERC hook with decryption key
        const {
            register,
        } = useEERC(
            publicClient,
            walletClient,
            CONTRACTS.EERC_STANDALONE,
            CIRCUIT_CONFIG,
            decryptionKey
        );
        
        console.log('🔐 Starting eERC20 registration process...');

        // Generate ZK proof using mock impl
        const proof = await generateCompleteRegistrationProof(
            walletAddress,
            43114 // fuji testnet
        );

        // validate the proof
        if (!validateProof(proof)) {
            throw new Error('Invalid proof generated');
        }

        console.log('✅️ eERC20 registration completed');

        // Register with the protocol
        const result = await register();

        return NextResponse.json({
            success: true,
            key: result.key,
            transactionHash: result.transactionHash,
            proof: proof
        });
    } catch (error: unknown) {
        console.error('eERC20 registration failed:', error);

        return NextResponse.json(
            {
                error: 'Registration failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}