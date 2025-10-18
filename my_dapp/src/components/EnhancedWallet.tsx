

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
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useAccount, useBalance, usePublicClient, useReadContract, useWalletClient } from 'wagmi';
import { arbitrumSepolia, avalanche, avalancheFuji, Chain, etherlink, hardhat, optimismSepolia, pgn, polygon, polygonAmoy, sepolia } from 'wagmi/chains';
import { formatEther } from 'viem/utils';
import { eERC20ContractInterface, eERC20ZKProofGenerator, EncryptedBalance, initializeContractInterface, initializeProofGenerator } from '@/utils/zkProofInputs';
import {ethers, providers, Signer, utils, Wallet} from "ethers"
import { parseEther } from 'ethers/lib/utils';
import {  CONTRACTS_ERC20, CONTRACTS_REGISTRARY, ENCRYPTED_ERC_ABI, provider,  REGISTRARY_ABI, } from '@/hooks/config/configs'
import { useABWallet } from '@/hooks/useABWallet';

interface RegistrationResult {
  isRegistered: boolean;
  error?: string;
  loading: boolean;
}
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
 
export const EnhancedWallet: React.FC<EnhancedWalletProps> =  ({
    balance,
    userHoldingWallet,
    hasValidNames,
    onCreateWallet,
    onRegisterName,
}) => {

    const { isConnected } = useAccount();
    const { address } = useAccount();

  //  const { checkAddressRegistered, encryptedBalance, handleRegister, initializeEERC} =  useEERC20Integration()
    // eERC20 specific state
    const [isRegisteredForEERC20, setIsRegisteredForEERC20] = useState(false);
    const [encryptedTokenBalance, setEncryptedTokenBalance] = useState< string>('');
    const [secretKey, setSecretKey] = useState<string>('');
    const [decryptionKey, setDecryptionKey] = useState<string | null>(null);
    const [proofGenerator, setProofGenerator] = useState<eERC20ZKProofGenerator | null>(null);
    const [contractInterface, setContractInterface] = useState<eERC20ContractInterface | null>(null);
    const [loading, setLoading] = useState(false);

    const [zkProofStatus, setZKProofStatus] = useState<'idle' | 'generating' | 'submitting' | 'completed' | 'failed'>('idle');
    const [ addressEERC, setAddressEERC ] = useState('');
    const [error, setError] = useState<string>('');
    const [ status, setStatus] = useState<string>('')
    const [ result, setResult ] = useState<RegistrationResult>({
      isRegistered: false,
      loading: false
    });
    
    // Transaction forms
    const [transferForm, setTransferForm] = useState({ recipient: '', amount: ''});
    const [mintForm, setMintForm] = useState({ amount: ''});
    const [balanceProofForm, setBalanceProofForm] = useState({ minBalance: ''});
    const [depositTokenAddress, setDepositTokenAddress] = useState<string>('');
    const [depositAmount, setDepositAmount] = useState<string>('');
    const [withdrawTokenId, setWithdrawTokenId] = useState<string>('');
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [burnAmount, setBurnAmount] = useState<string>('')
    const [activeTab, setActiveTab] = useState<'regular' | 'encrypted'>('regular');
  //  const [targetAddress, setTargetAddress] = useState('');
    const publicClient: any = usePublicClient();
    const  walletClient: any = useWalletClient();
    const { data: avaxBalance } = useBalance({
        address,
        chainId: avalanche?.id || avalancheFuji.id || hardhat.id || polygon.id 
        || sepolia.id || arbitrumSepolia.id 
        || optimismSepolia.id || polygonAmoy.id 
      });
    const [isDeposit, setDeposit] = useState(false);
    const [isTransfer, setTransfer] = useState(false);
    const abWallet = useABWallet();
      
      
    const [encryptedBalance] = useState<EncryptedBalance>({
      C1: ["0", "0"],
      C2: ["0", "0"]
    })
    
    const [currentBalance] = useState<string>('1000'); // const actualEncryptedBalance = contractInterface?.getBalance('', ''); 

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

    
    const signer =  provider.getSigner();

    const anyChainId = provider.getNetwork();

    useEffect(() => {
      if (isConnected && address && signer && !proofGenerator) {
        initializeEERC20System();
        loadUserEERC20State(address);
      }
    }, [isConnected, address, signer]);

        // Check if user can access eERC20 features
    const canAccessEncrypted = Wallet.isSigner(address) || hasValidNames || address?.codePointAt.length !== 0;

    const initializeEERC20System = async () => {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
  
        const auditoPublicKey: [string, string] = ["0", "0"];//await proofGenerator.derivePublicKey(pk.call.toString());
        const generator = await initializeProofGenerator(provider, auditoPublicKey);

        const contract =  await initializeContractInterface(
              CONTRACTS_ERC20,
              ENCRYPTED_ERC_ABI,
              signer,
              generator
            );

          if (publicClient && walletClient && address) {
            
            //Initialize proof generator with audito public
            setProofGenerator(generator);
            
            // Initialize contract interface
            setContractInterface(contract);
      }
     
      return {publicClient, walletClient, address};

    }
    // Check registration status on mount
    useEffect(() => {
        if (address && canAccessEncrypted) {
            checkRegistration(address);
        }
    }, [address, canAccessEncrypted, isRegisteredForEERC20]);

    const checkRegistration = async (address: string) => {

      if (!address || !publicClient) return false;

      setResult({ isRegistered: false, loading: true});

      try {
        const contracts_registrary = new ethers.Contract(CONTRACTS_REGISTRARY, REGISTRARY_ABI, signer);
        const registrationResult: boolean =  await contracts_registrary.isUserRegistered(address);

        setResult({
          isRegistered: registrationResult,
          error:  undefined,
          loading: false
        });
      } catch (error) {
        setResult({
          isRegistered: false,
          error: error instanceof Error ? error.message : 'Unkown error',
          loading: false
        });
      }
    }

    const handleRegister = async () => {
      if (!walletClient) return;

      const addr =  signer._address

      const chainId = (await anyChainId).chainId

      try {
        setZKProofStatus('generating');
        const registrationResult = await contractInterface?.register(addr, chainId, secretKey);
        
        setZKProofStatus('submitting');

        return {
          success: true,   
          decryptionKey: registrationResult?.type,
          transactionHash: registrationResult?.hash 
        }
      } catch (error: any) {

        setZKProofStatus('failed');
        console.error('falied to register', error);

        return {success: false, error: error.message}
      }
    }

    const loadUserEERC20State = async (userAddress: string) => {
      try {
        // Check registration status on-chain
        const isRegistered = await checkRegistration(userAddress);
        setIsRegisteredForEERC20(true);

        // Load or generate secret key
        const sk = await loadOrGenerateSecretKey(userAddress);
        setSecretKey(sk);

        // Load encrypted balance if registered
        if (isRegistered) {
          const encryptedBalance = await contractInterface?.getBalance(userAddress, '')//useEncryptedBalance();
          //setEncryptedTokenBalance(encBalance.encryptedBalance);
        }

        const encryptedBalance =  await contractInterface?.getBalance(userAddress, '')//useEncryptedBalance();
          
      } catch (error: any) {
        console.error('Failede to load eERC20 state:', error);
      }
    };

  
    // ========================================================================================
    // eERC20 OPERATIONS
    // ========================================================================================

    const handleEncryptedTransfer = useCallback(async () => {
      if (!contractInterface || !secretKey || !transferForm.recipient || !transferForm.amount) {
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
          '0',
          amount,
          currentBalance,
          encryptedBalance,
          secretKey,
          'Transfer via eERC20'
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

    const handleMintTokens = useCallback(async () => {
      if (!proofGenerator || !secretKey || !mintForm.amount || !address ) {
        alert('Please enter amount');
        return;
      }

      try {
        setZKProofStatus('generating');
        console.log('🔐️ Generating mint proof...');
        setZKProofStatus('submitting');

        const amount = parseEther(mintForm.amount).toString();

        const chainId = (await anyChainId).chainId

        const nonce =  signer.getTransactionCount;

        const nullifierHash = await proofGenerator.generateNullifier(address, nonce.toString(), secretKey)

        const proof = await proofGenerator.generateMintingProof(
          address,
          amount,
          chainId,
          nullifierHash
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
        setStatus(`Minting failed: ${error.message}`)
      }
    }, []);

    const handleEncryptedBurn = useCallback(async () => {
      if (!contractInterface || !secretKey) {
        setError('Missing required fields');
        return;
      }

      setLoading(true);
      setZKProofStatus('generating');
      setError('');
      setStatus('Generating burn proof...');

      try {
        const tx = await contractInterface.privateBurn(
          burnAmount,
          currentBalance,
          encryptedBalance,
          secretKey,
          'Burn via eERC20'
        );
        setZKProofStatus('submitting');

        setStatus('Transaction submitted. Waiting for confirmation');
        await tx.wait();
        setZKProofStatus('completed');
        setStatus('✅️ Burn successful');
        setBurnAmount('');
      } catch (err: any) {
        setZKProofStatus('failed');
        setError(`Burn failed: ${err.message}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, [])

    const handleEncryptedDeposit = useCallback(async () => {
      if  (!contractInterface || !proofGenerator) {
        setError('COntract not initialized');
        return;
      }
      
      try {
        let secretKey = signer;
        // Generate PCT foir deposit amount
        const amountPCT = await proofGenerator.generateBalancePCT(depositAmount, secretKey.toString());
        setZKProofStatus('generating');
        const tx = await contractInterface.deposit(
          depositAmount,
          depositTokenAddress,
          amountPCT,
          'Deposit via eERC20'
        );
        setZKProofStatus('submitting');
        setStatus('Transaction submitted. Waiting for conformation...');
        await tx.wait();
        setZKProofStatus('completed');
        setStatus('✅️ Deposit successful!');
        setDepositAmount('');
        } catch (err: any) {
          setZKProofStatus('failed');
          setError(`Encrypted deposit failed: ${err.message}`);  
          console.error('', err);
        } finally {
          setLoading(false);
        }
    }, []);

    const handleEncryptedWithdraw = useCallback(async () => {
      if (!contractInterface || !secretKey) {
        setError('Missing withdraw proof...');
        return;
      }
      
      setLoading(true);
      setError('');
      setZKProofStatus('generating');
      setStatus('Generating withdraw proof...');

      try {
        const tx = await contractInterface.withdraw(
          withdrawTokenId,
          withdrawAmount,
          currentBalance,
          encryptedBalance,
          secretKey,
          'Withdraw via eERC20'
        );

        setStatus('Transaction submitted. Waiting for confirmation...');
        setZKProofStatus('submitting');
        await tx.wait();

        setStatus('✅️ Withdrawal successful');
        setZKProofStatus('submitting');
        setWithdrawAmount('')
      } catch (err: any) {
        setError(`Withdrawal failed: ${err.message}`);
        setZKProofStatus('failed');
        console.error(err);            
      } finally {
        setLoading(false);
      }
    }, []);

    ////////////////////////////////////////////////////////////////////////////////////
    //================= REGULAR WALLET ========================= REGULAR WALLET ======//
    ////////////////////////////////////////////////////////////////////////////////////
    const handleDeposit = useCallback(async () => {
      setDeposit(true);
      
      try {
        await abWallet.deposit(depositTokenAddress, Number(depositAmount));
        console.log("depositing funds");
      } catch (error: any) {
        throw error;
      } finally {
        setDeposit(false);
      }
    }, []);
    
    const handleTransfer = useCallback(async () => {
      
      setTransfer(true);
      
      try {
        await abWallet.transfer(depositTokenAddress, transferForm.recipient, Number(transferForm.amount));
        console.log("transfering funds");
      } catch (error: any) {
        console.error("transfer failed", error);
      } finally {
        setTransfer(false);
      }
    }, []); 

    const handleWithdraw = useCallback(async () => {

      setLoading(true);

      try {
        
        await abWallet.withdraw();
        console.log('Withdrawing funds');
      
      } catch (error: any) {
        throw error;

      } finally {
        setLoading(false)
      }
    }, [])

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

    const renderHoldingWalletInfo = () => (
      userHoldingWallet && (
        <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20
         rounded-xl p-6 border border-green-500/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-green-400">
              Holding Wallet Created
            </h3>
            <CheckCircle2 className="text-green-400" size={20} />
          </div>
          <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-gray-400 text-sm">Address:</p>
              <p className="text-white font-mono text-sm break-all">{userHoldingWallet}</p>
            </div>
            <div className="flex space-x-2">
              <button 
              onClick={() => copyToClipBoard(userHoldingWallet)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded
              text-gray-300 hover:text-white transition-colors">
                <Copy size={14} />
              </button>
              <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded
               text-gray-300 hover:text-white transition-colors">
                <ExternalLink size={14} />
               </button>
            </div>
          </div>
         </div>
      )
    );

    const renderRegistrationPanel = () => (
      !isRegisteredForEERC20 && canAccessEncrypted &&  (
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
                    onClick={handleRegister}
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

        {/**Status message */}
        { status && (
          <div className="mb-4 bg-blue-900/30 border border-blue-500/50 p-4 rounded-lg">
            <p className="text-blue-300">{status}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-500/50 p-4 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}
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
        <div className="mb-6 bg-gray-800/50 rounded-lg p-4">
          <label className="block text-gray-300 text-sm font-medium mb-3">🔏️ Private Transfer</label>
          <div className="space-y-3">
            <input 
             type='text'
             placeholder='Recipient address (0x...)'
             value={transferForm.recipient}
             onChange={(e) => setTransferForm({...transferForm, recipient: e.target.value})}
             className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 
             focus:border-purple-500 focus:outline-none placeholder-gray-400"
             />
             <div className="flex space-x-3">
              <input
               type="text"
               placeholder='Enter Amount (eERC)'
               value={transferForm.amount}
               onChange={(e) => setTransferForm({...transferForm, amount: e.target.value})}
               className="flex-1 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600
               focus:border-purple-500 focus:outline-none  placeholder-gray-400" 
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
        {/**Mint Tokens (admin/testing) */}
        <div className="mb-6 bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3">💽️⚡️MInt Tokens</h4>
          <div className="space-y-3">
            <input
             type='number'
             placeholder='Amount to mint'
             value={mintForm.amount} 
             onChange={(e) => setMintForm({...mintForm, amount: e.target.value})}
             className='w-full bg-gradient-to-r from-purple-700 text-white px-3 py-2
             rounded border border-gray-600 focus:border-purple-500 
              focus:outline-none text-sm placeholder-gray-400'
             />
             <button 
             onClick={handleMintTokens}
             disabled={zkProofStatus !== 'idle' || !mintForm.amount}
             className='w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white
             py-2 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all
             duration-300 font-medium disabled:bg-gray-600'>
              Mint eETH Tokens
             </button>
          </div>
          <p className="text-gray-400 text-xsmt-2">
            🔧️ Testing/Admin feature
          </p>
        </div>

        {/**Deposit encrypted Tokens (admin/testing) */}
        <div className="mb-6 bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-green-400 font-semibold mb-4">
            💰️ Depsoit
          </h4>
          <div className="space-y-3">
            <input 
            type='text'
            value={depositTokenAddress}
            onChange={(e: any) => setDepositTokenAddress(e.target.value)}
            placeholder='token address'
            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600
            focus:border-green-500 focus:outline-none placeholder-gray-400"
            />
            <input 
              type="text"
              value={depositAmount}
              onChange={(e: any) => setDepositAmount(e.target.value)}
              placeholder='Amount'
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600
              focus:border-green-500 focus:outline-none placeholder-gray-400"
            />
          <button onClick={handleEncryptedDeposit}
            disabled={loading || !depositAmount || !depositTokenAddress}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white
            py-3 px-4 rounded-lg transition-colors font-medium">
              Encrypted Deposit
            </button>  
          </div>
        </div>

        {/**Privacy burn token feature */}
        <div className="mb-6 bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-red-600 font-semibold mb-3 ">🔥️ Private Burn</h3>
          <div className="space-y-3">
            <input 
            type='text'
            value={burnAmount}
            onChange={(e: any) => setBurnAmount(e.target.value)}
            placeholder=' Amount to Burn'
            className="w-full bg-gray-700 text-white px-3 py-2 rounded border
            border-gray-600 focus:border-red-500 focus:outline-none placeholder-gray-400"/>
            <button 
              onClick={handleEncryptedBurn} 
              disabled={loading || !burnAmount || !secretKey}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white
              py-3 px-4 rounded-lg transition-colors font-medium">
                Burn
              </button>
          </div>
        </div>

        {/**Privacy withdraw feature */}
        <div className='bg-gray-800/50 rounded-lg p-4'>
          <h4 className="text-orange-400 font-semibold mb-3">📤️ Withdraw</h4>
          <div className="space-y-3">
            <input 
            type='text'
            value={withdrawAmount}
            onChange={(e: any) => setWithdrawAmount(e.target.value)}
            placeholder=' Enter Amount'
            className="w-full bg-gray-700 text-white px-3 py-2 
            rounded border border-gray-600 focus:border-orange-500 
            focus:outline-none placeholder-gray-400"
            />
            <input 
            type='text'
            value={withdrawTokenId}
            onChange={(e: any) => setWithdrawTokenId(e.target.value)}
            placeholder='Enter tokenId'
            className="w-full bg-gray-700 text-white px-3 py-2 rounded border
            border-gray-600 focus:border-orange-500 focus:outline-none placeholder-gray-400"
            />
            <button onClick={handleEncryptedWithdraw} disabled={loading || !withdrawAmount || !secretKey}
              className="w-full bg-orange-600 hover:bg-orange-700
               disabled:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                Withdraw
            </button>
          </div>
        </div>

        {/**Privacy Features Info */}
        <div className="mt-6 bg-purple-900/30 rounded-lg p-4 border border-purple-600/30">
        <h4 className="text-purple-300 font-semibold mb-3 flex items-center">
          <Shield className="mr-2" size={18} />
          Privacy Features</h4>
        <div className="space-y-2">
          <div className="flex items-center text-green-400 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            <span>Encrypted balances</span>
          </div>
          <div className="flex items-center text-green-400 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
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
    );

    const renderRegularActions = () => (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center">
        <ArrowDown className="mr-2 text-blue-400" size={20} />
        Quick Actions
      </h3>

      { status && (
          <div className="mb-4 bg-blue-900/30 border border-blue-500/50 p-4 rounded-lg">
            <p className="text-blue-300">{status}</p>
          </div>
        )}

      {error && (
          <div className="mb-4 bg-red-900/30 border border-red-500/50 p-4 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

      {/** Deposit */}  
      <div className="space-y-4">
        <div className="bg-grray-800/50 rounded-lg p-4">
        <h4 className="text-gray font-medium mb-3">💎️ Deposit</h4> 
         <div className="space-y-3">
          <input 
           type="text"
           value={depositAmount}
           onChange={(e: any) => setDepositAmount(e.target.value)}
           placeholder='Amount to deposit'
           className="w-full bg-gray-700 text-white px-3 py-2
           rounded border border-gray-600 focus:border-green-500
           focus:outline-none placeholder-gray-400"
          />
          <button
           onClick={handleDeposit}
           className={`w-full py-3 px-4 rounded-lg transition-all
           duration-300 font-medium ${isConnected ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
           }`}
           disabled={!isConnected}>
            Deposit AVAX
           </button>
        </div>
      </div>
      {/**Transfer */}
      <div className="bg-gray-800/50 rounded-lg p-4">
       <h4 className="text-gray-300 font-medium mb-3">💸️ Transfer</h4>
       <div className="space-y-4">

        <input 
         type='text'
         value={depositTokenAddress}
         onChange={(e: any) => setDepositTokenAddress(e.target.value)}
         placeholder=' Enter token address'
         className='w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600
         focus:border-blue-500 focus:outline-none placeholder-gray-400'
         />
         <input 
         type='text'
         value={transferForm.recipient}
         onChange={(e: any) => setTransferForm({...transferForm, recipient: e.target.value})}
         placeholder='Recipient address'
         className="w-full bg-gray-700 text-white px-3 py-2 rounded
         border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-400"
         />
         <input 
         type='text'
         value={transferForm.amount}
         onChange={(e: any) => setTransferForm({...transferForm, amount: e.target.value})}
         placeholder='Enter amount to transfer'
         className='w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 
         focus:border-blue-500 focus:outline-none placeholder-gray-400'/> 
         <button onClick={handleTransfer}
              className={`w-full py-3 px-4 rounded-lg transition-all duration-300 font-medium
                ${isConnected 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              disabled={!isConnected}
            >Transfer funds
         </button>
        </div>
       </div>

        <button onClick={handleWithdraw} 
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
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-400">Incentive Tokens</span>
          <span className="text-gray-500">Coming soon</span>
        </div>
      </div>
    </div>
  );

  const renderEncryptedBalanceOverView = () => (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl
    p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center">
        <Lock className="mr-2 text-purple-400" size={20} />
        Encrypted balance
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400 flex items-center">
            <Lock className="mr-1" size={12} />
            Encrypted ERC20
          </span>
          <span className="text-green-400 font-medium">{balance.encrypted} eERC20</span>
        </div>
        <div className="flex justify-between items-center 
        py-2 border-b border-gray-700">
          <span className="text-gray-400">AB Bonds</span>
          <span className="text-white font-medium">{balance.bonds}</span>
        </div>
        <div className="bg-purple-900/30 border border-purple-600/30
        rounded-lg p-3 mt-4">
          <p className="text-purple-300 text-xs">
            🔐️ Your balance is encrypted and only visible to you. Transactions are
            proccessed using zero-knowledge proofs.
          </p>
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
                    role="presentation"
                    aria-placeholder='text...'
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white 
                    py-2 px-4 rounded-lg transition-all duration-300 font-medium"
                    >
                        Register Name Service
                    </button>
                </div>
            </div>
        )}

        {renderHoldingWalletInfo()}

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
            {activeTab === 'regular' ? renderBalanceOverview() : renderEncryptedBalanceOverView()}
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
