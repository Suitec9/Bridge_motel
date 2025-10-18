import  Networkish  from "@ethersproject/networks/lib/types";

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
