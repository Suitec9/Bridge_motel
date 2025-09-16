// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.27;

import "../lib/forge-std/src/Script.sol";
import "../src/PrimeContract.sol";

contract TestScript is Script {
    
    function run() external {

        address factoryAddr = vm.envAddress("FACTORY_ADDRESS");
        PrimeContractFactory factory =  PrimeContractFactory(address(factoryAddr));

        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;  //vm.envUint("FUJI_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Factory:", factoryAddr);
        console.log("Tester:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // wallet creation
//        address wallet = factory.createHoldingWallet();
//        console.log(' Wallet created:', address(wallet));

        // call view function getWallet info
        (
            address walletH,
            uint256 creationTime,
            uint256 timeUntilExpiry,
            bool isExpired,
            uint256 bondBalance
        ) = factory.getWalletInfo(deployer);

        console.log("wallet address: ", walletH);
        console.log("Creation time:", creationTime);
        console.log("Time until expiry:", timeUntilExpiry);
        console.log("Bond balance:", bondBalance);
        console.log("isExpired:", isExpired);

        // Purchase bond
        factory.purchaseBonds{value: 0.085 ether}(1, 1);
        console.log("bond purchased");

        // Check update balance
        (, , , , uint newBondBalance) = factory.getWalletInfo(deployer);
        console.log("New bond Balance:", newBondBalance);

        vm.stopBroadcast();

        console.log("Test complete");
        
    }
}