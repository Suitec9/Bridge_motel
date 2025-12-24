
import { useState, useEffect, useCallback } from "react";
import { ethers, Contract, utils } from "ethers";
import { BOND_NFT_ABI } from "../../constants/ABBondNFT";
import { NAME_SERVICE_ABI } from "../../constants/ABNameService";
import { FACTORY_ABI, CONTRACT_ADDRESSES } from "../../constants/PrimeFactory";
import { useAccount } from "wagmi";
import { provider_ } from "./config/configs";
import { parseEther } from "ethers/lib/utils";
import loadConfig from "next/dist/server/config";
import { localConfig } from "./config/bridge_Networkish";
import { toast } from "react-toastify";

// Types

interface TokenBalance_Symbol {
  value: number;
  symbol: string;
}
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

export interface UserNames {
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
  balanceTx: number;
}

interface NameRegistrationResult {
  tx1: ethers.ContractTransaction;
}

interface NameRenewResult {
  tx: ethers.ContractTransaction;
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
  provider: ethers.providers.Provider;
  signer: ethers.Signer;
  account: string | null;
}

interface Pricing {
    oneYear: number;
    threeYear: number;
    permanent: number;
}

export const useABWallet = () => {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | undefined>(undefined);
  const [account, setAccount] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contracts_motel>();
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [balanceOf, setBalanceOf] = useState<TokenBalance_Symbol | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [nameInfo, setNameInfo] = useState<NameInfoCollector | null>(null);
  const [userNames, setUserName] = useState<string[]>([]);
  const [events, setEvents] = useState<WalletEvent[]>([]);
  const [nameDetails, setNameDetails] = useState<Map<string, {
    owner: string;
    expiryTime: number;
    isPermanent: boolean;
    isExpired: boolean;
  }>>(new Map());
  const [loading, setLoading] = useState<boolean>(false);
  const {address} = useAccount();
  const abiIERC20 = new ethers.utils.Interface([
      "function approve(address spender, uint256 value)  returns (bool)",
      'function decimals() view returns (uint8)',
      'function balanceOf(address) external view returns (uint256)',
      'function symbol() public view returns (string memory)'
  ]);

  // Initialize Web3 Connection
  const connectWallet = useCallback(async (): Promise<ConnectionResult> => {
          
    try {

      if (!window.ethereum) {
        throw new Error("MetaMask not found");
      }
       
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      console.log("accounts [0]", accounts);
      const _provider = new ethers.providers.Web3Provider(window.ethereum); // I am getting error here, 
      // "call exception" the checknameavailable function revert withs failed to create provider

      const chainId = await _provider.getNetwork().then(network => network.chainId);
      console.log("connected to chainId:", chainId);

      if (chainId !== localConfig.chainId) {
        toast.error(`Please switch to the correct network: ${localConfig.chainId}`);    
      }

      const _signer = _provider?.getSigner();
/**
 *       const account = await _signer.getAddress();
      console.log("account connected:", account);

 */
      console.log("provider network", await _provider.getNetwork());

      setProvider(_provider);
      setSigner(_signer);
      setAccount(accounts[0]);
             
      return { provider: _provider, signer: _signer, account: account };
    } catch (error) {
      console.error("Wallet connection failed:", error);
      throw error;
    }
  }, []);

  useEffect(() => {

    if (provider && signer && account) {
      console.log("check account on initialization", account);
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

    }
  }, [provider, signer, account]);

  // Fetch wallet information
  const fetchWalletInfo = useCallback(async (address: string | undefined): Promise<any> => {
    if (!contracts?.factory  || !account) return;      
    console.log("logging provider:", contracts?.factory.provider);
    console.log("logging signer:",  contracts?.factory.signer);
    console.log("logging account:", account);
    console.log("logging contract address: factory:", contracts.factory.address);

    setLoading(true);

    try {  
      const connectContract = contracts.factory.connect((await connectWallet()).signer);
      const gasCostEstimate = await connectContract.estimateGas.getWalletInfo(account);
   
      console.log("gas estimate for getWalletInfo:", gasCostEstimate.toString());
      const {
        wallet,
        creationTime,
        timeUnlitExpiry,
        isExpired,
        bondBalance,
        walletHoldingBalance

      } = await connectContract.callStatic.getWalletInfo(account);
      console.log("address mount check:", address);
      console.log("account set up:", account);

      console.log("wallet info set:", { 
        wallet: wallet.toString(),
        creationTime: creationTime.toNumber(), 
        timeUnlitExpiry: timeUnlitExpiry.toNumber(), 
        isExpired: isExpired, 
        bondBalance: bondBalance.toNumber(),
        walletHoldingBalance: walletHoldingBalance.toNumber()}); 

      setWalletInfo({
          walletAddress: wallet,//info[0],
          creationTime: creationTime.toNumber(),//info[1].toNumber(),
          timeUntilExpiry: timeUnlitExpiry.toNumber(),//info[2].toNumber(),
          isExpired: isExpired,//info[3].boolean,
          bondBalance: bondBalance.toNumber(),//info[4].toNumber(),
          walletBalance: walletHoldingBalance.toNumber()//info[5].toString()
      });
 
    } catch (error: any) {
      console.error("Failed to fetch wallet info:", error);
      console.log("error in fetch wallet info:", error.message);
      console.log("error reason:", error.reason);
      console.log("error code:", error.code);
      throw new Error("failed to fetch wallet info:", error.message);
    } finally {
      setLoading(false);
    }
  }, [contracts?.factory]);

  const displayERC20balance = useCallback( async (address: string | undefined):Promise<any> => {
    if (!contracts?.factory || !address || !account) return;

    setLoading(true);
    try {
      const balance_ERC20 = await contracts.factory.getWalletBalance_ERC20(address);
      console.log("account check:", account);
      console.log( "wallet ERC20 balance", await balance_ERC20);
     
      const AddressWallet = await contracts.factory.userHoldingWallet(address);
      console.log("proxy holding wallet address", await AddressWallet);
      const IERC20_instance = new ethers.Contract(await contracts.factory.token(), abiIERC20, provider?.getSigner());
      
      const tokenSymbol = await IERC20_instance.symbol();
      console.log("symbol", await tokenSymbol);
      
      setBalanceOf({
        value: Number(balance_ERC20),
        symbol: tokenSymbol.toString()
      });
    } catch (error: any) {
      console.error("balance NA now", error);
      throw new Error("failed to fetch balance:", error.message);
    } finally {
      setLoading(false);
    }
  }, [contracts?.factory, abiIERC20]);

  const fetchNamePrices = useCallback(async():Promise<{
    oneYear: number, 
    threeYear: number, 
    permanent: number}> => {

    if (!contracts?.nameService) undefined;

    try {
      const {
        oneYear, 
        threeYear, 
        permanent, 
        isActive 
      } = await contracts?.nameService.connect((await connectWallet()).signer).callStatic.pricing();

      console.log("fetch data check:", setPricing({
        oneYear: Number(oneYear),
        threeYear: Number(threeYear),
        permanent: Number(permanent)
      }));

      console.log("pricing tier", {
        oneYear: Number(oneYear),
        threeYears: Number(threeYear),
        permanent: Number(permanent),
        isActive: isActive
      })

      return {
        oneYear: Number(oneYear),
        threeYear: Number(threeYear),
        permanent: Number(permanent)
      }

    } catch (error: any) {
      console.error("failed to fetch prices", error);
      throw new Error("failed to get prices", error.message);
    } finally {
      setLoading(false);
    }
  }, [contracts?.nameService]);

  // Memoize to prevent unnecessary re-renders
  const memoizedFetchWalletInfo = useCallback(
    () => fetchWalletInfo(`0x${address}`), 
    [fetchWalletInfo, address]
  );

  // Create AB wallet
  const createWallet = useCallback(async (): Promise<ethers.ContractTransaction> => {
    if (!contracts?.factory || !address || !account) {
      throw new Error("Factory contract not initialized");
    }

    try {
      setLoading(true);
      const tx = await contracts.factory.createHoldingWallet();
      console.log("creating holding wallet:", tx);
      await tx.wait();

      // Refresh wallet info
      await fetchWalletInfo(account);

      return tx;
    } catch (error) {
      console.error("Wallet creation failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contracts?.factory, fetchWalletInfo, address]);

  const deposit = useCallback(async (
    tokenAddress: string,
    amount: number
  ): Promise<DepositResult> => {

    if (!contracts || !address || !account) {
      throw new Error('account not connected or wallet does not exsit');
    }

    const IERC20_instance = new ethers.Contract(tokenAddress, abiIERC20, provider?.getSigner());

    setLoading(true);
    try {
      const tokenDecimal = await IERC20_instance.decimals();
      console.log("decimals for tokens", tokenDecimal);
      const bigN = ethers.utils.parseUnits(amount.toString(), tokenDecimal);

      console.log("approve the factory to spend funds", await IERC20_instance.approve(CONTRACT_ADDRESSES.FACTORY, bigN));
      const tx = await contracts?.factory.depositFunds_ERC20(tokenAddress, bigN );
      await tx.wait();
     
     return tx;
    
    } catch (error) {
      console.error("failed to make a deposit", error);
      throw error;
    } finally {
      setLoading(false);
    }
    
  }, [ contracts?.factory, address ]);
  
  const transfer = useCallback(async (
    tokenAddress: string,
    recipient: string,
    amount: number,
  ): Promise<TransferResult> => {
    if (!contracts?.factory || !account || !amount || !address || amount > 0 || 
      recipient.toLowerCase() === address.toLowerCase())  {
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
  }, [contracts?.factory, address])

  const withdraw = useCallback(async ():Promise<WithdrawResult> => {
    if (!contracts?.factory || !address || !account) {
      throw new Error("Contract not initialized or account don't exsit");
    }

    try {
      setLoading(true);

      const tx = await contracts.factory.withdraw();
      await tx.wait();

      return tx.ContractTransaction;
    } catch (error: any) {
      console.error('failed to withdraw', error);
      throw new Error('failed to withdraw', error.message);
    } finally {
      setLoading(false);
    }
  }, [contracts?.factory, address]);

  // Register name service with eERC20
  const registerNameService = useCallback(async (
    name: string, 
    duration: number, 
  ): Promise<NameRegistrationResult> => {
    if (!contracts?.nameService && !address || !account) {
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

      const tx1 = await contracts?.nameService.registerName(
        name,
        duration,
        { value: costs[duration] }
      );
      console.log("waiting for confirmation....", await tx1);

      return  tx1;
    } catch (error) {
      console.error("Name service registration failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contracts?.nameService, address]);


  const checkNamesAvailability = useCallback(async (
    name: string
  ): Promise<any> => {
    if (!contracts?.nameService) return;
    
    console.log("logging contract for name availability:", contracts?.nameService);
    console.log("logging provider for name availability:", contracts?.nameService.provider);
    console.log("logging signer for name availability:", contracts?.nameService.signer);
    console.log("logging account for name availability:", account);
    console.log("logging contract address:", contracts.nameService.address);
    setLoading(true);
    
    try {
      console.log("check provider and contract:", contracts?.nameService);
      const connectContract = contracts?.nameService.connect((await connectWallet()).signer);
      console.log("connected contract:", connectContract);
      const tx = await connectContract.checkNameAvailable(name);

      console.log("name searcher check:", await tx);

      return await tx;

    } catch (error: any) {
      console.error('failed to check name availibity', error);
      console.log("error code:", error.code);
      console.log("error reason:", error.reason);
      console.log("error message:", error.message);
      throw new Error('failed to check name', error.message);
    } finally {
      setLoading(false);
    }
  }, [contracts?.nameService]);

  const getNameInfo = useCallback(async (
    names: string
  ): Promise<any> => {

    if (!contracts?.nameService || !address || !account) return;

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

  const getUserNames = useCallback(async (
    address: string
  ):Promise<string[]> => {
    if (!contracts?.nameService || !address || !account) {
      throw new Error("Name service contract not initialized");
    }
    setLoading(true);

    try {
      const tx: string[] = await contracts?.nameService.connect(
        (await connectWallet()).signer).callStatic.getUserNames(address);
      console.log(`Found ${tx.length} names for ${address}:`, tx);
      console.log("tx to names:", tx);
      console.log("is object:", typeof tx);
      console.log("is Array:", Array.isArray(tx));
      console.log("first name:", tx[0]);

      setUserName(tx);

      fetchNameDetails(tx);

      return tx;

    } catch (error: any) {
      console.error('failed to get user names', error.message);
      setUserName([])
      return [];
      
    } finally {
      setLoading(false);
    }
  }, [contracts?.nameService]);

  const fetchNameDetails = useCallback(async(names: string[]) => {
    if (!contracts?.nameService || !address || !account) return;
    const detailsMap = new Map();

    for (const name of names) {
      try {
        const info = await contracts?.nameService.getNameInfo(name);

        detailsMap.set(name, {
          owner: info[0],
          expiryTime: info[1],
          isPermanent: info[2],
          isExpired: info[3]
        });

      } catch (error: any) {
        console.error(`Failed to get details for ${name}`, error);
      }
    }
    setNameDetails(detailsMap);
  }, [contracts?.nameService]);

  const renewName = useCallback(async (
    names: string,
    duration: number
  ): Promise<NameRenewResult> => {
    if (!contracts?.nameService && !address || !account) {
      throw new Error("Name service contract not initialized");
    }
    setLoading(true);

      // Calculate cost based on duration
      const costs: Record<number, ethers.BigNumber> = {
        1: ethers.utils.parseEther("0.125"), // 1 year
        3: ethers.utils.parseEther("0.25"),  // 3 years
      }

    try {
      const tx = await contracts?.nameService.renewName(names, duration, costs[duration]);

      console.log("transaction results", await tx);

      return tx;
    } catch (error: any) {
      console.error('failed to renew name', error.message);
      throw new Error('failed to new name');
    }
  }, [contracts?.nameService]);

  const expireName = useCallback(async (
    names: string
  ): Promise<any> => {

    if (!contracts?.nameService || !address || !account)  return;
    
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
    if (!contracts?.nameService && !(await contracts?.factory.owner())) return;

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
    if (!contracts?.factory && !(await contracts?.factory.owner())) return;

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
  }, [contracts?.nameService, contracts?.factory]);

  const userHasValidNames = useCallback(async (address: string): Promise<boolean> => {
    if (!contracts?.factory || !contracts.nameService || !address) {
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
  }, [contracts?.factory, contracts?.nameService, address, contracts?.factory]);

  const purchaseBonds = useCallback(async (
    bondType: number, 
    quantity: number
  ): Promise<BondPurchaseResult> => {
    if (!contracts?.factory || !contracts?.bondNFT || !address) {
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
      console.log("total cost:", totalCost);

      // Purchase bonds through factory
      const tx1 = await contracts.factory.purchaseBonds(
        bondType,
        quantity,
      //  { value: totalCost }
      );
      await tx1;

      // Get balance (assuming this was meant instead of minting)
      const tx2 = await contracts.bondNFT.balanceOf(
        account,
        bondType
      );
      await tx2.toNumber();

      return { purchaseTx: tx1, balanceTx: tx2 };
    } catch (error) {
      console.error("Bond purchase failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contracts?.factory, contracts?.bondNFT, address]);

  // Send bonds to AB player (burn NFTs)
  const sendBondsToPlayer = useCallback(async (
    bondType: number, 
    quantity: number, 
    playerId: string, 
    server: string
  ): Promise<ethers.ContractTransaction> => {
    if (!contracts?.bondNFT || !address) {
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
  }, [contracts?.bondNFT, address]);

  // Event Listeners 
  useEffect(() => {
    if (!contracts?.factory || !address) return;

    const handleWalletCreated = (user: string, wallet: string, creationTime: ethers.BigNumber) => {
      if (user.toLowerCase() === `0x${address}`.toLowerCase()) {
        const event: WalletEvent = {
          type: 'WalletCreated',
          data: { wallet, creationTime: creationTime.toNumber() },
          timestamp: Date.now()
        };
        setEvents(prev => [event, ...prev]);
        fetchWalletInfo(account!);
      }
    };

    const handleBondPurchased = (
      user: string, 
      bondType: ethers.BigNumber, 
      quantity: ethers.BigNumber, 
      totalCost: ethers.BigNumber
    ) => {
      if (user.toLowerCase() ===`0x${address}`.toLowerCase()) {
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
        fetchWalletInfo(`0x${address}`);
      }
    };
        
    contracts.factory.on("WalletCreated", handleWalletCreated);
    contracts.factory.on("BondPurchased", handleBondPurchased);

    return () => {
      contracts.factory.removeAllListeners();
    };
  }, [contracts?.factory, address, fetchWalletInfo]);

  // Name service event listeners
  useEffect(() => {
    if (!contracts?.nameService || !address) return;

    const handleNameRegistered = (
      owner: string, 
      name: string, 
      duration: ethers.BigNumber, 
      cost: ethers.BigNumber
    ) => {
      if (owner.toLowerCase() === `0x${address}`.toLowerCase()) {
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
  }, [contracts?.nameService, address]);

  // Bond NFT event listeners
  useEffect(() => {
    if (!contracts?.bondNFT || !address) return;

    const handleBondMinted = (user: string, bondType: ethers.BigNumber, quantity: ethers.BigNumber) => {
      if (user.toLowerCase() === `0x${address}`.toLowerCase()) {
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
      if (user.toLowerCase() === `0x${address}`.toLowerCase()) {
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
  }, [contracts?.bondNFT, address]);

  // Auto-fetch wallet info when account changes
  useEffect(() => {
    if (address && contracts?.factory) {
      fetchWalletInfo(`0x${address}`);
    }
  }, [address, contracts?.factory, fetchWalletInfo]);

  return {
    // 
    account,
    provider, 
    signer,
    walletInfo,
    nameDetails,
    balanceOf,
    pricing,
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
    fetchNamePrices,
    withdrawNameServicesFee,
    getUserNames,
    getNameInfo,
    purchaseBonds,
    sendBondsToPlayer,
    fetchWalletInfo,
    displayERC20balance,
  };
};