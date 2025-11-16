import React, { useState } from 'react';
import './RoleRequestCard.css';

function RoleRequestCard({ request, onApprove, onReject }) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    await onApprove(request.address);
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    await onReject(request.address);
    setLoading(false);
  };

  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getRoleBadgeClass = (role) => {
    const roleMap = {
      'producer': 'badge-producer',
      'certifier': 'badge-certifier',
      'distributor': 'badge-distributor',
      'retailer': 'badge-retailer'
    };
    return roleMap[role] || 'badge-default';
  };

  return (
    <div className="request-card">
      <div className="card-header">
        <div className="card-title">
          <h3>{request.name}</h3>
          <span className={`role-badge ${getRoleBadgeClass(request.role)}`}>
            {request.role.toUpperCase()}
          </span>
        </div>
        <p className="request-address">{request.address}</p>
      </div>

      <div className="card-body">
        <div className="info-row">
          <span className="info-label">Requested:</span>
          <span className="info-value">{formatDate(request.timestamp)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Status:</span>
          <span className="status-badge status-pending">Pending</span>
        </div>
      </div>

      <div className="card-actions">
        <button 
          className="btn-approve" 
          onClick={handleApprove}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Approve'}
        </button>
        <button 
          className="btn-reject" 
          onClick={handleReject}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

export default RoleRequestCard;
