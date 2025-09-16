#!/bin/bash

# Foundry setup & Deployment Commands

echo "🔧️ Setting up Foundry project..."

# 1. Initialize Foundry project
#forge init motel-wallet --no-git
cd Bridge #motel-wallet

# 2. Install dependencies
exho "📁️ Installing dependencies..."
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std

# 3. Create directory structure
#mkdir -p src script test
#mkdir -p lib/EncryptedERC/contracts # For eERC20 contracts and verifiers

# 4. Copy the contracts to src/
echo "📁️ Copy contracts to:"
echo " - src/HoldingWallet.sol"
echo " - src/PrimeContract.sol"
echo " - src/ABbondNFT.sol"
echo " - lib.EncryptedERC/contracts/EncryptedERC20.sol"

# run forge build
echo "🛠️ Building contracts"
forge build

# 6. Deploy to fuji \ anvil
echo "🚀️ Deploy to fuji or anvil"
#forge script script/PrimeContract.s.sol:DeployScript \
#    --rpc-url fuji \
#    --broadcast \
#    --verify \
#    --etherscan-api-key $ETHERSCAN_API_KEY \
#    -vvvv

forge script script/PrimeContract.s.sol:DeployScript \
    --rpc-url 127.0.0.1:8545 \
    --broadcast \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    -vvv

