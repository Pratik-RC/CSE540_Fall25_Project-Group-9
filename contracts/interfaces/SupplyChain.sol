// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Defines the basic product tracking functionalities to be supported on this chain
interface SupplyChain {
    
    function createProduct(
    string memory _name,
    string memory _description,
    string memory _location,
    uint256 _quantity
    ) external returns (uint256);

    
    function testProduct(
        uint256 _productId,
        string memory _location,
        string memory _notes
    ) external;
    
    function shipProduct(
        uint256 _productId,
        string memory _destination,
        string memory _notes,
        uint256 _quantityShipping
    ) external;
    
    function receiveProduct(
        uint256 _productId,
        string memory _location,
        string memory _notes,
        uint256 _quantityReceived
    ) external;
    
    function getProductInfo(uint256 _productId) external view returns (
        uint256,
        string memory,
        string memory,
        address,
        string memory,
        string memory,
        uint256,
        uint256,
        uint256,
        string memory,
        bool,
        uint256
    );
    
    function getJourneyLogCount(uint256 _productId) external view returns (uint256);
    
    function getJourneyLog(uint256 _productId, uint256 _index) external view returns (
        string memory,
        address,
        string memory,
        uint256,
        string memory,
        string memory
    );
    
    function getAllJourneyLogs(uint256 _productId) external view returns (
        string[] memory,
        string[] memory,
        address[] memory,
        uint256[] memory,
        string[] memory,
        string[] memory
    );
    
    function getQRCodeHash(uint256 _productId) external view returns (string memory);
}
