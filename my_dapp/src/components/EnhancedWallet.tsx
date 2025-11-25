
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
  ExternalLink,
  Clock,
  Wallet,
  Calendar,
  Zap,
  Loader
} from 'lucide-react';
import { useAccount, useBalance, usePublicClient, useReadContract, useWalletClient } from 'wagmi';
import { arbitrumSepolia, avalanche, avalancheFuji, Chain, etherlink, hardhat, optimismSepolia, pgn, polygon, polygonAmoy, sepolia } from 'wagmi/chains';
import { formatEther } from 'viem/utils';
import { eERC20ContractInterface, eERC20ZKProofGenerator, EncryptedBalance, initializeContractInterface, initializeProofGenerator } from '@/utils/zkProofInputs';
import {ethers, utils} from "ethers"
import { parseEther } from 'ethers/lib/utils';
import {  CONTRACTS_ERC20, CONTRACTS_REGISTRARY, derivePublicKey, ENCRYPTED_ERC_ABI, provider,  REGISTRARY_ABI, } from '@/hooks/config/configs'
import { DepositResult, useABWallet, WalletInfo } from '@/hooks/useABWallet';
import { hasZeroCodeLength, localConfig } from '@/hooks/config/bridge_Networkish';
import { CONTRACT_ADDRESSES } from '../../constants/PrimeFactory';


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
 }

 
export const EnhancedWallet: React.FC<EnhancedWalletProps> =  ({
    balance,
 
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
    const [contractInterface, setContractInterface] = useState<ethers.Contract | null>(null);
    const [loading, setLoading] = useState(false);

    const [zkProofStatus, setZKProofStatus] = useState<'idle' | 'generating' | 'submitting' | 'completed' | 'failed'>('idle');
    const [ addressEERC, setAddressEERC ] = useState('');
    const [error, setError] = useState<string>('');
    const [ status, setStatus] = useState<string>('')
    const [ result, setResult ] = useState<RegistrationResult>({
      isRegistered: false,
      loading: false
    });
    // Regular wallet 
    const [ status_Reg, setStatus_Reg] = useState<string>('');
    const [error_Reg, setError_Reg] = useState<string>('');
    const [isCreatingWallet, setIsCreatingWallet] = useState(false);
    const [userHoldingWallet, setUserHoldingWallet] = useState<string | null>('');
    const [ walletExpiryInfo, setWalletExpiry ] = useState<WalletInfo>({
      walletAddress: '', 
      creationTime: Number(0), 
      timeUntilExpiry: Number(0), 
      isExpired: false, 
      bondBalance: Number(balance.bonds), 
      walletBalance: '' 
    })
    // E-ERC20 Transaction forms
    const [transferForm, setTransferForm] = useState({ recipient: '', amount: ''});
    const [mintForm, setMintForm] = useState({ amount: ''});
  //  const [balanceProofForm, setBalanceProofForm] = useState({ minBalance: ''});
    const [depositTokenAddress, setDepositTokenAddress] = useState<string>('');
    const [withdrawTokenId, setWithdrawTokenId] = useState<string>('');
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [burnAmount, setBurnAmount] = useState<string>('');
    const [depositAmount, setDepositAmount] = useState<string>('');
    const [ registrationCollapsed, setRegistrationCollapsed ] = useState(false);
    
    // regular actions
    const [depositAmount_Reg, setDepositAmount_Reg] = useState<string>('');
    const [depositAddressToken, setDepositAddressToken] = useState<string>('')
    const [amount, setAmount] = useState({ recipient: '', transferAmount: ''})
  //  const [activeTab, setActiveTab] = useState<'regular' | 'encrypted'>('regular');
    const [tokenAddress, setTokenAddress] = useState('');
    const publicClient: any = usePublicClient();
    const  walletClient: any = useWalletClient();
    const { data: avaxBalance, data: sepoliaETH, data: anvilETH, data: polygonAmoyMatic } = useBalance({
        address,
        chainId: avalanche?.id || avalancheFuji.id || hardhat.id || polygon.id 
        || sepolia.id || arbitrumSepolia.id 
        || optimismSepolia.id || polygonAmoy.id 
      });   
    // regular state
    const [transactionState, setTransactionState] = useState({
      isLoading: false,
      status: 'idle', // 'idle' | 'pending' | 'success' | 'error'
      });
    const [isTransfer, setTransfer] = useState(false);
    const abWallet = useABWallet();
      
      
    const [encryptedBalance] = useState<EncryptedBalance>({
      C1: ["0", "0"],
      C2: ["0", "0"]
    });

    
    const [currentBalance] = useState<string>('1000'); // const actualEncryptedBalance = contractInterface?.getBalance('', ''); 


    // ========================================================================================
    // eERC20 INITIALIZATION
    // ========================================================================================

    const canAccessEncrypted = abWallet.userNames || provider._getAddress//abWallet.signer?.getAddress();

    const initializeABWalletHook = async () => {
      
      const connectToWallet = await abWallet.connectWallet();
      console.log("initailization of abWallet hook", connectToWallet);

      return abWallet.account, abWallet.provider, abWallet.signer;
    }
    
    const initializeEERC20System = async () => {
      
        const provider = new ethers.providers.JsonRpcProvider(localConfig.rpcUrl);//new ethers.providers.Web3Provider(window.ethereum);
        const signer =  provider.getSigner();
  
        const auditoPublicKey: {pubKeyX: string, pubKeyY: string}  = await derivePublicKey(await loadOrGenerateSecretKey('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));
        
        const generator = new eERC20ZKProofGenerator(provider, [auditoPublicKey.pubKeyX, auditoPublicKey.pubKeyY]);//await initializeProofGenerator(provider, [auditoPublicKey.pubKeyX, auditoPublicKey.pubKeyY]);
       
        console.log('generator is operational', generator);

        const contract =  new ethers.Contract(CONTRACTS_ERC20, ENCRYPTED_ERC_ABI, signer);
        console.log('contract is initialisng', contract);    

        if (publicClient && walletClient && address) {
          
          //Initialize proof generator with audito public
          setProofGenerator(generator);
            
          // Initialize contract interface
          setContractInterface(contract);
      }
     
      return {publicClient, walletClient, address};

    };
    
    useEffect(() => {
      
      if (isConnected && address  && !proofGenerator) {
        initializeEERC20System();
        loadUserEERC20State(address);
        initializeABWalletHook();
      }
      
    }, [isConnected, address, proofGenerator]);

    const checkRegistration = async (address: string) => {

      const signer =  provider.getSigner();
      
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

        setIsRegisteredForEERC20(registrationResult);
      } catch (error) {
        setResult({
          isRegistered: false,
          error: error instanceof Error ? error.message : 'Unkown error',
          loading: false
        });
        
      }
      
    }

    // Check registration status on mount
    useEffect(() => {
        if (address) {
            checkRegistration(address);
        }
    }, [address]);

    useEffect(() => {
      if (zkProofStatus === 'completed' && isRegisteredForEERC20) {
        setTimeout(() => setRegistrationCollapsed(true), 2000);
      }
    }, [zkProofStatus, isRegisteredForEERC20]);

    const handleRegister = async () => {
      
      const anyChainId = await provider.getNetwork();

      const canRegister = await hasZeroCodeLength(`${address}`, provider);
      if (!walletClient || canRegister) return;

      const chainId =  anyChainId.chainId;

      const sk = await loadOrGenerateSecretKey(`0x${address}`)
      setSecretKey(sk);

      try {
        setZKProofStatus('generating');
        const registrationResult = await contractInterface?.register(`${address}`, chainId, sk);

        setIsRegisteredForEERC20(true);
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
       if (isRegistered) {
         const sk = await loadOrGenerateSecretKey(userAddress);
         setSecretKey(sk);
       }

        // Load encrypted balance if registered
        if (isRegistered) {
          const encryptedBalance = await contractInterface?.getBalance(userAddress, '0x9a676e781a523b5d0c0e43731313a708cb607508')//useEncryptedBalance();
          //setEncryptedTokenBalance(encryptedBalance);
        }
         
      } catch (error: any) {
        console.error('Failede to load eERC20 state:', error);
      }
    }

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
    }, [encryptedBalance, secretKey, transferForm.amount, transferForm.recipient, encryptedTokenBalance, contractInterface]);

    const handleMintTokens = useCallback(async () => {
      if (!proofGenerator || !secretKey || !mintForm.amount || !address ) {
        alert('Please enter amount');
        return;
      }

      try {
        setZKProofStatus('generating');
        console.log('🔐️ Generating mint proof...');
        setZKProofStatus('submitting');

        const signer =  provider.getSigner();
        const anyChainId = await provider.getNetwork();

        const amount = parseEther(mintForm.amount).toString();

        const chainId = (await anyChainId).chainId

        const nonce =  signer.getTransactionCount();

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
    }, [address, encryptedTokenBalance, mintForm.amount, proofGenerator, secretKey]);

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
    }, [burnAmount, contractInterface,currentBalance, encryptedBalance, secretKey]);

    const handleEncryptedDeposit = useCallback(async () => {
      if  (!contractInterface || !proofGenerator) {
        setError('Contract not initialized');
        return;
      }
      const contract =  new ethers.Contract(CONTRACTS_ERC20, ENCRYPTED_ERC_ABI, provider.getSigner());
      console.log("deposit function:", contract.functions);
      const abiIERC20 = new ethers.utils.Interface([
      "function approve(address spender, uint256 value)  returns (bool)",
      'function decimals() view returns (uint8)']);
    
      try {
             const IERC20_instance = new ethers.Contract(depositTokenAddress, abiIERC20, provider.getSigner());
   
        const tokenDecimal = await IERC20_instance.decimals();
              console.log("decimals for tokens", tokenDecimal);
              const bigN = ethers.utils.parseUnits(depositAmount.toString(), tokenDecimal);
        
        // Generate PCT foir deposit amount
        const amountPCT = await proofGenerator.generateBalancePCT(depositAmount, (await loadOrGenerateSecretKey(`0x${address}`)));
        setZKProofStatus('generating');
        const track_function = await contract.connect(provider.getSigner()).deposit({
          amount: bigN,
          tokenAddress: depositTokenAddress,
          amountPCT: amountPCT
        });
        console.log("function deposit tracking: progress:", track_function.wait())
        const tx = await contract.deposit(
          bigN,
          depositTokenAddress,
          amountPCT,
          'Deposit via eERC20'
        );
        console.log("check transaction tx:", tx);
        setZKProofStatus('submitting');
        setStatus('Transaction submitted. Waiting for conformation...');
        await tx.wait();
        setZKProofStatus('completed');
        setStatus('✅️ Deposit successful!');
        
        setDepositTokenAddress('');
        setDepositAmount('');
        } catch (err: any) {
          setZKProofStatus('failed');
          setError(`Encrypted deposit failed: ${err.message}`);  
          console.error('', err);
        } finally {
          setLoading(false);
        }
    }, [contractInterface, depositAmount, depositTokenAddress, proofGenerator]);

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
    }, [contractInterface, currentBalance, encryptedBalance, secretKey, withdrawAmount, withdrawTokenId]);

    ////////////////////////////////////////////////////////////////////////////////////
    //================= REGULAR WALLET ========================= REGULAR WALLET ======//
    ////////////////////////////////////////////////////////////////////////////////////

    const formatTimeRemaining = (milliseconds: number) => {
      const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
      console.log("date: day:", days);

      return days;
    }

    const getExpiryUrgency = (timeUntilExpiry: number) => {
      const days = formatTimeRemaining(timeUntilExpiry);

      if (days < 7) return { color: 'red', level: 'urgent', icon: AlertCircle};

      if (days < 30) return {color: 'orange', level: 'warning', icon: Clock};
      return { color: 'green', level: 'good', icon: CheckCircle2};
      
    }

    const formatDate = (timestamp: number) => {
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    const initializeWalletState = async () => {
      
      try {
        const info = await abWallet.fetchWalletInfo();
        console.log("info:", info);
        console.log("address check:", info?.walletAddress);
        if (info?.walletAddress !== '0') {
          setUserHoldingWallet(info?.walletAddress);
          setWalletExpiry({
            walletAddress: info?.walletAddress,
            creationTime: info?.creationTime,
            timeUntilExpiry: info?.timeUntilExpiry,
            isExpired: info?.isExpired,
            bondBalance: info?.bondBalance,
            walletBalance: info?.walletBalance
          });
        }
      } catch (error: any) {
        console.error("user wallet address not found:", error);
        throw new Error("wallet info undefined", error.message);
      }
    }

    useEffect(() => {
      if (isConnected && address) {
        initializeWalletState();
      }
    }, [isConnected, address]);

    const handleCreateWallet = useCallback(async () => {
      setIsCreatingWallet(true);
      
      try {
        
        const tx = await abWallet.createWallet();
        console.log("wallet creation log:", tx);
        // k wallet creation success
        setIsCreatingWallet(true)
        setUserHoldingWallet(walletExpiryInfo.walletAddress);
        console.log('holding wallet created successfully');
        setStatus_Reg(tx.hash);
      
      } catch (error) {
        console.error('Failed to create holding wallet:', error);
      
      } finally {
        setIsCreatingWallet(false);
      }
    }, [abWallet]);

    
    const handleDeposit = useCallback(async () => {
      setTransactionState({ isLoading: true, status: 'pending' });

      try {
        const tx_ =  await abWallet.deposit(depositAddressToken, Number(depositAmount_Reg));
        console.log("depositing funds");

        // wait for cornfirmation
        setTransactionState({ isLoading: true, status: 'confirming' });
        console.log("transaction:",   tx_.tx1);
        setStatus_Reg(`${tx_.tx1 ? tx_.tx1 : 'deposit successful'}`);
        setTransactionState({ isLoading: false, status: 'success' });

        setDepositAddressToken('');
        setDepositAmount_Reg('');
        
      } catch (error: any) {
        console.error('failed to deposit', error);
        setError_Reg(`${error ? error : undefined}`);

        setTransactionState({ isLoading: false, status: 'error' });
        
      } finally {
        setTransactionState({ isLoading: false, status: 'idle' });
        
        setError(`${error ? error : ''}`); 
      }
    }, [abWallet, depositAmount_Reg, depositAddressToken]);
    
    const handleTransfer = useCallback(async () => {
      
      setTransfer(true);
      
      try {
        const tx_ = await abWallet.transfer(tokenAddress, amount.recipient, Number(amount.transferAmount));
        console.log("transfering funds:", tx_);
      } catch (error: any) {
        console.error("transfer failed", error);
      } finally {
        setTransfer(false);
      }
    }, [tokenAddress, amount.transferAmount, amount.transferAmount, abWallet]); 

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
    }, [abWallet])

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

    if (!isConnected) {
        return (
        <div className="text-center py-8 text-gray-400">
            Wallet not connected
            </div>
            );
    };

    const renderHoldingWalletCard = () => {
      if (!walletExpiryInfo.walletAddress) return null;

     
      const urgency = getExpiryUrgency(walletExpiryInfo.timeUntilExpiry);
      const daysRemaininig = formatTimeRemaining(walletExpiryInfo.timeUntilExpiry);
      const expiryDate = new Date(Date.now() + walletExpiryInfo.timeUntilExpiry);
      const creationDate = new Date(walletExpiryInfo.creationTime);
      const progress = ((90 - daysRemaininig) / 90 ) * 100;

      return (
        <div className={`sticky top-0 z-10 bg-gradient-to-br ${
          urgency.level === 'urgent' ? 'from-red-900/30 to-red-800/30 border-red-500/50' :
          urgency.level === 'warninig' ? 'from-orange-900/30 to-orange-800/30 border-orange-500/50' :
          'from-green-900/20 to-emerald-900/20 border-green-500/30'
        } rounded-xl p-6 border backdrop-blur-sm mb-6`}>
          <div className='flex items-start justify-between mb-4'>
            <div className='flex items-center space-x-3'>
              <div className={`p-3 rounded-full ${urgency.level === 'urgent' ? 'bg-red-500/20' :
                urgency.level === 'warning' ? 'text-orange-500' : 'text-green-500/20'
               }`}>
                <Wallet className={`${
                  urgency.level === 'urgent' ? 'text-red-400' : 
                  urgency.level === 'warning' ? 'text-orange-400' :
                  'text-green-400'
                }`} size={24}/>
              </div>
              <div>
                <h3 className='text-lg font-semibold text-white'>Your Holding Wallet</h3>
                <p className='text-gray-400 text-sm'>Secure proxy contract</p>
              </div>
            </div>
            <urgency.icon className={`${
              urgency.level === 'urgent' ? 'text-red-400' :
              urgency.level === 'warning' ? 'text-orange-400' :
              'text-green-400'
            }`} size={24}/>
          </div>

          <div className='bg-gray-800/50 rounded-lg p-4 mb-4'>
           <div className='flex items-center justify-between mb-2'>
            <p className='text-gray-400 text-sm'>Address:</p>
            <div className='flex items-center space-x-2'>
              <button 
               onClick={() => copyToClipBoard(walletExpiryInfo.walletAddress)}
               className='p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300
               hover:text-white transition-colors'>
                <Copy size={14} />
              </button>
              <button className='p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300
              hover:text-white transition-colors'>
                <ExternalLink size={14}/>
              </button>
            </div>
           </div>
           <p className='text-white font-mono text-sm break-all'>{walletExpiryInfo.walletAddress}</p>
          </div>

          <div className='grid grid-cols-2 gap-4 mb-3'>
            <div className='bg-gray-800/50 rounded-lg p-3'>
             <div className='flex items-center space-x-2 mb-1'>
              <Calendar size={14} className='text-gray-400' />
              <p className='text-gray-400 text-xs'>Created</p>
             </div>
              <p className='text-white text-sm font-medium'>{formatDate(Number(creationDate.toDateString))}</p>
            </div>

            <div className='bg-gray-800/50 rounded-lg p-3'>
             <div className='flex items-center space-x-2 mb-1'>
              <Clock size={14} className={urgency.level === 'urgent' ? 'text-red-400' :
                urgency.level === 'warning' ? 'text-orange-400' : 'text-green-400'
              } />
              <p className='text-gray-400 text-xs'>Expires</p>
             </div>
             <p className={`text-sm font-medium ${
              urgency.level === 'urgent' ? 'text-red-400' :
              urgency.level === 'warning' ? 'text-orange-400' :
              'text-green-400'
             }`}>{formatDate(Number(expiryDate.toDateString))}</p>
            </div>
          </div>

          <div className='mb-2'>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-white text-sm font-medium'>{(daysRemaininig)} days remaining</span>
              <span className='text-green-900 text-xs'>{progress.toFixed(0)}% elapsed</span>
            </div>
            <div className='w-full bg-gray-700 rounded-full h-2'>
              <div className={`h-2 rounded-full transition-all ${
                urgency.level === 'urgent' ? 'bg-red-500' :
                urgency.level === 'warning' ? 'bg-orange-500' :
                'bg-green-500'
              }`}
               style={{ width: `${100 - progress}%`}} 
               />
            </div>
          </div>

          <p className={`text-sm ${
            urgency.level === 'urgent' ? 'text-red-300' :
            urgency.level === 'warning' ? 'bg-orange-300' :
            'bg-green-300'
          }`}>
            {urgency.level === 'urgent' && '⚠️ Urgent: Withdraw your funds before expiry!'}
            {urgency.level === 'warning' && '⏰️Warning: Plan to withdraw your funds soon'}
            {urgency.level === 'good' && '✅️ Wallet is active and in good standing'}
          </p>
        </div>
      )
    }

    const renderRegistrationPanelProminent = () => {
      if (isRegisteredForEERC20 && registrationCollapsed) {
        return (
          <div className='bg-gradient-to-br from-green-900/20 to-emerald-900/20
          rounded-xl p-4 border border-green-500/30 mb-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <CheckCircle2 className="text-green-400" size={24} />
                <div>
                  <h3 className='text-lg font-semibold text-green-400'>Motel Smart Wallet Enabled</h3>
                  <p className='text-gray-300 text-sm'>Privacy Features Unlocked</p>
                </div>
              </div>
              <button 
               onClick={() => setRegistrationCollapsed(false)}
               className='text-gray-400 hover:text-white text-sm'>
                View Details
              </button>
            </div>
          </div>
        );

      }

      if (isRegisteredForEERC20 && !registrationCollapsed) {
        return (
          <div className='bg-gradient-to-br from-green-900/20 to-emerald-900/20
          rounded-xl p-6 border border-green-500/30 mb-6'>
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center space-x-3'>
                <CheckCircle2 className='text-green-400' size={24} />
                <h3 className='text-xl font-bold text-green-400'>Privacy Enabled Successfully</h3>
              </div>
              <button 
               onClick={() => setRegistrationCollapsed(true)}
               className='text-gray-400 hover:text-white'>
                <ArrowDown size={20} />
              </button>
            </div>
            <p className='text-gray-300 text-sm'>
              Your Motel Smart Wallet is now active. All encrypted operations are available below.
            </p>
          </div>
        );
      }

      return (
        <div className='bg-gradient-to-br from-purple-900/30 to-indigo=900/30
        rounded-xl p-8 border-2 border-500/50 mb-6 shadow-2xl'>
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center space-x-4'>
              <div className='p-4 bg-purple-600/20 rounded-full'>
              <Lock className='text-purple-400' size={32} />
              </div>
              <div>
                <h3 className='text-2xl font-bold text-white'>🔐 Unlock Motel Smart Wallet</h3>
                <p className='text-purple-300 text-sm'>Enable encrypted operations 
                  with zero-knowledge privacy</p>
              </div>
            </div>
          </div>

          {zkProofStatus !== 'idle' && (
            <div className='mb-6 bg-gray-800/50 rounded-lg p-4'>
              <div className='flex items-center space-x-3'>
                <div className={`w-4 h-4 rounded-full ${
                  zkProofStatus === 'generating' ? 'bg-yellow-400 animate-pulse' :
                  zkProofStatus === 'submitting' ? 'bg-blue-400 animate-pulse' :
                  zkProofStatus === 'completed' ? 'g-green-400' : 'bg-red-400'
                }`}></div>
                <span className='text-white font-medium'>
                  {zkProofStatus === 'generating' && '⚡ Generating your encryption key...'}
                  {zkProofStatus === 'submitting' && '📡 Registrayion on-chain...'}
                  {zkProofStatus === 'completed' && '✅️ Registration completed successfully'}
                  {zkProofStatus === 'failed' && '❌️ Registration failed'}
                </span>
              </div>
            </div>
          )}

          <div className='bg-bg-gray-800/30 rounded-lg p-6 mb-6'>
           <h4 className='text-white font-semibold mb-4'>What you get:</h4>
           <div className='space-y-3'>
            <div className='flex items-center space-x-3'>
              <CheckCircle2 className='text-green-400 flex-shrink-0' size={20} />
              <span className='text-gray-300'>Private transfer with hidden amounts</span>
            </div>
            <div className='flex items-center space-x-3'>
              <CheckCircle2 className='text-green-400 flex-shrink-0' size={20} />
              <span className='text-gray-300'>Fully encrypted balance visibilty</span>
            </div>
            <div className='flex items-center space-x-3'>
              <CheckCircle2 className='text-green-400 flex-shrink-0'/>
              <span className='text-gray-300'>Untraceable transaction history</span>
            </div>
            <div className='flex items-center space-x-3'>
              <CheckCircle2 className='text-green-400 flex-shrink-0' size={20}/>
              <span className='text-gray-300'>Zero-Knowledge proof technology</span>
            </div>
           </div>
          </div>
          <button 
           onClick={handleRegister}
           disabled={zkProofStatus !== 'idle'}
           className='w-full bg-gradient-to-r from-purple-600 to-indigo-600
           hover:from-purple-700 hover:to-indigo-700 disabled:bg-gray-600
           disabled:cursor-not-allowed text-white py-4 px-6 rounded-lg transition-all
           duration-300 font-bold text-lg flex items-center justify-center shadow-lg'>
            {zkProofStatus === 'generating' || zkProofStatus === 'submitting' ? (
              <Loader2 className='animate-spin mr-2' size={24}/>
            ) : (
              <Key className='mr-2' size={24} />
            )}
            {zkProofStatus === 'generating' ? 'Setting Up...' :
            zkProofStatus === 'submitting' ? 'Registering...' : 
            'Enabled Privacy Now'}
          </button>
          <div className='mt-4 flex items-center justify-center space-x-2 text-yellow-400 text-xs'>
            <AlertCircle size={15} />
            <span>One-time setup • Permanent on-chain registration</span>
          </div>
        </div>
      );
     }

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
                {zkProofStatus === 'submitting' && 'Submitting Encrypted transaction...'}
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
            💡 Amount and balance remain completely private
          </p>
        </div>
        {/**Mint Tokens (admin/testing) */}
        <div className="mb-6 bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3">💽️MInt Tokens</h4>
          <Zap className='mr-2 text-yellow-400' size={18}/>
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
          <p className="text-gray-400 text-xs mt-2">
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
            disabled={loading || !depositAmount || !depositTokenAddress }
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white
            py-3 px-4 rounded-lg transition-colors font-medium">
              {zkProofStatus === 'generating' || zkProofStatus === 'submitting' ? (
                <Loader2 className={` ${zkProofStatus === 'generating' ? 'animate-spin duration-500' :
                  'animate-ping'
                }`}size={24}/>
              ) : `${zkProofStatus === 'completed' ? 'bg-green-400' : 
              'Encrypted Deposit'}`}
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
              disabled={loading || !burnAmount || Number(encryptedTokenBalance) > 0}
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
            <button onClick={handleEncryptedWithdraw} disabled={loading || !withdrawAmount}
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
        <Wallet className='mr-2 text-blue=400' size={20} /> 
        Quick Actions
      </h3>

      {status_Reg && (
          <div className="mb-4 bg-blue-900/30 border border-blue-500/50 p-4 rounded-lg">
            <p className="text-blue-300">{status_Reg}</p>
          </div>
      )}

      {error_Reg && (
          <div className="mb-4 bg-red-900/30 border border-red-500/50 p-4 rounded-lg">
            <p className="text-red-300">{error_Reg}</p>
          </div>
      )}

      {/** Deposit */}  
      <div className="space-y-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-gray font-medium mb-3">💎️ Deposit</h4> 
         <div className="space-y-3">
          <input 
           type="text"
           value={depositAddressToken}
           onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositAddressToken(e.target.value)}
           placeholder='0x token address '
           className="w-full bg-gray-700 text-white px-3 py-2
           rounded border border-gray-600 focus:border-green-500
           focus:outline-none placeholder-gray-400 break-before-auto break-after-auto placeholder:break-after-auto"
          />
          <input 
           type="text"
           value={depositAmount_Reg}
           onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositAmount_Reg(e.target.value)}
           placeholder='Amount to deposit'
           className="w-full bg-gray-700 text-white px-3 py-2
           rounded border border-gray-600 focus:border-green-500
           focus:outline-none placeholder-gray-400"
          />
          <button
           onClick={handleDeposit}
           disabled={transactionState.status !== 'idle' || depositAmount_Reg === '0' || !depositTokenAddress}  
           className={`w-full py-3 px-4 rounded-lg transition-all
           duration-300 font-medium ${!transactionState.isLoading || !depositAmount_Reg || 
            !depositTokenAddress  ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
           }`}
           >
             {transactionState.isLoading ? (
              <div className="flex items-center">
                <Loader2 className={`size-10 md:size-5 ${
                  transactionState.status === 'pending' 
                  ? 'animate-spin duration-500' 
                  : 'animate-pulse'
              }`} />
              <span className="ml-2">
                {transactionState.status === 'pending' && 'Initiating'}
                {transactionState.status === 'confirming' && 'Confirming'}
              </span>
            </div>
          ) : (
            'Deposit Avax'
          )}
           </button>
        </div>
      </div>
      {/**Transfer */}
      <div className="bg-gray-800/50 rounded-lg p-4">
       <h4 className="text-gray-300 font-medium mb-3">💸️ Transfer</h4>
       <div className="space-y-4">

        <input 
         type='text'
         value={tokenAddress}
         onChange={(e: any) => setTokenAddress(e.target.value)}
         placeholder=' Enter token address'
         className='w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600
         focus:border-blue-500 focus:outline-none placeholder-gray-400'
         />
         <input 
         type='text'
         value={amount.recipient}
         onChange={(e: any) => setAmount({...amount, recipient: e.target.value})}
         placeholder='Recipient address'
         className="w-full bg-gray-700 text-white px-3 py-2 rounded
         border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-400"
         />
         <input 
         type='text'
         value={amount.transferAmount}
         onChange={(e: any) => setAmount({...amount, transferAmount: e.target.value})}
         placeholder='Enter amount to transfer'
         className='w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 
         focus:border-blue-500 focus:outline-none placeholder-gray-400'/> 
         <button onClick={handleTransfer}
              className={`w-full py-3 px-4 rounded-lg transition-all duration-300 font-medium
                ${isConnected 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              disabled={!isTransfer}
            >Transfer funds
         </button>
        </div>
       </div>

        <button onClick={handleWithdraw} disabled={!walletExpiryInfo}
              className={`w-full py-3 px-4 rounded-lg transition-all duration-300 font-medium
                ${!walletExpiryInfo
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
            > 
            Withdraw (fee: 2%)
        </button>
      </div>
    </div>
  );

  const renderBalanceOverviewEnhanced = () => {
    return (

    <div className='bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl
    p-6 border border-gray-700'>
      <h3 className='text-xl font-bold text-white mb-4 flex items-center'>
        <Eye className='mr-2 text-purple-400' size={20} />
        Balance Overview
      </h3>
      <div className='space-y-4'>
        <div className='flex justify-between items-center py-2 border-b border-gray-700'>
          <span className='text-gray-400'>{`${avaxBalance?.symbol || anvilETH?.symbol || sepoliaETH?.symbol || polygonAmoyMatic?.symbol}` || 'AVAX BAlance'}</span>
          <span className='text-white font-medium'>
            {walletExpiryInfo.walletBalance ? `${
              parseFloat(formatEther(BigInt(walletExpiryInfo.walletBalance))).toFixed(4)
            } ${avaxBalance?.symbol || anvilETH?.symbol || sepoliaETH?.symbol || polygonAmoyMatic?.symbol}` : 'N/A'}
          </span>
        </div>
        <div className='flex justify-between items-center py-2 border-b 
        border-gray-700'>
          <span className='text-gray-400'>AB Bonds</span>
          <span className='text-white font-medium'>{balance.bonds}Bonds</span>
        </div>
        {isRegisteredForEERC20 && (
          <div className='flex justify-between items-center py-2 border-b 
          border-purple-950'>
            <span className='text-gray-400 flex items-center'>
              <Lock className='mr-1' size={12} />
              Encrypted ERC20
            </span>
            <span className='text-green-400 font-medium'>{encryptedTokenBalance}</span>
          </div>
        )}
        {/** Wallet Expiry Info */}
        { walletExpiryInfo.walletAddress && (
          <div className='mt-4 pt-4 border-t border-gray-700'>
            <div className='bg-gray-800/50 rounded-lg p-4'>
             <div className='flex items-center justify-between mb-2'>
              <h4 className='text-gray-300 font-medium flex items-center'>
                <Calendar size={16} className='mr-2' />
                Wallet Timeline
              </h4>
             </div>
             <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-gray-400'>Created:</span>
                <span className='text-white'>{walletExpiryInfo.creationTime}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-400'>Expires:</span>
                <span className={`font-medium ${getExpiryUrgency(walletExpiryInfo.timeUntilExpiry).level
                  === 'urgent' ? 'text-red-400' : getExpiryUrgency(walletExpiryInfo.timeUntilExpiry).level
                  === 'warning' ? 'text-orange-400' : 'text-green-400'
                }`}>{formatDate(Date.now() + walletExpiryInfo.timeUntilExpiry)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-400'>Days Remaining:</span>
                <span className={`font-bold ${getExpiryUrgency(walletExpiryInfo.timeUntilExpiry).level
                  === 'urgent' ? 'text-red-400' : getExpiryUrgency(walletExpiryInfo.timeUntilExpiry).level
                  === 'warning' ? 'text-orange-400' : 'text-green-400'
                }`}>{formatTimeRemaining(walletExpiryInfo.timeUntilExpiry)} Days</span>
              </div>
             </div>
            </div>
          </div>
        )}
        <div className='flex justify-between items-center py-2'>
          <span className='text-gray-400'>Incentive Tokens</span>
          <span className='text-gray-500'>Coming Soon</span>
        </div>
      </div>
    </div>
    );
  }
  
  return (
    <div className="space-y-6">
        {/** Access setup section */}
        {isConnected && canAccessEncrypted && !isCreatingWallet && walletExpiryInfo &&(
            <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20
            rounded-xl p-6 border-yellow-500/30">
                <h3 className="text-xl font-bold text-white mb-4">Get Started</h3>
                <p className="text-gray-300 mb-4">Create a holding wallet or register a name access all features:</p>
                <div className="flex gap-3">
                    <button 
                    onClick={handleCreateWallet} disabled={isCreatingWallet}
                    className="flex bg-blue-600 hover:bg-blue-700 text-white py-2
                    px-4 rounded-lg transtition-all duration-300 font-medium disabled:bg-gray-200">
                        Create Holding Wallet
                    </button>
                </div>
            </div>
        )}

        {/**Sticky Holding Wallet Info Card */}
      {renderHoldingWalletCard()}
        {/** Regular Wallet Operations - Always visible when has access*/}
        {canAccessEncrypted && renderRegularActions()}

        {/**Motel Smart Wallet Section */}
        {canAccessEncrypted && (
          <>
          {!isRegisteredForEERC20 || !registrationCollapsed ?
          renderRegistrationPanelProminent() : null}
          {isRegisteredForEERC20 && renderEncryptedActions()}
          </>
        )}
        {/**Balance Overview - Enhanced with expiry */}
        {canAccessEncrypted && renderBalanceOverviewEnhanced()}
        
        { /** Recent Transactions */}
        {canAccessEncrypted && (
          <div className='bg-gradient-to-br from-gray-900 to-gray-800
          rounded-xl p-6 border border-gray-700'>
            <h3 className='text-xl font-bold text-white mb-4 '>Recent Transaction</h3>
            <div className='space-y-3'>
              <div className='flex justify-between items-center p-3 bg-gray-800
              rounded-lg'>
                <div className='flex items-center space-x-3'>
                  <div className='w-8 h-8 bg-green-600 rounded-full flex 
                  items-center justify-center'>
                    <ArrowUpDown size={14} className='text-white'/>
                  </div>
                  <div>
                    <p className='text-white font-medium'>Bond Purchase</p>
                    <p className='text-gray-400 text-sm'>Premium Bond - 15%
                      discount applied
                    </p>
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-white font-medium'>-85 AVAX</p>
                  <p className='text-gray-400 text-sm'>2 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        )}        
    </div>
  );
}
