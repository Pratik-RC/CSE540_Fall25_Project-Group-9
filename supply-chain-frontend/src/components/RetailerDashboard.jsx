import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import QrScanner from 'qr-scanner';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/contract';
import './RetailerDashboard.css';

function RetailerDashboard({ account, signer }) {
  const [activeView, setActiveView] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Recent Products State
  const [recentProducts, setRecentProducts] = useState([]);
  const [expandedProduct, setExpandedProduct] = useState(null);
  
  // Search Product State
  const [searchHash, setSearchHash] = useState('');
  const [searchedProduct, setSearchedProduct] = useState(null);
  
  // Manage Product State
  const [manageSearchHash, setManageSearchHash] = useState('');
  const [manageProduct, setManageProduct] = useState(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState('');
  
  // Receive Product State
  const [receiveLocation, setReceiveLocation] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  
  // Sold Product State
  const [customerInfo, setCustomerInfo] = useState('');
  const [saleNotes, setSaleNotes] = useState('');

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
          status: info[7].replace(/\s+/g, '').toLowerCase(),
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

  // Search by QR hash - uses backend journey service
  const handleSearchByHash = async () => {
    if (!searchHash) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/journey/${searchHash}`);
      
      if (!response.ok) {
        throw new Error('Product not found or invalid QR code');
      }
      
      const product = await response.json();
      setSearchedProduct(product);
    } catch (error) {
      console.error('Error searching product:', error);
      alert('Product not found or invalid QR code');
    } finally {
      setLoading(false);
    }
  };

  // Handle QR image upload for search
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
    } finally {
      e.target.value = null;
    }
  };

  // Load product for management
  const loadManageProduct = async (qrHash) => {
    setManageLoading(true);
    setManageError('');
    
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const productId = await contract.getProductIdByQRHash(qrHash);
      const id = Number(productId);
      
      const info = await contract.getProductInfo(id);
      const holder = await contract.getCurrentHolder(id);
      
      setManageProduct({
        id: id,
        name: info[1],
        description: info[2],
        status: info[7].replace(/\s+/g, '').toLowerCase(),
        rawStatus: info[7],
        currentHolder: holder,
        qrHash: qrHash
      });
    } catch (error) {
      console.error('Error loading product:', error);
      setManageError('Product not found or invalid QR hash');
    } finally {
      setManageLoading(false);
    }
  };

  // Receive product
  const handleReceiveProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setManageError('');
    
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const tx = await contract.receiveProduct(
        manageProduct.id,
        receiveLocation,
        receiveNotes || ''
      );
      
      await tx.wait();
      
      alert('Product received successfully! Now available in store.');
      
      // Reload product to show updated status
      await loadManageProduct(manageProduct.qrHash);
      
      // Clear form
      setReceiveLocation('');
      setReceiveNotes('');
      
    } catch (error) {
      console.error('Error receiving product:', error);
      
      if (error.message.includes('Product must be in transit')) {
        setManageError('Product is not in transit');
      } else if (error.message.includes("You don't have the required role")) {
        setManageError('This product is not destined for retailers');
      } else {
        setManageError('Failed to receive product. Check your permissions.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Mark product as sold
  const handleMarkAsSold = async (e) => {
    e.preventDefault();
    setLoading(true);
    setManageError('');
    
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const tx = await contract.markProductAsSold(
        manageProduct.id,
        customerInfo || 'Point of Sale',
        saleNotes || 'Product sold to customer'
      );
      
      await tx.wait();
      
      alert('Product marked as sold successfully!');
      
      // Clear form and product
      setManageProduct(null);
      setManageSearchHash('');
      setCustomerInfo('');
      setSaleNotes('');
      
    } catch (error) {
      console.error('Error marking as sold:', error);
      
      if (error.message.includes('Only current holder can mark as sold')) {
        setManageError('You are not the current holder of this product');
      } else if (error.message.includes('Product already sold')) {
        setManageError('This product has already been marked as sold');
      } else if (error.message.includes('Product must be delivered to retailer first')) {
        setManageError('Product must be delivered to your store before marking as sold');
      } else {
        setManageError('Failed to mark product as sold');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load recent products when view changes
  useEffect(() => {
    if (activeView === 'viewProducts') {
      fetchRecentProducts();
    }
  }, [activeView]);

  const renderLeftPanel = () => (
    <div className="left-panel">
      <header className="dashboard-header">
        <h1>🏪 Retailer Dashboard</h1>
        <p className="account-info">{account.substring(0, 6)}...{account.substring(38)}</p>
      </header>
      
      <div className="action-buttons">
        <button 
          className={`action-btn ${activeView === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveView('manage')}
        >
          📋 Manage Products
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
      </div>
    </div>
  );

  const renderRightPanel = () => {
    if (!activeView) {
      return (
        <div className="right-panel empty">
          <div className="empty-state">
            <h2>Welcome, Retailer!</h2>
            <p>Select an action from the left panel to get started</p>
          </div>
        </div>
      );
    }

    if (activeView === 'manage') {
      return (
        <div className="right-panel">
          <h2>Manage Products</h2>
          
          <div className="manage-section">
            <div className="search-methods">
              <div className="method-card">
                <h3>Upload Product QR Code</h3>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    try {
                      const result = await QrScanner.scanImage(file);
                      await loadManageProduct(result);
                    } catch (error) {
                      console.error('Error scanning QR:', error);
                      setManageError('Could not read QR code from image');
                    } finally {
                      e.target.value = null;
                    }
                  }}
                  className="file-input"
                />
              </div>
              
              <div className="method-card">
                <h3>Or Enter QR Hash</h3>
                <input
                  type="text"
                  value={manageSearchHash}
                  onChange={(e) => setManageSearchHash(e.target.value)}
                  placeholder="Paste QR hash here..."
                  className="hash-input"
                />
                <button 
                  onClick={() => loadManageProduct(manageSearchHash)}
                  className="search-btn"
                  disabled={!manageSearchHash}
                >
                  Load Product
                </button>
              </div>
            </div>
            
            {manageLoading && (
              <div className="loading-message">
                Loading product...
              </div>
            )}
            
            {manageError && !manageProduct && (
              <div className="error-message">
                {manageError}
              </div>
            )}
            
            {manageProduct && (
              <div className="manage-form-container">
                <div className="product-info-box">
                  <h3>Product Information</h3>
                  <p><strong>ID:</strong> {manageProduct.id}</p>
                  <p><strong>Name:</strong> {manageProduct.name}</p>
                  <p><strong>Status:</strong> <span className={`status-badge ${manageProduct.status}`}>{manageProduct.rawStatus}</span></p>
                  <p><strong>Current Holder:</strong> {manageProduct.currentHolder.substring(0, 10)}...</p>
                </div>
                
                {/* CONDITIONAL RENDERING BASED ON STATUS */}
                
                {/* If product is InTransit, show Receive button */}
                {manageProduct.status === 'intransit' && (
                  <div className="action-section">
                    <h3>Product In Transit - Receive & Stock</h3>
                    <form onSubmit={handleReceiveProduct} className="action-form">
                      <div className="form-group">
                        <label>Store Location *</label>
                        <input
                          type="text"
                          value={receiveLocation}
                          onChange={(e) => setReceiveLocation(e.target.value)}
                          placeholder="e.g., Main Store, Downtown LA"
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Receiving Notes</label>
                        <textarea
                          value={receiveNotes}
                          onChange={(e) => setReceiveNotes(e.target.value)}
                          placeholder="e.g., Stock placed in aisle 5, shelf 3"
                          rows="2"
                        />
                      </div>
                      
                      {manageError && (
                        <div className="error-message">
                          ❌ {manageError}
                        </div>
                      )}
                      
                      <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Receiving...' : '📥 Receive & Add to Inventory'}
                      </button>
                    </form>
                  </div>
                )}
                
                {/* If I have this product and it's not sold, show Mark as Sold form */}
                {manageProduct.currentHolder.toLowerCase() === account.toLowerCase() && 
                 manageProduct.status !== 'intransit' && 
                 manageProduct.status !== 'sold' && (
                  <div className="action-section">
                    <h3>✅ Product In Your Inventory</h3>
                    <div className="inventory-info">
                      <p>📍 <strong>Status:</strong> {manageProduct.rawStatus}</p>
                      <p>🏪 <strong>Ready for sale</strong></p>
                    </div>
                    
                    <form onSubmit={handleMarkAsSold} className="sold-form">
                      <div className="form-group">
                        <label>Customer/Sale Info</label>
                        <input
                          type="text"
                          value={customerInfo}
                          onChange={(e) => setCustomerInfo(e.target.value)}
                          placeholder="e.g., Customer #12345 or Point of Sale"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Sale Notes</label>
                        <textarea
                          value={saleNotes}
                          onChange={(e) => setSaleNotes(e.target.value)}
                          placeholder="e.g., Sold at register 3, payment confirmed"
                          rows="2"
                        />
                      </div>
                      
                      {manageError && (
                        <div className="error-message">
                          ❌ {manageError}
                        </div>
                      )}
                      
                      <button type="submit" className="sold-btn" disabled={loading}>
                        {loading ? 'Processing...' : '💰 Mark as Sold'}
                      </button>
                    </form>
                  </div>
                )}
                
                {/* If product is already sold */}
                {manageProduct.status === 'sold' && (
                  <div className="success-section">
                    <h3>✅ Product Sold</h3>
                    <p>This product has been sold to a customer.</p>
                    <div className="sold-info-box">
                      <p>💰 <strong>Status:</strong> Sold</p>
                      <p>🎉 <strong>Transaction complete</strong></p>
                    </div>
                  </div>
                )}
                
                {/* If product is not mine */}
                {manageProduct.currentHolder.toLowerCase() !== account.toLowerCase() && 
                 manageProduct.status !== 'intransit' && (
                  <div className="info-message">
                    ℹ️ This product is held by another entity in the supply chain.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeView === 'viewProducts') {
      return (
        <div className="right-panel">
          <h2>Recent Products</h2>
          
          {loading && <p>Loading products...</p>}
          
          {!loading && recentProducts.length === 0 && (
            <p className="coming-soon">No products found.</p>
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
                      <span className={`status-badge ${product.status}`}>
                        {product.status.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="expand-icon">
                        {expandedProduct === product.id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                  
                  {expandedProduct === product.id && (
                    <div className="product-details-expanded">
                      <p><strong>Description:</strong> {product.description}</p>
                      <p><strong>Quantity:</strong> {product.quantity}</p>
                      <p><strong>QR Hash:</strong> {product.qrHash.substring(0, 30)}...</p>
                      
                      <h4>Complete Journey</h4>
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
                  <p><strong>Status:</strong> <span className={`status-badge ${searchedProduct.status}`}>{searchedProduct.status}</span></p>
                  <p><strong>Quantity:</strong> {searchedProduct.quantity}</p>
                  
                  <h4>Complete Supply Chain Journey</h4>
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
                            {log.date}
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
  };

  return (
    <div className="retailer-dashboard">
      {renderLeftPanel()}
      {renderRightPanel()}
    </div>
  );
}

export default RetailerDashboard;
