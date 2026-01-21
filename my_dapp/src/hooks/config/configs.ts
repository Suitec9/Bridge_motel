import { ethers, providers } from "ethers";

import { Avalanche_mainnet, fuji_Ava, localConfig, mainnetConfig, Sepolia_Config, testnetConfig } from "./bridge_Networkish";
import { buildBabyjub } from "circomlibjs";
import { sign } from "crypto";
import { loadZKLibraries } from "../../../lib/zkLoader";
import { poseidon, Poseidon } from "@iden3/js-crypto";
export const ENCRYPTED_ERC_ABI = [{"type":"constructor","inputs":[{"name":"params","type":"tuple","internalType":"struct CreateEncryptedERCParams","components":[{"name":"registrar","type":"address","internalType":"address"},{"name":"isConverter","type":"bool","internalType":"bool"},{"name":"name","type":"string","internalType":"string"},{"name":"symbol","type":"string","internalType":"string"},{"name":"decimals","type":"uint8","internalType":"uint8"},{"name":"mintVerifier","type":"address","internalType":"address"},{"name":"withdrawVerifier","type":"address","internalType":"address"},{"name":"transferVerifier","type":"address","internalType":"address"},{"name":"burnVerifier","type":"address","internalType":"address"}]}],"stateMutability":"nonpayable"},{"type":"function","name":"acceptOwnership","inputs":[],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"alreadyMinted","inputs":[{"name":"mintNullifier","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"isUsed","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"auditor","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"auditorPublicKey","inputs":[],"outputs":[{"name":"x","type":"uint256","internalType":"uint256"},{"name":"y","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"balanceOf","inputs":[{"name":"user","type":"address","internalType":"address"},{"name":"tokenId","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"eGCT","type":"tuple","internalType":"struct EGCT","components":[{"name":"c1","type":"tuple","internalType":"struct Point","components":[{"name":"x","type":"uint256","internalType":"uint256"},{"name":"y","type":"uint256","internalType":"uint256"}]},{"name":"c2","type":"tuple","internalType":"struct Point","components":[{"name":"x","type":"uint256","internalType":"uint256"},{"name":"y","type":"uint256","internalType":"uint256"}]}]},{"name":"nonce","type":"uint256","internalType":"uint256"},{"name":"amountPCTs","type":"tuple[]","internalType":"struct AmountPCT[]","components":[{"name":"pct","type":"uint256[7]","internalType":"uint256[7]"},{"name":"index","type":"uint256","internalType":"uint256"}]},{"name":"balancePCT","type":"uint256[7]","internalType":"uint256[7]"},{"name":"transactionIndex","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"balanceOfStandalone","inputs":[{"name":"user","type":"address","internalType":"address"}],"outputs":[{"name":"eGCT","type":"tuple","internalType":"struct EGCT","components":[{"name":"c1","type":"tuple","internalType":"struct Point","components":[{"name":"x","type":"uint256","internalType":"uint256"},{"name":"y","type":"uint256","internalType":"uint256"}]},{"name":"c2","type":"tuple","internalType":"struct Point","components":[{"name":"x","type":"uint256","internalType":"uint256"},{"name":"y","type":"uint256","internalType":"uint256"}]}]},{"name":"nonce","type":"uint256","internalType":"uint256"},{"name":"amountPCTs","type":"tuple[]","internalType":"struct AmountPCT[]","components":[{"name":"pct","type":"uint256[7]","internalType":"uint256[7]"},{"name":"index","type":"uint256","internalType":"uint256"}]},{"name":"balancePCT","type":"uint256[7]","internalType":"uint256[7]"},{"name":"transactionIndex","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"balances","inputs":[{"name":"user","type":"address","internalType":"address"},{"name":"tokenId","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"eGCT","type":"tuple","internalType":"struct EGCT","components":[{"name":"c1","type":"tuple","internalType":"struct Point","components":[{"name":"x","type":"uint256","internalType":"uint256"},{"name":"y","type":"uint256","internalType":"uint256"}]},{"name":"c2","type":"tuple","internalType":"struct Point","components":[{"name":"x","type":"uint256","internalType":"uint256"},{"name":"y","type":"uint256","internalType":"uint256"}]}]},{"name":"nonce","type":"uint256","internalType":"uint256"},{"name":"transactionIndex","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"blacklistedTokens","inputs":[{"name":"tokenAddress","type":"address","internalType":"address"}],"outputs":[{"name":"isBlacklisted","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"burnVerifier","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract IBurnVerifier"}],"stateMutability":"view"},{"type":"function","name":"decimals","inputs":[],"outputs":[{"name":"","type":"uint8","internalType":"uint8"}],"stateMutability":"view"},{"type":"function","name":"deposit","inputs":[{"name":"amount","type":"uint256","internalType":"uint256"},{"name":"tokenAddress","type":"address","internalType":"address"},{"name":"amountPCT","type":"uint256[7]","internalType":"uint256[7]"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"deposit","inputs":[{"name":"amount","type":"uint256","internalType":"uint256"},{"name":"tokenAddress","type":"address","internalType":"address"},{"name":"amountPCT","type":"uint256[7]","internalType":"uint256[7]"},{"name":"message","type":"bytes","internalType":"bytes"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"getBalanceFromTokenAddress","inputs":[{"name":"user","type":"address","internalType":"address"},{"name":"tokenAddress","type":"address","internalType":"address"}],"outputs":[{"name":"eGCT","type":"tuple","internalType":"struct EGCT","components":[{"name":"c1","type":"tuple","internalType":"struct Point","components":[{"name":"x","type":"uint256","internalType":"uint256"},{"name":"y","type":"uint256","internalType":"uint256"}]},{"name":"c2","type":"tuple","internalType":"struct Point","components":[{"name":"x","type":"uint256","internalType":"uint256"},{"name":"y","type":"uint256","internalType":"uint256"}]}]},{"name":"nonce","type":"uint256","internalType":"uint256"},{"name":"amountPCTs","type":"tuple[]","internalType":"struct AmountPCT[]","components":[{"name":"pct","type":"uint256[7]","internalType":"uint256[7]"},{"name":"index","type":"uint256","internalType":"uint256"}]},{"name":"balancePCT","type":"uint256[7]","internalType":"uint256[7]"},{"name":"transactionIndex","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"getTokens","inputs":[],"outputs":[{"name":"","type":"address[]","internalType":"address[]"}],"stateMutability":"view"},{"type":"function","name":"isAuditorKeySet","inputs":[],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"isConverter","inputs":[],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"mintVerifier","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract IMintVerifier"}],"stateMutability":"view"},{"type":"function","name":"name","inputs":[],"outputs":[{"name":"","type":"string","internalType":"string"}],"stateMutability":"view"},{"type":"function","name":"nextTokenId","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"pendingOwner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"privateBurn","inputs":[{"name":"user","type":"address","internalType":"address"},{"name":"proof","type":"tuple","internalType":"struct BurnProof","components":[{"name":"proofPoints","type":"tuple","internalType":"struct ProofPoints","components":[{"name":"a","type":"uint256[2]","internalType":"uint256[2]"},{"name":"b","type":"uint256[2][2]","internalType":"uint256[2][2]"},{"name":"c","type":"uint256[2]","internalType":"uint256[2]"}]},{"name":"publicSignals","type":"uint256[19]","internalType":"uint256[19]"}]},{"name":"balancePCT","type":"uint256[7]","internalType":"uint256[7]"},{"name":"message","type":"bytes","internalType":"bytes"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"privateBurn","inputs":[{"name":"proof","type":"tuple","internalType":"struct BurnProof","components":[{"name":"proofPoints","type":"tuple","internalType":"struct ProofPoints","components":[{"name":"a","type":"uint256[2]","internalType":"uint256[2]"},{"name":"b","type":"uint256[2][2]","internalType":"uint256[2][2]"},{"name":"c","type":"uint256[2]","internalType":"uint256[2]"}]},{"name":"publicSignals","type":"uint256[19]","internalType":"uint256[19]"}]},{"name":"balancePCT","type":"uint256[7]","internalType":"uint256[7]"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"privateMint","inputs":[{"name":"user","type":"address","internalType":"address"},{"name":"proof","type":"tuple","internalType":"struct MintProof","components":[{"name":"proofPoints","type":"tuple","internalType":"struct ProofPoints","components":[{"name":"a","type":"uint256[2]","internalType":"uint256[2]"},{"name":"b","type":"uint256[2][2]","internalType":"uint256[2][2]"},{"name":"c","type":"uint256[2]","internalType":"uint256[2]"}]},{"name":"publicSignals","type":"uint256[24]","internalType":"uint256[24]"}]}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"privateMint","inputs":[{"name":"user","type":"address","internalType":"address"},{"name":"proof","type":"tuple","internalType":"struct MintProof","components":[{"name":"proofPoints","type":"tuple","internalType":"struct ProofPoints","components":[{"name":"a","type":"uint256[2]","internalType":"uint256[2]"},{"name":"b","type":"uint256[2][2]","internalType":"uint256[2][2]"},{"name":"c","type":"uint256[2]","internalType":"uint256[2]"}]},{"name":"publicSignals","type":"uint256[24]","internalType":"uint256[24]"}]},{"name":"message","type":"bytes","internalType":"bytes"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"registrar","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract IRegistrar"}],"stateMutability":"view"},{"type":"function","name":"renounceOwnership","inputs":[],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"sendEncryptedMetadata","inputs":[{"name":"to","type":"address","internalType":"address"},{"name":"message","type":"bytes","internalType":"bytes"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setAuditorPublicKey","inputs":[{"name":"user","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setTokenBlacklist","inputs":[{"name":"token","type":"address","internalType":"address"},{"name":"blacklisted","type":"bool","internalType":"bool"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"symbol","inputs":[],"outputs":[{"name":"","type":"string","internalType":"string"}],"stateMutability":"view"},{"type":"function","name":"tokenAddresses","inputs":[{"name":"tokenId","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"tokenAddress","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"tokenIds","inputs":[{"name":"tokenAddress","type":"address","internalType":"address"}],"outputs":[{"name":"tokenId","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"tokens","inputs":[{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"transfer","inputs":[{"name":"to","type":"address","internalType":"address"},{"name":"tokenId","type":"uint256","internalType":"uint256"},{"name":"proof","type":"tuple","internalType":"struct TransferProof","components":[{"name":"proofPoints","type":"tuple","internalType":"struct ProofPoints","components":[{"name":"a","type":"uint256[2]","internalType":"uint256[2]"},{"name":"b","type":"uint256[2][2]","internalType":"uint256[2][2]"},{"name":"c","type":"uint256[2]","internalType":"uint256[2]"}]},{"name":"publicSignals","type":"uint256[32]","internalType":"uint256[32]"}]},{"name":"balancePCT","type":"uint256[7]","internalType":"uint256[7]"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"transfer","inputs":[{"name":"to","type":"address","internalType":"address"},{"name":"tokenId","type":"uint256","internalType":"uint256"},{"name":"proof","type":"tuple","internalType":"struct TransferProof","components":[{"name":"proofPoints","type":"tuple","internalType":"struct ProofPoints","components":[{"name":"a","type":"uint256[2]","internalType":"uint256[2]"},{"name":"b","type":"uint256[2][2]","internalType":"uint256[2][2]"},{"name":"c","type":"uint256[2]","internalType":"uint256[2]"}]},{"name":"publicSignals","type":"uint256[32]","internalType":"uint256[32]"}]},{"name":"balancePCT","type":"uint256[7]","internalType":"uint256[7]"},{"name":"message","type":"bytes","internalType":"bytes"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"transferOwnership","inputs":[{"name":"newOwner","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"transferVerifier","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract ITransferVerifier"}],"stateMutability":"view"},{"type":"function","name":"withdraw","inputs":[{"name":"tokenId","type":"uint256","internalType":"uint256"},{"name":"proof","type":"tuple","internalType":"struct WithdrawProof","components":[{"name":"proofPoints","type":"tuple","internalType":"struct ProofPoints","components":[{"name":"a","type":"uint256[2]","internalType":"uint256[2]"},{"name":"b","type":"uint256[2][2]","internalType":"uint256[2][2]"},{"name":"c","type":"uint256[2]","internalType":"uint256[2]"}]},{"name":"publicSignals","type":"uint256[16]","internalType":"uint256[16]"}]},{"name":"balancePCT","type":"uint256[7]","internalType":"uint256[7]"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"withdraw","inputs":[{"name":"tokenId","type":"uint256","internalType":"uint256"},{"name":"proof","type":"tuple","internalType":"struct WithdrawProof","components":[{"name":"proofPoints","type":"tuple","internalType":"struct ProofPoints","components":[{"name":"a","type":"uint256[2]","internalType":"uint256[2]"},{"name":"b","type":"uint256[2][2]","internalType":"uint256[2][2]"},{"name":"c","type":"uint256[2]","internalType":"uint256[2]"}]},{"name":"publicSignals","type":"uint256[16]","internalType":"uint256[16]"}]},{"name":"balancePCT","type":"uint256[7]","internalType":"uint256[7]"},{"name":"message","type":"bytes","internalType":"bytes"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"withdrawVerifier","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract IWithdrawVerifier"}],"stateMutability":"view"},{"type":"event","name":"AuditorChanged","inputs":[{"name":"oldAuditor","type":"address","indexed":true,"internalType":"address"},{"name":"newAuditor","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"Deposit","inputs":[{"name":"user","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"dust","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"tokenId","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"OwnershipTransferStarted","inputs":[{"name":"previousOwner","type":"address","indexed":true,"internalType":"address"},{"name":"newOwner","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"OwnershipTransferred","inputs":[{"name":"previousOwner","type":"address","indexed":true,"internalType":"address"},{"name":"newOwner","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"PrivateBurn","inputs":[{"name":"user","type":"address","indexed":true,"internalType":"address"},{"name":"auditorPCT","type":"uint256[7]","indexed":false,"internalType":"uint256[7]"},{"name":"auditorAddress","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"PrivateMessage","inputs":[{"name":"from","type":"address","indexed":true,"internalType":"address"},{"name":"to","type":"address","indexed":true,"internalType":"address"},{"name":"metadata","type":"tuple","indexed":false,"internalType":"struct Metadata","components":[{"name":"messageFrom","type":"address","internalType":"address"},{"name":"messageTo","type":"address","internalType":"address"},{"name":"messageType","type":"string","internalType":"string"},{"name":"encryptedMsg","type":"bytes","internalType":"bytes"}]}],"anonymous":false},{"type":"event","name":"PrivateMint","inputs":[{"name":"user","type":"address","indexed":true,"internalType":"address"},{"name":"auditorPCT","type":"uint256[7]","indexed":false,"internalType":"uint256[7]"},{"name":"auditorAddress","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"PrivateTransfer","inputs":[{"name":"from","type":"address","indexed":true,"internalType":"address"},{"name":"to","type":"address","indexed":true,"internalType":"address"},{"name":"auditorPCT","type":"uint256[7]","indexed":false,"internalType":"uint256[7]"},{"name":"auditorAddress","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"Withdraw","inputs":[{"name":"user","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"tokenId","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"auditorPCT","type":"uint256[7]","indexed":false,"internalType":"uint256[7]"},{"name":"auditorAddress","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"error","name":"InvalidChainId","inputs":[]},{"type":"error","name":"InvalidNullifier","inputs":[]},{"type":"error","name":"InvalidOperation","inputs":[]},{"type":"error","name":"InvalidProof","inputs":[]},{"type":"error","name":"OwnableInvalidOwner","inputs":[{"name":"owner","type":"address","internalType":"address"}]},{"type":"error","name":"OwnableUnauthorizedAccount","inputs":[{"name":"account","type":"address","internalType":"address"}]},{"type":"error","name":"SafeERC20FailedOperation","inputs":[{"name":"token","type":"address","internalType":"address"}]},{"type":"error","name":"TokenBlacklisted","inputs":[{"name":"token","type":"address","internalType":"address"}]},{"type":"error","name":"TransferFailed","inputs":[]},{"type":"error","name":"UnknownToken","inputs":[]},{"type":"error","name":"UserNotRegistered","inputs":[]},{"type":"error","name":"ZeroAddress","inputs":[]}]; 
export const REGISTRARY_ABI = [{"type":"constructor","inputs":[{"name":"registrationVerifier_","type":"address","internalType":"address"}],"stateMutability":"nonpayable"},{"type":"function","name":"getUserPublicKey","inputs":[{"name":"user","type":"address","internalType":"address"}],"outputs":[{"name":"publicKey","type":"uint256[2]","internalType":"uint256[2]"}],"stateMutability":"view"},{"type":"function","name":"isRegistered","inputs":[{"name":"registrationHash","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"isRegistered","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"isUserRegistered","inputs":[{"name":"user","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"register","inputs":[{"name":"proof","type":"tuple","internalType":"struct RegisterProof","components":[{"name":"proofPoints","type":"tuple","internalType":"struct ProofPoints","components":[{"name":"a","type":"uint256[2]","internalType":"uint256[2]"},{"name":"b","type":"uint256[2][2]","internalType":"uint256[2][2]"},{"name":"c","type":"uint256[2]","internalType":"uint256[2]"}]},{"name":"publicSignals","type":"uint256[5]","internalType":"uint256[5]"}]}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"registrationVerifier","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract IRegistrationVerifier"}],"stateMutability":"view"},{"type":"function","name":"userPublicKeys","inputs":[{"name":"userAddress","type":"address","internalType":"address"}],"outputs":[{"name":"x","type":"uint256","internalType":"uint256"},{"name":"y","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"event","name":"Register","inputs":[{"name":"user","type":"address","indexed":true,"internalType":"address"},{"name":"publicKey","type":"tuple","indexed":false,"internalType":"struct Point","components":[{"name":"x","type":"uint256","internalType":"uint256"},{"name":"y","type":"uint256","internalType":"uint256"}]}],"anonymous":false},{"type":"error","name":"InvalidChainId","inputs":[]},{"type":"error","name":"InvalidProof","inputs":[]},{"type":"error","name":"InvalidRegistrationHash","inputs":[]},{"type":"error","name":"InvalidSender","inputs":[]},{"type":"error","name":"UserAlreadyRegistered","inputs":[]}] as const
/**export const CONTRACTS = {
  EERC_STANDALONE: "0x5E9c6F952fB9615583182e70eDDC4e6E4E0aC0e0",
  EERC_CONVERTER: "0x372dAB27c8d223Af11C858ea00037Dc03053B22E",
  ERC20: "0xb0Fe621B4Bd7fe4975f7c58E3D6ADaEb2a2A35CD",
} as const; */

export const CONTRACTS_ERC20 = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
export const CONTRACTS_REGISTRARY = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"; 
 
export const provider_ = new ethers.providers.JsonRpcProvider(localConfig.rpcUrl)
/**
 * BabyJubJub curve parameters
 */
export const BABYJUB_PARAMS = {
  // Curve order (number of points on the curve)
  BASE_ORDER: BigInt('2736030358979909402780800718157159386076813972158567259200215660948447373041'),

  // Prime field size (larger than the BASE_ORDER)
  FIELD_SIZE: BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617'),

  // Cofactor
  COFACTOR: BigInt(8),

} as const;

/**
* Generate Baby JubJub public key from private key
* Returns the public key as a point [x, y] in string format
* @param secretKey private key as string
     */
    export const derivePublicKey = async (secretKey: string):Promise<{pubKeyX: string; pubKeyY: string}> => {
        // In productionl, use proper EdDSA point multication
        try {
          // Convert secret key to BigInt
          const privateKeyBigInt = BigInt(secretKey);
          console.log("PrivateKeyBigInt:", privateKeyBigInt);

          //Ensure it's in the Field
          if (privateKeyBigInt >= BABYJUB_PARAMS.FIELD_SIZE) {
            throw new Error('Private key exceeds field size or it`s zero');
          }

          // Generate public key point on Baby Jub Jub curve
          // mulPointEscalar multiplies the base point by the private key
          const babyJubJub = await buildBabyjub();
          const publicKey = babyJubJub.mulPointEscalar(babyJubJub.Base8, privateKeyBigInt);

          // Extract x and y coordinates and convert to string
          // Using F.toObject instead of F.toString() to aviod negative values and large number issues
          const pubKeyX = await babyJubJub.F.toString(publicKey[0]);
          const pubKeyY = await babyJubJub.F.toString(publicKey[1]);
          console.log("Derived Public Key:", { pubKeyX, pubKeyY});
        
          return {pubKeyX, pubKeyY}
     
        } catch (error: any) {
          console.error('Error derving public key from private key:', error);
          throw new Error(`Failed to derive public key: ${error.message}`)
        } 
        
    }

    /**
     * This will be the same signature every time for the same message
     * @param signer ethers signer to sign message, request signature from user's wallet
     * @param userAddress user address to compute the private key signing a message
     * @returns returns private key that fits in the babyjubjub field
     */
    export async function generateSecretKetFromSignature(
      signer: ethers.Signer,
      userAddress: string
    ): Promise<string> {
      try {
        // Create a determinstic user's message
        const message = `Generate eERC20 Secret Key for ${userAddress.toLowerCase()}`
        const BaseOrder = BABYJUB_PARAMS.BASE_ORDER;
        // Request signature from user's wallet
        // This will be the same signature every time for the same message
        const signature = await signer.signMessage(message);

        console.log("User signuature:", signature);

        // Hash the signature to get deterministic bytes
        //const signatureHash = ethers.utils.keccak256(signature);
        //console.log("Signature hash:", signatureHash);

        // Convert to BigInt 
        let privateKeyBigInt = BigInt(signature);
        
        //reduce modulo BASE_ORDER (not field size)
        // This ensures: privateKey < baseOrder
        privateKeyBigInt = privateKeyBigInt % BaseOrder;

        // Edge case :Ensure it's not zer0
        if (privateKeyBigInt === BigInt(0)) {
          // Fallback: hash again with nonce
          console.warn("Generated zero private key, using fallback");
          const fallbackHash = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              ['bytes', 'uint256'],
              [signature, 1]
            )
          );
          privateKeyBigInt = BigInt(fallbackHash) % BaseOrder;

          // if it is still zero, throw error
          if (privateKeyBigInt === BigInt(0)) {
            throw new Error("Failed to generate non-zero private key");
          }
        }

        console.log("Generated private key:",  privateKeyBigInt.toString());
        console.log("Private key < BASE_ORDER:", privateKeyBigInt < BaseOrder);
        console.log("private key > 0:", privateKeyBigInt > BigInt(0));

        return privateKeyBigInt.toString();
      } catch (error: any) {
        console.error("Error generating private key from signature:", error);
        throw new Error(`Failed to generate private key:${error.message}`);
      }
    }

    /**
     * Helper function
     * @param func Verify private key satisfies all circuit constraints
     * @returns boolean and caught errors
     */
    export function validatePrivateKey(privateKey: string): {
      valid: boolean; errors: string[];
    } {
      const errors: string[] = [];
      const privateKeyBigInt = BigInt(privateKey);

      // Check non-zero
      if (privateKeyBigInt === BigInt(0)) {
        errors.push('Private key cannot be zero.');
      }

      // Check must be less than the BASE_ORDER (circuit line 211 constraint)
      if (privateKeyBigInt >= BABYJUB_PARAMS.BASE_ORDER) {
        errors.push(
          `Private key must be < ${BABYJUB_PARAMS.BASE_ORDER}.` + 
          `Got: ${privateKeyBigInt}`
        );
      }

      // Check should fit in 252 bits (Num2Bits constraint)
      const bitLength = privateKeyBigInt.toString(2).length;
      if (bitLength > 252) {
        errors.push(`Private key exceeds 252 bits (got ${bitLength} bits)`);
      }

      return {
        valid: errors.length === 0,
        errors
      }
    }

    // Helper function
    export function debounce<T extends (...args: any[]) => any>(
      func: T,
      wait: number
    ): (...args: Parameters<T>) => void {
      let timeout: NodeJS.Timeout;
      return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
      };
    }