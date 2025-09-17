
import { useState, useEffect, useCallback } from "react";
import { ethers, Contract } from "ethers";
import { BOND_NFT_ABI } from "../../constants/ABBondNFT";
import { NAME_SERVICE_ABI } from "../../constants/ABNameService";
import { FACTORY_ABI, CONTRACT_ADDRESSES } from "../../constants/PrimeFactory";

// Types
interface WalletInfo {
  walletAddress: string;
  creationTime: number;
  timeUntilExpiry: number;
  isExpired: boolean;
  bondBalance: number;
}

interface Contracts {
  factory: Contract;
  nameService: Contract;
  bondNFT: Contract;
}

interface WalletEvent {
  type: 'WalletCreated' | 'BondPurchased' | 'NameRegistered' | 'eERC20AccessGranted' | 'BondNFTMinted' | 'BondNFTBurned' | 'BondSentPlayer';
  data: any;
  timestamp: number;
}

interface BondPurchaseResult {
  purchaseTx: ethers.ContractTransaction;
  balanceTx: ethers.ContractTransaction;
}

interface NameRegistrationResult {
  tx1: ethers.ContractTransaction;
  tx2: ethers.ContractTransaction | null;
}

interface ConnectionResult {
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
  account: string;
}

export const useABWallet = () => {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contracts | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [events, setEvents] = useState<WalletEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize Web3 Connection
  const connectWallet = useCallback(async (): Promise<ConnectionResult> => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not found");
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
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

      const nameServiceContract = new ethers.Contract(
        CONTRACT_ADDRESSES.NAME_SERVICE,
        NAME_SERVICE_ABI,
        signer
      );

      const bondNFTContract = new ethers.Contract(
        CONTRACT_ADDRESSES.BOND_NFT,
        BOND_NFT_ABI,
        signer
      );

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

  // Create AB wallet
  const createWallet = useCallback(async (): Promise<ethers.ContractTransaction> => {
    if (!contracts?.factory) {
      throw new Error("Factory contract not initialized");
    }

    try {
      setLoading(true);
      const tx = await contracts.factory.createHoldingWallet();
      await tx.wait();

      // Refresh wallet info
      await fetchWalletInfo();

      return tx;
    } catch (error) {
      console.error("Wallet creation failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contracts?.factory]);

  // Register name service with eERC20
  const registerNameService = useCallback(async (
    name: string, 
    duration: number, 
    enablePrivacy: boolean = true
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

      let tx2: ethers.ContractTransaction | null = null;

      // Auto-enable eERC20 access
      if (enablePrivacy) {
        tx2 = await contracts.nameService.enableeERC20Access(name);
        await tx2?.wait();
      }

      return { tx1, tx2 };
    } catch (error) {
      console.error("Name service registration failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contracts?.nameService]);

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

  // Fetch wallet information
  const fetchWalletInfo = useCallback(async (): Promise<void> => {
    if (!contracts?.factory || !account) return;

    try {
      const info = await contracts.factory.getWalletInfo(account);
      setWalletInfo({
        walletAddress: info[0],
        creationTime: info[1].toNumber(),
        timeUntilExpiry: info[2].toNumber(),
        isExpired: info[3],
        bondBalance: info[4].toNumber()
      });
    } catch (error) {
      console.error("Failed to fetch wallet info:", error);
    }
  }, [contracts?.factory, account]);

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

    const handleeERC20AccessGranted = (user: string, name: string) => {
      if (user.toLowerCase() === account.toLowerCase()) {
        const event: WalletEvent = {
          type: 'eERC20AccessGranted', 
          data: { name },
          timestamp: Date.now()
        };
        setEvents(prev => [event, ...prev]);
      }
    };

    contracts.nameService.on("NameRegistered", handleNameRegistered);
    contracts.nameService.on("eERC20AccessGranted", handleeERC20AccessGranted);

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
    walletInfo,
    events,
    loading,
    contracts,

    // Actions
    connectWallet,
    createWallet,
    registerNameService,
    purchaseBonds,
    sendBondsToPlayer,
    fetchWalletInfo
  };
};