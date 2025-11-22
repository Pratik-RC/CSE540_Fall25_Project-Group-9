import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import './WalletConnect.css';

function WalletConnect({ onConnect }) {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask!');
      return;
    }

    try {
      setError('');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();

      onConnect({
        account: accounts[0],
        provider: provider,
        signer: signer
      });
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet');
    }
  };

  return (
    <div className="wallet-connect-container">
      <div className="wallet-connect-card">
        <h1>🔗 Supply Chain Provenance</h1>
        <p className="tagline">Blockchain-Powered Product Tracking</p>
        
        {/* Public Tracker Button - NEW */}
        <div className="public-section">
          <h3>🔍 Verify Product Authenticity</h3>
          <p>Track a Product (Simple scan)</p>
          <button 
            className="track-product-btn"
            onClick={() => navigate('/track')}
          >
            Track Product
          </button>
        </div>
        
        <div className="divider">
          <span>or</span>
        </div>
        
        {/* Wallet Connect Section */}
        <div className="connect-section">
          <h3>Supply Chain Participant?</h3>
          <p>Connect your wallet to manage products</p>
          <button className="connect-btn" onClick={connectWallet}>
            🦊 Connect MetaMask
          </button>
          {error && <p className="error-message">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default WalletConnect;
