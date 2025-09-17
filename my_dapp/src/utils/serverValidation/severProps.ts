"use server";
import fs from 'fs/promises';  // Use promises version
import { CircuitFiles } from "@/utils/zkProofInputs";

// validate files from the server-side contexts
export async function validateCircuitFilesServer(files: CircuitFiles): Promise<void> {
    try {
        await Promise.all([
            fs.access(files.wasmPath),
            fs.access(files.zkeyPath),
            fs.access(files.vkeyPath)
        ]);
    } catch (error: any) {
        throw new Error(`Circuit file validation failed: ${error.message}`);
    }
}

//  reading verification key
export async function readVerificationKey(vkeyPath: any) {
    try {
        const vkeyContent = await fs.readFile(vkeyPath, 'utf8');
        return JSON.parse(vkeyContent);
    } catch (error: any) {
        throw new Error(`Failed to read verification key: ${error.message}`);
    }
}

