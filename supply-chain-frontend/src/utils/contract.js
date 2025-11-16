// Contract configuration
export const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3"; // Update after deployment

// Hardhat local network default owner (first account)
export const OWNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// Contract ABI - Role Management + Core functions
export const CONTRACT_ABI = [
  // Owner/Role checks
  "function owner() view returns (address)",
  "function producers(address) view returns (bool)",
  "function certifyingAuthorities(address) view returns (bool)",
  "function distributors(address) view returns (bool)",
  "function retailers(address) view returns (bool)",
  
  // Role Request Functions (Users)
  "function requestProducerRole(string memory _name) public",
  "function requestCertifierRole(string memory _name) public",
  "function requestDistributorRole(string memory _name) public",
  "function requestRetailerRole(string memory _name) public",
  
  // Admin Functions
  "function approveRoleRequest(address _requester) public",
  "function rejectRoleRequest(address _requester) public",
  "function getPendingRequests() public view returns (address[])",
  "function getRoleRequest(address _requester) public view returns (address requester, string memory name, string memory role, uint256 timestamp, bool pending)",
  
  // Events
  "event RoleRequested(address indexed requester, string role, string name, uint256 timestamp)",
  "event RoleApproved(address indexed user, string role, address indexed approver)",
  "event RoleRejected(address indexed user, string role, address indexed rejector)"
];
