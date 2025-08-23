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
import { useAccount } from 'wagmi';
import { useEERC20Integration } from '../hooks/useEERC20Registration';

interface Balance {
  avax: string;
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

export const EnhancedWallet: React.FC<EnhancedWalletProps> = ({
    balance,
    userHoldingWallet,
    hasValidNames,
    onCreateWallet,
    onRegisterName
}) => {
    const { address } = useAccount();
    const [activeTab, setActiveTab] = useState<'regular' | 'encrypted'>('regular');
    const [showKeyGeneration, setShowkeyGeneration] = useState(false);

    // eERC20 integration
    const {
        isInitialized,
        isRegistered,
        decryptionKey,
        isInitializing,
        error,
        handleGenerateKey,
        handleRegister,
        encryptedBalance,
        clearError,
        checkAddressRegistered,
    } = useEERC20Integration();

    // Check if user can access eERC20 features
    const canAccessEncrypted = userHoldingWallet || hasValidNames;

    // Check registration status on mount
    useEffect(() => {
        if (address && canAccessEncrypted) {
            checkAddressRegistered(address);
        }
    }, [address, canAccessEncrypted, checkAddressRegistered]);

    const handleKeyGeneration = useCallback(async () => {
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

    // Encrypted operations (placeHolders)
    const handleEncryptedDeposit = useCallback(async () => {
        try {
            // Implement encrypted deposit using encryptedBalance.mint()
            console.log('Encrypted deposit');
        } catch (err) {
            console.error('Encrypted deposit failed:', err);
        }
    }, []);

    // Encrypted transfer
    const handleEncryptedTransfer = useCallback(async () => {
        try {
            // Implement encrypted transfer using encryptedBalance.transfer()
            console.log('Encrypted transfer');
        } catch (err) {
            console.error('Encrypted transfer failed:', err);
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

    const renderRegistrationPanel = () => (
        <div className='bg-gradient-to-br from-purple-900/20 to-indigo-900/20
        rounded-xl p-6 border border-purple-500/30'>
            <div className='flex items-center mb-4'>
                <Shield className='mr-3 text-purple-400' size={24} />
                <h3 className='text-xl font-bold text-white'>eERC20 Privacy Setup</h3>
            </div>

            {error && (
                <div className='mb-4 p-3 bg-red-900/20 border border-red-500/30
                rounded-lg flex items-center'>
                    <AlertCircle className='mr-2 text-red-40' size={16} />
                    <span className='text-red-400 text-sm'>{error}</span>
                    <button onClick={clearError} className='ml-auto text-red-400 hover:text-red-300'>x</button>
                </div>
            )}

            {!decryptionKey ? (
                <div className='space-y-4'>
                    <p className='text-gray-300 text-sm'>
                        Generate a decryption Key to enable private transactions with eERC20 tokens.
                    </p>
                    <button
                    onClick={handleKeyGeneration}
                    disabled={isInitializing || showKeyGeneration}
                    className='w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600
                    text-white py-3 px-4 rounded-lg transition-all duration-300
                    font-medium flex items-center justify-center'>
                        {showKeyGeneration ? (
                            <Loader2 className='animate-spin mr-2' size={16} />
                        ) : (
                            <Key className='mr' size={16} />
                        )}
                        {showKeyGeneration ? 'Generating...' : 'Generate Decryption key'}
                    </button>
                </div>
            ) : !isRegistered ? (
                <div className='space-y-4'>
                    <div className="flex items-center p-3 bg-green-900/20 border border-green-500/30
                    rounded-lg">
                        <CheckCircle2 className="mr-2 text-400" size={16} />
                        <span className="text-green-400 text-sm">Decryption key generated</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                        Register with the eERC protocol to start using encrypted transactions.
                    </p>
                    <button onClick={handleRegistation}
                        disabled={isInitializing}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600
                        text-white py-3 px-4 rounded-lg transition-all duration-300
                        font-medium flex items-center justify-center"
                        > {isInitializing ? (
                            <Loader2 className="animate-spin mr-2" size={16} />
                        ) : (
                            <Shield className="mr-2" size={16} />
                        )}
                        {isInitializing ? 'Registering...' : 'Register for eERC20'}
                    </button>
                </div>
            ) : (
                <div className="flex items-center p-3 bg-green-900/20 border-green-500/30
                rounded-lg">
                    <CheckCircle2 className="mr-2 text-green-400" size={16} />
                    <span className="text-green-400 text-sm">Ready for encrypted transactions</span>
                </div>
            )}
        </div>
    );

    const renderEncryptedActions = () => (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl
        p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Lock className="mr-2 text-green-400" size={20} />
                Encrypted Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
                <button 
                onClick={handleEncryptedDeposit}
                className="bg-green-600 hover:bg-green-700 text-white py-3 px-4
                rounded-lg transition-all duration-300 font-medium items-center justify-center"
                >
                    <Plus className='mr-2' size={16} />
                    Encrypted Deposit
                </button>
                <button
                onClick={handleEncryptedTransfer}
                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg
                transition-all duration-300 font-medium flex items-center justify-center"
                >
                    <Send className="mr-2" size={16} />
                    Private Transfer
                </button>
                <button
                onClick={handleEncryptedWithdraw}
                className="bg-orange-600 hover:bg-orange-700 text-white py-3 px-4
                rounded-lg transition-all duration-300 font-medium flex items-center justify-center"
                >
                    <Minus className="mr-2" size={16} />
                    Encrypted Withdraw
                </button>
                <button 
                onClick={handlePrivateMints}
                className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4
                rounded-lg transition-all duration-300 font-medium flex items-center justify-center"
                >
                    <Plus className="mr-2" size={16} />
                    Private Mint
                </button>
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
        <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-all duration-300 font-medium">
          Deposit AVAX
        </button>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-all duration-300 font-medium">
          Transfer funds
        </button>
        <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg transition-all duration-300 font-medium">
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
          <span className="text-white font-medium">{balance.avax} AVAX</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400">AB bonds</span>
          <span className="text-white font-medium">{balance.bonds} Bonds</span>
        </div>
        {isRegistered && (
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
        {canAccessEncrypted && !isRegistered && renderRegistrationPanel()}

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
                disabled={!isRegistered}
                className={`flex-1 py-2 px-4 rounded-md transition-all
                duration-200 font-medium flex items-center justify-center ${
                    activeTab === 'encrypted' && isRegistered
                    ? 'bg-purple-600 text-white'
                    : !isRegistered
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:text-white'
                }`}
                >
                    <Lock className="mr-1" size={14} />
                    Encrypted Wallet
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
