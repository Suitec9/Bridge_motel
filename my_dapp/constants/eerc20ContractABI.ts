
export const geteERC20ABI = () => {
      return [
        "function register(uint[2] memory _pA, uint[2][2] memory _pB, uint[2] memory _pC, uint[5] memory _publicSignals) external",
        "function transfer(address to, uint[2] memory _pA, uint[2][2] memory _pB, uint[2] memory _pC, uint[5] memory _publicSignals) external returns (bool)",
        "function proveBalance(uint[2] memory _pA, uint[2][2] memory _pB, uint[2] memory _pC, uint[3] memory _publicSignals) external view returns (bool)",
        "function mint(address to, uint256 amount, uint[2] memory _pA, uint[2][2] memory _pB, uint[2] memory _pC, uint[3] memory _publicSignals) external",
        "function getEncryptedBalance(address user) external view returns (bytes memory)",
        "function isRegistered(address user) external view returns (bool)"
      ];
    }