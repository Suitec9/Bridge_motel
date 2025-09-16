// SPDX-License-Identifier: UUNLICENSE
pragma solidity ^0.8.27;


import {ERC1155} from "../lib/openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "../lib/openzeppelin-contracts/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";


/**
 * @title ABBondNFT\
 * @dev ERC-1155 contract tokenized Arena Breakout bonds
 * Phase 2 Bond tokenization with metadata and trading capabilites
 */
contract ABBondNFT is ERC1155, ERC1155Supply, Ownable, ReentrancyGuard {

    struct BondInfo {
        string name;
        uint256 value; // Original bond value in USD (scaled by 1e6)
        uint256 discount; // Discount percentage (15 = 15%)
        bool isActive;
        string metadata; //IPFS hash for additional data
    }

    mapping(uint256 bondType => BondInfo) public bondInfo;
    mapping(address user => mapping(uint256 bondType => uint256 purchaseTime)) public userBondPurchaseTime;

    address public factoryContract;
    uint256 public nextBondType = 1;

    event BondTypeCreated(uint256 indexed bondType, string name, uint256 value, uint256 discount);
    event BondMinted(address indexed user, uint256 indexed bondType, uint256 quantity);
    event BondBurned(address indexed user, uint256 indexed bondType, uint256 quantity);

    error OnlyFactory();
    error InvalidBondType();
    error UnauthorizedBurn();

    modifier onlyFactory() {
        if (msg.sender != factoryContract) revert OnlyFactory();
        _;
    }

    constructor(address _factoryContract) ERC1155("https:// api.absmartwallets.com/bonds/{id}.json") Ownable(msg.sender) {
        factoryContract = _factoryContract;

        // Initialize default bond types for testnet
        _createBondType("Premium Bond", 1_063_829, 15, "QmPremiumBondMetadata");
        _createBondType("PremiumII Bond", 5_318_617, 15, "QmPremiumIIBondMetadata");
        _createBondType("Elite Bond", 26_595_212, 15, "QmEliteBondMetadata");
        _createBondType("Legendary Bond", 106_382_446, 15, "QmLegendaryBondMetadata");
    }

    /**
     * @dev Create new bondType (admin only)
     */
    function createBondType(
        string memory name,
        uint256 value, 
        uint256 discount, 
        string memory metadata
    ) external onlyOwner returns (uint256) {
        return _createBondType(name, value, discount, metadata);
    }

    /**
     * @dev Mint bonds to user (called by factory)
     */
    function mintBond(
        address to, 
        uint256 bondType,
        uint256 quantity
        ) external nonReentrant onlyFactory {

        if (!bondInfo[bondType].isActive) revert InvalidBondType();
        _mint(to, bondType, quantity, "");
        userBondPurchaseTime[to][bondType] = block.timestamp;

        emit BondMinted(to, bondType, quantity);   

    }

    /**
     * @dev Burn bonds (user or factory)
     */
    function burnBond(
        address from, 
        uint256 bondType,
        uint256 quantity
        ) external nonReentrant {

        if (msg.sender != from && msg.sender != factoryContract && !isApprovedForAll(from, msg.sender)) {
            revert UnauthorizedBurn();
        }

        _burn(from, bondType, quantity);
        emit BondBurned(from, bondType, quantity);
    }

    /**
     * @dev Get bond info with calculated discounted price
     */
    function getBondDetails(uint256 bondType) external view returns(
        string memory name, 
        uint256 originalValue,
        uint256 discountedPrice,
        uint256 discount,
        bool isActive,
        string memory metadata
    ) {
        BondInfo memory bond = bondInfo[bondType];
        uint256 discountedPrice_ = (bond.value * (100 - bond.discount)) / 100;

        return (
            bond.name,
            bond.value,
            discountedPrice_,
            bond.discount,
            bond.isActive,
            bond.metadata
        );

    }

    /**
     * @dev Check user bond balance
     */
    function getBalances(address user, uint256 bondType) external view returns (uint256) {

        return balanceOf(user, bondType);
    }

    ////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////    INTERNAL FUNCTIONS    //////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////

    // Override required by Solidity
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal override(ERC1155, ERC1155Supply) {
        super._update( from, to, ids, amounts);
    }

    function _createBondType(
        string memory name,
        uint256 value, 
        uint256 discount,
        string memory metadata
    ) internal returns (uint256) {
        uint256 bondType = nextBondType++;

        bondInfo[bondType] = BondInfo({
            name: name,
            value: value,
            discount: discount,
            isActive: true,
            metadata: metadata
        });

        emit BondTypeCreated(bondType, name, value, discount);

        return bondType;
    }

}
