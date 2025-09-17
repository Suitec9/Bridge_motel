import { NextRequest, NextResponse } from "next/server";
import { useEERC } from "@avalabs/eerc-sdk";
import { publicClient, walletClient, CONTRACTS, CIRCUIT_CONFIG } from "../ava-hook/route";

export async function POST(request: NextRequest) {
    try {
        const { walletAddress } = await request.json();

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400}
            );
        }

        // Initailize the eERC20 hook on server
        const {
            generateDecryptionKey,
        } = useEERC(
            publicClient,
            walletClient,
            CONTRACTS.EERC_STANDALONE,
            CIRCUIT_CONFIG,
            undefined // no decryption key needed for key genenration
        );

        // Generate decryption key
        const key = await generateDecryptionKey();

        return NextResponse.json({
            key,
            success: true
        });
    } catch (error: unknown) {
        console.error('key generation failed:', error);

        return NextResponse.json(
            { error: 'Wallet address and decryption key are required'},
            { status: 500 }
        );
    }
}