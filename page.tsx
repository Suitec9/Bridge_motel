"use client"
import React, { useState, useEffect, useCallback } from "react";
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
  ArrowUpDown 
} from "lucide-react";

import { EnhancedWallet } from "@/components/EnhancedWallet";

// Mock Proof
const generateMockProof = () => ({
  pointA_: [
    "12345678901234567890123456789012345678901234567890123456789012345678",
    "98765432109876543210987654321098765432109876543210987654321098765432"
  ],
  pointB_: [
    [
      "11111111111111111111111111111111111111111111111111111111111111111111",
      "22222222222222222222222222222222222222222222222222222222222222222222"
    ],
    [
      "33333333333333333333333333333333333333333333333333333333333333333333",
      "44444444444444444444444444444444444444444444444444444444444444444444"
    ]
  ],
  pointC_: [
    "55555555555555555555555555555555555555555555555555555555555555555555",
    "66666666666666666666666666666666666666666666666666666666666666666666"
  ],
  publicSignals_: [
    "77777777777777777777777777777777777777777777777777777777777777777777",
    "88888888888888888888888888888888888888888888888888888888888888888888",
    "0x1234567890123456789012345678901234567890", // address
    "43114", // Avalanche mainnet chain ID
    "99999999999999999999999999999999999999999999999999999999999999999999"
  ]
});

const ABSmartWallet = () => {

  const [ activeTab, setActiveTab ] = useState('dashBoard');
  const [ isConnected, setIsConnected ] = useState(false);
  const [ userRole, setUserRole ] = useState('player'); // 'admin' or 'player'
  const [ balance, setBalance ] = useState({avax: "25.50", bonds: "1000", tokens: "0", encrypted: "0"});

  const [userHoldingWallet, setUserHoldingWallet] = useState(null);
  const [hasValidNames, setHasValidNames] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isRegisteringName, setIsRegisteringName] = useState(false);
  
  const [ bonds, setBonds ] = useState([
    {id: 1, type: 'Premium', value: 100, discount: 15, available: 25 },
    {id: 2, type: 'Elite', value: 250, discount: 15, available: 3 },
    { id: 3, type: 'Lenendary', value: 500, discount: 15, available: 3 }
  ]);

  const handleConnect = () => {
    setIsConnected(!isConnected);
  };

  const switchRole = () => {
    setUserRole(userRole === 'admin' ? 'player' : 'admin');
  };

  // Mock
  const handleCreateWallet = useCallback(async () => {
    setIsCreatingWallet(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock proof generation (replace with real ZK proof generation)
      const proof = generateMockProof();
      console.log('Mock proof generated:', proof);
      
      // Mock wallet creation success
      setUserHoldingWallet("0x742d35Cc6634C0532925a3b8D87C1F1a2abCdE42");
      console.log('Mock holding wallet created successfully');
    } catch (error) {
      console.error('Failed to create holding wallet:', error);
    } finally {
      setIsCreatingWallet(false);
    }
  }, []);

   const handleRegisterName = useCallback(async () => {
    setIsRegisteringName(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock name registration success
      setHasValidNames(true);
      console.log('Mock name service registered successfully');
    } catch (error) {
      console.error('Failed to register name:', error);
    } finally {
      setIsRegisteringName(false);
    }
  }, []);


  const TabButton = ({ id, label, icon: Icon, isActive }) => (
    <button
     onClick={() => setActiveTab(id)}
     className={`flex items-center space-x-2 px-4 py-3 rounding-lg transiton-all duration-300
      ${isActive ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
        : 'bg-gray-800 text-grey-300 hover:bg-gray-700'
      }`} >
        <Icon size={18} />
        <span className="font-medium">{label}</span>
      </button>
      
  )

  const StatCard = ({ title, value, subtitle, icon: Icon, color = "purple"}) => (
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

  const BondCard = ({ bond }) => (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl
    p-6 border-gray-700 hover:border-blue-500 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{bond.type} Bond</h3>
          <p className="text-gray-400 text-sm">Available: {bond.available}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-400">${bond.value}</p>
          <p className="text-purple-400 text-sm font-medium">{bond.discount}% OFF</p>
        </div>
      </div>
      <div className="bg-gray-800 rounded-lg p-3 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Original Price:</span>
          <span className="text-gray-300"></span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-purple-400">Price:$1</span>
          <span className="text-purole-400 font-bold">${((bond.value / 0.85) - bond.value).toFixed(2)}</span>
        </div>
      </div>
      <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3
      px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 font-medium">
        Purchase Bond
      </button>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 mb:grid-cols-3 gap-6">
        <StatCard
        title="AVAX balance"
        value={`${balance.avax} AVAX`}
        subtitle="~$3,265.00 USD"
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Arena Breakout Bonds</h2>
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white
        px-4 py-2 rounded-lg">
          <span className="font-bold">15% Discount Activated</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bonds.map(bond => (
          <BondCard key={bond.id} bond={bond} />
        ))}
      </div>

      <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-4">
      <div className="flex items-center space-x-3">
        <Zap className="text-yello-400" size={24} />
        <div>
          <h3 className="text-yellow-400 font-semibold">future Feature: Incentive Tokens</h3>
          <p className="text-gray-300 text-sm">
            Earn tokens backed by withdrwal fees. Token system will launch soon once community reaches crictal mass.
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
      userHoldingWallet={userHoldingWallet}
      hasValidNames={hasValidNames}
      onCreateWallet={handleCreateWallet}
      onRegisterName={handleRegisterName}
    />
  );

  const renderAdmin = () => {
    if (userRole !== 'admin') {
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
        <h2 className="text-xl font-bold text-white mb-2">Admin Dashboard</h2>
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
        </div>
      </div>
    );
  }
  
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'bonds': return renderBonds();
      case 'wallet': return renderWallet();
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
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg
              flex items-center justify-center">
                <Shield className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">AB smart Wallet</h1>
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
               <button 
               onClick={handleConnect}
               className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                isConnected
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
               }`}
               >
                {isConnected ? 'Connected' : 'Connect Wallet'}
               </button>
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
                <span>Nerwork:</span>
                <span className="text-red-400 font-medium">Avalanche Testnet</span>
              </div>
            </div>
          </div>
      </footer>
    </div>
  );
}
export default ABSmartWallet;