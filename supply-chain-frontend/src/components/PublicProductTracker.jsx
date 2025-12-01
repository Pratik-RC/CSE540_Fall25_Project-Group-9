import React, { useState } from 'react';
import QrScanner from 'qr-scanner';
import './PublicProductTracker.css';

function PublicProductTracker() {
  const [loading, setLoading] = useState(false);
  const [searchHash, setSearchHash] = useState('');
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');

  const searchProduct = async () => {
    if (!searchHash) return;
    
    setLoading(true);
    setError('');
    setProduct(null);
    
    try {
      const response = await fetch(`http://localhost:3000/journey/${searchHash}`);
      
      if (!response.ok) {
        throw new Error('Product not found or invalid QR code');
      }
      
      const productData = await response.json();
      setProduct(productData);
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Product not found or invalid QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const result = await QrScanner.scanImage(file);
      setSearchHash(result);
    } catch (error) {
      console.error('Error scanning QR:', error);
      setError('Could not read QR code from image');
    } finally {
      e.target.value = null;
    }
  };

  return (
    <div className="public-tracker">
      <header className="tracker-header">
        <h1>🔍 Product Authenticity Tracker</h1>
        <p>Verify product origin and journey - No login required</p>
      </header>
      
      <div className="search-container">
        <div className="search-card">
          <h2>Upload Product QR Code</h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleQRUpload}
            className="file-input"
          />
        </div>
        
        <div className="search-card">
          <h2>Or Enter QR Hash</h2>
          <input
            type="text"
            value={searchHash}
            onChange={(e) => setSearchHash(e.target.value)}
            placeholder="Paste QR hash here..."
            className="hash-input"
          />
          <button 
            onClick={searchProduct}
            className="search-btn"
            disabled={loading || !searchHash}
          >
            {loading ? 'Searching...' : 'Track Product'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="error-box">
          ❌ {error}
        </div>
      )}
      
      {product && (
        <div className="product-result">
          <div className="product-header-section">
            <h2>✅ Verified Product</h2>
            <span className={`status-badge ${product.status.replace(/\s+/g, '').toLowerCase()}`}>
              {product.status}
            </span>
          </div>
          
          <div className="product-details">
            <div className="detail-row">
              <strong>Product ID:</strong> {product.id}
            </div>
            <div className="detail-row">
              <strong>Name:</strong> {product.name}
            </div>
            <div className="detail-row">
              <strong>Description:</strong> {product.description}
            </div>
            <div className="detail-row">
              <strong>Quantity:</strong> {product.quantity }
            </div>
            <div className="detail-row">
              <strong>Producer:</strong> {product.producerName}
            </div>
            <div className="detail-row">
              <strong>Created:</strong> {product.createdDate}
            </div>
          </div>
          
          <div className="journey-section">
            <h3>📜 Complete Supply Chain Journey</h3>
            <div className="journey-timeline">
              {product.journey.map((log, idx) => (
                <div key={idx} className="journey-step">
                  <div className="step-number">{idx + 1}</div>
                  <div className="step-content">
                    <h4>{log.action}</h4>
                    <p className="step-actor">By: {log.actorName}</p>
                    <p className="step-location">📍 {log.location}</p>
                    <p className="step-notes">{log.notes}</p>
                    <p className="step-time">
                      {log.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {!product && !error && !loading && (
        <div className="empty-state">
          <p>Scan or enter a product QR code to view its complete journey</p>
        </div>
      )}
    </div>
  );
}

export default PublicProductTracker;
