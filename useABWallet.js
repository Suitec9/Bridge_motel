import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { BOND_NFT_ABI } from "../../constants/ABBondNFT";
import { NAME_SERVICE_ABI } from "../../constants/ABNameService";
import { FACTORY_ABI, CONTRACT_ADDRESSES } from "../../constants/PrimeFactory";
import { error } from "console";

export const useABWallet = () => {

    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [account, setAccount] = useState(null);
    const [contracts, setContracts] = useState(null);
    const [walletInfo, setWalletInfo] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false)

    // Initialize Web3 COnnection
    const connectWallet = useCallback(async () => {
        try {
            if (!window.ethereum) {
                throw new Error("metaMask not found");
            }

            const provider = new ethers.provider.Web3Provider(window.ethereum);
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
            return { provider, signer, account: accounts[0]};
        } catch {
            console.error("Wallet connection failed:", error);
            throw error;
        }
    }, []);

    // Create AB wallet
    const createWallet = useCallback(async () => {
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
    }, [contracts.factory]);

    // Register name service with eERC20
    const registerNameService = useCallback(async (name, duration, enablePrivacy = true) => {
        try {
            setLoading(true);

            // Calculate cost based on duration
            const costs = {
                1: ethers.utils.parseEther("0.125"), // 1 year
                3: ethers.utils.parseEther("0.25"),  // 3 years
                0: ethers.utils.parseEther("1")  // permanent
            };

            const tx1 = await contracts.nameService.registerName(
                name,
                duration,
                { value: costs[duration] }
            );
            await tx1.wait();

            // Auto-enable eERC20 access
            if (enablePrivacy) {
                const tx2 = await contracts.nameService.enableeERC20Access(name);
                await tx2.wait();
            }

            return { tx1, tx2: enablePrivacy ? tx2 : null };
        } catch (error) {
            console.error("Name service registration failed:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [contracts.nameService]);

    const purchaseBonds = useCallback(async (bondType, quantity) => {
        try {
            setLoading(true);

            const bondPrices = {
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

            // Mint NFT bonds
            const tx2 = await contracts.bondNFT.getBalance(
                account,
                bondType,
            );
            await tx2.wait();

            return { purchaseTx: tx1, BalanceTx: tx2};
        } catch (error) {
            console.error("Bond purchase failed");
            throw error;
        } finally {
            setLoading(false);
        }
    }, [contracts.factory, contracts.bondNFT, account]);

    // Send bonds to AB player (burn NFTs)
    const sendBondsToPlayer = useCallback(async (bondType, quantity, playerId, server) => {
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
            // or call a backend API to creadit the player's game account
            console.log(`Bonds sent to player ${playerId} on ${server}`);

            // Add to events for UI
            const newEvent = {
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
    }, [contracts.bondNFT, account]);

    // Fatch wallet information
    const fetchWalletInfo = useCallback(async () => {

        if (!contracts.factory || !account) return;

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
    }, [contracts.factory, account]);

    // Event Listeners 
    useEffect(() => {
        if (!contracts.factory) return;

        const handleWalletCreated = (user, wallet, creationTime) => {
            if (user.toLowerCase() === account?.toLowerCase()) {
                const event = {
                    type: 'WalletCreated',
                    data: { wallet, creationTime: creationTime.toNumber() },
                    timestamp: Date.now()
                };
                setEvents(prev => [event, ...prev]);
                fetchWalletInfo();
            }
        };

        handleBondPurchased = (user, bondType, quantity, totalCost) => {
            if (user.toLowerCase() === account?.toLowerCase()) {
                const event = {
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
    }, [contracts.factory, account, fetchWalletInfo]);

    // Name service event listeners
    useEffect(() => {
        if (!contracts.nameService) return;

        const handleNameRegistered = (owner, name, duration, cost) => {
            if (owner.toLowerCase() === account?.toLowerCase()) {
                const event = {
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

        const handleeERC20AccessGranted = (user, name) => {
            if (user.toLowerCase() === account?.toLowerCase()) {
                const event = {
                    type: 'eERCAccessGranted', 
                    data: { name },
                    timestamp: Date.now()
                };
                setEvents(prev => [event, ...prev]);
            }
        };

        contracts.factory.on("NameRegistered", handleNameRegistered);
        contracts.factory.on("eERC20AccessGranted", handleeERC20AccessGranted);

        return () => {
            contracts.nameService.removeAllListeners();
        };
    }, [contracts.nameService, account]);

    // Bond NFET event listners
    useEffect(() => {
        if (!contracts.bondNFT) return;

        const handleBondMinted = (user, bondType, quantity)  => {
            if (user.toLowerCase() === account?.toLowerCase()) {
                const event = {
                    type: 'BondNFTMinted',
                    data: {
                        bondType: bondType.toNumber(),
                        quantity: quantity.toNumber()
                    },
                    timestamp: Date.now()
                };
                setEvents(prev => [event, ...prev])
            }
        };

        const handleBondBurned = (user, bondType, quantity) => {
            if (user.toLowerCase() === account?.toLowerCase()) {
                const event = {
                    type: 'BondNFTBurned',
                    data: {
                        bondType: bondType.toNumber(),
                        quantity: quantity.toNumber()
                    },
                    timestamp: Date.now()
                };
                setEvents(pre => [event, ...prev]);
            }
        };

        contracts.bondNFT.on("BondMinted", handleBondMinted);
        contracts.bondNFT.on("BondBurned", handleBondBurned);

        return () => {
            contracts.bondNFT.removeAllListeners();
        };
    }, [contracts.bondNFT, account]);

    // Auto-fetch wallet info when account changes
    useEffect(() => {
        if (account && contracts.factory) {
            fetchWalletInfo();
        }
    }, [account, contracts.factory, fetchWalletInfo]);

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

