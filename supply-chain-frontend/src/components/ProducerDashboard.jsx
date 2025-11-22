import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { QRCodeCanvas } from 'qrcode.react';
import QrScanner from 'qr-scanner';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/contract';
import './ProducerDashboard.css';

function ProducerDashboard({ account, signer }) {
  const [activeView, setActiveView] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Create Product Form State
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  
  // Created Product State
  const [createdProduct, setCreatedProduct] = useState(null);
  const [qrHash, setQrHash] = useState('');
  
  // Recent Products State
  const [recentProducts, setRecentProducts] = useState([]);
  const [expandedProduct, setExpandedProduct] = useState(null);
  
  // Search Product State
  const [searchHash, setSearchHash] = useState('');
  const [searchedProduct, setSearchedProduct] = useState(null);
  
  // Ship Product State
  const [shipSearchHash, setShipSearchHash] = useState('');
  const [shipProduct, setShipProduct] = useState(null);
  const [shipToRole, setShipToRole] = useState('');
  const [shipDestination, setShipDestination] = useState('');
  const [shipNotes, setShipNotes] = useState('');
  const [shipError, setShipError] = useState('');
  const [shipLoading, setShipLoading] = useState(false);

  // Fetch recent products
  // Fetch recent products
const fetchRecentProducts = async () => {
  setLoading(true);
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    const productIds = await contract.getRecentProducts(account);
    
    const products = [];
    const seenIds = new Set(); 
    
    for (let i = 0; i < productIds.length; i++) {
      const id = Number(productIds[i]);
      if (id === 0) continue;
      
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      
      const info = await contract.getProductInfo(id);
      products.push({
        id: id,
        name: info[1],
        description: info[2],
        qrHash: info[5],
        totalQty: info[6],
        status: info[7].replace(/\s+/g, '').toLowerCase(), // Also normalize here
        timestamp: Number(info[9])
      });
    }
    
    setRecentProducts(products);
  } catch (error) {
    console.error('Error fetching recent products:', error);
  } finally {
    setLoading(false);
  }
};


  // Fetch product journey
  const fetchProductJourney = async (productId) => {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const logs = await contract.getAllJourneyLogs(productId);
      
      const journey = [];
      for (let i = 0; i < logs[0].length; i++) {
        journey.push({
          action: logs[0][i],
          actorName: logs[1][i],
          actor: logs[2][i],
          timestamp: Number(logs[3][i]),
          location: logs[4][i],
          notes: logs[5][i]
        });
      }
      
      return journey;
    } catch (error) {
      console.error('Error fetching journey:', error);
      return [];
    }
  };

  // Search by QR hash
  const handleSearchByHash = async () => {
    if (!searchHash) return;
    
    setLoading(true);
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const productId = await contract.getProductIdByQRHash(searchHash);
      const id = Number(productId);
      
      const info = await contract.getProductInfo(id);
      const journey = await fetchProductJourney(id);
     console.log('Full info array:', info);
      setSearchedProduct({
        id: id,
        name: info[1],
        description: info[2],
        qrHash: info[5],
        totalQty: info[6],
        status: info[7],
        journey: journey
      });
      
    } catch (error) {
      console.error('Error searching product:', error);
      alert('Product not found or invalid QR code');
    } finally {
      setLoading(false);
    }
  };

  // Handle QR image upload
  const handleQRImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const result = await QrScanner.scanImage(file);
      setSearchHash(result);
      alert('QR Code detected! Click "Search" to fetch product details.');
    } catch (error) {
      console.error('Error scanning QR image:', error);
      alert('Could not read QR code from image');
    }
    finally {
      e.target.value = null; // Reset file input
    }
  };

  // Load recent products when view changes
  useEffect(() => {
    if (activeView === 'viewProducts') {
      fetchRecentProducts();
    }
  }, [activeView]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const tx = await contract.createProduct(
        productName,
        description,
        location,
        quantity
      );
      
      const receipt = await tx.wait();
      
      let productId;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === 'ProductCreated') {
            productId = parsed.args.productId ?? parsed.args[0];
            break;
          }
        } catch (e) {}
      }
      
      const pid = typeof productId.toNumber === 'function' ? productId.toNumber() : Number(productId);
      const hash = await contract.getQRCodeHash(pid);
      
      setCreatedProduct({
        id: pid,
        name: productName,
        quantity: quantity
      });
      setQrHash(hash);
      
      setProductName('');
      setDescription('');
      setLocation('');
      setQuantity('');
      
      alert(`Product created successfully! ID: ${pid}`);
      
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShipProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShipError('');
    
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const tx = await contract.shipProduct(
        shipProduct.id,
        shipToRole,
        shipDestination,
        shipNotes || ''
      );
      
      await tx.wait();
      
      alert('Product shipped successfully!');
      
      // Clear form
      setShipProduct(null);
      setShipToRole('');
      setShipDestination('');
      setShipNotes('');
      setShipSearchHash('');
      
    } catch (error) {
      console.error('Error shipping product:', error);
      
      if (error.message.includes('Only current holder can ship')) {
        setShipError('You currently do not have the product or permission to do this');
      } else if (error.message.includes('Product already in transit')) {
        setShipError('Product is already in transit');
      } else if (error.message.includes('Product already fully delivered')) {
        setShipError('Product has already been fully delivered');
      } else {
        setShipError('You currently do not have the product or permission to do this');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-code-canvas');
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `product-${createdProduct.id}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const renderLeftPanel = () => (
    <div className="left-panel">
      <header className="dashboard-header">
        <h1>🌾 Producer Dashboard</h1>
        <p className="account-info">{account.substring(0, 6)}...{account.substring(38)}</p>
      </header>
      
      <div className="action-buttons">
        <button 
          className={`action-btn ${activeView === 'create' ? 'active' : ''}`}
          onClick={() => setActiveView('create')}
        >
          ➕ Create Product
        </button>
        
        <button 
          className={`action-btn ${activeView === 'viewProducts' ? 'active' : ''}`}
          onClick={() => setActiveView('viewProducts')}
        >
          📦 Recent Products
        </button>
        
        <button 
          className={`action-btn ${activeView === 'search' ? 'active' : ''}`}
          onClick={() => setActiveView('search')}
        >
          🔍 Search by QR
        </button>
        
        <button 
          className={`action-btn ${activeView === 'ship' ? 'active' : ''}`}
          onClick={() => setActiveView('ship')}
        >
          🚚 Ship Product
        </button>
      </div>
    </div>
  );

  const renderRightPanel = () => {
    if (!activeView) {
      return (
        <div className="right-panel empty">
          <div className="empty-state">
            <h2>Welcome, Producer!</h2>
            <p>Select an action from the left panel to get started</p>
          </div>
        </div>
      );
    }

    if (activeView === 'create') {
      return (
        <div className="right-panel">
          <h2>Create New Product</h2>
          
          <form onSubmit={handleCreateProduct} className="product-form">
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Colombian Coffee Beans"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Premium Arabica from high altitude farms"
                rows="3"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Location *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Medellín, Colombia"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 10lb, 1kg, 100 units"
                min="1"
                required
              />
            </div>
            
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </form>
          
          {createdProduct && qrHash && (
            <div className="qr-section">
              <h3>✅ Product Created Successfully!</h3>
              <div className="product-details">
                <p><strong>Product ID:</strong> {createdProduct.id}</p>
                <p><strong>Name:</strong> {createdProduct.name}</p>
                <p><strong>Quantity:</strong> {createdProduct.quantity}</p>
              </div>
              
              <div className="qr-container">
                <h4>Product QR Code</h4>
                <div className="qr-code-wrapper">
                  <QRCodeCanvas
                    id="qr-code-canvas"
                    value={qrHash}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="qr-hash">Hash: {qrHash.substring(0, 20)}...</p>
                <button onClick={downloadQRCode} className="download-btn">
                  ⬇️ Download QR Code
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeView === 'viewProducts') {
      return (
        <div className="right-panel">
          <h2>Recent Products</h2>
          
          {loading && <p>Loading products...</p>}
          
          {!loading && recentProducts.length === 0 && (
            <p className="coming-soon">No products found. Create your first product!</p>
          )}
          
          {!loading && recentProducts.length > 0 && (
            <div className="product-list">
              {recentProducts.map((product) => (
                <div key={product.id} className="product-card">
                  <div 
                    className="product-header"
                    onClick={async () => {
                      if (expandedProduct === product.id) {
                        setExpandedProduct(null);
                      } else {
                        const journey = await fetchProductJourney(product.id);
                        product.journey = journey;
                        setExpandedProduct(product.id);
                      }
                    }}
                  >
                    <div>
                      <h3>{product.name}</h3>
                      <p className="product-id">ID: {product.id}</p>
                    </div>
                    <div className="product-status">
                      <span className={`status-badge ${product.status.toLowerCase()}`}>
                        {product.status}
                      </span>
                      <span className="expand-icon">
                        {expandedProduct === product.id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                  
                  {expandedProduct === product.id && (
                    <div className="product-details-expanded">
                      <p><strong>Description:</strong> {product.description}</p>
                      <p><strong>Quantity:</strong> {product.totalQty}</p>
                      <p><strong>QR Hash:</strong> {product.qrHash.substring(0, 30)}...</p>
                      
                      <h4>Journey History</h4>
                      <div className="journey-timeline">
                        {product.journey && product.journey.map((log, idx) => (
                          <div key={idx} className="journey-entry">
                            <div className="journey-bullet">●</div>
                            <div className="journey-content">
                              <p className="journey-action">{log.action}</p>
                              <p className="journey-actor">{log.actorName}</p>
                              <p className="journey-location">{log.location}</p>
                              <p className="journey-notes">{log.notes}</p>
                              <p className="journey-time">
                                {new Date(log.timestamp * 1000).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeView === 'search') {
      return (
        <div className="right-panel">
          <h2>Search Product by QR Code</h2>
          
          <div className="search-section">
            <div className="search-methods">
              <div className="method-card">
                <h3>Upload QR Image</h3>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQRImageUpload}
                  className="file-input"
                />
              </div>
              
              <div className="method-card">
                <h3>Enter QR Hash Manually</h3>
                <input
                  type="text"
                  value={searchHash}
                  onChange={(e) => setSearchHash(e.target.value)}
                  placeholder="Paste QR hash here..."
                  className="hash-input"
                />
                <button 
                  onClick={handleSearchByHash}
                  className="search-btn"
                  disabled={loading || !searchHash}
                >
                  {loading ? 'Searching...' : 'Search Product'}
                </button>
              </div>
            </div>
            
            {searchedProduct && (
              <div className="search-result">
                <h3>✅ Product Found</h3>
                <div className="product-card">
                  <h4>{searchedProduct.name}</h4>
                  <p><strong>ID:</strong> {searchedProduct.id}</p>
                  <p><strong>Description:</strong> {searchedProduct.description}</p>
                  <p><strong>Status:</strong> <span className={`status-badge ${searchedProduct.status.toLowerCase()}`}>{searchedProduct.status}</span></p>
                  <p><strong>Quantity:</strong> {searchedProduct.totalQty}</p>
                  
                  <h4>Journey History</h4>
                  <div className="journey-timeline">
                    {searchedProduct.journey.map((log, idx) => (
                      <div key={idx} className="journey-entry">
                        <div className="journey-bullet">●</div>
                        <div className="journey-content">
                          <p className="journey-action">{log.action}</p>
                          <p className="journey-actor">{log.actorName}</p>
                          <p className="journey-location">{log.location}</p>
                          <p className="journey-notes">{log.notes}</p>
                          <p className="journey-time">
                            {new Date(log.timestamp * 1000).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeView === 'ship') {
      return (
        <div className="right-panel">
          <h2>Ship Product</h2>
          
          <div className="ship-section">
            <div className="search-methods">
              <div className="method-card">
                <h3>Upload Product QR Code</h3>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    setShipLoading(true);
                    setShipError('');
                    
                    try {
                      const result = await QrScanner.scanImage(file);
                      
                      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
                      const productId = await contract.getProductIdByQRHash(result);
                      
                      const id = Number(productId);
                      const info = await contract.getProductInfo(id);

                      setShipProduct({
                        id: id,
                        name: info[1],
                        description: info[2],
                        status: info[7].replace(/\s+/g, '').toLowerCase(),
                        qrHash: result
                      });
                    } catch (error) {
                      console.error('Error details:', error); 
                      setShipError('Could not read QR code or product not found');
                    } finally {
                      setShipLoading(false);
                      e.target.value = null; // Reset file input
                    }
}}
                  className="file-input"
                />
              </div>
              
              <div className="method-card">
                <h3>Or Enter QR Hash</h3>
                <input
                  type="text"
                  value={shipSearchHash}
                  onChange={(e) => setShipSearchHash(e.target.value)}
                  placeholder="Paste QR hash here..."
                  className="hash-input"
                />
                <button 
                  onClick={async () => {
                    if (!shipSearchHash) return;
                    
                    setShipLoading(true);
                    setShipError('');
                    
                    try {
                      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
                      const productId = await contract.getProductIdByQRHash(shipSearchHash);
                      const id = Number(productId);
                      
                      const info = await contract.getProductInfo(id);

                      setShipProduct({
                        id: id,
                        name: info[1],
                        description: info[2],
                        status: info[7].replace(/\s+/g, '').toLowerCase(),
                        qrHash: shipSearchHash
                      });
                      console.log('Product loaded successfully:', info[1]);
                    } catch (error) {
                      console.error('Error fetching product:', error);
                      setShipError('Product not found or invalid QR hash');
                    } finally {
                      setShipLoading(false);
                    }
                  }}
                  className="search-btn"
                  disabled={!shipSearchHash}
                >
                  Load Product
                </button>
              </div>
            </div>
            
            {shipLoading && (
              <div className="loading-message">
                Loading product...
              </div>
            )}
            
            {shipError && !shipProduct && (
              <div className="error-message">
                {shipError}
              </div>
            )}
            
            {shipProduct && (
              <div className="ship-form-container">
                <div className="product-info-box">
                  <h3>Product to Ship</h3>
                  <p><strong>ID:</strong> {shipProduct.id}</p>
                  <p><strong>Name:</strong> {shipProduct.name}</p>
                  <p><strong>Status:</strong> <span className={`status-badge ${shipProduct.status.toLowerCase()}`}>{shipProduct.status}</span></p>
                </div>
                
                <form onSubmit={handleShipProduct} className="ship-form">
                  <div className="form-group">
                    <label>Ship To (Role) *</label>
                    <select
                      value={shipToRole}
                      onChange={(e) => setShipToRole(e.target.value)}
                      required
                    >
                      <option value="">Select destination role...</option>
                      <option value="certifier">Certifier</option>
                      <option value="distributor">Distributor</option>
                      <option value="retailer">Retailer</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Destination *</label>
                    <input
                      type="text"
                      value={shipDestination}
                      onChange={(e) => setShipDestination(e.target.value)}
                      placeholder="e.g., Quality Lab, Bogota"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      value={shipNotes}
                      onChange={(e) => setShipNotes(e.target.value)}
                      placeholder="Shipping notes (optional)"
                      rows="3"
                    />
                  </div>
                  
                  {shipError && (
                    <div className="error-message">
                      ❌ Illegal operation: {shipError}
                    </div>
                  )}
                  
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Shipping...' : '🚚 Ship Product'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="producer-dashboard">
      {renderLeftPanel()}
      {renderRightPanel()}
    </div>
  );
}

export default ProducerDashboard;
