const express = require('express');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to blockchain
const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);

// Contract ABI (just the functions we need)
const contractABI = [
  "function getQRCodeHash(uint256 _productId) view returns (string)",
  "function getProductInfo(uint256 _productId) view returns (uint256, string, string, address, string, string, uint256, uint256, uint256, string, bool, uint256)",
  "function getJourneyLogCount(uint256 _productId) view returns (uint256)",
  "function getJourneyLog(uint256 _productId, uint256 _index) view returns (string, address, string, uint256, string, string)"
];

const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  contractABI,
  provider
);

// GET /journey/:qrHash - Get product journey by QR code
app.get('/journey/:qrHash', async (req, res) => {
  try {
    const qrHash = req.params.qrHash;
    
    // Find product by QR hash (check first 100 products)
    let productId = null;
    for (let i = 1; i <= 100; i++) {
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
    
    // Get journey
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
    
    res.json({
      productId: Number(info[0]),
      name: info[1],
      status: info[9],
      journey
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Backend running on http://localhost:${PORT}`);
  console.log(`📊 Try: http://localhost:${PORT}/journey/<QR_HASH>\n`);
});
