// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "../lib/forge-std/src/Script.sol";
import "../src/HoldingWallet.sol";
import "../src/PrimeContract.sol";
import "../src/ABBondNFT.sol";

contract DeployScript is Script {

    function run() external {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;//vm.envUint("FUJI_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log(" Deploying Motel wallet to fuji");
        console.log("Deployer ", deployer);
        console.log("Balance", deployer.balance / 1e18, "AVAX");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploy HoldinWallet...");
        HoldingWallet holdingWalletImpl = new HoldingWallet();
        console.log("HoldingWallet:", address(holdingWalletImpl));

        console.log("Deploy factory...");
        PrimeContractFactory factory = new PrimeContractFactory();
        console.log("PrimeContract:", address(factory));

        console.log("Deploy ABbond..." );
        
        require(address(factory) != address(0), "zero Address");
        ABBondNFT bondNFT = new ABBondNFT(address(factory));
        console.log("ABbondNFT:", address(bondNFT));

        console.log("Initialize contracts....");
        factory.initializeContracts(
            address(holdingWalletImpl),
            address(bondNFT),
            address(0) // placeholder for nameService
        );

        console.log("factory initialized");

        vm.stopBroadcast();

        console.log("\n  Snowtrace Links:");
        //console.log("Factory: https://testnet.snowtrace.io/address/%s", address(factory));
        //console.log("ABbondNFT: https://testnet.snowtrace.io/address/%s", address(bondNFT));

        console.log("\n Verifying deployment...");
        uint256 premiumPrice = factory.bondPrices(1);
        uint256 premiumPriceI = factory.bondPrices(2);
        uint256 elitePrice = factory.bondPrices(3);
        uint256 lengendaryPrice = factory.bondPrices(4);

        console.log("Bond Prices");
        console.log("Premium: %s AVAX", premiumPrice);
        console.log("PremiumI: %s AVAX", premiumPriceI);
        console.log("Elite: %s AVAX", elitePrice);
        console.log("Legendary: %s AVAX", lengendaryPrice);
    }
}