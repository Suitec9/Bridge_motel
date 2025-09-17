import { NextRequest, NextResponse } from "next/server";
import { useEERC } from "@avalabs/eerc-sdk";
import { publicClient, walletClient, CONTRACTS, CIRCUIT_CONFIG } from "../ava-hook/route";
import { error } from "console";

export async function POST(request: NextRequest) {
    try {
        const { decryptionKey , tokenAddress } = await request.json();

        if (!decryptionKey) {
            return NextResponse.json(
                { error: 'Decryption key is required'},
                { status: 400}
            )
        }

        // Initialize eERC hook with decryption key
        const {
            useEncryptedBalance,
        } = useEERC(
            publicClient,
            walletClient,
            CONTRACTS.EERC_STANDALONE,
            CIRCUIT_CONFIG,
            decryptionKey
        );

        // Get encrypted balance
        const balanceResult = useEncryptedBalance(tokenAddress);

        return NextResponse.json({
            balance: balanceResult,
            success: true
        });
    } catch (error: any) {
        console.error('failed to get encrypted balance:', error);
        return NextResponse.json(
            { 
                error: 'Failed to get balance',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500}
        );
    }
}