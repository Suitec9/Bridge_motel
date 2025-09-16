// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.27;


import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
/**
 * @title HoldingWallet
 * @dev Individual user wallet with self-destruct capability
 */
contract HoldingWallet {

    uint256 public creationTime;

    address public  factory;

    address public owner;

    bool private initialized;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "not factory");
        _;
    }

    modifier onlyBeforeExpire() {
        require(block.timestamp < creationTime + 90 days, "Wallet expire");
        _;
    }

    function initialize(address _owner, address _factory) external {
        require(msg.sender != address(0), "zero address");
        require(!initialized, "Already Initialized");
        
        owner = _owner;
        factory = _factory;
        creationTime = block.timestamp;
        initialized = true;
    }    

    /**
     * @dev Receive funds from bond purchases
     */
    function receiveFunds() external payable onlyFactory onlyBeforeExpire {}

    /**
     * @dev Transfer funds between wallets
     */
    function transferFunds(address token, address to, uint256 amount) external onlyOwner onlyBeforeExpire {
        require(address(this).balance >= amount, "Insufficient amount");
        require(token != address(0), "zero address");

        uint fee = (amount * 150) / 10000;
        uint256 netAmount = amount - fee;

        (bool success, ) = payable(factory).call{value: fee}("");

        require(success, "fee failed");

        payable(to).transfer(netAmount);


    }
    
    /**
     * @dev Withdraw with fee deduction
     */
    function withdraw(uint256 netAmount, uint256 fee) external onlyFactory onlyBeforeExpire {
        require(address(this).balance >= netAmount + fee, "Insufficient balance");

        //send fee to factory
        payable(factory).transfer(fee);
 
        //Send net amount to user
        payable(owner).transfer(netAmount);
        
    }

       function deposit(address token, uint256 amount) external onlyBeforeExpire returns (bool) {
        require(token != address(0), 'zero address');
        require(amount > uint256(1), 'insufficient amount');

        uint256 balance = uint256(address(this).balance);
        balance += amount;

        IERC20(token).approve(msg.sender, amount);
        bool success =  IERC20(token).transferFrom(msg.sender, address(this), amount);

        require(success, 'deposit failed');

        return success;
        
    }

    /**
     * @dev Emergency destruct for expired wallets (callable by anyone)
     */
    function emergencyDestruct() external {
        require(block.timestamp >= creationTime + 90 days, "Not expired");

        // Return funds to owner before destroying
        if (address(this).balance > uint256(0)) {
            (bool success, ) = payable(owner).call{value: (address(this).balance)}("");

            require(success, "transfer failed");
        }

    }

    /**
     * @dev Get wallet status
     */
    function getStatus() external view returns (
        uint256 balance,
        uint256 timeUnlitExpiry,
        bool isExpired
    ) {
        balance = address(this).balance;
        uint256 expiryTime = creationTime + 90 days;
        timeUnlitExpiry = block.timestamp >= expiryTime ? 0 : expiryTime - block.timestamp;
        isExpired = block.timestamp >= expiryTime;
    }

 
    fallback() external {}
}