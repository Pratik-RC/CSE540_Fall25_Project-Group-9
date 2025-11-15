// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library ProductLibrary {
    
    enum Status {
        Produced,
        Tested,
        InTransit,
        InStore,
        Delivered
    }
    
    enum ActionType {
        Created,
        Tested,
        Shipped,
        Received,
        Delivered
    }
    
    struct JourneyLog {
        ActionType action;
        address actor;
        string actorName;
        uint256 timestamp;
        string location;
        string notes;
    }
    
    struct Product {
        uint256 id;
        string name;
        string description;
        address producer;
        string qrCodeHash;
        uint256 totalQuantity;
        uint256 quantityInTransit;
        uint256 quantityDelivered;
        Status currentStatus;
        uint256 producedTimestamp;
        bool exists;
        bool fullyDelivered;
        address currentHolder;
        string destinationRole;  // "certifier", "distributor", "retailer"
        JourneyLog[] journey;
    }

    
    function statusToString(Status status) internal pure returns (string memory) {
        if (status == Status.Produced) return "Produced";
        if (status == Status.Tested) return "Tested";
        if (status == Status.InTransit) return "In Transit";
        if (status == Status.InStore) return "In Store";
        if (status == Status.Delivered) return "Delivered";
        return "Unknown";
    }
    
    function actionToString(ActionType action) internal pure returns (string memory) {
        if (action == ActionType.Created) return "Product Created";
        if (action == ActionType.Tested) return "Quality Tested";
        if (action == ActionType.Shipped) return "Shipped";
        if (action == ActionType.Received) return "Received";
        if (action == ActionType.Delivered) return "Delivered";
        return "Unknown";
    }
}
