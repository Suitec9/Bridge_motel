import { avalancheFuji } from "viem/chains";
import { usePublicClient, useWalletClient } from "wagmi";

type DecryptedMetadata = {
    decryptedMessage: string;
    messageType: string;
    messageFrom: `0x${string}`;
    messageTo: `0x${string}`;
};

type OperationResult = {
    transactionHash: `0x${string}`;
};

type DecryptedTransaction = {
    type: string;
    amount: string;
    sender: `0x${string}`;
    receiver: `0x${string}` | null;
    transactionHash: `0x${string}`;
};

type DecryptedEvent = {
    transactionHash: string;
    blockNumber: bigint;
    eventType: "PrivateTransfer" | "Deposit" | "Withdraw" | "PrivateMint" | "PrivateBurn";
    decryptedAmount?: string;
    decryptError?: string;
    from?: `0x${string}`;
    to?: `0x${string}`;
    auditorAddress?: `0x${string}`;
    user?: `0x${string}`;
    amount?: string;
};

export type UseEncryptedBalanceHookResult = {
    decryptedBalance: bigint;
    parsedDecryptedBalance: string;
    encryptedBalance: bigint[];
    auditorPublicKey: bigint[];
    decimals: bigint;
    decryptMessage: (transactionHash: string) => Promise<DecryptedMetadata>;
    decryptTransaction: (transactionHash: string) => Promise<DecryptedEvent[]>;
    privateMint: (recipient: `0x${string}`, amount: bigint, message?: string) => Promise<OperationResult>;
    privateBurn: (amount: bigint, message?: string) => Promise<OperationResult>;
    privateTransfer: (to: string, amount: bigint, message?: string) => Promise<{
        transactionHash: `0x${string}`;
        receiverEncryptedAmount: string[];
        senderEncryptedAmount: string[];
    }>;
    withdraw: (amount: bigint, message?: string) => Promise<OperationResult>;
    deposit: (amount: bigint, message?: string) => Promise<OperationResult>;
    refetchBalance: () => void;
};

export type hookProps = {
    isInitialized: boolean;
    isAllDataFetched: boolean;
    isRegistered: boolean;
    isConverter: boolean;
    publicKey: bigint[];
    auditorAddress: `0x${string}`;
    owner: string;
    auditorPublicKey:  bigint[];
    isAuditorKeySet: boolean;
    name: string;
    symbol: string;
    isDecryptionKeySet: boolean;
    areYouAuditor: boolean;
    hasBeenAuditor:  {
        isChecking: boolean;
        isAuditor: boolean;
    };
             
    // Actions
    generateDecryptionKey: () => Promise<string>;
    register: () => Promise<{
        key: string;
        transactionHash: string;
    }>;
    auditorDecrypt: () => Promise<DecryptedTransaction[]>;
    isAddressRegistered:  (address: `0x${string}`) => Promise<{
        isRegistered: boolean;
        error: string | null;
    }>;
    useEncryptedBalance: (tokenAddress?: `0x${string}` | undefined) => UseEncryptedBalanceHookResult;
    refetchEercUser: () => void;
    refetchAuditor: () => void;
    setContractAuditorPublicKey: (address: `0x${string}`) => Promise<`0x${string}`>;
}
export const publicClient: any = usePublicClient({
    chainId: avalancheFuji.id
});

export const walletClient: any  = useWalletClient({
    account:  undefined
});


export const CONTRACTS = {
  EERC_STANDALONE: "0x5E9c6F952fB9615583182e70eDDC4e6E4E0aC0e0",
  EERC_CONVERTER: "0x372dAB27c8d223Af11C858ea00037Dc03053B22E",
  ERC20: "0xb0Fe621B4Bd7fe4975f7c58E3D6ADaEb2a2A35CD",
} as const;

export const CIRCUIT_CONFIG = {
  
  register: {
    wasm: "/RegisterationCircuit.wasm",
    zkey: "RegistrationCurcuit.groth16.zkey",
  },

  mint: {
    wasm: "/MintCircuit.wasm",
    zkey: "/MintCircuit.groth16.zkey",
  },
  transfer: {
    wasm: "/TransferCircuit.wasm",
    zkey: "/TransferCircuit.groth16.zkey",
  },
  withdraw: {
    wasm: "/WithdrawCircuit.wasm",
    zkey: "/WithdrawCircuit.groth16.zkey",
  },
  burn: {
    wasm: "/BurnCircuit.wasm",
    zkey: "/BurnCircuit.groth16.zkey",
  },
} as const;
