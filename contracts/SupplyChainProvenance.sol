// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./access/RoleManagement.sol";
import "./libraries/ProductLibrary.sol";
import "./interfaces/SupplyChain.sol";

contract SupplyChainProvenance is RoleManagement, SupplyChain {
    
    uint256 public productCounter;
    mapping(uint256 => ProductLibrary.Product) private products;
    mapping(string => bool) private qrCodeExists;
    
    event ProductCreated(uint256 indexed productId, string name, address producer, uint256 quantity, uint256 timestamp);
    event ProductShipped(uint256 indexed productId, address shipper, string destination, uint256 quantityShipped, uint256 timestamp);
    event ProductReceived(uint256 indexed productId, address receiver, uint256 quantityReceived, uint256 timestamp);
    
    // Producer creates product with QR code
    // Producer creates product - blockchain generates unique ID
    function createProduct(
        string memory _name, 
        string memory _description,
        string memory _location,
        uint256 _quantity
    ) public onlyProducer override returns (uint256) {
        require(_quantity > 0, "Quantity must be greater than 0");
        
        productCounter++;
        uint256 newProductId = productCounter;
        
        // Generate unique blockchain hash from product details + timestamp
        bytes32 blockchainHash = keccak256(abi.encodePacked(
            msg.sender,
            _name,
            block.timestamp,
            newProductId
        ));
        
        // Convert to hex string for QR code
        string memory generatedQRHash = bytes32ToHexString(blockchainHash);
        
        ProductLibrary.Product storage newProduct = products[newProductId];
        newProduct.id = newProductId;
        newProduct.name = _name;
        newProduct.description = _description;
        newProduct.producer = msg.sender;
        newProduct.qrCodeHash = generatedQRHash;  // Blockchain-generated
        newProduct.totalQuantity = _quantity;
        newProduct.quantityInTransit = 0;
        newProduct.quantityDelivered = 0;
        newProduct.currentStatus = ProductLibrary.Status.Produced;
        newProduct.producedTimestamp = block.timestamp;
        newProduct.exists = true;
        newProduct.fullyDelivered = false;
        
        newProduct.journey.push(ProductLibrary.JourneyLog({
            action: ProductLibrary.ActionType.Created,
            actor: msg.sender,
            actorName: entityNames[msg.sender],
            timestamp: block.timestamp,
            location: _location,
            notes: "Product batch created"
        }));
        
        emit ProductCreated(newProductId, _name, msg.sender, _quantity, block.timestamp);
        return newProductId;
    }

    
    // Certifier tests product
    function testProduct(
        uint256 _productId,
        string memory _location,
        string memory _notes
    ) public override onlyCertifyingAuthority {
        ProductLibrary.Product storage product = products[_productId];
        require(product.exists, "Product does not exist");
        require(product.currentStatus == ProductLibrary.Status.Produced, "Product must be in Produced status");
        require(!hasBeenTestedByAnyone(product), "Product already tested");
        
        product.currentStatus = ProductLibrary.Status.Tested;
        
        product.journey.push(ProductLibrary.JourneyLog({
            action: ProductLibrary.ActionType.Tested,
            actor: msg.sender,
            actorName: entityNames[msg.sender],
            timestamp: block.timestamp,
            location: _location,
            notes: _notes
        }));
    }
    
    // Single ship method - with cleaner state validation
    function shipProduct(
        uint256 _productId,
        string memory _destination,
        string memory _notes,
        uint256 _quantityShipping
    ) public override {
        ProductLibrary.Product storage product = products[_productId];
        require(product.exists, "Product does not exist");
        require(_quantityShipping > 0, "Quantity must be greater than 0");
        require(!product.fullyDelivered, "Product already fully delivered");
        
        // Certifier ships to distributor
        if (certifyingAuthorities[msg.sender]) {
            require(product.currentStatus == ProductLibrary.Status.Tested, "Product must be in Tested status");
            require(getLastTesterAddress(product) == msg.sender, "Only the certifier who tested can ship");
            
            product.quantityInTransit = _quantityShipping;
            product.currentStatus = ProductLibrary.Status.InTransit;
            
            product.journey.push(ProductLibrary.JourneyLog({
                action: ProductLibrary.ActionType.ShippedFromCertifier,
                actor: msg.sender,
                actorName: entityNames[msg.sender],
                timestamp: block.timestamp,
                location: _destination,
                notes: _notes
            }));
        }
        // Distributor ships to retailer
        else if (distributors[msg.sender]) {
            require(product.currentStatus == ProductLibrary.Status.InStore, "Product must be in InStore status");
            
            address lastReceiver = getLastReceiverAddress(product);
            require(lastReceiver == msg.sender, "Only the distributor who received can ship");
            
            product.currentStatus = ProductLibrary.Status.InTransit;
            
            product.journey.push(ProductLibrary.JourneyLog({
                action: ProductLibrary.ActionType.ShippedFromDistributor,
                actor: msg.sender,
                actorName: entityNames[msg.sender],
                timestamp: block.timestamp,
                location: _destination,
                notes: _notes
            }));
        }
        else {
            revert("Only certifiers or distributors can ship products");
        }
        
        emit ProductShipped(_productId, msg.sender, _destination, _quantityShipping, block.timestamp);
    }
    
    // Single receive method with status management
    function receiveProduct(
    uint256 _productId,
    string memory _location,
    string memory _notes,
    uint256 _quantityReceived
    ) public override {
        ProductLibrary.Product storage product = products[_productId];
        require(product.exists, "Product does not exist");
        require(product.currentStatus == ProductLibrary.Status.InTransit, "Product must be in-transit");
        require(_quantityReceived > 0, "Quantity must be greater than 0");
        
        // Distributor receives from certifier
        if (distributors[msg.sender]) {
            require(!hasDistributorReceivedFromCertifier(product), "Distributor already received this product");
            
            product.currentStatus = ProductLibrary.Status.InStore;
            
            product.journey.push(ProductLibrary.JourneyLog({
                action: ProductLibrary.ActionType.ReceivedByDistributor,
                actor: msg.sender,
                actorName: entityNames[msg.sender],
                timestamp: block.timestamp,
                location: _location,
                notes: _notes
            }));
        }
        // Retailer receives from distributor
        else if (retailers[msg.sender]) {
            require(hasDistributorReceivedFromCertifier(product), "Distributor must have received first");
            require(!hasRetailerReceivedProduct(product), "Retailer already received this product");
            
            product.quantityDelivered += _quantityReceived;
            product.currentStatus = ProductLibrary.Status.Delivered;
            product.fullyDelivered = true;
            
            product.journey.push(ProductLibrary.JourneyLog({
                action: ProductLibrary.ActionType.ReceivedByRetailer,
                actor: msg.sender,
                actorName: entityNames[msg.sender],
                timestamp: block.timestamp,
                location: _location,
                notes: _notes
            }));
        }
        else {
            revert("Only distributors or retailers can receive products");
        }
        
        emit ProductReceived(_productId, msg.sender, _quantityReceived, block.timestamp);
    }
    
    // ===== Helper Functions =====
    
    function getLastReceiverAddress(ProductLibrary.Product storage product) private view returns (address) {
        for (uint256 i = product.journey.length; i > 0; i--) {
            if (product.journey[i - 1].action == ProductLibrary.ActionType.ReceivedByDistributor) {
                return product.journey[i - 1].actor;
            }
        }
        return address(0);
    }

    // Convert bytes32 to hex string for QR code
    function bytes32ToHexString(bytes32 data) private pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(64);
        
        for (uint256 i = 0; i < 32; i++) {
            uint8 value = uint8(data[i]);
            result[i * 2] = hexChars[value >> 4];
            result[i * 2 + 1] = hexChars[value & 0xf];
        }
        
        return string(result);
    }

    
    function hasBeenTestedByAnyone(ProductLibrary.Product storage product) private view returns (bool) {
        for (uint256 i = 0; i < product.journey.length; i++) {
            if (product.journey[i].action == ProductLibrary.ActionType.Tested) {
                return true;
            }
        }
        return false;
    }
    
    function getLastTesterAddress(ProductLibrary.Product storage product) private view returns (address) {
        for (uint256 i = product.journey.length; i > 0; i--) {
            if (product.journey[i - 1].action == ProductLibrary.ActionType.Tested) {
                return product.journey[i - 1].actor;
            }
        }
        return address(0);
    }
    
    function hasDistributorReceivedFromCertifier(ProductLibrary.Product storage product) private view returns (bool) {
        for (uint256 i = 0; i < product.journey.length; i++) {
            if (product.journey[i].action == ProductLibrary.ActionType.ReceivedByDistributor) {
                return true;
            }
        }
        return false;
    }
    
    function hasRetailerReceivedProduct(ProductLibrary.Product storage product) private view returns (bool) {
        for (uint256 i = 0; i < product.journey.length; i++) {
            if (product.journey[i].action == ProductLibrary.ActionType.ReceivedByRetailer) {
                return true;
            }
        }
        return false;
    }
    
    // ===== View Functions =====
    
    function getProductInfo(uint256 _productId) public view override returns (
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
    ) {
        require(products[_productId].exists, "Product does not exist");
        ProductLibrary.Product storage p = products[_productId];
        
        return (
            p.id,
            p.name,
            p.description,
            p.producer,
            entityNames[p.producer],
            p.qrCodeHash,
            p.totalQuantity,
            p.quantityInTransit,
            p.quantityDelivered,
            ProductLibrary.statusToString(p.currentStatus),
            p.fullyDelivered,
            p.producedTimestamp
        );
    }
    
    function getJourneyLogCount(uint256 _productId) public view override returns (uint256) {
        require(products[_productId].exists, "Product does not exist");
        return products[_productId].journey.length;
    }
    
    function getJourneyLog(uint256 _productId, uint256 _index) public view override returns (
        string memory,
        address,
        string memory,
        uint256,
        string memory,
        string memory
    ) {
        require(products[_productId].exists, "Product does not exist");
        require(_index < products[_productId].journey.length, "Index out of bounds");
        
        ProductLibrary.JourneyLog memory log = products[_productId].journey[_index];
        
        return (
            ProductLibrary.actionToString(log.action),
            log.actor,
            log.actorName,
            log.timestamp,
            log.location,
            log.notes
        );
    }
    
    function getAllJourneyLogs(uint256 _productId) public view override returns (
    string[] memory,
    string[] memory,
    address[] memory,
    uint256[] memory,
    string[] memory,
    string[] memory
    ) {
        require(products[_productId].exists, "Product does not exist");
        
        ProductLibrary.Product storage product = products[_productId];
        uint256 count = product.journey.length;
        
        string[] memory actions = new string[](count);
        string[] memory actorNames = new string[](count);
        address[] memory actors = new address[](count);
        uint256[] memory timestamps = new uint256[](count);
        string[] memory locations = new string[](count);
        string[] memory notes = new string[](count);
        
        for (uint256 i = 0; i < count; i++) {
            actions[i] = ProductLibrary.actionToString(product.journey[i].action);
            actorNames[i] = product.journey[i].actorName;
            actors[i] = product.journey[i].actor;
            timestamps[i] = product.journey[i].timestamp;
            locations[i] = product.journey[i].location;
            notes[i] = product.journey[i].notes;
        }
        
        return (actions, actorNames, actors, timestamps, locations, notes);
    }

    
    function getQRCodeHash(uint256 _productId) public view override returns (string memory) {
        require(products[_productId].exists, "Product does not exist");
        return products[_productId].qrCodeHash;
    }
}
