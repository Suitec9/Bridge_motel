"use client"
import React, { useState, useEffect, useCallback } from "react";
import { ToastContainer, toast } from 'react-toastify';
import { 
  Wallet, 
  Shield, 
  Users, 
  TrendingUp, 
  ArrowDown, 
  Eye, 
  ShoppingCart, 
  Settings, 
  DollarSign, 
  Zap, 
  Lock, 
  Unlock, 
  ArrowUpDown, 
  FileText,
  Coins,
  Loader2
} from "lucide-react";

import { EnhancedWallet } from "@/components/EnhancedWallet";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useCall, useDisconnect } from "wagmi";
import { anvil, avalanche, avalancheFuji, polygonAmoy, sepolia } from "viem/chains";
import { formatEther } from "viem";
import { eERC20ContractInterface, eERC20ZKProofGenerator } from "@/utils/zkProofInputs";

import { useABWallet } from "@/hooks/useABWallet";
import { CONTRACTS_ERC20, ENCRYPTED_ERC_ABI, provider_ } from "../hooks/config/configs";

import { useRouter } from "next/navigation";
import { NameService } from "@/components/NameServiceComponent";
import  Image  from "next/image";

interface EnhancedWalletProps {
  balance: any;
  userHoldingWallet: string | undefined;
  hasValidNames: boolean;
}

const MotelSmartWallet = () => {

  const [ activeTab, setActiveTab ] = useState('dashBoard');
  const [ userRole, setUserRole ] = useState('player'); // 'admin' or 'player'
  const [ admin, setAdmin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusBond, setStatusBond] = useState<string | null>(null);
  const abWallet = useABWallet();

  // eERC20 specific state
  const [eERC20System, setEERC20System] = useState<{
    proofGenerator: eERC20ZKProofGenerator | null;
    contractInterface: eERC20ContractInterface | null;
    isInitialized: boolean;
  }>({
    proofGenerator: null,
    contractInterface: null,
    isInitialized: false
  });

 
  const [ bonds, setBonds ] = useState([
    {id: 1, type: 'Premium', value: 1.11, discount: 15, available: 25, units:60 },
    {id: 2, type: 'PremiumII', value: 5.555, discount: 15, available: 3, units: 310 },
    {id: 3, type: 'Elite', value: 30.5555, discount: 15, available: 3, units: 1580 },
    { id: 4, type: 'Legendary', value: 111.11, discount: 15, available: 1, units: 6500 }
  ]);

  const [purchasingBondId, setPurchasingBondId] = useState<number | null>(null);
  const [bondBalances, setBondBalances] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0
  });

  /**const handleConnect = () => {
    setIsConnected(!isConnected);
  };*/

  const { address, isConnected, chain} = useAccount();
  const { disconnect } = useDisconnect();
  const { data: avaxBalance, data: sepoliaBalance, data: polygonAmoyMatic, data: anvilEthBalance } = useBalance({
    address,
    chainId: chain?.id || avalancheFuji.id || polygonAmoy.id || sepolia.id || anvil.id 
  });

  const [ethBalance, setEthBalance] = useState<EnhancedWalletProps>({
    balance: {sepoliaBalance, polygonAmoyMatic, anvilEthBalance},
    userHoldingWallet: abWallet.walletInfo?.walletAddress,
    hasValidNames: false
  })

  const [ balance, setBalance ] = useState({
    avax: avaxBalance, 
    bonds: "1000", 
    tokens: "0", 
    encrypted: "0"
  });

  // ==========================================================================================
  // eERC20 SYSTEN INITIALIZATION
  // =====================================

  // Get provided and signer from wagmi
  
//  const signer = _provider.getSigner();
  
  const initializeEERC20Integration = useCallback(async () => {
    try {
      console.log('🚀️ Initializing eERC20 integration for Motel Smart Wallet...');

      // Initialize proof generator
      
      const pg = new eERC20ZKProofGenerator(provider_, ['0','0']);
      console.log("initialize generator", pg);

      // eERC20 contract interface
      const contractAddress = CONTRACTS_ERC20;//process.env.NEXT_PUBLIC_EERC20_CONTRACT;  // fuli or subnet eERC20 contract address

      const ci = new eERC20ContractInterface(contractAddress, ENCRYPTED_ERC_ABI, provider_.getSigner(), pg);
      console.log("eERC20 contract initialize", ci);
      
      setEERC20System({
        proofGenerator: pg,
        contractInterface: ci,
        isInitialized: true
      });

      console.log('✅️ eERC20 integration initialized successfully');
    } catch (error: any) {
      console.error('❌️ eERC20 integration failed:', error);
      // Don't block the app if fails - show warning but continue
      console.warn('Continuing without eERC20 features');
    }
  }, []);

  const initializeUseABWallet = useCallback(async () => {
    try {
      console.log('🚀️ Initializing useABWallet hook...')    
      const connectToWallet = await abWallet.connectWallet();
      console.log("initailization of abWallet hook", connectToWallet.account);

      console.log('✅️ useABWallet initialized successfully');
    } catch (error: any) {
      console.error('❌️ useABWallet initialization failed:', error);
    }
  }, []);

  useEffect(() => {
    
    initializeEERC20Integration();
  }, []);

  // Handler for purchasing bonds
  const handlePurchaseBond = useCallback(async(
    bondId: number,
    quantity: number = 1
  ) => {
    //const notify = () => toast("Wow so easy!");
    const address_ = await abWallet.connectWallet().then(res => res.account);

    if (!address_ || !abWallet.contracts?.bondNFT || address_ === address) {
      toast.error("Please connect your wallet");
    }

    setPurchasingBondId(bondId);

    try {
      // Call the hook's purchaseBonds function
      // bondId maps directly to bondType in the smart contract
      const { purchaseTx, balanceTx} = await abWallet.purchaseBonds(bondId, quantity);

      console.log("Purchase transaction:", (await purchaseTx.wait()).transactionHash.toString());
      console.log("Balance update:", balanceTx);
      const txHash = (await purchaseTx.wait()).transactionHash.toString();

      // Update local bond balance
      setBondBalances(prev => ({
        ...prev,
        [bondId]: (prev[bondId] || 0) + (bonds.find(b => b.id === bondId)?.units || 0)
      }));

      // Update available count
      setBonds(prev => prev.map(bond => bond.id === bondId ?
         { ...bond, available: bond.available - quantity } : bond
      ));

      setStatusBond(txHash ? txHash.toString() : 'Bond purchased');

      toast.success(`Successfully purchased ${bonds.find(b => b.id === bondId)?.type} Bond!`);
    } catch (error: any) {
      console.error("Bond purchase failed:", error);
      toast.error(error || "Failed to purchase bond");

      setError(error ? error.message : 'purchase failed');
    } finally {
      setPurchasingBondId(null);
    }
  }, [address, abWallet.contracts?.bondNFT, bonds])

  useEffect(() => {
    const loadBondBalances = async (address: string | null) => {
      //const address_ = (await abWallet.connectWallet()).account
      if (!address || !abWallet.contracts?.bondNFT) return;
      console.log("signer address:", await abWallet.connectWallet().then(res => res.account));
      console.log("check address when mount:", address);

      try {
        const balances: Record<number, number> = {};
        const connectContract =  abWallet.contracts.bondNFT.connect((await abWallet.connectWallet()).signer)
        console.log("connect contract bonfNFT:", 
          connectContract.provider.getNetwork().then(network => network.chainId));

        // Load balance for each bond type
        for (const bond of bonds) {
          const balance = await connectContract.callStatic.balanceOf(
            address,
            bond.id
          );
          balances[bond.id] = balance.toNumber();
        }
        setBondBalances(balances);
      } catch (error: any) {
        console.error('Falied to load bond balances:', error);
      }
    }
    loadBondBalances(abWallet.account || null);
    console.log("address:", address);
  }, [ abWallet.contracts?.bondNFT, bonds]);
   
  const router = useRouter();

  const handleDisconnect = () => {
    disconnect()
    router.push('/')  // Redirect after disconnection
  }

  const switchRole = () => {
    setAdmin(process.env.NEXT_PUBLIC_ADMIN_ADDRESS || null);
    if (!admin) return;
    const setUser = userRole === 'admin' ? 'player' : 'admin';
    setUserRole(setUser);
  };

  interface TabButtonParams {
    id: any,
    label: any,
    icon: any,
    isActive: boolean
  }

  const TabButton = ({ id, label, icon: Icon, isActive }: TabButtonParams) => (
    <button
     onClick={() => setActiveTab(id)}
     className={`flex items-center space-x-2 px-4 py-3 rounded-lg transiton-all duration-300
      ${isActive ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
        : 'bg-gray-800 text-grey-300 hover:bg-gray-700'
      }`} >
        <Icon size={18} />
        <span className="font-medium">{label}</span>
      </button>
      
  )

  interface StatCardParams {
    title: any,
    value: any,
    subtitle: any,
    icon: any,
    color: any
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color = "purple"}: StatCardParams) => (
    <div className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6
      border border-gray-700 hover:border-${color}-500 transition-all duration-300`}>
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-gray-500 text-xs">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-full bg-${color}-600/20`}>
         <Icon className={`text-${color}-400`} size={24} /> 
         </div>
      </div>
  );

  interface BondCardParams {
    bond: {
      id: number;
      type: string;
      value: number;
      discount: number;
      available: number;
      units: number;
    };
    onPurchase: (bondId: number) => void;
    isPurchasing: boolean;
    balance: number;
  }

  const BondCard = ({ bond, onPurchase, isPurchasing, balance }: BondCardParams) => {
    const discountedPrice = bond.value * 0.85; // 15% discount
    const savings = bond.value - discountedPrice;

    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl 
      p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{bond.type}Bond</h3>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-400">${bond.value.toFixed(2)}</p>
            <p className="text-purple-400 text-sm font-medium">{bond.discount}%OFF</p>
          </div>
        </div>
        {/**Bond Units Diplay */}
        <div className="bg-gray-800/50 rounded-lg px-3 py-2 mb-3 
        flex items-center justify-between">
          <span className="text-gray-400 text-sm">Bond Units:</span>
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold">{bond.units.toLocaleString()}</span>
            <Coins className="text-yellow-400" size={16}/>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Original Price:</span>
            <span className="text-gray-400 line-through">${bond.value.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Discounted Price:</span>
            <span className="text-green-400 font-bold">${discountedPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-purple-400">You Save:</span>
            <span className="text-purple-400 font-bold">${savings.toFixed(2)}</span>
          </div>
        </div>
        {/**Your Balance Display */}
        {balance > 0 && (
          <div className="bg-blue-900/20 border border-blue-500/30 
          rounded-lg px-3 py-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-blue-300 text-sm">Your Balance:</span>
              <span className="text-blue-400 font-bold">{balance.toLocaleString()} units</span>
            </div>
          </div>
        )}
        <button onClick={() => onPurchase(bond.id)}
          disabled={isPurchasing || bond.available === 0}
          className="w-full bg-gradient-to-r from-purple-600 
          to-blue-600 text-white py-3 px-4 rounded-lg 
          hover:from-purple-700 hover:to-blue-700 transition-all 
          duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2">
            {isPurchasing ? (
              <>
              <Loader2 className="animate-spin" size={18}/>
              
              <span>Processing...</span>
              </>
            ) : bond.available === 0 ? (
              <span>Sold Out😟️</span>
            ) : (
              <>
              <ShoppingCart size={18} />
              <span>Purchase Bond</span>
              </>
            )}
          </button>
          <ToastContainer />
      </div>
    )
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 mb:grid-cols-3 gap-6">
        <StatCard
        title={avaxBalance?.symbol ? `${avaxBalance.symbol || polygonAmoyMatic.symbol || sepoliaBalance.symbol || anvilEthBalance.symbol} Balance`: 'Balance' }
        value={avaxBalance ? `${parseFloat(formatEther(avaxBalance.value | polygonAmoyMatic.value | sepoliaBalance.value | anvilEthBalance.value)).toFixed(4)} 
        ${avaxBalance.symbol || polygonAmoyMatic.symbol || sepoliaBalance.symbol || anvilEthBalance.symbol}` : '0 AVAX' }
        subtitle={avaxBalance ? `~$${(parseFloat(formatEther(avaxBalance.value | polygonAmoyMatic.value | sepoliaBalance.value | anvilEthBalance.value)) * 25).toFixed(2)} USD` : 'Connect wallet'}
        icon={DollarSign}
        color="blue"
        />

        <StatCard 
        title="AB bonds"
        value={balance.bonds}
        subtitle="Total owned"
        icon={Shield}
        color="gold"
        />

        <StatCard 
        title="Incentive Tokens"
        value={balance.tokens}
        subtitle="Coming soon"
        icon={Zap}
        color="yello"/>
      </div>

      {/** Connection Status */}
      {isConnected && (
        <div className="bg-gradient-to-br from-green-900/20 to-green-800/20 rounded-xl
          p-6 border border-green-700/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-1">Wallet Connected</h3>
              <p className="text-gray-400 text-sm">Address: {address}</p>
              <p className="text-gray-400 text-sm">Network: {chain?.name}</p>
            </div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl
      p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">AB integration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Smart Value Transfer</h3>
              <p className="text-gray-400 text-sm mb-3">
                Enable seamless transaction for in-game items valuable in nature "SD". 
              </p>
              <div className="flex items-center text-green-400 text-sm">
                <Lock size={16} className="mr-2" />
                <span>Secured by Avalanche</span>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Community Benefits</h3>
              <p className="text-gray-400 text-sm mb-3">
                15% discount on bonds, future token incentives, and direct web3 education e.g ENS.
              </p>
              <div className="flex items-center text-purple-400 text-sm">
                <Users size={16} className="mr-2" />
                <span>Built for AB players</span>
              </div>
            </div>
          </div>
      </div>
    </div>
  );

  const renderBonds = () => (
    <div className="space-y-6">
      {/**Header with Total Balance */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white">Arena Breakout Bonds</h2>
        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-500/50 p-4 rounded-lg duration-300">
            <p className="text-red-300">{error}</p>
            <ToastContainer />
          </div>
      )}
      {statusBond && (
          <div className="mb-2 bg-blue-900/30 border border-blue-500/50 p-1 rounded-lg">
            <p className="text-blue-300">{statusBond}</p>
          </div>
      )}
        {/**Elegant Balance Display */}
        <div className="flex items-center gap-3">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700
          rounded-lg px-4 py-2 flez items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Total Bond Units</p>
              <p className="text-lg font-bold text-blue-400">
                {Object.values(bondBalances).reduce((a, b) => a + b, 0).toLocaleString()}
              </p>
            </div>
            <Coins className="text-yellow-400" size={24}/>
          </div>

          <div className="bg-gradient-to-r from-purple-600 to-blue-600
           text-white px-4 py-2 rounded-lg">
            <span className="font-bold">15% Discounted Active</span>
           </div>
        </div>
      </div>
      {/**Bond Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bonds.map(bond => (
          <BondCard 
          key={bond.id}
          bond={bond}
          onPurchase={handlePurchaseBond}
          isPurchasing={purchasingBondId === bond.id}
          balance={bondBalances[bond.id] || 0}
          />
        ))}
      </div>
      {/** Future Feature Notice */}
      <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <Zap className="text-yellow-400" size={24}/>
          <div>
            <h3 className="text-yellow-400 font-semibold">Future Feature: Incentive Tokens</h3>
            <p className="text-gray-300 text-sm">
              Earn tokens backed by withdrawal fess. Token system will launch Soon
              once Community reaches critical mass.
            </p>
          </div>  
        </div>
      </div>
    </div>
  );
  
  {/** render wallet*/}
  const renderWallet = () => (
    <EnhancedWallet
      balance={balance}
      
    />
  );

  const renderNameService = () => (
    <NameService />
  )

  const renderAdmin = () => {
    if (!admin) {
      return (
        <div className="text-center py-12">
          <Lock className="mx-auto text-gray-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-400 mb-2">Admin Access Required</h2>
          <p className="text-gray-500">This section is restricted to administrators only.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-4">Admin Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols3 gap-6">
          <StatCard 
          title="Total Bonds Sale"
          value="$25,750"
          subtitle="This month"
          icon={TrendingUp}
          color="green"
          />

          <StatCard 
          title="Active Players"
          value="156"
          subtitle="Connected Wallets"
          icon={Users}
          color="blue"
          />

          <StatCard 
          title="Contract Balance"
          value="1,247 AVAX"
          subtitle="Available liquidity"
          icon={Shield}
          color="purple"
          />
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Smart Contract Managerment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-all
            duration-300 font-medium">
              Update Bonds Prices
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4
            rounded-lg transition-all duration-300 font-medium">
              Manage Discounts
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white
            py-3 px-4 rounded-lg transition-all duration-300 font-medium">
              Withdraw fees
            </button>
            <button className="bg-orange-500 hover:bg-orange-700 text-white py-3 rounded-lg transition-all
            duration-300 font-medium">
              Deploy Token Contract
            </button>
          </div>
        </div>
        {/**
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Avalanche L1 Integration</h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-gray-400 text-sm mb-3">eERC20 Token Features</h4>
            <p className="text-gray-400 text-sm mb-3">
              Leverage Avalanche's eERC20 for enhanced privacy and efficient token operations.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-green-400 text-sm">
                <Unlock size={16} className="mr-2" />
                <span>Privacy Enhanced</span>
              </div>
              <div className="flex items-center text-blue-400 text-sm">
                <Zap size={16} className="mr-2" />
                <span>Low Gas Fees</span>
              </div>
            </div>
          </div>
        </div> */}
      </div>
    );
  }
  
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'bonds': return renderBonds();
      case 'wallet': return renderWallet();
      case 'names': return renderNameService();
      case 'admin': return renderAdmin();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 text-white">
      { /* Header */ }
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg
              flex items-center justify-center">
                <Image src="/motel_main.png" alt="motel_key logo" className="rounded-sm md:h-full" width={100} height={100}/>
              </div>
              <div>
                <h1 className="text-xl font-bold">Motel</h1>
                <p className="text-sm text-gray-400">Defi Bridge</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button 
               onClick={switchRole}
               className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-all duration-300"
               >
                {userRole === 'admin' ? 'Switch to Player': 'Switch to Admin'}
               </button> 
               {/**
                * {isConnected && (
               <div className="px-4 py-2 bg-green-600 rounded-lg">
                <span className="text-sm font-medium">Connected</span>
               </div>
               )}

               {!isConnected && (
                <div className="px-4 py-2 bg-red-600 rounded-lg">
                <span className="text-sm font-medium">Connect</span>
               </div>
               )}
                */}
                
               <ConnectButton 
                accountStatus={{
                  smallScreen: 'avatar',
                  largeScreen: 'full',
                }}
                chainStatus="icon"
                showBalance={{
                  smallScreen: false,
                  largeScreen: true,
                }}
              />
              <button onClick={handleDisconnect}
              disabled={!isConnected}>              
              </button>
              <div className="px-4 py-2 bg-green-600 rounded-lg">
                <span className="text-sm font-medium">Connected</span>
                {chain?.id !== anvil.id && (
                  <span className="text-orange-500 
                  text-xs font-semibold animate-pulse duration-3000 transition-all">change network:{anvil.id}</span>
                )}
               </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-gray-900/30 backdrop-blur-xl">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-4 py-4 overflow-x-auto">
          <TabButton id="dashboard" label="dashboard" icon={TrendingUp} isActive={activeTab === 'dashboard'}/>
          <TabButton id="bonds" label="Bonds" icon={ShoppingCart} isActive={activeTab === 'bonds'} />
          <TabButton id="wallet" label="Wallet" icon={Wallet} isActive={activeTab === 'wallet'} />
          <TabButton id="names" label="Name Serivce" icon={FileText} isActive={activeTab === "names"}/>
          <TabButton id="admin" label="Admin" icon={Settings} isActive={activeTab === 'admin'} />
          </div>
        </div>
      </nav>

      {/* Main Content */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderContent()}
      </main>

      {/* Footer */}

      <footer className="border-t border-gray-800 bg-gray-900/30 backdrop:-blur-xl mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <p className="text-gray-400 text-sm">
                Built on Avalanche L1 • Powered by eERC20 • Secured by Smart Contracts 
              </p>
              <div className="flex items-center space-x-2 text-gray-400">
                <span>Network:</span>
                <span className="text-red-400 font-medium">{chain?.name}</span>
              </div>
            </div>
          </div>
      </footer>
    </div>
  );
}
export default MotelSmartWallet;