// SPDX-License-Identifier: Unlicensed UNLICENSE
pragma solidity ^0.8.27;

import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Clones} from "../lib/openzeppelin-contracts/contracts/proxy/Clones.sol";
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {HoldingWallet} from "./HoldingWallet.sol";
import {ABNameService} from "./ABNameService.sol";
import {ABBondNFT} from "./ABBondNFT.sol";


contract PrimeContractFactory is Ownable {
    using Clones for address;

    // Core mappings
    mapping(address user => address holdingWallet) public userHoldingWallet;

    mapping(address holdingWallet => address user) public holdingWalletUser;

    mapping(address holdingWallet => bool isValid) public isholdingWallet;

    mapping(address holdingWallet => uint256 creationTime) public walletCreationTime;

    // Name service mappings
    mapping(address holdingWallet => bool hasNameService) public walletNameService;

    mapping(string name => address owner) public nameServiceRegistery;

    // bond mappings 
    mapping(address user => uint256 bondCount) public userBondBalance;
    mapping(uint256 bondType => bool isActive) public activeBonds;
    // bondType 1 = premium ($10), 2 = Elite ($50) 3 = legeng ($150)
    mapping(uint256 bondType => uint256 value) public bondPrices; 
    
    address public immutable holdingWalletImplementation;

    address public bondNFTContract; // ERC-1155 for bonds

    address public nameServiceContract;

    address public eERC20Contract;

    uint256 public constant WALLET_LIFESPAN = 90 days; // 3 months

    uint256 public constant BOND_DISCOUNT = 1500; // 15 %

    uint256 public withdrawalFeePercent = 200; // 2% (basis points)

    uint256 public totalWithdrawlFees;

//    uint256[4] public bonds;

    event WalletCreated(address indexed user, address indexed wallet, uint256 createdTime);

    event WalletDestroyed(address indexed user, address indexed wallet);

    event NameServicePurchased(address indexed user, string name, uint256 duration);

    event BondPurchased(address indexed user, uint256 bondtype, uint256 quantity, uint256 cost);

    event WithdrawalFeeCollected(address indexed user, uint256 amount);

    event BondPriceUpdated(uint256 bondType, uint256 newPrice);

    event BondNFTMinted(address indexed user, uint256 bondType, uint256 quantity);

    event NameServiceRevenue(uint256 amount);

    error WalletAlreadyExists();
    error WalletNotFound();
    error WalletExpired();
    error InvalidBondType();
    error InsufficientFunds();
    error OnlyEOA();
    error WalletNotExpired();

    modifier onlyEOA() {
        if (msg.sender.code.length > 0) revert OnlyEOA();
        _;
    }

    modifier walletExists(address user) {

        bool hasHoldingWallet = userHoldingWallet[user] != address(0);
        bool hasValidNames = ABNameService(nameServiceContract).getUserNames(user).length > 0;
        
        if (!hasHoldingWallet && !hasValidNames) revert WalletNotFound();
    
        _;
    }

    constructor(address _holdingWalletImplementation) Ownable(msg.sender) {

        holdingWalletImplementation = _holdingWalletImplementation;
		
        //Mock bond prices for testnet
        bondPrices[1] = 0.085 ether; // Premium: $1 -15% = 0.085 (mocked as AVAX) 60 bonds
        bondPrices[2] = 0.09 ether;  // PremiumII: $5,555 - 15% = 0,09 AVAX 310 bonds
        bondPrices[3] = 0.62 ether; // Elite: $28 - 15% = 0.62 AVAX 1580 bonds
        bondPrices[4] = 2.488 ether; // Legendary: $112 - 15% = 2.488 AVAX 6500 bonds 
    } 

    /**
     * @dev Creates a new holding wallet for the user (EOA only)
     */
    function createHoldingWallet() external onlyEOA {

        if (userHoldingWallet[msg.sender] != address(0)) revert WalletAlreadyExists();

        address wallet = holdingWalletImplementation.clone();
        HoldingWallet(wallet).initialize(msg.sender);

        userHoldingWallet[msg.sender] = wallet;
        holdingWalletUser[wallet] = msg.sender;
        isholdingWallet[wallet] = true;
        walletCreationTime[wallet] = block.timestamp;

        emit WalletCreated(msg.sender, wallet, block.timestamp);
    }
    
    /**
     * @dev Purchase Arena Breakout bonds with 15% discount
     */
    function purchaseBonds(
        uint256 bondType, 
        uint256 quantity) external payable walletExists(msg.sender) {
            
        if (!activeBonds[bondType]) revert InvalidBondType();

        address wallet = userHoldingWallet[msg.sender];
        
        if (wallet != address(0)) {
        if (block.timestamp > walletCreationTime[wallet] + WALLET_LIFESPAN) revert WalletExpired();
        
        }
        uint256 totalCost = bondPrices[bondType] * quantity;
        if (msg.value < totalCost) revert InsufficientFunds();

    //    bonds memory bondsbundle = [60, 310, 1580, 6500]

        // Add bonds to user balance
        userBondBalance[msg.sender] += quantity;

        //forward funds to this contract
        (bool success, ) = address(this).call{value: msg.value}("");
        require(success, "call failed");

        ABBondNFT(bondNFTContract).mintBond(msg.sender, bondType, quantity);

        emit BondNFTMinted(msg.sender, bondType, quantity);
        emit BondPurchased(msg.sender, bondType, quantity, totalCost);

    }

    /**
     * @dev Collect name service revenue for token backing
     */
    function collectNameServiceRevenue() external {

        ABNameService nameService = ABNameService(nameServiceContract);
        uint256 revenue = nameService.totalRevenue();

        nameService.withdrawRevenue();
        emit NameServiceRevenue(revenue);
    }

    /**
     * @dev Set Contract addresses
     */
    function setContracts(
        address _bondNFT,
        address _nameService,
        address _eERC20
    ) external {
        bondNFTContract = _bondNFT;
        nameServiceContract = _nameService;
        eERC20Contract = _eERC20;
    }

    /**
     * @dev Deposit funds via eERC20
     */
    function depositERC20(
        address token, 
        uint256 amount) external walletExists(msg.sender) {

        address wallet = userHoldingWallet[msg.sender];

        require(token != address(0), "zero address");
        if (amount == uint256(0)) revert InsufficientFunds();    

        IERC20(token).approve(address(this), amount);
        bool success = IERC20(token).transferFrom(wallet, address(this), amount);

        require(success, "transfer failed");

    }

    /**
     * @dev Withdraw funds from
     */
    function withdrawFunds() external onlyEOA walletExists(msg.sender) {

        address wallet = userHoldingWallet[msg.sender];

        uint256 amount = userHoldingWallet[msg.sender].balance;

        if (block.timestamp >= walletCreationTime[wallet] + WALLET_LIFESPAN) revert WalletExpired();

        uint256 fee = (amount * withdrawalFeePercent) / 10000;

        uint256 netAmount = amount - fee;

        HoldingWallet(wallet).withdraw(netAmount, fee);
        totalWithdrawlFees += fee;

        emit WithdrawalFeeCollected(msg.sender, fee);
    }

    /**
     * @dev Collect withdral fees for future token backing
     */
    function collectWithdralFees() external onlyOwner {

        uint256 amount = totalWithdrawlFees;
        totalWithdrawlFees = 0;
        payable(owner()).transfer(amount);
    }

    /**
     * @dev Forve self-desrtuct of expired wallet
     */
    function destroyExpiredWallet(address user) external {

        address wallet = userHoldingWallet[user];
        if (wallet == address(0)) revert WalletNotFound();
        if (block.timestamp < walletCreationTime[wallet] + WALLET_LIFESPAN) revert WalletNotExpired();

        HoldingWallet(wallet).emergencyDestruct();

        // Clean up mappings
        delete userHoldingWallet[user];
        delete holdingWalletUser[wallet];
        delete isholdingWallet[wallet];
        delete walletCreationTime[wallet];

        emit WalletDestroyed(user, wallet);
    }

    /**
     * @dev Admin functions for bond management
     */
    function updateBondPrices(uint256 bondType, uint256 newPrice) external onlyOwner {

        bondPrices[bondType] = newPrice;

        emit BondPriceUpdated(bondType, newPrice);
    }

    function toggleBondActivity(uint256 bondType) external onlyOwner {
        activeBonds[bondType] != activeBonds[bondType];
    }

    /**
     * @dev Get wallet info for user
     */

    function getWalletInfo(address user) external view returns (
        address wallet,
        uint256 creationTime,
        uint256 timeUnlitExpiry,
        bool isExpired,
        uint256 bondBalance
    ) {
        wallet = userHoldingWallet[user];
        if (wallet != address(0)) {
            creationTime = walletCreationTime[wallet];
            uint256 expiryTime = creationTime + WALLET_LIFESPAN;
            timeUnlitExpiry = block.timestamp >= expiryTime ?  0 : expiryTime - block.timestamp;
            isExpired = block.timestamp >= expiryTime;
            bondBalance = userBondBalance[user];
        }
    }

}


