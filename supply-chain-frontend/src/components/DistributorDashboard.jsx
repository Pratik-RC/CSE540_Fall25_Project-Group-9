import React from 'react';
import './RoleDashboard.css';

function DistributorDashboard({ account, signer }) {
  return (
    <div className="role-dashboard-container">
      <header className="dashboard-header">
        <h1>🚚 Distributor Dashboard</h1>
        <p className="account-badge">Connected: {account.substring(0, 6)}...{account.substring(38)}</p>
      </header>
      <div className="dashboard-content">
        <p className="coming-soon">Distributor features coming soon...</p>
        <ul className="feature-list">
          <li>Receive Products</li>
          <li>Manage Inventory</li>
          <li>Ship to Retailers</li>
        </ul>
      </div>
    </div>
  );
}

export default DistributorDashboard;
