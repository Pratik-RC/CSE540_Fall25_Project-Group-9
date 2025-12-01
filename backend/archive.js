const axios = require('axios');
const FormData = require('form-data');
const { ethers } = require('ethers');
require('dotenv').config();

// Connect to blockchain
const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);

// Contract ABI 
const contractABI = [
  "function getRecentProducts(address _owner) view returns (uint256[])",
  "function getProductInfo(uint256 _productId) view returns (uint256, string, string, address, string, string, string, string, bool, uint256, string, bool)",
  "function getJourneyLogCount(uint256 _productId) view returns (uint256)",
  "function getJourneyLog(uint256 _productId, uint256 _index) view returns (string, address, string, uint256, string, string)",
  "function archiveProduct(uint256 _productId, string _ipfsHash) returns (bool)"
];

const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  contractABI,
  provider
);

// Helper: Upload data to IPFS (Revised for Robustness)
async function uploadToIPFS(data) {
  const formData = new FormData();
  
  // Convert JSON object to a Buffer
  const jsonString = JSON.stringify(data);
  const buffer = Buffer.from(jsonString, 'utf-8');
  
  // Append the Buffer data with required metadata for the IPFS API
  formData.append('file', buffer, { 
    filename: 'product.json', // Required filename
    contentType: 'application/json',
    knownLength: buffer.length // CRITICAL for reliable form-data transmission
  });

  try {
    const response = await axios.post(
      'http://localhost:5001/api/v0/add', 
      formData, 
      {
        headers: formData.getHeaders(),
        timeout: 10000 // Set a timeout for reliability
      }
    );
    
    // IPFS API returns { Name: "product.json", Hash: "QmW...", Size: "..." }
    return response.data.Hash; 
    
  } catch (error) {
    // Log the detailed error message from the IPFS API itself
    console.error('IPFS API Upload FAILED.');
    console.error('Error Details:', error.response?.data?.Message || error.response?.data || error.message);
    
    // Re-throw a clear error to halt the main function gracefully
    throw new Error('IPFS upload failed. See details above.');
  }
}

// Helper: Get product journey from chain
async function getProductJourney(productId) {
  const count = Number(await contract.getJourneyLogCount(productId));
  const journey = [];
  
  for (let i = 0; i < count; i++) {
    const [action, actor, actorName, timestamp, location, notes] = 
      await contract.getJourneyLog(productId, i);
    
    journey.push({
      step: i + 1,
      action,
      actor: actor,
      actorName,
      location,
      date: new Date(Number(timestamp) * 1000).toLocaleString(),
      notes
    });
  }
  
  return journey;
}

// Main function to archive all sold products
async function main() {
  try {
    // FIX 1: Derive the owner address directly from the OWNER_PRIVATE_KEY
    if (!process.env.OWNER_PRIVATE_KEY) {
        throw new Error("OWNER_PRIVATE_KEY is not set in environment variables.");
    }
    
    const owner = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY).address;
    const productIds = await contract.getRecentProducts(owner);
    console.log(`Found ${productIds.length} products for owner:`, owner);

    const soldProducts = [];

    for (const productId of productIds) {
      const info = await contract.getProductInfo(productId);
      const status = info[7].replace(/\s+/g, '').toLowerCase();

      if (status === 'sold') {
        soldProducts.push(Number(productId));
      }
    }

    console.log(`Found ${soldProducts.length} sold products to archive:`, soldProducts);

    // Archive each sold product
    for (const productId of soldProducts) {
      console.log(`Archiving product: ${productId}`);

      // Get product info
      const info = await contract.getProductInfo(productId);
      const journey = await getProductJourney(productId);

      // Prepare product data
      const productData = {
        id: Number(info[0]),
        name: info[1],
        description: info[2],
        producer: info[3],
        producerName: info[4],
        totalQty: info[6],
        status: info[7],
        ipfsHash: info[10],
        archived: info[11],
        createdDate: new Date(Number(info[9]) * 1000).toLocaleString(),
        journey
      };

      // Upload to IPFS (using the fixed function)
      console.log('Uploading to IPFS...');
      const ipfsHash = await uploadToIPFS(productData);
      console.log('Uploaded to IPFS:', ipfsHash);

      // Archive product on chain
      // FIX 2: Use OWNER_PRIVATE_KEY for the Wallet/Signer
      const wallet = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);
      const contractWithSigner = contract.connect(wallet);
      const tx = await contractWithSigner.archiveProduct(productId, ipfsHash);
      
      console.log(`Sending transaction ${tx.hash}...`);
      await tx.wait();

      console.log(`Product ${productId} archived successfully`);
    }
  } catch (error) {
    // This catches errors from IPFS and Transaction failures
    console.error('Final Script Error:', error.message);
  }
}

main();