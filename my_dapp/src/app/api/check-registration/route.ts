import { NextRequest, NextResponse } from "next/server";
import { useEERC } from "@avalabs/eerc-sdk";
import { publicClient, walletClient, CONTRACTS, CIRCUIT_CONFIG } from "../ava-hook/route";

export async function POST(request: NextRequest) {
    try {
        const { address } = await request.json();

        if (!address) {
            return NextResponse.json(
                { error: 'Address is required'},
                { status: 400 }
            );
        }

        // Initialize eERC hook
        const {
            isAddressRegistered,
        } = useEERC(
            publicClient,
            walletClient,
            CONTRACTS.EERC_STANDALONE,
            CIRCUIT_CONFIG,
            undefined // no decryption key required  for regsitration 
        );

        const result = await isAddressRegistered(`0x${address.replace('0x', '')}`);

        return NextResponse.json({
            isRegistered: result.isRegistered,
            error: result.error,
            success: true
        });
    } catch (error: unknown) {
        console.error('Failed to check registration status:', error);
        return NextResponse.json(
            {
                error: 'Failed to check registration',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}