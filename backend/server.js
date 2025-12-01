const express = require('express');
const { ethers } = require('ethers');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to blockchain
const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);

// Contract ABI 
const contractABI = [
  "function getQRCodeHash(uint256 _productId) view returns (string)",
  "function getProductInfo(uint256 _productId) view returns (uint256, string, string, address, string, string, string, string, bool, uint256, string, bool)",
  "function getJourneyLogCount(uint256 _productId) view returns (uint256)",
  "function getJourneyLog(uint256 _productId, uint256 _index) view returns (string, address, string, uint256, string, string)"
];

const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  contractABI,
  provider
);

// Helper: Get data from IPFS
async function getIPFSData(ipfsHash) {
  try {
    const response = await axios.get(`http://localhost:8080/ipfs/${ipfsHash}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw new Error('Failed to retrieve product data from IPFS');
  }
}

// GET /product/:productId - Get product info (chain + IPFS)
app.get('/product/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    
    // Get product info from chain
    const info = await contract.getProductInfo(productId);
    
    // Extract fields
    const product = {
      id: Number(info[0]),
      name: info[1],
      description: info[2],
      producer: info[3],
      qrCodeHash: info[4],
      totalQuantity: info[6],
      status: info[7],
      fullyDelivered: info[8],
      producedTimestamp: Number(info[9]),
      ipfsHash: info[10],
      archived: info[11]
    };
    
    // If archived, get journey from IPFS
    if (product.archived && product.ipfsHash) {
      try {
        const ipfsData = await getIPFSData(product.ipfsHash);
        product.journey = ipfsData.journey;
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    } else {
      // Get journey from chain
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
          date: new Date(Number(timestamp) * 1000).toLocaleString(),
          notes
        });
      }
      
      product.journey = journey;
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /journey/:qrHash - Get product journey by QR code 
app.get('/journey/:qrHash', async (req, res) => {
  try {
    const qrHash = req.params.qrHash;
    
    // Find product by QR hash 
    let productId = null;
    for (let i = 1; i <= 1000000; i++) {
      try {
        const hash = await contract.getQRCodeHash(i);
        if (hash.toLowerCase() === qrHash.toLowerCase()) {
          productId = i;
          break;
        }
      } catch (e) {
        break; // No more products
      }
    }
    
    if (!productId) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get product info
    const info = await contract.getProductInfo(productId);
    
    // Extract fields
    const product = {
      id: Number(info[0]),
      name: info[1],
      status: info[7],
      ipfsHash: info[10],
      archived: info[11]
    };
    
    // If archived, get journey from IPFS
    if (product.archived && product.ipfsHash) {
      try {
        const ipfsData = await getIPFSData(product.ipfsHash);
        product.journey = ipfsData.journey;
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    } else {
      // Get journey from chain
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
          date: new Date(Number(timestamp) * 1000).toLocaleString(),
          notes
        });
      }
      
      product.journey = journey;
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Backend running on http://localhost:${PORT}`);
  console.log(`📊 Try: http://localhost:${PORT}/product/<PRODUCT_ID>`);
  console.log(`📊 Try: http://localhost:${PORT}/journey/<QR_HASH>\n`);
});
