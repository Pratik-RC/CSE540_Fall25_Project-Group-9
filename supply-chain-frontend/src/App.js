import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import WalletConnect from './components/WalletConnect';
import AdminDashboard from './components/AdminDashboard';
import RoleRequestForm from './components/RoleRequestForm';
import { CONTRACT_ADDRESS, CONTRACT_ABI, OWNER_ADDRESS } from './utils/contract';
import './App.css';

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle wallet connection
  const handleWalletConnect = async ({ account, provider, signer }) => {
    setAccount(account);
    setProvider(provider);
    setSigner(signer);
    setWalletConnected(true);

    // Check if connected account is the owner
    await checkOwnership(account, signer);
  };

  // Check if the connected account is the contract owner
  const checkOwnership = async (account, signer) => {
  setLoading(true);
  try {
    console.log('=== Starting Ownership Check ===');
    console.log('Contract Address:', CONTRACT_ADDRESS);
    console.log('Connected Account:', account);
    
    // First, check if there's code at the contract address
    const provider = await signer.provider;
    const code = await provider.getCode(CONTRACT_ADDRESS);
    console.log('Contract code length:', code.length);
    
    if (code === '0x') {
      throw new Error('No contract deployed at this address');
    }
    
    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    console.log('Contract instance created');
    
    // Call owner function
    const ownerAddress = await contract.owner();
    console.log('Contract Owner:', ownerAddress);
    console.log('Connected Account:', account);
    
    // Compare addresses
    const isOwnerAccount = ownerAddress.toLowerCase() === account.toLowerCase();
    console.log('Is Owner?', isOwnerAccount);
    
    setIsOwner(isOwnerAccount);
  } catch (err) {
    console.error('=== Error Details ===');
    console.error('Error:', err);
    console.error('Error message:', err.message);
    setIsOwner(false);
  } finally {
    setLoading(false);
  }
};


  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          window.location.reload();
        } else {
          setWalletConnected(false);
          setAccount('');
          setIsOwner(false);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  // Render appropriate component based on state
  const renderContent = () => {
    if (!walletConnected) {
      return <WalletConnect onConnect={handleWalletConnect} />;
    }

    if (loading) {
      return (
        <div className="loading-container">
          <p>Loading...</p>
        </div>
      );
    }

    if (isOwner) {
      return <AdminDashboard account={account} signer={signer} />;
    } else {
      return <RoleRequestForm account={account} signer={signer} />;
    }
  };

  return (
    <div className="App">
      {renderContent()}
    </div>
  );
}

export default App;
