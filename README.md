# Smart Contract Powered Premium Coffee Traceability System

This project demonstrates how **blockchain technology** can be used to create a **transparent and traceable coffee supply chain**. Using **smart contracts** written in **Solidity** and deployed on a local **Ethereum network** using **Hardhat**, this system tracks the journey of a coffee batch across different stakeholders:  
**Producer → Certifying Authority → Distributors → Retailer**  
Each step in the lifecycle is recorded on the blockchain and becomes immutable and verifiable, ensuring:

- **Transparency** — Every update is stored as an on-chain transaction
- **Traceability** — Anyone can trace the origin and path of a coffee batch
- **Tamper-proof records** — No participant can alter past data  
  The smart contract manages the various states of a coffee batch using an **enum-based lifecycle**, allowing only authorized functions to move a batch from one state to another. Users interact with the contract through scripts or **Hardhat** tasks to simulate real-world events (harvesting, processing, packaging, shipping, receiving, and purchase by consumer).  
  The goal of this project is to showcase how **blockchain technology** enhances supply chain accountability, prevents fraud, and builds consumer trust through verifiable product authenticity.  
  **Smart contracts** enforce **role-based access control** so only authorized entities can perform actions such as:
- **Creating a product batch**
- **Testing and certifying quality**
- **Shipping or receiving goods**

Each product is assigned a **QR code hash** generated on-chain, which can be scanned later to verify its complete journey.

#### Dependencies / Setup Instructions

**Installation Prerequisites**:

- Node.js
- Hardhat (installed through the project dependencies)

**Use The following instructions to run and test smart contract**

1. git clone https://github.com/Pratik-RC/CSE540_Fall25_Project-Group-9.git
2. cd CSE540_Fall25_Project-Group-9
3. npm install --legacy-peer-deps
4. npm install @nomicfoundation/hardhat-toolbox
5. npx hardhat compile
6. Run the node locally : npx hardhat node
7. Keep the node running and open a new terminal to deploy the contract
8. npx hardhat run scripts/deploy.js --network localhost
9. Run the following command to test the chain with a sample product
10. npx hardhat run scripts/test_contract.js --network localhost

**IPFS Local Setup**
1. Download the IPFS executable zip from : https://dist.ipfs.tech/kubo/v0.25.0/kubo_v0.25.0_windows-amd64.zip
2. Extract the zip 
3. Add the ipfs executable to path variables ( for windows : cp ipfs.exe /c/Windows/System32/)
4. open a terminal and run ipfs init (first time only)
5. run ipfs daemon to start the local IPFS server

**Backend setup Instructions**
1. To run the backend, cd into "supplychainprovenancesystem / backend"
2. run npm init (when running first time)
3. run npm start to start the backend server.

** Metamask Wallet Setup instructions ** 
1. Add metamask wallet chrom extension to your browser and create an account / login if u already did
2. Open the metamask extension in your browser window -> Accounts -> Add wallet -> Import An account -> Paste the private key of the wallet there
3. This will link the respective wallet to the metamask extension. Repeat the step 2 from here on whenever we need to add a new entity to this chain.
4. We will be working with wallets created by hardhat at node creation for this project.
5. The first wallet is hardcoded to be the owner of this chain, so use the first private key listed when running npx hardhat node and add it to metamask. (We will refer this as contract owner from here on)
6. Add the following accounts to your metamask wallet for testing purposes :
7. Contract owner, pvt key : 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
8. Producer, pvt key : 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
9. Certifier, pvt key : 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
10. Distributor, pvt key : 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
11. Retailer, pvt key : 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a

**User-Interface instructions**
1. cd into the supply-chain-frontend directory
2. if doing for first time, do an npm install to get all necessary packages
3. Copy the contract address from deploy script and paste it in src/utils/contract.js
4. do an npm start and u should have the UI launched.
5. Now you can switch through different accounts in metamask and see the corresponding UI pages loaded.
6. If your wallet is currently not role provisioned, you shall be navigated to role request page once commissioned.
7. Ability to view product history without role is yet to be implemented.

#### High-Level Component Design

**SupplyChain.sol**  
Mentions the contract signatures

**SupplyChainProvenance.sol**

- Implements full supply chain provenance logic with enforced enum-based state transitions and role checks
- Generates a unique on-chain QR/trace hash per product batch (e.g., keccak256 of batch metadata + nonce) for verifiable scanning
- Emits events and records each lifecycle change (Created → Tested → Shipped → Received) to enable off-chain indexing and audit trails

**RoleManagement.sol**

- Only contract owner can assign: Producer,Certifier,Distributor, Retailer
- Adds role-based restrictions (e.g., only certifier can test)

**ProductLibrary.sol**

Defines product structure:

- Product metadata
- Status (Produced, Tested, In Transit, Delivered)
- Journey logs (history trail)

#### Future Enhancements
- Extend to a multi-product batching system with batch IDs, aggregated tracking, and batch-level state transitions
