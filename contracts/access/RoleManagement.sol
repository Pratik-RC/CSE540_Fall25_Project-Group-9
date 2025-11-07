// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Interface to control who has which access and to allow only owner assign these roles.
contract RoleManagement {
    
    address public contractOwner;
    
    mapping(address => bool) public producers;
    mapping(address => bool) public certifyingAuthorities;
    mapping(address => bool) public distributors;
    mapping(address => bool) public retailers;
    
    // CHANGE: Make this public so child contracts can access it
    mapping(address => string) public entityNames;
    
    event RoleAssigned(address indexed user, string role, string name);
    event RoleRevoked(address indexed user, string role);
    
    constructor() {
        contractOwner = msg.sender;
        entityNames[msg.sender] = "Contract Owner";
    }
    
    modifier onlyOwner() {
        require(msg.sender == contractOwner, "Only contract owner");
        _;
    }
    
    modifier onlyProducer() {
        require(producers[msg.sender], "Only producers");
        _;
    }
    
    modifier onlyCertifyingAuthority() {
        require(certifyingAuthorities[msg.sender], "Only certifiers");
        _;
    }
    
    modifier onlyDistributor() {
        require(distributors[msg.sender], "Only distributors");
        _;
    }
    
    modifier onlyRetailer() {
        require(retailers[msg.sender], "Only retailers");
        _;
    }
    
    function assignProducer(address _producer, string memory _name) public onlyOwner {
        producers[_producer] = true;
        entityNames[_producer] = _name;
        emit RoleAssigned(_producer, "Producer", _name);
    }
    
    function assignCertifyingAuthority(address _authority, string memory _name) public onlyOwner {
        certifyingAuthorities[_authority] = true;
        entityNames[_authority] = _name;
        emit RoleAssigned(_authority, "Certifying Authority", _name);
    }
    
    function assignDistributor(address _distributor, string memory _name) public onlyOwner {
        distributors[_distributor] = true;
        entityNames[_distributor] = _name;
        emit RoleAssigned(_distributor, "Distributor", _name);
    }
    
    function assignRetailer(address _retailer, string memory _name) public onlyOwner {
        retailers[_retailer] = true;
        entityNames[_retailer] = _name;
        emit RoleAssigned(_retailer, "Retailer", _name);
    }
    
    function getEntityName(address _address) public view returns (string memory) {
        return entityNames[_address];
    }
}
