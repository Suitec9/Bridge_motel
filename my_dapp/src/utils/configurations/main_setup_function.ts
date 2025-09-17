"use server";
// ============================================================================================
// MAIN SETUP FUNCTION
// ============================================================================================

import { ethers } from "ethers";
import { CircuitSetUpManager } from "./config-script";
import {eERC20DeploymentHelper } from "./deployments-scripts";
import { eERC20TestHelper } from "./testing-utilities";

/**
 *  Main setup function to initialize cmplete eERC20 ZK system
 */
export async function setupERC20ZKSystem(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    options: {
        circuitsDir?: string;
        buildDir?: string;
        skipCompilation?: boolean;
        deployContracts?: boolean;
        tokenName?: string;
        tokenSymbol?: string;
        initialSupply?: string;
    } = {}
): Promise<{
    proofGenerator: any;
    contractAddress: { [key: string]: string };
    setupManager: CircuitSetUpManager;
}> {
    console.log('🌟️ Initializing complete eERC20 ZK system...');

    const {
        circuitsDir = './circuits',
        buildDir = './build',
        skipCompilation = false,
        deployContracts = true,
        tokenName = 'Encrypted Token',
        tokenSymbol = 'eETH',
        initialSupply = '1000000'
    } = options;

    try {
        // 1. Setup circuit compilation
        const setupManager = new CircuitSetUpManager(circuitsDir, buildDir);

        // 2. Initialize proof generator
        const { eERC20ZKProofGenerator } = await import('../zkProofInputs');
        const proofGenerator = new eERC20ZKProofGenerator(provider);

        // 3. Initialize circuits
        const circuits = ['REGISTRATION', 'TRANSFER', 'BALANCE_PROOF', 'MINT_PROOF'] as const;

        for (const circuit of circuits) {
            const circuitName = circuit.toLowerCase().replace('_', '_');
            const files = setupManager.getCircuitFiles(circuitName);
            await proofGenerator.intializeCircuit(circuit, files);
        }

        // 4. Deploy contracts if requested
        let contractAddress: { [key: string]: string} = {};

        if (deployContracts) {
            const deploymentHelper = new eERC20DeploymentHelper(provider, signer);

            // Deploy verifiers
            const verifierAddress = await deploymentHelper.deployVerifiers(buildDir);

            // Deploy main contract
            const mainContractAddress = await deploymentHelper.deployeERC20Contract(
                verifierAddress,
                tokenName,
                tokenSymbol,
                initialSupply
            );

            contractAddress = {
                ...verifierAddress,
                eERC20: mainContractAddress
            };
        }

        // Run test
        const testHelper = new eERC20TestHelper(proofGenerator, setupManager);
        await testHelper.runAllTests();

        console.log('🎉️ eERC20 ZK system setup completed successfully!');

        return {
            proofGenerator,
            contractAddress,
            setupManager
        };
    } catch (error: any) {
        console.error('❌️ eERC20 ZK system setup failed', error.message);
        throw error;
    }
}