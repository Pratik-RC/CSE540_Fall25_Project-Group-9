import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/contract';
import RoleRequestCard from './RoleRequestCard';
import './AdminDashboard.css';

function AdminDashboard({ account, signer }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchPendingRequests();
  }, [refreshTrigger]);

  const fetchPendingRequests = async () => {
    setLoading(true);
    setError('');

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      // Get all pending request addresses
      const pendingAddresses = await contract.getPendingRequests();
      
      // Fetch details for each pending request
      const requestDetails = await Promise.all(
        pendingAddresses.map(async (address) => {
          const [requester, name, role, timestamp, pending] = await contract.getRoleRequest(address);
          return {
            address: requester,
            name,
            role,
            timestamp,
            pending
          };
        })
      );

      setRequests(requestDetails);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to fetch pending requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requesterAddress) => {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.approveRoleRequest(requesterAddress);
      await tx.wait();
      
      // Refresh the list
      setRefreshTrigger(prev => prev + 1);
      alert('Role request approved successfully!');
    } catch (err) {
      console.error('Error approving request:', err);
      alert('Failed to approve request: ' + (err.reason || err.message));
    }
  };

  const handleReject = async (requesterAddress) => {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.rejectRoleRequest(requesterAddress);
      await tx.wait();
      
      // Refresh the list
      setRefreshTrigger(prev => prev + 1);
      alert('Role request rejected');
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject request: ' + (err.reason || err.message));
    }
  };

  return (
    <div className="admin-dashboard-container">
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="admin-account">Logged in as: {account}</p>
          </div>
          <button className="refresh-button" onClick={() => setRefreshTrigger(prev => prev + 1)}>
            Refresh
          </button>
        </div>

        <div className="dashboard-content">
          <div className="section-header">
            <h2>Pending Role Requests</h2>
            <span className="request-count">{requests.length} pending</span>
          </div>

          {loading && <p className="loading-text">Loading requests...</p>}
          
          {error && <p className="error-message">{error}</p>}

          {!loading && requests.length === 0 && (
            <div className="empty-state">
              <p>No pending role requests</p>
            </div>
          )}

          <div className="requests-grid">
            {requests.map((request) => (
              <RoleRequestCard
                key={request.address}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
