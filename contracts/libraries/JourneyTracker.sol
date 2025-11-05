// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library JourneyTracker {
    
    enum EventType {
        Created,
        Tested,
        ShippedFromCertifier,
        ReceivedByDistributor,
        ShippedFromDistributor,
        ReceivedByRetailer,
        InStore
    }
    
    struct JourneyEvent {
        EventType eventType;
        address actor;
        string actorName;
        string location;
        uint256 timestamp;
        string notes;
    }
    
    function eventTypeToString(EventType eventType) internal pure returns (string memory) {
        if (eventType == EventType.Created) return "Product Created";
        if (eventType == EventType.Tested) return "Quality Tested";
        if (eventType == EventType.ShippedFromCertifier) return "Shipped from Testing Facility";
        if (eventType == EventType.ReceivedByDistributor) return "Received by Distributor";
        if (eventType == EventType.ShippedFromDistributor) return "Shipped to Retailer";
        if (eventType == EventType.ReceivedByRetailer) return "Received by Retailer";
        if (eventType == EventType.InStore) return "Available in Store";
        return "Unknown";
    }
}
