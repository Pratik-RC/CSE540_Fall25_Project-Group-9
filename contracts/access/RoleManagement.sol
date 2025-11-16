// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RoleManagement {
    
    address public owner;
    
    mapping(address => bool) public producers;
    mapping(address => bool) public certifyingAuthorities;
    mapping(address => bool) public distributors;
    mapping(address => bool) public retailers;
    mapping(address => string) public entityNames;
    
    struct RoleRequest {
        address requester;
        string name;
        string role;  // "producer", "certifier", "distributor", "retailer"
        uint256 timestamp;
        bool pending;
    }
    
    mapping(address => RoleRequest) public roleRequests;
    address[] public pendingRequests;
    
    // Events
    event RoleRequested(address indexed requester, string role, string name, uint256 timestamp);
    event RoleApproved(address indexed user, string role, address indexed approver);
    event RoleRejected(address indexed user, string role, address indexed rejector);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyProducer() {
        require(producers[msg.sender], "Only producers can perform this action");
        _;
    }
    
    modifier onlyCertifyingAuthority() {
        require(certifyingAuthorities[msg.sender], "Only certifying authorities can perform this action");
        _;
    }
    
    modifier onlyDistributor() {
        require(distributors[msg.sender], "Only distributors can perform this action");
        _;
    }
    
    modifier onlyRetailer() {
        require(retailers[msg.sender], "Only retailers can perform this action");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
        
    function requestProducerRole(string memory _name) public {
        require(!producers[msg.sender], "Already a producer");
        require(!roleRequests[msg.sender].pending, "Request already pending");
        
        roleRequests[msg.sender] = RoleRequest({
            requester: msg.sender,
            name: _name,
            role: "producer",
            timestamp: block.timestamp,
            pending: true
        });
        
        pendingRequests.push(msg.sender);
        
        emit RoleRequested(msg.sender, "producer", _name, block.timestamp);
    }
    
    function requestCertifierRole(string memory _name) public {
        require(!certifyingAuthorities[msg.sender], "Already a certifier");
        require(!roleRequests[msg.sender].pending, "Request already pending");
        
        roleRequests[msg.sender] = RoleRequest({
            requester: msg.sender,
            name: _name,
            role: "certifier",
            timestamp: block.timestamp,
            pending: true
        });
        
        pendingRequests.push(msg.sender);
        
        emit RoleRequested(msg.sender, "certifier", _name, block.timestamp);
    }
    
    function requestDistributorRole(string memory _name) public {
        require(!distributors[msg.sender], "Already a distributor");
        require(!roleRequests[msg.sender].pending, "Request already pending");
        
        roleRequests[msg.sender] = RoleRequest({
            requester: msg.sender,
            name: _name,
            role: "distributor",
            timestamp: block.timestamp,
            pending: true
        });
        
        pendingRequests.push(msg.sender);
        
        emit RoleRequested(msg.sender, "distributor", _name, block.timestamp);
    }
    
    function requestRetailerRole(string memory _name) public {
        require(!retailers[msg.sender], "Already a retailer");
        require(!roleRequests[msg.sender].pending, "Request already pending");
        
        roleRequests[msg.sender] = RoleRequest({
            requester: msg.sender,
            name: _name,
            role: "retailer",
            timestamp: block.timestamp,
            pending: true
        });
        
        pendingRequests.push(msg.sender);
        
        emit RoleRequested(msg.sender, "retailer", _name, block.timestamp);
    }
    
    // Owner approves role request
    function approveRoleRequest(address _requester) public onlyOwner {
        RoleRequest storage request = roleRequests[_requester];
        require(request.pending, "No pending request");
        
        // Assign appropriate role
        if (keccak256(bytes(request.role)) == keccak256(bytes("producer"))) {
            producers[_requester] = true;
        } else if (keccak256(bytes(request.role)) == keccak256(bytes("certifier"))) {
            certifyingAuthorities[_requester] = true;
        } else if (keccak256(bytes(request.role)) == keccak256(bytes("distributor"))) {
            distributors[_requester] = true;
        } else if (keccak256(bytes(request.role)) == keccak256(bytes("retailer"))) {
            retailers[_requester] = true;
        }
        
        entityNames[_requester] = request.name;
        request.pending = false;
        
        // Remove from pending list
        removePendingRequest(_requester);
        
        emit RoleApproved(_requester, request.role, msg.sender);
    }
    
    // Owner rejects role request
    function rejectRoleRequest(address _requester) public onlyOwner {
        RoleRequest storage request = roleRequests[_requester];
        require(request.pending, "No pending request");
        
        request.pending = false;
        
        // Remove from pending list
        removePendingRequest(_requester);
        
        emit RoleRejected(_requester, request.role, msg.sender);
    }
    
    // Get all pending requests
    function getPendingRequests() public view returns (address[] memory) {
        return pendingRequests;
    }
    
    // Get details of a specific request
    function getRoleRequest(address _requester) public view returns (
        address requester,
        string memory name,
        string memory role,
        uint256 timestamp,
        bool pending
    ) {
        RoleRequest memory request = roleRequests[_requester];
        return (
            request.requester,
            request.name,
            request.role,
            request.timestamp,
            request.pending
        );
    }
        
    // Check if address has pending role request
    function hasPendingRoleRequest(address _address) public view returns (bool) {
        return roleRequests[_address].pending;
    }
    
    // Simple boolean checkers for roles
    function isProducer(address _address) public view returns (bool) {
        return producers[_address];
    }
    
    function isCertifier(address _address) public view returns (bool) {
        return certifyingAuthorities[_address];
    }
    
    function isDistributor(address _address) public view returns (bool) {
        return distributors[_address];
    }
    
    function isRetailer(address _address) public view returns (bool) {
        return retailers[_address];
    }
    
    // Helper function to remove from pending array
    function removePendingRequest(address _requester) private {
        for (uint256 i = 0; i < pendingRequests.length; i++) {
            if (pendingRequests[i] == _requester) {
                pendingRequests[i] = pendingRequests[pendingRequests.length - 1];
                pendingRequests.pop();
                break;
            }
        }
    }
    
    
    function assignProducer(address _producer, string memory _name) public onlyOwner {
        producers[_producer] = true;
        entityNames[_producer] = _name;
    }
    
    function assignCertifier(address _certifier, string memory _name) public onlyOwner {
        certifyingAuthorities[_certifier] = true;
        entityNames[_certifier] = _name;
    }
    
    function assignDistributor(address _distributor, string memory _name) public onlyOwner {
        distributors[_distributor] = true;
        entityNames[_distributor] = _name;
    }
    
    function assignRetailer(address _retailer, string memory _name) public onlyOwner {
        retailers[_retailer] = true;
        entityNames[_retailer] = _name;
    }
    
    function removeProducer(address _producer) public onlyOwner {
        producers[_producer] = false;
    }
    
    function removeCertifier(address _certifier) public onlyOwner {
        certifyingAuthorities[_certifier] = false;
    }
    
    function removeDistributor(address _distributor) public onlyOwner {
        distributors[_distributor] = false;
    }
    
    function removeRetailer(address _retailer) public onlyOwner {
        retailers[_retailer] = false;
    }
}
