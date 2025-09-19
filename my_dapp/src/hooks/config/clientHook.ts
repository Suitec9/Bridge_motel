import { PublicClient, WalletClient } from "viem";
import { avalancheFuji } from "viem/chains";
import { usePublicClient, useWalletClient } from "wagmi";

export async function useClients(): Promise<{
    publicClient: PublicClient;
    walletClient: WalletClient;
}> {
  const publicClient: any = usePublicClient({ 
    chainId: avalancheFuji.id 
  })
  
  const  walletClient: any = useWalletClient({
    account: undefined
  })

  return { 
    publicClient, 
    walletClient 
  }
} 
