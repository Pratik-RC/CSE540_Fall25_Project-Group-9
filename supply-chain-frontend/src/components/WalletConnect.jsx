import React, { useState } from 'react';
import { ethers } from 'ethers';
import './WalletConnect.css';

function WalletConnect({ onConnect }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const connectWallet = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        setError('MetaMask is not installed. Please install MetaMask to continue.');
        setLoading(false);
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      console.log('Connected account:', accounts[0]);
      const account = accounts[0];
      
      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Pass connection info to parent
      onConnect({ account, provider, signer });

    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wallet-connect-container">
      <div className="wallet-connect-card">
        <h1>Supply Chain Provenance</h1>
        <p className="subtitle">Role Management System</p>
        
        <div className="connect-section">
          <p>Connect your MetaMask wallet to continue</p>
          
          <button 
            className="connect-button" 
            onClick={connectWallet}
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>

          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="info-section">
          <p className="info-text">
            Make sure you're connected to the Hardhat local network (Chain ID: 31337)
          </p>
        </div>
      </div>
    </div>
  );
}

export default WalletConnect;
