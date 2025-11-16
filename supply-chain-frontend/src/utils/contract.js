// Contract configuration
export const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3"; // Update after deployment

// Hardhat local network default owner (first account)
export const OWNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// Contract ABI - Updated with helper functions
export const CONTRACT_ABI = [
  // Owner check
  "function owner() view returns (address)",
  
  // Simple boolean role checks (NEW - RECOMMENDED)
  "function isProducer(address) view returns (bool)",
  "function isCertifier(address) view returns (bool)",
  "function isDistributor(address) view returns (bool)",
  "function isRetailer(address) view returns (bool)",
  "function hasPendingRoleRequest(address) view returns (bool)",
  
  // Role Request Functions (Users)
  "function requestProducerRole(string memory _name) public",
  "function requestCertifierRole(string memory _name) public",
  "function requestDistributorRole(string memory _name) public",
  "function requestRetailerRole(string memory _name) public",
  
  // Admin Functions
  "function approveRoleRequest(address _requester) public",
  "function rejectRoleRequest(address _requester) public",
  "function getPendingRequests() public view returns (address[])",
  "function getRoleRequest(address _requester) public view returns (address requester, string name, string role, uint256 timestamp, bool pending)",
  
  // Events
  "event RoleRequested(address indexed requester, string role, string name, uint256 timestamp)",
  "event RoleApproved(address indexed user, string role, address indexed approver)",
  "event RoleRejected(address indexed user, string role, address indexed rejector)"
];
