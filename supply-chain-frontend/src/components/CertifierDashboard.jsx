import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import QrScanner from 'qr-scanner';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/contract';
import './CertifierDashboard.css';

function CertifierDashboard({ account, signer }) {
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
  
  // Test/Certify Product State
  const [testLocation, setTestLocation] = useState('');
  const [testNotes, setTestNotes] = useState('');
  const [testError, setTestError] = useState('');
  
  // Ship Product State
  const [shipToRole, setShipToRole] = useState('');
  const [shipDestination, setShipDestination] = useState('');
  const [shipNotes, setShipNotes] = useState('');
  const [shipError, setShipError] = useState('');

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
      
      setSearchedProduct({
        id: id,
        name: info[1],
        description: info[2],
        qrHash: info[5],
        totalQty: info[6],
        status: info[7].replace(/\s+/g, '').toLowerCase(),
        journey: journey
      });
      
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
      
      alert('Product received successfully!');
      
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
        setManageError('This product is not destined for certifiers');
      } else {
        setManageError('Failed to receive product. Check your permissions.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Test/Certify product
  const handleTestProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTestError('');
    
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const tx = await contract.testProduct(
        manageProduct.id,
        testLocation,
        testNotes
      );
      
      await tx.wait();
      
      alert('Product certified successfully!');
      
      // Reload product
      await loadManageProduct(manageProduct.qrHash);
      
      // Clear form
      setTestLocation('');
      setTestNotes('');
      
    } catch (error) {
      console.error('Error testing product:', error);
      
      if (error.message.includes('Only current holder can test')) {
        setTestError('You are not the current holder of this product');
      } else {
        setTestError('Failed to certify product. You may not have permission.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Ship product
  const handleShipProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShipError('');
    
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const tx = await contract.shipProduct(
        manageProduct.id,
        shipToRole,
        shipDestination,
        shipNotes || ''
      );
      
      await tx.wait();
      
      alert('Product shipped successfully!');
      
      // Clear form and product
      setManageProduct(null);
      setShipToRole('');
      setShipDestination('');
      setShipNotes('');
      setManageSearchHash('');
      
    } catch (error) {
      console.error('Error shipping product:', error);
      
      if (error.message.includes('Only current holder can ship')) {
        setShipError('You are not the current holder of this product');
      } else if (error.message.includes('Product already in transit')) {
        setShipError('Product is already in transit');
      } else {
        setShipError('Failed to ship product. Check your permissions.');
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
        <h1>🔬 Certifier Dashboard</h1>
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
            <h2>Welcome, Certifier!</h2>
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
                    <h3>Product In Transit - Receive It</h3>
                    <form onSubmit={handleReceiveProduct} className="action-form">
                      <div className="form-group">
                        <label>Location *</label>
                        <input
                          type="text"
                          value={receiveLocation}
                          onChange={(e) => setReceiveLocation(e.target.value)}
                          placeholder="e.g., Quality Lab, Bogota"
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Notes</label>
                        <textarea
                          value={receiveNotes}
                          onChange={(e) => setReceiveNotes(e.target.value)}
                          placeholder="Receiving notes (optional)"
                          rows="2"
                        />
                      </div>
                      
                      {manageError && (
                        <div className="error-message">
                          ❌ {manageError}
                        </div>
                      )}
                      
                      <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Receiving...' : '📥 Receive Product'}
                      </button>
                    </form>
                  </div>
                )}
                
                {/* If product is with me but NOT tested yet, show only Certify option */}
                {(manageProduct.status === 'delivered' || manageProduct.status === 'produced') && 
                 manageProduct.currentHolder.toLowerCase() === account.toLowerCase() && (
                  <div className="action-section">
                    <h3>Certify Product</h3>
                    <form onSubmit={handleTestProduct} className="action-form">
                      <div className="form-group">
                        <label>Test Location *</label>
                        <input
                          type="text"
                          value={testLocation}
                          onChange={(e) => setTestLocation(e.target.value)}
                          placeholder="e.g., Quality Lab A"
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Certification Notes *</label>
                        <textarea
                          value={testNotes}
                          onChange={(e) => setTestNotes(e.target.value)}
                          placeholder="e.g., Passed all quality tests. Grade A+"
                          rows="3"
                          required
                        />
                      </div>
                      
                      {testError && (
                        <div className="error-message">
                          ❌ {testError}
                        </div>
                      )}
                      
                      <div className="button-group">
                        <button type="submit" className="submit-btn certify-btn" disabled={loading}>
                          {loading ? 'Certifying...' : '✅ Certify & Pass'}
                        </button>
                        
                        <button 
                          type="button" 
                          className="reject-btn"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to reject this product?')) {
                              alert('Reject functionality to be implemented');
                            }
                          }}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
                {/* If product is TESTED and I'm the holder, show Ship option */}
                {manageProduct.status === 'tested' && 
                 manageProduct.currentHolder.toLowerCase() === account.toLowerCase() && (
                  <div className="action-section">
                    <h3>Ship Product</h3>
                    <form onSubmit={handleShipProduct} className="action-form">
                      <div className="form-group">
                        <label>Ship To (Role) *</label>
                        <select
                          value={shipToRole}
                          onChange={(e) => setShipToRole(e.target.value)}
                          required
                        >
                          <option value="">Select destination role...</option>
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
                          placeholder="e.g., Distribution Center, Lima"
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Notes</label>
                        <textarea
                          value={shipNotes}
                          onChange={(e) => setShipNotes(e.target.value)}
                          placeholder="Shipping notes (optional)"
                          rows="2"
                        />
                      </div>
                      
                      {shipError && (
                        <div className="error-message">
                          ❌ {shipError}
                        </div>
                      )}
                      
                      <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Shipping...' : '🚚 Ship Product'}
                      </button>
                    </form>
                  </div>
                )}
                
                {/* If product is not mine */}
                {manageProduct.currentHolder.toLowerCase() !== account.toLowerCase() && 
                 manageProduct.status !== 'intransit' && (
                  <div className="info-message">
                    ℹ️ This product is currently held by another entity. You cannot perform actions on it.
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
                  <p><strong>Status:</strong> <span className={`status-badge ${searchedProduct.status}`}>{searchedProduct.status}</span></p>
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
  };

  return (
    <div className="certifier-dashboard">
      {renderLeftPanel()}
      {renderRightPanel()}
    </div>
  );
}

export default CertifierDashboard;
