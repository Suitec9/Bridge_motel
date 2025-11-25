
import { useState, useEffect, useCallback } from "react";
import { ethers, Contract, utils } from "ethers";
import { BOND_NFT_ABI } from "../../constants/ABBondNFT";
import { NAME_SERVICE_ABI } from "../../constants/ABNameService";
import { FACTORY_ABI, CONTRACT_ADDRESSES } from "../../constants/PrimeFactory";
import { localConfig } from "./config/bridge_Networkish";
import { useAccount } from "wagmi";

// Types
export interface WalletInfo {
  walletAddress: string;
  creationTime: number;
  timeUntilExpiry: number;
  isExpired: boolean;
  bondBalance: number;
  walletBalance: string;
}

interface NameInfoCollector {
  owner: string;
  expirytime: number;
  isPermanent: boolean;
  isExpired: boolean;
}

interface UserNames {
  allNames: []
}

interface Contracts_motel {
  factory: Contract;
  nameService: Contract;
  bondNFT: Contract;
}

interface WalletEvent {
  type: 'WalletCreated' | 'BondPurchased' | 'NameRegistered' |  'BondNFTMinted' | 'BondNFTBurned' | 'BondSentPlayer';
  data: any;
  timestamp: number;
}

interface BondPurchaseResult {
  purchaseTx: ethers.ContractTransaction;
  balanceTx: ethers.ContractTransaction;
}

interface NameRegistrationResult {
  tx1: ethers.ContractTransaction;
}

export interface DepositResult {
  tx1: ethers.ContractTransaction;
}

interface WithdrawResult {
  tx1: ethers.ContractTransaction
}

interface TransferResult {
  tx1: ethers.ContractTransaction;
}

interface ConnectionResult {
  provider: ethers.providers.JsonRpcProvider;
  signer: ethers.Signer;
  account: string;
}

export const useABWallet = () => {
  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contracts_motel>();
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [nameInfo, setNameInfo] = useState<NameInfoCollector | null>(null);
  const [userNames, setUserName] = useState<UserNames | null>(null);
  const [events, setEvents] = useState<WalletEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { address } = useAccount();

  // Initialize Web3 Connection
  const connectWallet = useCallback(async (): Promise<ConnectionResult> => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not found");
      }

      const provider =new ethers.providers.JsonRpcProvider(localConfig.rpcUrl);// new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);

      // Initialize Contracts
      const factoryContract = new ethers.Contract(
        CONTRACT_ADDRESSES.FACTORY,
        FACTORY_ABI,
        signer
      );

      console.log("check factory contract", factoryContract);

      const nameServiceContract = new ethers.Contract(
        CONTRACT_ADDRESSES.NAME_SERVICE,
        NAME_SERVICE_ABI,
        signer
      );
      console.log("check nameServiceContact:", nameServiceContract);

      const bondNFTContract = new ethers.Contract(
        CONTRACT_ADDRESSES.BOND_NFT,
        BOND_NFT_ABI,
        signer
      );
      console.log("check bond contract:", bondNFTContract);

      setContracts({
        factory: factoryContract,
        nameService: nameServiceContract,
        bondNFT: bondNFTContract
      });
      
      return { provider, signer, account: accounts[0] };
    } catch (error) {
      console.error("Wallet connection failed:", error);
      throw error;
    }
  }, []);


  // Fetch wallet information
  const fetchWalletInfo = useCallback(async (): Promise<any> => {
    if (!contracts?.factory || !account) return;
    

    try {/**

      const walletAddress_Onchain: string = await contracts.factory.userHoldingWallet(account);
      console.log("wallet address check:", walletAddress_Onchain);

      if (walletAddress_Onchain === '0x0000000000000000000000000000000000000000') {
        console.warn('No wallet found for this user');
        setWalletInfo(null);
        return;
      }
       */
      const factoryAddre = CONTRACT_ADDRESSES.FACTORY;
      //const code_Facory = await provider?.getCode("getWalletInfo(address)", factoryAddre);
      //console.log("code of factory", code_Facory);
      const gasCheck = provider?.estimateGas({gasLimit: 30000000, 
        data: "0x7d5c1914000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266", 
        to: factoryAddre, gasPrice: 50000, nonce: provider.getTransactionCount(account)});
        
      console.log("gas check",await gasCheck );
      
      const info = await contracts?.factory.getWalletInfo(account);
      await info.wait();

       setWalletInfo({
        walletAddress: info[0],
        creationTime: info[1].toNumber(),
        timeUntilExpiry: info[2].toNumber(),
        isExpired: info[3],
        bondBalance: info[4].toNumber(),
        walletBalance: info[5].toNumber()
      });
      
    } catch (error) {
      console.error("Failed to fetch wallet info:", error);
    }
  }, [contracts?.factory, account]);

  // Memoize to prevent unnecessary re-renders
  const memoizedFetchWalletInfo = useCallback(
    () => fetchWalletInfo(), 
    [fetchWalletInfo]
  );

  // Create AB wallet
  const createWallet = useCallback(async (): Promise<ethers.ContractTransaction> => {
    if (!contracts?.factory) {
      throw new Error("Factory contract not initialized");
    }

    try {
      setLoading(true);
      const tx = await contracts.factory.createHoldingWallet();
      console.log("creating holding wallet:", tx);
      await tx.wait();

      // Refresh wallet info
      await memoizedFetchWalletInfo();

      return tx;
    } catch (error) {
      console.error("Wallet creation failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contracts?.factory, fetchWalletInfo]);

  // Register name service with eERC20
  const registerNameService = useCallback(async (
    name: string, 
    duration: number, 
  ): Promise<NameRegistrationResult> => {
    if (!contracts?.nameService) {
      throw new Error("Name service contract not initialized");
    }

    try {
      setLoading(true);

      // Calculate cost based on duration
      const costs: Record<number, ethers.BigNumber> = {
        1: ethers.utils.parseEther("0.125"), // 1 year
        3: ethers.utils.parseEther("0.25"),  // 3 years
        0: ethers.utils.parseEther("1")      // permanent
      };

      const tx1 = await contracts.nameService.registerName(
        name,
        duration,
        { value: costs[duration] }
      );
      await tx1.wait();

      return  tx1;
    } catch (error) {
      console.error("Name service registration failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contracts?.nameService]);

  const deposit = useCallback(async (
    tokenAddress: string,
    amount: number
  ): Promise<DepositResult> => {

    if (!contracts || !account) {
      throw new Error('account not connected or wallet does not exsit');
    }
    const provider =new ethers.providers.JsonRpcProvider(localConfig.rpcUrl);
    
    const abiIERC20 = new ethers.utils.Interface([
      "function approve(address spender, uint256 value)  returns (bool)",
      'function decimals() view returns (uint8)'
    ]);
    const IERC20_instance = new ethers.Contract(tokenAddress, abiIERC20, provider.getSigner());
    

    setLoading(true);
    try {
      const tokenDecimal = await IERC20_instance.decimals();
      console.log("decimals for tokens", tokenDecimal);
      const bigN = ethers.utils.parseUnits(amount.toString(), tokenDecimal);

      console.log("approve the factory to spend funds", await IERC20_instance.approve(CONTRACT_ADDRESSES.FACTORY, bigN));
      const tx = await contracts?.factory.depositFundsERC20(tokenAddress, bigN );
      await tx.wait();
     
     return tx;
    
    } catch (error) {
      console.error("failed to make a deposit", error);
      throw error;
    } finally {
      setLoading(false);
    }
    
  }, [ account, contracts]);
  
  const transfer = useCallback(async (
    tokenAddress: string,
    recipient: string,
    amount: number,
  ): Promise<TransferResult> => {
    if (!contracts?.factory || !amount || !account || account === recipient || amount > 0) {
      throw new Error("Contracts not initialize or recipient is sender");
    }

    try {
      setLoading(true);

      const tx = await contracts.factory.transferFunds(
        tokenAddress, 
        recipient, 
        ethers.utils.formatEther(amount)
      );

      await tx.wait()

      return  tx.ContractTransaction
    } catch (error: any) {
      console.error('failed to transfer', error);
      throw new Error('failed to transfer');
    } finally {
      setLoading(false);
    }
  }, [contracts?.factory, account])

  const withdraw = useCallback(async ():Promise<WithdrawResult> => {
    if (!contracts?.factory || !account ) {
      throw new Error("Contract not initialized or account don't exsit");
    }

    try {
      setLoading(true);

      const tx = await contracts.factory.withdraw();
      await tx.wait();

      return tx.ContractTransaction;
    } catch (error: any) {
      throw error
    } finally {
      setLoading(false);
    }
  }, [contracts?.factory, account]);

  const checkNamesAvailability = useCallback(async (
    name: string
  ): Promise<any> => {
    
    setLoading(true);
    
    try {
      const tx = await contracts?.nameService.checkNameAvailable(name);

      await tx.wait();

      return tx.ContractTransaction;

    } catch (error: any) {
      console.error('failed to check name availibity', error);
      throw new Error('failed to check name', error.message);
    } finally {
      setLoading(false);
    }
  }, [contracts?.nameService]);

  const getNameInfo = useCallback(async (
    names: string
  ): Promise<any> => {

    setLoading(true);

    try {
      const collectInfoName = await contracts?.nameService.getNameInfo(names);
      setNameInfo({
        owner: collectInfoName[0],
        expirytime: collectInfoName[1].toNumber(),
        isPermanent: collectInfoName[2],
        isExpired: collectInfoName[3],
      });      
    } catch (error) {
      console.error('failed to collect name info', error);
      throw new Error('failed to get info');
    } finally {
      setLoading(false);
    }
  }, [contracts?.nameService]);

  const displayBondBalance = useCallback(async (
    address: string
  ): Promise<any> => {

    setLoading(true)

    try {
      const tx = await contracts?.factory.userBondBalance(address);

      await tx.wait();

      return tx.ContractTransaction;
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false)
    }

  }, [contracts?.factory]);

  const getUserNames = useCallback(async (
    names: string
  ):Promise<any> => {
    
    setLoading(true);

    try {
      const tx = await contracts?.nameService.getUserNames(names);

      setUserName({
        allNames: tx.name[0].toString()
      });

    } catch (error: any) {
      console.error('failed to get user names', error.message);
      throw new Error('failed to get user names or user has no names');
    } finally {
      setLoading(false);
    }
  }, [contracts?.nameService]);

  const renewName = useCallback(async (
    names: string,
    duration: number
  ): Promise<any> => {

    setLoading(true);

    try {
      const tx = await contracts?.nameService.renewName(names, duration);

      await tx.wait();

      return tx.ContractTransaction
    } catch (error: any) {
      console.error('failed to renew name', error.message);
      throw new Error('failed to new name');
    }
  }, [contracts?.nameService]);

  const expireName = useCallback(async (
    names: string
  ): Promise<any> => {

    setLoading(true);

    try {
      const tx = await contracts?.nameService.expireName(names);

      await tx.wait();
    } catch (error: any) {
      console.error('failed to expire name', error.message);
      throw new Error('failed or name hasnt expired yet');
    } finally {
      setLoading(false);
    }
  }, [contracts?.nameService]);

  const updateNameServicePrices = useCallback(async (
    oneYear: ethers.BigNumber,
    threeYears: ethers.BigNumber,
    permanent: ethers.BigNumber
  ):Promise<any> => {

    setLoading(true);

    try {
      const tx = await contracts?.nameService.updatePricing(oneYear, threeYears, permanent);

      await tx.wait()

      return tx.ContractTransaction;
    } catch (error: any) {
      console.error('failed to update price', error.message);
      throw new Error("failed to update prices");
    } finally {
      setLoading(false);
    }
  }, [contracts?.nameService]);

  const withdrawNameServicesFee = useCallback(async () => {

    setLoading(true);

    try {
      const tx = await contracts?.nameService.withdrawRevenue();

      await tx.wait();
    } catch (error: any) {
      console.error('failed to withdraw revenue fees', error.message);
      throw new Error('failed to transfer', error);
    } finally {
      setLoading(false);
    }
  }, [contracts?.nameService]);

  const userHasValidNames = useCallback(async (address: string): Promise<boolean> => {
    if (!contracts?.factory || !contracts.nameService || !account) {
      throw new Error("intiate contracts or connect account");
    }

    try {
      const tx = await contracts.factory.hasValidNames(address);

      await tx.wait();

      return true;
    } catch (error: any){
      console.error("name validation failed", error);
      
      throw new Error("account didn't match name:", error.message)
      
    } finally {
      setLoading(false);
      return false
    }
  }, [contracts?.factory, contracts?.nameService, account]);

  const purchaseBonds = useCallback(async (
    bondType: number, 
    quantity: number
  ): Promise<BondPurchaseResult> => {
    if (!contracts?.factory || !contracts?.bondNFT || !account) {
      throw new Error("Contracts not initialized or account not connected");
    }

    try {
      setLoading(true);

      const bondPrices: Record<number, ethers.BigNumber> = {
        1: ethers.utils.parseEther("0.085"),
        2: ethers.utils.parseEther("0.09"),
        3: ethers.utils.parseEther("0.62"),
        4: ethers.utils.parseEther("2.488")
      };

      const totalCost = bondPrices[bondType].mul(quantity);

      // Purchase bonds through factory
      const tx1 = await contracts.factory.purchaseBonds(
        bondType,
        quantity,
        { value: totalCost }
      );
      await tx1.wait();

      // Get balance (assuming this was meant instead of minting)
      const tx2 = await contracts.bondNFT.getBalance(
        account,
        bondType
      );
      await tx2.wait();

      return { purchaseTx: tx1, balanceTx: tx2 };
    } catch (error) {
      console.error("Bond purchase failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contracts?.factory, contracts?.bondNFT, account]);

  // Send bonds to AB player (burn NFTs)
  const sendBondsToPlayer = useCallback(async (
    bondType: number, 
    quantity: number, 
    playerId: string, 
    server: string
  ): Promise<ethers.ContractTransaction> => {
    if (!contracts?.bondNFT || !account) {
      throw new Error("Bond NFT contract not initialized or account not connected");
    }

    try {
      setLoading(true);

      // Burn the bond NFTs
      const tx = await contracts.bondNFT.burnBond(
        account,
        bondType,
        quantity
      );
      await tx.wait();

      // In a real implementation, this would emit a custom event
      // or call a backend API to credit the player's game account
      console.log(`Bonds sent to player ${playerId} on ${server}`);

      // Add to events for UI
      const newEvent: WalletEvent = {
        type: 'BondSentPlayer',
        data: { playerId, server, bondType, quantity },
        timestamp: Date.now()
      };
      setEvents(prev => [newEvent, ...prev]);

      return tx;
    } catch (error) {
      console.error("Send bonds to player failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contracts?.bondNFT, account]);

  // Event Listeners 
  useEffect(() => {
    if (!contracts?.factory || !account) return;

    const handleWalletCreated = (user: string, wallet: string, creationTime: ethers.BigNumber) => {
      if (user.toLowerCase() === account.toLowerCase()) {
        const event: WalletEvent = {
          type: 'WalletCreated',
          data: { wallet, creationTime: creationTime.toNumber() },
          timestamp: Date.now()
        };
        setEvents(prev => [event, ...prev]);
        fetchWalletInfo();
      }
    };

    const handleBondPurchased = (
      user: string, 
      bondType: ethers.BigNumber, 
      quantity: ethers.BigNumber, 
      totalCost: ethers.BigNumber
    ) => {
      if (user.toLowerCase() === account.toLowerCase()) {
        const event: WalletEvent = {
          type: 'BondPurchased',
          data: {
            bondType: bondType.toNumber(),
            quantity: quantity.toNumber(),
            totalCost: ethers.utils.formatEther(totalCost)
          },
          timestamp: Date.now()
        };
        setEvents(prev => [event, ...prev]);
        fetchWalletInfo();
      }
    };
        
    contracts.factory.on("WalletCreated", handleWalletCreated);
    contracts.factory.on("BondPurchased", handleBondPurchased);

    return () => {
      contracts.factory.removeAllListeners();
    };
  }, [contracts?.factory, account, fetchWalletInfo]);

  // Name service event listeners
  useEffect(() => {
    if (!contracts?.nameService || !account) return;

    const handleNameRegistered = (
      owner: string, 
      name: string, 
      duration: ethers.BigNumber, 
      cost: ethers.BigNumber
    ) => {
      if (owner.toLowerCase() === account.toLowerCase()) {
        const event: WalletEvent = {
          type: 'NameRegistered',
          data: {
            name,
            duration: duration.toNumber(),
            cost: ethers.utils.formatEther(cost)
          },
          timestamp: Date.now()
        };
        setEvents(prev => [event, ...prev]);
      }
    };


    contracts.nameService.on("NameRegistered", handleNameRegistered);

    return () => {
      contracts.nameService.removeAllListeners();
    };
  }, [contracts?.nameService, account]);

  // Bond NFT event listeners
  useEffect(() => {
    if (!contracts?.bondNFT || !account) return;

    const handleBondMinted = (user: string, bondType: ethers.BigNumber, quantity: ethers.BigNumber) => {
      if (user.toLowerCase() === account.toLowerCase()) {
        const event: WalletEvent = {
          type: 'BondNFTMinted',
          data: {
            bondType: bondType.toNumber(),
            quantity: quantity.toNumber()
          },
          timestamp: Date.now()
        };
        setEvents(prev => [event, ...prev]);
      }
    };

    const handleBondBurned = (user: string, bondType: ethers.BigNumber, quantity: ethers.BigNumber) => {
      if (user.toLowerCase() === account.toLowerCase()) {
        const event: WalletEvent = {
          type: 'BondNFTBurned',
          data: {
            bondType: bondType.toNumber(),
            quantity: quantity.toNumber()
          },
          timestamp: Date.now()
        };
        setEvents(prev => [event, ...prev]);
      }
    };

    contracts.bondNFT.on("BondMinted", handleBondMinted);
    contracts.bondNFT.on("BondBurned", handleBondBurned);

    return () => {
      contracts.bondNFT.removeAllListeners();
    };
  }, [contracts?.bondNFT, account]);

  // Auto-fetch wallet info when account changes
  useEffect(() => {
    if (account && contracts?.factory) {
      fetchWalletInfo();
    }
  }, [account, contracts?.factory, fetchWalletInfo]);

  return {
    // State
    account,
    provider, 
    signer,
    walletInfo,
    nameInfo,
    userNames,
    events,
    loading,
    contracts,

    // Actions
    connectWallet,
    memoizedFetchWalletInfo,
    userHasValidNames,
    createWallet,
    deposit,
    transfer,
    withdraw,
    checkNamesAvailability,
    registerNameService,
    renewName,
    expireName,
    updateNameServicePrices,
    withdrawNameServicesFee,
    getUserNames,
    getNameInfo,
    purchaseBonds,
    displayBondBalance,
    sendBondsToPlayer,
    fetchWalletInfo
  };
};