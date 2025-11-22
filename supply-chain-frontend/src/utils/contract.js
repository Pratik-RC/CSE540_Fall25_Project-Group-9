// Contract configuration
export const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
export const OWNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export const CONTRACT_ABI = [
  // Owner & Role Checks
  "function owner() view returns (address)",
  "function isProducer(address) view returns (bool)",
  "function isCertifier(address) view returns (bool)",
  "function isDistributor(address) view returns (bool)",
  "function isRetailer(address) view returns (bool)",
  "function hasPendingRoleRequest(address) view returns (bool)",
  
  // Role Request Functions
  "function requestProducerRole(string memory _name) public",
  "function requestCertifierRole(string memory _name) public",
  "function requestDistributorRole(string memory _name) public",
  "function requestRetailerRole(string memory _name) public",
  
  // Admin Functions
  "function approveRoleRequest(address _requester) public",
  "function rejectRoleRequest(address _requester) public",
  "function getPendingRequests() public view returns (address[])",
  "function getRoleRequest(address _requester) public view returns (address requester, string name, string role, uint256 timestamp, bool pending)",
  
  // Supply Chain Core Functions (UPDATED - no quantity params)
  "function createProduct(string memory _name, string memory _description, string memory _location, string _quantity) public returns (uint256)",
  "function testProduct(uint256 _productId, string memory _location, string memory _notes) public",
  "function shipProduct(uint256 _productId, string memory _roleType, string memory _destination, string memory _notes) public",
  "function receiveProduct(uint256 _productId, string memory _location, string memory _notes) public",
  
  // Product Information Functions (UPDATED - removed quantity fields)
  "function getProductInfo(uint256 _productId) view returns (uint256, string, string, address, string, string, string, string, bool, uint256)",
  "function getQRCodeHash(uint256 _productId) view returns (string)",
  "function getProductIdByQRHash(string memory _qrHash) view returns (uint256)",
  "function getCurrentHolder(uint256 _productId) view returns (address)",
  "function productCounter() view returns (uint256)",
  "function getRecentProducts(address _entity) view returns (uint256[])",
  
  // Journey/History Functions
  "function getJourneyLogCount(uint256 _productId) view returns (uint256)",
  "function getJourneyLog(uint256 _productId, uint256 _index) view returns (string, address, string, uint256, string, string)",
  "function getAllJourneyLogs(uint256 _productId) view returns (string[], string[], address[], uint256[], string[], string[])",
  "function markProductAsSold(uint256 _productId, string memory _customerInfo, string memory _notes) public",  
  
  // Events (UPDATED - removed quantity from ship/receive events)
  "event RoleRequested(address indexed requester, string role, string name, uint256 timestamp)",
  "event RoleApproved(address indexed user, string role, address indexed approver)",
  "event RoleRejected(address indexed user, string role, address indexed rejector)",
  "event ProductCreated(uint256 indexed productId, string name, address producer, string quantity, uint256 timestamp)",
  "event ProductTested(uint256 indexed productId, address certifier, uint256 timestamp)",
  "event ProductShipped(uint256 indexed productId, address from, string toRole, uint256 timestamp)",
  "event ProductReceived(uint256 indexed productId, address receiver, uint256 timestamp)",
  "event ProductSold(uint256 indexed productId, address retailer, uint256 timestamp)"
];
