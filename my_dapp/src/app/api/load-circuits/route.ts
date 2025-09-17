import { NextRequest, NextResponse } from 'next/server';
import { validateCircuitFilesServer } from '@/utils/serverValidation/severProps';

export async function POST(request: NextRequest) {
    try {
        const { files } = await request.json();
        
        if (!files) {
            return NextResponse.json(
                { error: 'Files parameter is required' }, 
                { status: 400 }
            );
        }

        const validation = await validateCircuitFilesServer(files);
        return NextResponse.json({ success: true, validation });
    } catch (error: unknown) {
        console.error('Failed to validate files:', error);
        return NextResponse.json(
            { error: 'Validation failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}