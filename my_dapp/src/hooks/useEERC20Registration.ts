
import { useState, useCallback, useEffect } from "react";

import { DecryptedTransaction, useEERC } from "@avalabs/eerc-sdk";
import { DEVELOPMENT_INFO, generateCompleteRegistrationProof, validateProof } from "@/utils/mockZKProofs";
import { publicClient, walletClient } from "@/app/api/ava-hook/route";
import { register } from "module";


interface EERC20HookReturn {
  // State
  isInitialized: boolean;
  isAllDataFetched: boolean;
  isRegistered: boolean;
  isConverter: boolean;
  publicKey: bigint[] | null;
  auditorAddress: string | null;
  owner: string | null;
  auditorPublicKey: bigint[] | null;
  isAuditorKeySet: boolean;
  name: string | null;
  symbol: string | null;
  isDecryptionKeySet: boolean;
  areYouAuditor: boolean;
  hasBeenAuditor: any;
  decryptionKey: string | null;
  isInitializing: boolean;
  encryptedBalance: any
  

  // Actions
  handleGenerateKey: () => Promise<string | null>;
  handleRegister: () => Promise<any>;
  checkAddressRegistered: (address: string) => Promise<boolean>;
//  auditorDecrypt: 
  initializeEERC: () => Promise<void>;
  clearError: () => void;
}

export  function useEERC20Integration(): EERC20HookReturn{
  
  const [decryptionKey, setDecryptionKey] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Server-side hook data
  const [hookData, setHookData] = useState<any>({
    isInitialized: false,
    isAllDataFetched: false,
    isRegistered: false,
    isConverter: false,
    publicKey: null,
    auditorAddress: null,
    owner: null,
    auditorPublicKey: null,
    isAuditorKeySet: false,
    name: null,
    symbol: null,
    isDecryptionKeySet: false,
    areYouAuditor: false,
    hasBeenAuditor: null,
  });
  
  const initialiseEERC = useCallback(async () => {
    if (!publicClient || !walletClient) {
      console.log('Clients not ready');

      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/ava-hook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          decryptionKey: decryptionKey,
          // Just sending data I need
          walletAdress: walletClient.account?.address,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Hook initialization failed');
      }

      const data = await res.json();
      setHookData(data);
    } catch (error: any) {
      console.error('Failed to initiallze eERC:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, walletClient, decryptionKey]);
  

  const handleGenerateKey = useCallback(async () => {
    if (!walletClient?.account?.address) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setIsInitializing(true);
      setError(null);

      const res = await fetch('/api/generate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: walletClient.account.address,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate key');
      }

      const { key } = await res.json();
      setDecryptionKey(key);
      
      setDecryptionKey(key);
      
      // Store key securely (Consider local encrypted storage)
      localStorage.setItem('eerc20_decryption_key', key);

       console.log("generatekey", key.slice(0, 20) + '...')
      return key;
    } catch (err) {
      console.error('Key generation failed:', err);
      setError('Failed to generate decryption key');

      return null;
    } finally {
      setIsInitializing(false);
    }
  }, [walletClient]);

  // Register with eERC20 protocol
  const handleRegister = useCallback(async () => {

    if (!walletClient) {
      setError('Wallet not connected');
      return null;
    }

    try {
      setIsInitializing(true);
      setError(null);

      // Generate key if non existance
      let currentKey = decryptionKey;
      if (!currentKey) {
        currentKey = await handleGenerateKey();
        if (!currentKey) throw new Error('Failed to generate key');
      }

      const res = await fetch('/api/register-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: walletClient.account.address,
          decryptionKey: currentKey,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const result = await res.json();

      // Refresh hook data after registration
      await initialiseEERC();

    return {
        success: true,
        decryptionKey: result.key,
        transactionHash: result.transactionHash
      };

    } catch (err: any) {
      console.error('eERC20 registration failed:', err);
      setError('Registration failed');

      return { success: false, error: err.message};
    } finally {
      setIsInitializing(false);
    }
  }, [walletClient, decryptionKey, handleGenerateKey, initialiseEERC]);

  const checkAddressRegistered = useCallback(async (address: string) => {

    try {
      const res = await fetch(' /api/check-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({address}),
      });

      if (!res.ok) return false;

      const { isRegistered } = await res.json();
      return isRegistered;
    } catch (err) {
      console.error('Failed to checck registration status:', err);
      return false;
    }
    
  }, []);

   // Load stored decryption key on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('eerc20_keys');
    if (storedKey) {
      setDecryptionKey(storedKey);
    }
  }, []);

  // Encrypted balance
  const encryptedUserBalance = useCallback(async (decryptionKey: string, tokenAddress: string) => {
    try {
      const res = await fetch('/api/get-encrypted-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({
          decryptionKey: decryptionKey,
          tokenAddress: tokenAddress
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'failed to get encrypted balance');
      }

      const { userBalance } = await res.json()
      return userBalance; 
    } catch ( error: any) {
      console.error('failed to gert encrypted balance', error);
      return false;
    }
  }, [decryptionKey])

  // Initailize when clients and key are ready
  useEffect(() => {
    if (publicClient && walletClient) {
      initialiseEERC();
    }
  }, [publicClient, walletClient, initialiseEERC]);


  
  return {
    // State
    isInitialized: hookData.isInitialized,
    isAllDataFetched: hookData.isAllDataFetched,
    isRegistered: hookData.isRegistered,
    isConverter: hookData.isConverter,
    publicKey: hookData.publicKey,
    auditorAddress: hookData.auditorAddress,
    owner: hookData.owner,
    auditorPublicKey: hookData.auditorPublicKey,
    isAuditorKeySet: hookData.isAuditorKeySet,
    name: hookData.name,
    symbol: hookData.symbol,
    isDecryptionKeySet: hookData.isDecryptionKeySet,
    areYouAuditor: hookData.areYouAuditor,
    hasBeenAuditor: hookData.hasBeenAuditor,
    decryptionKey,
    isInitializing,
    encryptedBalance: encryptedUserBalance,
    
   

    // Actions
    handleGenerateKey,
    handleRegister,
    checkAddressRegistered,
    initializeEERC: hookData.initializeEERC,
  //  auditorDecrypt: hookData.auditorDecrypt,
  //  refetchEercUser: hookData.refetchEercUser,
  //  refetchAuditor: hookData.refetchAuditor,
  //  setContractAuditorPublicKey: hookData.setContractAuditorPublicKey,
    
    // Encrypted operations
    // Clear error
    clearError: () => setError(null),
  };
    

};

