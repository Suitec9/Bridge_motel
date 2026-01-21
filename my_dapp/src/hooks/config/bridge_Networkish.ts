import  Networkish  from "@ethersproject/networks/lib/types";
import { ethers } from "ethers";

interface Networkish {
    name: string;
    chainId: number;
    rpcUrl: string;
}

export const localConfig: Networkish= {
    name: 'localHost',
    chainId: 31337,
    rpcUrl: ''
};

export const testnetConfig: Networkish = {
    name: 'polygon-amoy',
    chainId: 80002,
    rpcUrl: 'https://rpc-amoy.polygon.technology/',
}

export const mainnetConfig: Networkish = {
    name: 'polygon-mainnet',
    chainId: 137,
    rpcUrl:  'https://polygon-mainnet.infura.io',
}

export const fuji_Ava: Networkish = {
    name: 'Avalanche-fuji',
    chainId: 43113,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc'
}

export const Avalanche_mainnet: Networkish = {
    name: 'Avalanche',
    chainId: 41337,
    rpcUrl: 'https://api.avax-snowtrace.network/ext/bc/C/rpc'
}

export const Sepolia_Config: Networkish = {
  name: 'Sepolia',
  chainId: 11155111,
  rpcUrl: 'https://sepolia.drpc.org'  
}


// Async function to check contract code length
export async function hasZeroCodeLength(address: string | null, provider: ethers.providers.Provider) {
  try {
    console.log("address of EOA/smart_contract:", address);
    const code = await provider.getCode(address!);
    return code.length === 2; // "0x" is length 2 for empty contract
  } catch (error) {
    console.error("Error checking contract code:", error);
    return false;
  }

}



