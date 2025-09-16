// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;


import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";


/**
 * @title ABNameService
 * @dev Avax Name Service with eERC20 integration
 * Phase 2: Name registration with privacy features and IPFS backup
 */
contract ABNameService is Ownable, ReentrancyGuard {

    struct NameRecord {
        address owner_;
        uint256 expiryTime;
        bool isPermanent;
        string ipfsHash; // Backup metadata on IPFS
        bool eERC20Eenabled; // Privacy features enabled
    }
 
    struct PricingTier {
        uint256 oneYear;
        uint256 threeYear;
        uint256 permanent;
        bool isActive;
    }

    mapping(string name => NameRecord) public nameRecords;
    mapping(address owner => string[] names) public ownerNames;
    mapping(address owner => bool canAccesseERC20) public eERC20Access;

    PricingTier public pricing;
    address public factoryContract;
    address public eERC20Contract;
    uint256 public totalRevenue;

    event NameRegistered(address indexed owner, string name, uint256 duration, uint256 cost);
    event NameRenewed(address indexed owner, string name, uint256 newExpiry, uint256 cost);
    event NameIsExpired(string name, string ipfsBackup);
    event eERC20AccessGranted(address indexed user, string name);

    error NameNotAvailable();
    error NotNameOwner();
    error NameExpired();
    error InvalidDuration();
    error InsufficientPayment();
    error NameNotFound();


    modifier onlyNameOwner(string memory name) {
        if (nameRecords[name].owner_ != msg.sender) revert NotNameOwner();
        if (!nameRecords[name].isPermanent && block.timestamp >= nameRecords[name].expiryTime) {
            revert NameExpired();
        }
        _;
    }

    constructor(address _factoryContract) Ownable(msg.sender) {
        require(_factoryContract != address(0), "zero address");
        factoryContract = _factoryContract;

        // Set initial pricing (in AVAX wei)
        pricing = PricingTier({
            oneYear: 0.125 ether, // 4.9 dollars in AVAX for 1 year
            threeYear: 0.25 ether, // 9.875 dollars in AVAX for three years
            permanent: 1 ether, // 39.5 dollars in AVAX permanent
            isActive: true
        });

    }

    /**
     * @dev Register a new name
     * @param name the name to register
     * @param duration 1 = 1 year, 3 = 3 year, 0 = permanent
     */
    function registerName(string memory name, uint256 duration) external payable nonReentrant {
        
        if (!_isNameAvailable(name)) revert NameNotAvailable();

        uint256 cost = _getCost(duration);
        if (msg.value < cost) revert InsufficientPayment();

        uint256 expiryTime;
        bool isPermanent;

        if (duration == 0) {
            isPermanent = true;
            expiryTime = 0;
        } else if (duration == 1) {
            expiryTime = block.timestamp + 365 days;
        } else if (duration == 3) {
            expiryTime = block.timestamp + (3 * 365 days);
        } else {
            revert InvalidDuration();
        }

        // Create name record
        nameRecords[name] = NameRecord({
            owner_: msg.sender,
            expiryTime: expiryTime,
            isPermanent: isPermanent,
            ipfsHash: "",
            eERC20Eenabled: false
        });

        ownerNames[msg.sender].push(name);
        totalRevenue += cost;

        // Refund exess payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }

        emit NameRegistered(msg.sender, name, duration, cost);

    }

    /**
     * @dev Enable eERC20 privacy features for name owner
     */
    function enableeERC20Access(string memory name) external onlyNameOwner(name) {

        nameRecords[name].eERC20Eenabled = true;
        eERC20Access[msg.sender] = true;

        emit eERC20AccessGranted(msg.sender, name);
    }

    /**
     * @dev Renew an existing name
     */
    function renewName(
        string memory name,
        uint256 duration
        ) external payable onlyNameOwner(name) nonReentrant {

        if (nameRecords[name].isPermanent) revert InvalidDuration();

        uint256 cost = _getCost(duration);
        if (msg.value < cost) revert InsufficientPayment();

        uint256 currentExpiry = nameRecords[name].expiryTime;
        uint256 baseTime = block.timestamp > currentExpiry ? block.timestamp : currentExpiry;

        if (duration == 1) {
            nameRecords[name].expiryTime = baseTime + 356 days;
        } else if (duration == 3 ) {
            nameRecords[name].expiryTime = baseTime + (3 * 356 days);
        } else {
            revert InvalidDuration();
        }  

        totalRevenue += cost;

        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }

        emit NameRenewed(msg.sender, name, nameRecords[name].expiryTime, cost);
    }

    /**
     * @dev Expire a name and backup to IPFS
     */
    function expireName(
        string memory name,
        string memory ipfsHash
        ) external {

        NameRecord storage record = nameRecords[name];
        if (record.owner_ == address(0)) revert NameNotFound();
        if (record.isPermanent || block.timestamp < record.expiryTime) revert NameNotFound();

        // Backup to IPFS before deletion
        record.ipfsHash = ipfsHash;
        emit NameIsExpired(name, ipfsHash);

        // Clean up on-chain data
        delete nameRecords[name];
        _removeFromOwnerNames(record.owner_, name);
    }

    /**
     * @dev Set eERC contract address
     */
    function seteERC20Contract(address _eERC20Contract) external onlyOwner {
        eERC20Contract = _eERC20Contract;
    }

    /**
     * @dev Update Pricing
     */
    function updatePricing(
        uint256 oneYear, 
        uint256 threeYear,
        uint256 permanent
        ) external onlyOwner {
        
        pricing.oneYear = oneYear;
        pricing.threeYear = threeYear;
        pricing.permanent = permanent;
    }

    /**
     * @dev Withdraw revenue to back incentive tokens
     */
    function withdrawRevenue() external onlyOwner {

        uint256 amount = totalRevenue;
        totalRevenue = 0;
        
        (bool success, ) = payable(factoryContract).call{value: amount}("");
        require(success, "call failed");
    }

    /**
     * @dev Get name info
     */
    function getNameInfo(string memory name) external view returns (
        address _owner,
        uint256 expiryTime,
        bool isPermanent,
        bool eERC20Enabled,
        bool isExpired
    ) {
        NameRecord memory record = nameRecords[name];
        bool expired = !record.isPermanent && block.timestamp > record.expiryTime;

        return (
            record.owner_,
            record.expiryTime,
            record.isPermanent,
            record.eERC20Eenabled,
            expired
        );
    }

    /**
     * @dev Get user's names
     */
    function getUserNames(address user) external view returns (string[] memory) {
        
        return ownerNames[user];
    }

    function checkNameAvailable(string memory name) external view returns (bool) {
        return _isNameAvailable(name);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////   INTERNAL FUNCTIONS    //////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Check if name is available
     */
    function _isNameAvailable(string memory name) internal view returns (bool) {

        NameRecord memory record = nameRecords[name];
        if (record.owner_ == address(0)) return true;
        if (record.isPermanent) return false;
        return block.timestamp >= record.expiryTime;
    }

    /**
     * @dev Get cost for duration
     */
    function _getCost(uint256 duration) internal view returns (uint256) {

        if (duration == 1) return pricing.oneYear;
        if (duration == 3) return pricing.threeYear;
        if (duration == 0) return pricing.permanent;
        revert InvalidDuration();
    }

    /**
     * @dev Remove name from owner's list
     */
    function _removeFromOwnerNames(
        address _owner,
        string memory name
        ) internal {
        
        string[] storage names = ownerNames[_owner];
        for (uint256 i = 0; i < names.length; i++) {
            if (keccak256(bytes(names[i])) == keccak256(bytes(name))) {
                names[i] = names[names.length - 1];
                names.pop();
                break;
            }
        }
    }
}