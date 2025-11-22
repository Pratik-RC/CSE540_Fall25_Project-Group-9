import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ethers } from 'ethers';
import WalletConnect from './components/WalletConnect';
import AdminDashboard from './components/AdminDashboard';
import RoleRequestForm from './components/RoleRequestForm';
import PendingApproval from './components/PendingApproval';
import ProducerDashboard from './components/ProducerDashboard';
import CertifierDashboard from './components/CertifierDashboard';
import DistributorDashboard from './components/DistributorDashboard';
import RetailerDashboard from './components/RetailerDashboard';
import PublicProductTracker from './components/PublicProductTracker';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './utils/contract';
import './App.css';

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle wallet connection
  const handleWalletConnect = async ({ account, provider, signer }) => {
    console.log('Wallet connected:', account);
    setAccount(account);
    setProvider(provider);
    setSigner(signer);
    setWalletConnected(true);

    // Check user's role
    await checkUserRole(account, signer);
  };

  // Check user's role in the system
  const checkUserRole = async (account, signer) => {
    setLoading(true);
    try {
      console.log('=== Starting Role Check ===');
      console.log('Contract Address:', CONTRACT_ADDRESS);
      console.log('Connected Account:', account);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const network = await provider.getNetwork();
      console.log('Connected to Chain ID:', network.chainId.toString());
      
      if (network.chainId.toString() !== '1337') {
        console.error('❌ WRONG NETWORK! You are on chain ID:', network.chainId.toString());
        throw new Error(`Wrong network! Please switch to Localhost 8545`);
      }
      
      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (code === '0x') {
        console.error('❌ NO CONTRACT AT ADDRESS');
        throw new Error('No contract deployed at this address');
      }
      
      console.log('✅ Contract found');
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const ownerAddress = await contract.owner();
      if (ownerAddress.toLowerCase() === account.toLowerCase()) {
        console.log('✅ User is Owner');
        setUserRole('owner');
        return;
      }
      
      if (await contract.isProducer(account)) {
        console.log('✅ User is Producer');
        setUserRole('producer');
        return;
      }
      
      if (await contract.isCertifier(account)) {
        console.log('✅ User is Certifier');
        setUserRole('certifier');
        return;
      }
      
      if (await contract.isDistributor(account)) {
        console.log('✅ User is Distributor');
        setUserRole('distributor');
        return;
      }
      
      if (await contract.isRetailer(account)) {
        console.log('✅ User is Retailer');
        setUserRole('retailer');
        return;
      }
      
      if (await contract.hasPendingRoleRequest(account)) {
        console.log('⏳ User has pending role request');
        setUserRole('pending');
        return;
      }
      
      console.log('ℹ️ User has no role - showing request form');
      setUserRole('none');
      
    } catch (err) {
      console.error('=== Error Details ===');
      console.error('Error:', err);
      setUserRole('none');
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
          setUserRole(null);
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

  // Render appropriate component based on user role
  const renderContent = () => {
    if (!walletConnected) {
      return <WalletConnect onConnect={handleWalletConnect} />;
    }

    if (loading) {
      return (
        <div className="loading-container">
          <p>Checking your role...</p>
        </div>
      );
    }

    switch (userRole) {
      case 'owner':
        return <AdminDashboard account={account} signer={signer} />;
      case 'producer':
        return <ProducerDashboard account={account} signer={signer} />;
      case 'certifier':
        return <CertifierDashboard account={account} signer={signer} />;
      case 'distributor':
        return <DistributorDashboard account={account} signer={signer} />;
      case 'retailer':
        return <RetailerDashboard account={account} signer={signer} />;
      case 'pending':
        return <PendingApproval account={account} />;
      case 'none':
      default:
        return <RoleRequestForm account={account} signer={signer} />;
    }
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public product tracker - no wallet needed */}
          <Route path="/track" element={<PublicProductTracker />} />
          
          {/* Main app - wallet required */}
          <Route path="/" element={renderContent()} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
