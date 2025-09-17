// ERC20 Proof setup Scripts and Interactions Helpers

import { ethers } from "ethers";
import { execSync } from "child_process";
import fs from "fs"
import path from "path"


// ============================================================================================
//   CIRCUIT COMPILATION AND SETUP
// ============================================================================================

export class CircuitSetUpManager {
    private buildDir: string;
    private circuitsDir: string;

    constructor(circuitsDir = './circuits', buildDir = './build') {
        this.circuitsDir = circuitsDir;
        this.buildDir = buildDir;
    }

    /**
     *  Complete setup process for all eERC20 circuits
     */
    async setupAllCircuits(): Promise<void> {
        console.log('🚀️ Starting eERC20 ZK Circuit Setup...');

        try {
            // 1. Create directories
            await this.createDirectories();

            // 2. Install dependencies
            await this.installDependencies();

            // 3. Compile all circuits
            await this.compileAllCircuits();

            // 4. Generate trusted setup
            await this.generateTrustedSetUp();

            // 5. Generate circuit-specific keys
            await this.generateCircuitKeys();

            // 6. Generate solidity verifiers
            await this.generateSolidityVerifiers();

            // 7. Validate setup
            await this.validateSetup();

            console.log('✅️ eERC20 ZK Circuit setup completed successfully!');
        } catch (error: any) {
            console.error('❌️ Circuit setup failed:', error.message);
            throw error;
        }
    }

    private async createDirectories(): Promise<void> {
        const dirs = [this.buildDir, `${this.buildDir}/keys`, `${this.buildDir}/verifiers`];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁️ Created directory: ${dir}`);
            }
        }
    }

    private async installDependencies(): Promise<void> {
        console.log("🌐️ Installing circom and snarkjs...");

        try {
            // Check if circom is installed
            execSync('circom --version', { stdio: 'pipe'});
            console.log('✅️ circom already installed');
        } catch {
            console.log('Installed circom globally...');
            execSync('npm install -g circom', { stdio: 'inherit'});
        }
    }

    private async compileAllCircuits(): Promise<void> {
        const circuits = [
            'eerc20_registration',
            'eerc20_transfer',
            'eerc20_balance',
            'eerc20_mint',
            'eerc20_burn'
        ];

        console.log('🛠️ compiling circuits...');

        for (const circuit of circuits) {
            try {
                const circuitPath = path.join(this.circuitsDir, `${circuit}.circom`);

                if (!fs.existsSync(circuitPath)) {
                    console.warn(`⚠️ Circuit file not found: ${circuitPath}`);
                    continue;
                }

                console.log(`Compiling ${circuit}...`);
                execSync(
                    `circom ${circuitPath} -o ${this.buildDir} --r1cs --wasm --sym `,
                    { stdio: 'pipe'}
                );
                console.log(`✅️ ${circuit} compiled successfully`);
            } catch (error: any) {
                console.error(`❌️ Failed to compile ${circuit}:`, error.message);
            }
        }
    }

    private async generateTrustedSetUp(): Promise<void> {
        console.log('🔏️ Generating trusted setup (Powers of tau)...');

        const ptauFile = path.join(this.buildDir, 'pot16_final.ptau');

        if (fs.existsSync(ptauFile)) {
            console.log(' Trusted setup already exists');
            return;
        }

        try {
            // Generate new ceremony
            execSync(
                `npx snarkjs powersoftau new bn128 16 ${this.buildDir}/pot16_0000.pt -v`,
                { stdio: 'pipe'}
            );

            // Contribute to ceremony
            execSync(
                `npx snarkjs poweroftau contribute ${this.buildDir}/pot16_0000.ptau ${this.buildDir}/pot16_0001.ptau --name="eERC20 Setup" -v`,
                { stdio: 'pipe'}
            );

            // Prepare phase 2
            execSync(
                `npx snarkjs poweroftau prepare pgase 2 ${this.buildDir}/pot16_0001.ptau ${ptauFile} -v`,
                { stdio: 'pipe'}
            );

            // Cleanup temporary files
            fs.unlinkSync(path.join(this.buildDir, 'pot16_0000.ptau'));
            fs.unlinkSync(path.join(this.buildDir, 'pot16_0001.ptau'));

            console.log('✅️ Trusted setup generated');
        } catch (error: any) {
            console.error('❌️  Trusted setup generation failed:', error);
            throw error;
        }
    }

    private async generateCircuitKeys(): Promise<void> {
        console.log('🗝️ Generating circuit-specific keys...');

        const circuits = [
            'eerc20_registration',
            'eerc20_transfer',
            'eerc20_balance',
            'eerc20_mint',
            'eerc20_burn'
        ];

        const ptauFile = path.join(this.buildDir, 'pot16_final.ptau');

        for (const circuit of circuits) {
            try {
                const r1csFile = path.join(this.buildDir, `${circuit}`);

                if (!fs.existsSync(r1csFile)) {
                    console.warn(`⚠️ R1cs file not found for ${circuit}`);
                    continue;
                }

                const zkeyTempFile = path.join(this.buildDir, 'keys', `${circuit}_0000.zkey`);
                const zkeyFinalFile = path.join(this.buildDir, 'keys', `${circuit}_0000.zkey`);
                const vkeyFile = path.join(this.buildDir, 'keys', `${circuit}.vkey.json`);

                if (fs.existsSync(zkeyFinalFile) && fs.existsSync(vkeyFile)) {
                    console.log(`✅️ Keys already exist for ${circuit}`);
                    continue;
                }

                console.log(`Generating keys for ${circuit}...`);

                // Generate initial zkey
                execSync(
                    `npx snarkjs groth16 setup ${r1csFile} ${ptauFile} ${zkeyTempFile}`,
                    { stdio: 'pipe'} 
                );

                // Contribute to circuit-specific ceremony
                execSync(
                    `npx snarkjs zkey contribute ${zkeyTempFile} ${zkeyFinalFile} --name="eERC20 ${circuit}" -v`,
                    { stdio: 'pipe'}
                );

                // Export verification key
                execSync(
                    `npx snarkjs key export verificationkey ${zkeyFinalFile} ${vkeyFile}`,
                    { stdio: 'pipe'}
                );

                // Clean temporary file
                if (fs.existsSync(zkeyTempFile)) {
                    fs.unlinkSync(zkeyTempFile);
                }

                console.log(`✅️ Keys generated for ${circuit}`);
            } catch (error: any) {
                console.error(`❌️ Key generation failed for ${circuit}:`, error.message);
                throw error;
            }
        }
    }

    private async generateSolidityVerifiers(): Promise<void> {
        console.log('📄️ Generating Solidity verifiers...');

        const circuits = [
            'eerc20_registration',
            'eerc20_transfer',
            'eerc20_balance',
            'eerc20_mint',
            'eerc20_burn'
        ];

        for (const circuit of circuits) {
            try {
                const zkeyFile = path.join(this.buildDir, 'keys', `${circuit}>final.zkey`);
                const verifierFile = path.join(this.buildDir, 'verifiers', `${circuit}Verifier.sol`);

                if (!fs.existsSync(zkeyFile)) {
                    console.warn(`⚠️ ZKey file not found for ${circuit}`);
                    continue;
                }

                if (fs.existsSync(verifierFile)) {
                    console.log(`✅️ Verifier already exists for ${circuit}`);
                    continue;
                }

                console.log(`Generating solidity verifier for ${circuit}...`);

                execSync(
                    `npx snarkjs zkey export solidityverifier ${zkeyFile} ${verifierFile}`,
                    { stdio: 'pipe'}
                );

                // Modify contract name to be more descriptive
                let verifierContent = fs.readFileSync(verifierFile, 'utf8');
                verifierContent = verifierContent.replace(
                    'contract Verifier {',
                    `contract ${circuit.charAt(0).toUpperCase() + circuit.slice(1).replace(/ _/g, '')}Verifier {`
                );
                fs.writeFileSync(verifierFile, verifierContent);

                console.log(`✅️ Verifier granted for ${circuit}`);
            } catch (error: any) {
                console.error(`❌️ Verifier generation failed for ${circuit}:`, error.message);
                throw error;
            }
        }
    }

    private async validateSetup(): Promise<void> {
        console.log('🔍️ Validating setup...');

        const requiredFiles = [
            'pot16_final.ptau',
            'keys/eerc20_registration_final.zkey',
            'keys/eerc20_registration.vkey.json',
            'keys/eerc20_transfer_final.zkey', 
            'keys/eerc20_transfer.vkey.json',
            'verifiers/eerc20RegistrationVerifier.sol',
            'verifiers/eerc20TransferVerifier.sol'
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(this.buildDir, file);

            if (!fs.existsSync(filePath)) {
                throw new Error(`Required file missing: ${filePath}`);
            }
        }

        console.log('✅️ All required files present');
    }

    /**
     *  Get circuit file paths for proof generation
     */
    getCircuitFiles(circuitType: string): { wasmPath: string; zkeyPath: string; vkeyPath: string } {
        return {
            wasmPath: path.join(this.buildDir, `${circuitType}.wasm`),
            zkeyPath: path.join(this.buildDir, 'keys', `${circuitType}_final.zkey`),
            vkeyPath: path.join(this.buildDir, 'keys', `${circuitType}.vkey.json`)
        };
    }
}