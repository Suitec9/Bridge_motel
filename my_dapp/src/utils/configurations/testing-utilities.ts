// ============================================================================================
// TESTING UTILITIES
// ============================================================================================

import { CircuitSetUpManager } from "./config-script";

export class eERC20TestHelper {
    private proofGenerator: any;
    private setupManager: CircuitSetUpManager;

    constructor(proofGenerator: any, setupManager: CircuitSetUpManager) {
        this.proofGenerator = proofGenerator;
        this.setupManager = setupManager;
    }

    /**
     *  Run comprehensive test for all proof types
     */
    async runAllTests(): Promise<void> {
        console.log("🧪️ Running eERC20 ZK Proof tests...");

        try {
            await this.testRegistrationProof();
            await this.testTransferProof();
            await this.testBalanceProof();
            await this.testMintProof();

            console.log(' ✅️ All test passed!');
        } catch (error: any) {
            console.error('❌️ Tests failed:' , error.message);
        }
    }

    private async testRegistrationProof(): Promise<void> {
        console.log('Testing registration proof...');

        const testAddress = '0x1234567890123456789012345678901234567890';
        const chainId = 43114;

        const proof = await this.proofGenerator.generateRegisterationProof(testAddress, chainId);

        // Validate proof structure
        if (!proof.proof || !proof.publicSignals || proof.publicSignals.length !== 3) {
            throw new Error('Invalid refistration proof structure');
        }

        console.log('✅️ Registration proof test passed');
    }

    private async testTransferProof(): Promise<void> {
        console.log('Testing transfer proof...');

        const senderAddress = '0x1234567890123456789012345678901234567890';
        const recipientAddress = '0x0987654321098765432109876543210987654321';
        const amount = '1000';
        const balance = '5000';
        const secretKey = '12345';
        const nonce = '1';

        const proof = await this.proofGenerator.generateTransferProof(
            senderAddress,
            recipientAddress,
            amount,
            balance,
            secretKey,
            nonce
        );

        // Validate proof structure
        if (!proof.proof || !proof.publicSignals || proof.publicSignals !== 5) {
            throw new Error('Invalid transfer proof structure');
        }

        console.log('✅️ Transfer proof test passed');
    }

    private async testBalanceProof(): Promise<void> {
        console.log('Testing balance proof...');

        const userAddress = '0x1234567890123456789012345678901234567890';
        const actualBalance = ' 10000';
        const minBalance = '5000';
        const secretKey = '12345';

        const proof = await this.proofGenerator.generateBalanceProof(
            userAddress,
            actualBalance,
            minBalance,
            secretKey
        );

        // Validate proof structure
        if (!proof.proof || !proof.publicSignals || proof.publicSignals.length !== 3) {
            throw new Error(' Invalid balance proof structure');
        }

        console.log('Balance proof test passed');
    }

    private async testMintProof(): Promise<void> {
        console.log('Testing mint proof...');

        const userAddress = '0x1234567890123456789012345678901234567890';
        const mintBalance = '1000';
        const secretKey = '12345';

        const proof = await this.proofGenerator.generateMintingProof(
            userAddress,
            mintBalance,
            userAddress, // Same as Auth minter for test
            secretKey
        );

        // Validate proof structure
        if (!proof.proof || !proof.publicSignals || proof.publicSignals.length !== 3) {
            throw new Error('Invalid mint proof');
        }

        console.log('✅️ Mint proof test passed');
    }

    /**
     *  Generate test data for development
     */
    generateTestData(): any {
        return {
            user:  [
                {
                    address: '0x1234567890123456789012345678901234567890',
                    secretKey: '12345678901234567890123456789012345678901234567890123456789012345',
                    balance: '10000'
                },
                {
                    address: '0x0987654321098765432109876543210987654321',
                    secretKey: '98765432109876543210987654321098765432109876543210987654321098765',
                    balance: '5000'
                }
            ],
            
            transfers: [
                {
                    from: '0x1234567890123456789012345678901234567890',
                    to: '0x0987654321098765432109876543210987654321',
                    amount: '1000'
                }
            ],
            chainId: 431114
        };
    }
}