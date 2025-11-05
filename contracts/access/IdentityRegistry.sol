// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract IdentityRegistry {
    
    struct Identity {
        string name;
        string organization;
        string location;
        bool exists;
    }
    
    mapping(address => Identity) public identities;
    
    event IdentityRegistered(address indexed userAddress, string name, string organization);
    event IdentityUpdated(address indexed userAddress, string name, string organization);
    
    function registerIdentity(
        address _address,
        string memory _name,
        string memory _organization,
        string memory _location
    ) internal {
        identities[_address] = Identity({
            name: _name,
            organization: _organization,
            location: _location,
            exists: true
        });
        
        emit IdentityRegistered(_address, _name, _organization);
    }
    
    function getIdentity(address _address) public view returns (
        string memory name,
        string memory organization,
        string memory location
    ) {
        require(identities[_address].exists, "Identity not registered");
        Identity memory id = identities[_address];
        return (id.name, id.organization, id.location);
    }
    
    function getIdentityName(address _address) public view returns (string memory) {
        if (!identities[_address].exists) {
            return "Unknown";
        }
        return identities[_address].name;
    }
    
    function hasIdentity(address _address) public view returns (bool) {
        return identities[_address].exists;
    }
}
