"use client"
import React, { useState, useCallback, useEffect } from 'react';
import { 
  ArrowDown, 
  Eye, 
  ArrowUpDown, 
  Shield, 
  Key, 
  Lock,
  Send,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { useEERC20Integration } from '../hooks/useEERC20Registration';
import { avalanche, avalancheFuji, Chain } from 'wagmi/chains';
import { formatEther } from 'viem/utils';
import { eERC20ContractInterface, eERC20ZKProofGenerator } from '@/utils/zkProofInputs';
import {ethers, providers, Signer, utils} from "ethers"
import { parseEther } from 'ethers/lib/utils';
import { geteERC20ABI } from '../../constants/eerc20ContractABI';
import { hookProps, UseEncryptedBalanceHookResult } from '@/hooks/config/configs'
import { DecryptedTransaction } from '@avalabs/eerc-sdk';

interface AvaxBalance {
    decimals: number;
    formatted: string;
    symbol: string;
    value: bigint;
} 

interface Balance {
  avax?: AvaxBalance ;
  bonds: string;
  encrypted: string; // eERC20 encrypted balance
}

interface EnhancedWalletProps {
  balance: Balance;
  userHoldingWallet: string | null;
  hasValidNames: boolean;
  onCreateWallet?: () => void;
  onRegisterName?: () => void;
}
 
export const EnhancedWallet: React.FC<EnhancedWalletProps> = async ({
    balance,
    userHoldingWallet,
    hasValidNames,
    onCreateWallet,
    onRegisterName
}) => {

    const { isConnected } = useAccount();
    const { address } = useAccount();
        const { checkAddressRegistered, encryptedBalance} =  useEERC20Integration()
    // eERC20 specific state
    const [isRegisteredForEERC20, setIsRegisteredForEERC20] = useState(false);
    const [encryptedTokenBalance, setEncryptedTokenBalance] = useState< string>('');
    const [secretKey, setSecretKey] = useState<string | null>(null);
    const [proofGenerator, setProofGenerator] = useState<eERC20ZKProofGenerator | null>(null);
    const [contractInterface, setContractInterface] = useState<eERC20ContractInterface | null>(null);
    const [isInitializingEERC20, setIsInitializingEERC20] = useState(false);
    const [zkProofStatus, setZKProofStatus] = useState<'idle' | 'generating' | 'submitting' | 'completed' | 'failed'>('idle');
  

    // Transaction forms
    const [transferForm, setTransferForm] = useState({ recipient: '', amount: ''});
    const [mintForm, setMintForm] = useState({ amount: ''});
    const [balanceProofForm, setBalanceProofForm] = useState({ minBalance: ''});


    
    const [activeTab, setActiveTab] = useState<'regular' | 'encrypted'>('regular');
    const [showKeyGeneration, setShowkeyGeneration] = useState(false);
    const { data: avaxBalance } = useBalance({
        address,
        chainId: avalanche?.id || avalancheFuji.id
      });
    
    if (!isConnected) {
        return (
        <div className="text-center py-8 text-gray-400">
            Wallet not connected
            </div>
            );
    };
    
    // ========================================================================================
    // eERC20 INITIALIZATION
    // ========================================================================================

    const provider = new ethers.providers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');

    const signer =  provider.getSigner()

    useEffect(() => {
      if (isConnected && address && signer && !proofGenerator) {
        initializeEERC20System();
      }
    }, [isConnected, address, signer]);

    const initializeEERC20System = async () => {
      if (!signer || !address) return;

      try {
        setIsInitializingEERC20(true);
        console.log('🚀️ Initializing eERC20 system for AB Smart Wallet...');

        // Initialize proof generator
        const pg = new eERC20ZKProofGenerator(provider);

        // fetch intiailization from the server
        const response = await fetch('/api/eerc20-integration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData || 'Initailization failed');
        
        }
        await response.json();
        setProofGenerator(pg);

        // Initialize contract interface
        // fuji eERC20/my subnet eERC20 smart contract
        const contractAddress = process.env.NEXT_PUBLIC_EERC20_CONTRACT || '0x';
        const abi = geteERC20ABI();

        const ci = new eERC20ContractInterface(contractAddress, abi, signer, pg);

        setContractInterface(ci);

        // load user's eERC20 state
        await loadUserEERC20State(address, pg);

        console.log('✅️ eERC20 system initialized successfully');
      } catch (error: any) {
        console.error('❌️ eERC20 initialized failed:', error);
        alert(`eERC20 initialization failed: ${error.message}`);
      } finally {
        setIsInitializingEERC20(false);
      }
    };
 
    const loadUserEERC20State = async (userAddress: string, pg: eERC20ZKProofGenerator) => {
      try {
        // Check registration status on-chain
        const isRegistered = await checkAddressRegistered(userAddress);
        setIsRegisteredForEERC20(isRegistered);

        // Load or generate secret key
        const sk = await loadOrGenerateSecretKey(userAddress);
        setSecretKey(sk);

        // Load encrypted balance if registered
        if (isRegistered) {
          const encBalance = await encryptedBalance(userAddress);
          setEncryptedTokenBalance(encBalance.encryptedBalance);
        }

      } catch (error: any) {
        console.error('Failede to load eERC20 state:', error);
      }
    };

    // ========================================================================================
    // eERC20 OPERATIONS
    // ========================================================================================

    const handleEncryptedRegistration = async () => {
      if (!contractInterface || !address || !signer) {
        alert('System not ready for registration');
        return;
      }

      try {
        setZKProofStatus('generating');

        const chainId = await signer.getChainId();
        console.log('🔏️ Generating registration proof...');

        const tx = await contractInterface.register(address, chainId);

        setZKProofStatus('submitting');
        console.log('📤️ Submitting registration transaction...');

        const receipt = await tx.wait();

        setZKProofStatus('completed');
        console.log('✅️ Registration completed:', receipt);

        // Update state
        setIsRegisteredForEERC20(true);
        setEncryptedTokenBalance('0');
      } catch (error: any) {
        console.error('❌️ Registration failed:', error);
        setZKProofStatus('failed');
        alert(`Registration failed: ${error.message}`);
      }
    };

    const handleEncryptedTransfer = useCallback(async () => {
      if (!contractInterface || !secretKey || !transferForm.recipient || transferForm.amount) {
        alert('Please fill all transfer details');
        return;
      }

      try {
        setZKProofStatus('generating');
        console.log('🔐️ Generating transfer proof...');

        const amount = parseEther(transferForm.amount).toString();
        const currentBalance = parseEther(encryptedTokenBalance).toString();
        const nonce = Date.now().toString();

        const tx = await contractInterface.transfer(
          transferForm.recipient,
          amount,
          currentBalance,
          secretKey,
          nonce
        );

        setZKProofStatus('submitting');
        console.log('📤️ Submitting encrypted trsnsfer');

        const receipt = await tx.wait();

        setZKProofStatus('completed');
        console.log('✅️ Transfer completed:', receipt);

        // Update local balance
        const newBalance = (BigInt(encryptedTokenBalance) - BigInt(transferForm.amount)).toString();
        setEncryptedTokenBalance(newBalance);

        // Reset form
        setTransferForm({ recipient: '', amount: ''});

      } catch (error: any) {
        console.error('❌️ Transfer failed:', error);
        setZKProofStatus('failed');
        alert(`Transfer failed: ${error.message}`);
      }
    }, []);

    const handleBalanceProof = useCallback(async () => {
      if (!proofGenerator || !secretKey || !balanceProofForm.minBalance || !address) {
        alert('Please enter minimum balance to prove');
        return;
      }

      try {
        setZKProofStatus('generating');
        console.log('🔐️ Generating balance proof...');

        const actualBalance = parseEther(encryptedTokenBalance).toString();
        const minBalance = parseEther(balanceProofForm.minBalance).toString();

        const proof = await proofGenerator.generateBalanceProof(
          address,
          actualBalance,
          minBalance,
          secretKey
        );

        setZKProofStatus('completed');
        console.log(`🔏️ Balance proof generated successfully: ${proof}`);
        
        setBalanceProofForm({ minBalance: ''});
      } catch (error: any) {
        console.error('❌️ Balance proof failed:', error);
        setZKProofStatus('failed');

        if (error.message.includes('Insufficient balance')) {
          alert('❌️ Insufficient balance for the requested proof');
        } else {
          alert(`Balance proof failed: ${error.message}`);
        }
      }
    }, []);

    const handleMintTokens = useCallback(async () => {
      if (!proofGenerator || !secretKey || !mintForm.amount || !address) {
        alert('Please enter amount');
        return;
      }

      try {
        setZKProofStatus('generating');
        console.log('🔐️ Generating mint proof...');

        const amount = parseEther(mintForm.amount).toString();

        const proof = await proofGenerator.generateMintingProof(
          address,
          amount,
          address,
          secretKey
        );

        setZKProofStatus('completed');
        console.log('✅️ Mint proof generated:', proof);

        // Update local balance
        const newBalance = (BigInt(String(encryptedTokenBalance)) + BigInt(mintForm.amount)).toString();
        
        setEncryptedTokenBalance(newBalance);

        // Reset mint
        setMintForm({ amount: ''});
        alert(`✅️ Successfully minted ${mintForm.amount} eETH`);

      } catch (error: any) {
        console.error('❌️ Minting failed:', error);
        setZKProofStatus('failed');
        alert(`Minting failed: ${error.message}`)
      }
    }, []);
    // Check if user can access eERC20 features
    const canAccessEncrypted = userHoldingWallet || hasValidNames;

    // Check registration status on mount
    useEffect(() => {
        if (address && canAccessEncrypted) {
            checkAddressRegistered(address);
        }
    }, [address, canAccessEncrypted, isRegisteredForEERC20]);

  
/**    const handleKeyGeneration = useCallback(async () => {
        setShowkeyGeneration(true);
        try {
            await handleGenerateKey();
        } finally {
            setShowkeyGeneration(false);
        }
    }, [handleGenerateKey]);

    const handleRegistation = useCallback(async () => {
        try {
            const result = await handleRegister();
            if (result?.success) {

                // Registration successful - could show success message
                console.log('Registration successful:', result.transactionHash);
            }
        } catch (err) {
            console.error('Registration error:', err);
        }
    }, [handleRegister]);
 */ 
    // Encrypted operations (placeHolders)
    const handleEncryptedDeposit = useCallback(async () => {
        try {
            // Implement encrypted deposit using encryptedBalance.mint()
            console.log('Encrypted deposit');
        } catch (err) {
            console.error('Encrypted deposit failed:', err);
        }
    }, []);

    const handleEncryptedWithdraw = useCallback(async () => {
        try {
            // Implement encrypted withdraw using encryptedBalance.burn()
            console.log('Encrypted withdraw');
        } catch (err) {
            console.error('Encrypted withdraw failed:', err);
        }
    }, []);

    // private mints
    const handlePrivateMints = useCallback(async () => {
        try {
            // Implement private mint using encryptedBalance.Mint()
            console.log('Private mint');
        } catch (err) {
            console.error('Private mint failed:', err);
        }
    }, []);

    // ========================================================================================
    // HELPER FUNCTIONS
    // ========================================================================================
    const loadOrGenerateSecretKey = async (address: string): Promise<string> => {
      // Store securely (encrypted) or derive deterministically
      const message = `Generate secret key for eERC20: ${address}`;
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));
      const fieldSize = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
      return (BigInt(hash) % fieldSize).toString();
    };


    const copyToClipBoard = (text: string) => {
      navigator.clipboard.writeText(text);
    }

    const renderRegistrationPanel = () => (
      !isRegisteredForEERC20 && canAccessEncrypted && (
            <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-xl p-6 border border-purple-500/30">
                <div className="flex items-center mb-4">
                    <Shield className="mr-3 text-purple-400" size={24} />
                    <h3 className="text-xl font-bold text-white">eERC20 Privacy Setup</h3>
                </div>
                
                {zkProofStatus !== 'idle' && (
                    <div className="mb-4 bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                                zkProofStatus === 'generating' ? 'bg-yellow-400 animate-pulse' :
                                zkProofStatus === 'submitting' ? 'bg-blue-400 animate-pulse' :
                                zkProofStatus === 'completed' ? 'bg-green-400' :
                                'bg-red-400'
                            }`}></div>
                            <span className="text-white text-sm">
                                {zkProofStatus === 'generating' && 'Generating Zero-Knowledge Proof...'}
                                {zkProofStatus === 'submitting' && 'Submitting Registration...'}
                                {zkProofStatus === 'completed' && 'Registration Completed Successfully'}
                                {zkProofStatus === 'failed' && 'Registration Failed'}
                            </span>
                        </div>
                    </div>
                )}

                <p className="text-gray-300 text-sm mb-4">
                    Enable encrypted transactions with eERC20 tokens. This will generate a decryption key and register you for private operations.
                </p>
                
                <button
                    onClick={handleEncryptedRegistration}
                    disabled={zkProofStatus !== 'idle'}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg transition-all duration-300 font-medium flex items-center justify-center"
                >
                    {zkProofStatus === 'generating' ? (
                        <Loader2 className="animate-spin mr-2" size={16} />
                    ) : (
                        <Key className="mr-2" size={16} />
                    )}
                    {zkProofStatus === 'generating' ? 'Setting Up...' : 'Enable eERC20 Privacy'}
                </button>
            </div>
        )
    );
    const renderEncryptedActions = () => (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 
      border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Lock className="mr-2 text-green-400" size={20} />
          Encrypted Operations
        </h3>

        {zkProofStatus !== 'idle' && (
          <div className="mb-4 bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                zkProofStatus === 'generating' ? 'bg-yellow-400 animate-pulse' :
                zkProofStatus === 'submitting' ? 'bg-blue-400 animate-pulse' :
                zkProofStatus === 'completed' ? 'bg-green-400' :
                'bg-red-400'
              }`}></div>
              <span className="text-white text-sm">
                {zkProofStatus === 'generating' && 'Generating Zero-Knowledge Proof...'}
                {zkProofStatus === 'submitting' && 'Submitting Encrypted transzction...'}
                {zkProofStatus === 'completed' && 'Operation Completed Successfully'}
                {zkProofStatus === 'failed' && 'Operation failed'}
              </span>
            </div>
          </div>
        )}
        {/** Encrypted Transfer Form */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">Private Transfer</label>
          <div className="space-y-3">
            <input 
             type='text'
             placeholder='Recipient address (0x...)'
             value={transferForm.recipient}
             onChange={(e) => setTransferForm({...transferForm, recipient: e.target.value})}
             className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 
             focus:border-purple-500 focus:outline-none"
             />
             <div className="flex space-x-3">
              <input
               type="number"
               placeholder='Amount (eERC)'
               value={transferForm.amount}
               onChange={(e) => setTransferForm({...transferForm, recipient: e.target.value})}
               className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600
               focus:border-purple-500 focus:outline-none" 
               />
               <button
                onClick={handleEncryptedTransfer}
                disabled={zkProofStatus !== 'idle' || !transferForm.recipient || !transferForm.amount}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white 
                px-6 py-2 rounded transition-all duration-300 font-medium"
                >
                  Send
                </button>
             </div>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            Amount and balance remain completely private
          </p>
        </div>

        {/**Balance Proof */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3">🔍️ Prove Balance</h4>
          <div className="space-y-3">
            <input
             type='number'
             placeholder='Minimum balance to prove'
             value={balanceProofForm.minBalance}
             onChange={(e) => setBalanceProofForm({...balanceProofForm, minBalance: e.target.value})}
             className='w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600
             focus:outline-none text-sm' 
             />
             <button 
              onClick={handleBalanceProof}
              disabled={zkProofStatus !== 'idle' || !balanceProofForm.minBalance}
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600
              text-white py-2 px-4 rounded-lg hover:from-yellow-700 hover:to-orange-700
              transition-all duration-300 font-medium disabled:opacity-50 text-sm"
              >
                Generate BalanceProof
              </button>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            ✨️ Prove minimum balance without revealing actual amount
          </p>
        </div>
        {/**Mint Tokens (admin/testing) */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3">💽️⚡️MInt Tokens</h4>
          <div className="space-y-3">
            <input
             type='number'
             placeholder='Amount to mint'
             value={mintForm.amount} 
             onChange={(e) => setMintForm({...mintForm, amount: e.target.value})}
             className='w-full bg-gradient-to-r from-purple-700 text-white px-3 py-2
             rounded border border-gray-600 focus:border-purple-500 focus:outline-none text-sm'
             />
             <button 
             onClick={handleMintTokens}
             disabled={zkProofStatus !== 'idle' || !mintForm.amount}
             className='w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white
             py-2 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all
             duration-300 font-medium disabled:opacity-50 text-sm'>
              Mint eETH Tokens
             </button>
          </div>
          <p className="text-gray-400 text-xsmt-2">
            🔧️ Testing/Admin feature
          </p>
        </div>
        {/**Privacy Features Info */}
        <div className="bg-purple-900 rounded-lg p-4 border border-purple-600/30">
        <h4 className="text-purple-300 font-semibold mb-3">🛡️ Privacy Features</h4>
        <div className="space-y-2">
          <div className="flex items-center text-green-400 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            <span>Encrypted balances</span>
          </div>
          <div className="flex items-center text-green-400 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2">
              <span>Private transfer amounts</span>
            </div>
            <div className="flex items-center text-green-400 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span>Zero-Knowledge proofs</span>
            </div>
            <div className="flex items-center text-green-400 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span>No transaction linkability</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    );

    const renderRegularActions = () => (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center">
        <ArrowDown className="mr-2 text-blue-400" size={20} />
        Quick Actions
      </h3>
      <div className="space-y-3">
         <button 
              className={`w-full py-3 px-4 rounded-lg transition-all duration-300 font-medium
                ${isConnected 
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              disabled={!isConnected}
            >
          Deposit AVAX
        </button>
        <button 
              className={`w-full py-3 px-4 rounded-lg transition-all duration-300 font-medium
                ${isConnected 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              disabled={!isConnected}
            >Transfer funds
        </button>
        <button 
              className={`w-full py-3 px-4 rounded-lg transition-all duration-300 font-medium
                ${isConnected 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              disabled={!isConnected}
            > 
            Withdraw (fee: 2%)
        </button>
      </div>
    </div>
  );

  const renderBalanceOverview = () => (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center">
        <Eye className="mr-2 text-purple-400" size={20} />
        Balance Overview
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400">AVAX balance</span>
          <span className="text-white font-medium">
                {avaxBalance ? `${parseFloat(formatEther(avaxBalance.value)).toFixed(4)} AVAX` : 'N/A'}
           </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400">AB bonds</span>
          <span className="text-white font-medium">{balance.bonds} Bonds</span>
        </div>
        {isRegisteredForEERC20  && (
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <span className="text-gray-400 flex items-center">
              <Lock className="mr-1" size={12} />
              Encrypted eERC20
            </span>
            <span className="text-green-400 font-medium">{balance.encrypted} eERC</span>
          </div>
        )}
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-400">Incentive Tokens</span>
          <span className="text-gray-500">Coming soon</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
        {/** Access setup section */}
        {!canAccessEncrypted && (
            <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20
            rounded-xl p-6 border-yellow-500/30">
                <h3 className="text-xl font-bold text-white mb-4">Get Started</h3>
                <p className="text-gray-300 mb-4">Create a holding wallet or register a name access all features:</p>
                <div className="flex gap-3">
                    <button 
                    onClick={onCreateWallet}
                    className="flex bg-blue-600 hover:bg-blue-700 text-white py-2
                    px-4 rounded-lg transtition-all duration-300 font-medium">
                        Create Holding Wallet
                    </button>
                    <button 
                    onClick={onRegisterName}
                    aria-placeholder='text...'
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white 
                    py-2 px-4 rounded-lg transition-all duration-300 font-medium"
                    >
                        Register Name Service
                    </button>
                </div>
            </div>
        )}

        {/** eERC Registration Panel */}
        {canAccessEncrypted && !isRegisteredForEERC20  && renderRegistrationPanel()}

        {/** Tab Navigation */}
        {canAccessEncrypted && (
            <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
                <button
                onClick={() => setActiveTab('regular')}
                className={`flex-1 py-2 px-4 rounded-mb transition-all duration-200
                    font-medium ${activeTab === 'regular'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Regular Wallet
                </button>
                <button 
                onClick={() => setActiveTab('encrypted')}
                disabled={!isRegisteredForEERC20 }
                className={`flex-1 py-2 px-4 rounded-md transition-all
                duration-200 font-medium flex items-center justify-center ${
                    activeTab === 'encrypted' && isRegisteredForEERC20 
                    ? 'bg-purple-600 text-white'
                    : !isRegisteredForEERC20 
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:text-white'
                }`}
                >
                    <Lock className="mr-1" size={14} />
                    Motel smart Wallet
                </button>
            </div>
        )}

        {/** Content based on active tab */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTab === 'regular' ? renderRegularActions() : renderEncryptedActions()}
            {renderBalanceOverview()}
        </div>
        { /** Recent Transactions */}
        
    
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <ArrowUpDown size={14} className="text-white" />
              </div>
              <div>
                <p className="text-white font-medium">Bond Purchase</p>
                <p className="text-gray-400 text-sm">Premium Bond - 15% discount applied</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-medium">-85 AVAX</p>
              <p className="text-gray-400 text-sm">2 hours ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
