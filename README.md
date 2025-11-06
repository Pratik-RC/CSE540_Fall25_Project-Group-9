Smart Contract Powered Coffee Traceability System : 
This project demonstrates how blockchain technology can be used to create a transparent and traceable coffee supply chain. Using smart contracts written in Solidity and deployed on a local Ethereum network using Hardhat, this system tracks the journey of a coffee batch across different stakeholders:
Producer → Certifying Authority → Distributors → Retailer
Each step in the lifecycle is recorded on the blockchain and becomes immutable and verifiable, ensuring:
- Transparency — Every update is stored as an on-chain transaction
- Traceability — Anyone can trace the origin and path of a coffee batch
- Tamper-proof records — No participant can alter past data
The smart contract manages the various states of a coffee batch using an enum-based lifecycle, allowing only authorized functions to move a batch from one state to another. Users interact with the contract through scripts or Hardhat tasks to simulate real-world events (harvesting, processing, packaging, shipping, receiving, and purchase by consumer).
The goal of this project is to showcase how blockchain enhances supply chain accountability, prevents fraud, and builds consumer trust through verifiable product authenticity.
Smart contracts enforce role-based access control so only authorized entities can perform actions such as:
- Creating a product batch
- Testing and certifying quality
- Shipping or receiving goods

Each product is assigned a QR code hash generated on-chain, which can be scanned later to verify its complete journey.

Dependencies / Setup Instructions
Install:
- Node.js 
- Hardhat (installed through the project dependencies)
Product creation (with ID & QR hash)
Each step of the product journey

Contract Signatures : Mentioned in SupplyChain.sol:

High-Level Component Design

SupplyChainProvenance.sol
Implements the full supply chain logic
Generates a unique QR/trace hash on-chain
Logs each event (Created → Tested → Shipped → Received)

RoleManagement.sol
Only contract owner can assign:
Producer
Certifier
Distributor
Retailer
Adds role-based restrictions (e.g., only certifier can test)

ProductLibrary.sol
Defines product structure:
Product metadata
Status (Produced, Tested, In Transit, Delivered)
Journey logs (history trail)

Future Enhancements :
Add frontend UI to scan QR + fetch on-chain history
IPFS integration for certificates / test reports
Extend to multi-product batching system

Use The following instructions to run and test smart contract

git clone https://github.com/Pratik-RC/CSE540_Fall25_Project-Group-9.git

cd CSE540_Fall25_Project-Group-9

npm install --legacy-peer-deps

npx hardhat compile

Run the node locally : npx hardhat node

Keep the node running and open a new terminal to deploy the contract

npx hardhat run scripts/deploy.js --network localhost

Run the following command to test the chain with a sample product

npx hardhat run scripts/test_contract.js --network localhost
