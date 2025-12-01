const { ethers } = require('ethers');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

async function main() {
  console.log("Starting product archiving process...\n");
  
  // Connect to blockchain
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  
  // Contract setup
  const contractABI = [
    "function getProductInfo(uint256 _productId) view returns (uint256, string, string, address, string, string, string, string, bool, uint256, string, bool)",
    "function getJourneyLogCount(uint256 _productId) view returns (uint256)",
    "function getJourneyLog(uint256 _productId, uint256 _index) view returns (string, address, string, uint256, string, string)",
    "function batchArchiveProducts(uint256[] _productIds, string _ipfsHash) public"
  ];
  
  // Make sure CONTRACT_ADDRESS is set in .env
  if (!process.env.CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS not set in .env file");
  }
  
  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    contractABI,
    provider
  );
  
  // Get signer for transaction
  const wallet = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);
  const contractWithSigner = contract.connect(wallet);
  
  // Find all products in sold/delivered state
  const productsToArchive = [];
  let productId = 1;
  
  while (true) {
    try {
      const info = await contract.getProductInfo(productId);
      const status = info[7]; // status is at index 7
      const archived = info[11]; // archived is at index 11
      
      // Check if product is in final state and not already archived
      if ((status === "Sold" || status === "Delivered") && !archived) {
        productsToArchive.push(productId);
      }
      
      productId++;
    } catch (e) {
      // Product doesn't exist or contract error
      break;
    }
  }
  
  if (productsToArchive.length === 0) {
    console.log("No products to archive.");
    return;
  }
  
  console.log(`Found ${productsToArchive.length} products to archive:`, productsToArchive);
  
  // Collect product data
  const batchData = [];
  for (const productId of productsToArchive) {
    const info = await contract.getProductInfo(productId);
    const count = Number(await contract.getJourneyLogCount(productId));
    const journey = [];
    
    for (let i = 0; i < count; i++) {
      const [action, actor, actorName, timestamp, location, notes] = 
        await contract.getJourneyLog(productId, i);
      
      journey.push({
        step: i + 1,
        action,
        actorName,
        location,
        timestamp: Number(timestamp),
        notes
      });
    }
    
    batchData.push({
      id: Number(info[0]),
      name: info[1],
      description: info[2],
      producer: info[3],
      qrCodeHash: info[4],
      totalQuantity: info[6],
      status: info[7],
      fullyDelivered: info[8],
      producedTimestamp: Number(info[9]),
      journey
    });
  }
  
  // Upload to IPFS
  console.log("Uploading to IPFS...");
  const ipfsResponse = await axios.post('http://localhost:5001/api/v0/add', 
    Buffer.from(JSON.stringify(batchData)),
    { headers: { 'Content-Type': 'application/octet-stream' } }
  );
  
  const ipfsHash = ipfsResponse.data.Hash;
  console.log(`IPFS hash: ${ipfsHash}`);
  
  // Update contract
  console.log("Archiving products on-chain...");
  const tx = await contractWithSigner.batchArchiveProducts(productsToArchive, ipfsHash);
  await tx.wait();
  
  console.log("Archiving complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
