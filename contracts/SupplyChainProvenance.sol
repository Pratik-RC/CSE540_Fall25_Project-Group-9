// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./access/RoleManagement.sol";
import "./libraries/ProductLibrary.sol";
import "./interfaces/SupplyChain.sol";

contract SupplyChainProvenance is RoleManagement, SupplyChain {
    uint256 public productCounter;
    mapping(uint256 => ProductLibrary.Product) private products;
    mapping(string => bool) private qrCodeExists;
    mapping(string => uint256) private qrHashToProductId;
    mapping(address => uint256[]) private entityProducts;
    uint256 private constant MAX_RECENT_PRODUCTS = 10;

    event ProductCreated(uint256 indexed productId, string name, address producer, string quantity, uint256 timestamp);
    event ProductTested(uint256 indexed productId, address certifier, uint256 timestamp);
    event ProductShipped(uint256 indexed productId, address from, string toRole, uint256 timestamp);
    event ProductReceived(uint256 indexed productId, address receiver, uint256 timestamp);
    event ProductSold(uint256 indexed productId, address retailer, uint256 timestamp);
    event ProductsBatchArchived(uint256[] indexed productIds, string ipfsHash);
    event ProductArchived(uint256 indexed productId, string ipfsHash);



    // Helper function to check if address has ANY role
    function hasRole(address _addr) private view returns (bool) {
        return producers[_addr] || 
               certifyingAuthorities[_addr] || 
               distributors[_addr] || 
               retailers[_addr];
    }

    // Producer creates product
    function createProduct(
        string memory _name, 
        string memory _description,
        string memory _location,
        string memory _quantity
    ) public override onlyProducer returns (uint256) {
        productCounter++;
        uint256 newProductId = productCounter;
        // Generate blockchain QR hash
        bytes32 blockchainHash = keccak256(abi.encodePacked(
            msg.sender,
            _name,
            block.timestamp,
            newProductId
        ));
        string memory generatedQRHash = bytes32ToHexString(blockchainHash);
        ProductLibrary.Product storage newProduct = products[newProductId];
        newProduct.id = newProductId;
        newProduct.name = _name;
        newProduct.description = _description;
        newProduct.producer = msg.sender;
        newProduct.qrCodeHash = generatedQRHash;
        newProduct.totalQuantity = _quantity;
        //newProduct.quantityInTransit = 0;
        //newProduct.quantityDelivered = 0;
        newProduct.currentStatus = ProductLibrary.Status.Produced;
        newProduct.producedTimestamp = block.timestamp;
        newProduct.exists = true;
        newProduct.fullyDelivered = false;
        newProduct.currentHolder = msg.sender;
        newProduct.destinationRole = "";  // No destination yet
        qrCodeExists[generatedQRHash] = true;
        qrHashToProductId[generatedQRHash] = newProductId;

        addToEntityProducts(msg.sender, newProductId);

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

    function getProductIdByQRHash(string memory _qrHash) public override view returns (uint256) {
        require(qrCodeExists[_qrHash], "Invalid QR code");
        return qrHashToProductId[_qrHash];
    }

    // Certifier tests product (optional)
    function testProduct(
        uint256 _productId,
        string memory _location,
        string memory _notes
    ) public override onlyCertifyingAuthority {
        ProductLibrary.Product storage product = products[_productId];
        require(product.exists, "Product does not exist");
        require(product.currentHolder == msg.sender, "Only current holder can test"); 
        product.currentStatus = ProductLibrary.Status.Tested;
        product.journey.push(ProductLibrary.JourneyLog({
            action: ProductLibrary.ActionType.Tested,
            actor: msg.sender,
            actorName: entityNames[msg.sender],
            timestamp: block.timestamp,
            location: _location,
            notes: _notes
        }));
        addToEntityProducts(msg.sender, _productId);
        emit ProductTested(_productId, msg.sender, block.timestamp);
    }

    // Anyone holding the product can ship it to a role type
    function shipProduct(
        uint256 _productId,
        string memory _roleType,  // "certifier", "distributor", "retailer"
        string memory _destination,
        string memory _notes
        ) public override {
        ProductLibrary.Product storage product = products[_productId];
        require(product.exists, "Product does not exist");
        require(hasRole(msg.sender), "Only authorized roles can ship");
        require(product.currentHolder == msg.sender, "Only current holder can ship");
        require(product.currentStatus != ProductLibrary.Status.InTransit, "Product already in transit");
        require(!product.fullyDelivered, "Product already fully delivered");
        // Validate role type
        require(
            keccak256(bytes(_roleType)) == keccak256(bytes("certifier")) ||
            keccak256(bytes(_roleType)) == keccak256(bytes("distributor")) ||
            keccak256(bytes(_roleType)) == keccak256(bytes("retailer")),
            "Invalid role type"
        );
        product.currentStatus = ProductLibrary.Status.InTransit;
        product.destinationRole = _roleType;
        product.journey.push(ProductLibrary.JourneyLog({
            action: ProductLibrary.ActionType.Shipped,
            actor: msg.sender,
            actorName: entityNames[msg.sender],
            timestamp: block.timestamp,
            location: _destination,
            notes: string(abi.encodePacked("Shipped to ", _roleType, ". ", _notes))
        }));

        addToEntityProducts(msg.sender, _productId);

        emit ProductShipped(_productId, msg.sender, _roleType, block.timestamp);
    }

    // Anyone with matching role can receive the product
    function receiveProduct(
        uint256 _productId,
        string memory _location,
        string memory _notes
        ) public override {
        ProductLibrary.Product storage product = products[_productId];
        require(product.exists, "Product does not exist");
        require(hasRole(msg.sender), "Only authorized roles can receive");
        require(product.currentStatus == ProductLibrary.Status.InTransit, "Product must be in transit");
        //require(_quantityReceived > 0, "Quantity must be greater than 0");
        // Check if caller has the destination role
        bool hasDestinationRole = false;
        if (keccak256(bytes(product.destinationRole)) == keccak256(bytes("certifier"))) {
            hasDestinationRole = certifyingAuthorities[msg.sender];
        } else if (keccak256(bytes(product.destinationRole)) == keccak256(bytes("distributor"))) {
            hasDestinationRole = distributors[msg.sender];
        } else if (keccak256(bytes(product.destinationRole)) == keccak256(bytes("retailer"))) {
            hasDestinationRole = retailers[msg.sender];
        }
        require(hasDestinationRole, "You don't have the required role to receive this shipment");
        // Update holder and status
        product.currentHolder = msg.sender;
        product.currentStatus = ProductLibrary.Status.Delivered;
        //product.quantityDelivered += _quantityReceived;
        //product.quantityInTransit = 0;
        product.destinationRole = "";
        // Check if this is final delivery (to retailer)
        if (retailers[msg.sender]) {
            product.fullyDelivered = true;
        }
        product.journey.push(ProductLibrary.JourneyLog({
            action: ProductLibrary.ActionType.Received,
            actor: msg.sender,
            actorName: entityNames[msg.sender],
            timestamp: block.timestamp,
            location: _location,
            notes: _notes
        }));
        addToEntityProducts(msg.sender, _productId);
        emit ProductReceived(_productId, msg.sender, block.timestamp);
    }

    // Retailer marks product as sold
    function markProductAsSold(
        uint256 _productId,
        string memory _customerInfo,
        string memory _notes
    ) public override onlyRetailer {
        ProductLibrary.Product storage product = products[_productId];
        require(product.exists, "Product does not exist");
        require(product.currentHolder == msg.sender, "Only current holder can mark as sold");
        require(product.currentStatus != ProductLibrary.Status.Sold, "Product already sold");
        
        // Update status to Sold
        product.currentStatus = ProductLibrary.Status.Sold;
        
        // Add journey log
        product.journey.push(ProductLibrary.JourneyLog({
            action: ProductLibrary.ActionType.Sold,
            actor: msg.sender,
            actorName: entityNames[msg.sender],
            timestamp: block.timestamp,
            location: _customerInfo,
            notes: _notes
        }));
        
        addToEntityProducts(msg.sender, _productId);
        
        emit ProductSold(_productId, msg.sender, block.timestamp);
    }


    // Helper: Convert bytes32 to hex string
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

    // View functions remain the same
    function getProductInfo(uint256 _productId) public view override returns (
        uint256, string memory, string memory, address, string memory, 
        string memory,string memory, string memory, bool, uint256, string memory, bool
    ) {
        require(products[_productId].exists, "Product does not exist");
        ProductLibrary.Product storage p = products[_productId];
        return (
            p.id, p.name, p.description, p.producer, entityNames[p.producer],
            p.qrCodeHash, p.totalQuantity,
            ProductLibrary.statusToString(p.currentStatus), p.fullyDelivered, p.producedTimestamp,
            p.ipfsHash, p.archived
        );
    }

    function getJourneyLogCount(uint256 _productId) public view override returns (uint256) {
        require(products[_productId].exists, "Product does not exist");
        return products[_productId].journey.length;
    }

    function getJourneyLog(uint256 _productId, uint256 _index) public view override returns (
        string memory, address, string memory, uint256, string memory, string memory
    ) {
        require(products[_productId].exists, "Product does not exist");
        require(_index < products[_productId].journey.length, "Index out of bounds");
        ProductLibrary.JourneyLog memory log = products[_productId].journey[_index];
        return (
            ProductLibrary.actionToString(log.action),
            log.actor, log.actorName, log.timestamp, log.location, log.notes
        );
    }

    function getAllJourneyLogs(uint256 _productId) public view override returns (
        string[] memory, string[] memory, address[] memory, 
        uint256[] memory, string[] memory, string[] memory
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

    function getCurrentHolder(uint256 _productId) public view returns (address) {
        require(products[_productId].exists, "Product does not exist");
        return products[_productId].currentHolder;
    }

    function addToEntityProducts(address _entity, uint256 _productId) private {
        uint256[] storage prods = entityProducts[_entity];
        
        // Add to beginning of array
        if (prods.length >= MAX_RECENT_PRODUCTS) {
            // Shift all elements and replace last one
            for (uint256 i = prods.length - 1; i > 0; i--) {
                prods[i] = prods[i - 1];
            }
            prods[0] = _productId;
        } else {
            // Add new product at the beginning
            // First, make space
            prods.push(0);
            // Shift everything right
            for (uint256 i = prods.length - 1; i > 0; i--) {
                prods[i] = prods[i - 1];
            }
            prods[0] = _productId;
        }
    }

    function getRecentProducts(address _entity) public view override returns (uint256[] memory) {
        return entityProducts[_entity];
    }

    function batchArchiveProducts(uint256[] memory _productIds, string memory _ipfsHash) public override {
        for (uint256 i = 0; i < _productIds.length; i++) {
            require(products[_productIds[i]].exists, "Product does not exist");
            require(products[_productIds[i]].currentStatus == ProductLibrary.Status.Sold || 
                    products[_productIds[i]].currentStatus == ProductLibrary.Status.Delivered, 
                    "Product not in final state");
            
            products[_productIds[i]].ipfsHash = _ipfsHash;
        }
        
        emit ProductsBatchArchived(_productIds, _ipfsHash);
    }

    function archiveProduct(uint256 _productId, string memory _ipfsHash) public onlyOwner {
    require(products[_productId].exists, "Product does not exist");
    require(products[_productId].currentStatus == ProductLibrary.Status.Sold || 
            products[_productId].currentStatus == ProductLibrary.Status.Delivered, 
            "Product not in final state");
    
    // Set archive flag and IPFS hash
    products[_productId].archived = true;
    products[_productId].ipfsHash = _ipfsHash;
    
    // Clear detailed data (optional, but recommended)
    delete products[_productId].journey;
    products[_productId].name = "";
    products[_productId].description = "";
    
    emit ProductArchived(_productId, _ipfsHash);
}


}
