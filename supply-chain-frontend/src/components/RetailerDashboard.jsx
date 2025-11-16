import React from 'react';
import './RoleDashboard.css';

function RetailerDashboard({ account, signer }) {
  return (
    <div className="role-dashboard-container">
      <header className="dashboard-header">
        <h1>🏪 Retailer Dashboard</h1>
        <p className="account-badge">Connected: {account.substring(0, 6)}...{account.substring(38)}</p>
      </header>
      <div className="dashboard-content">
        <p className="coming-soon">Retailer features coming soon...</p>
        <ul className="feature-list">
          <li>Receive Products</li>
          <li>View Product Details</li>
          <li>Mark as Sold</li>
        </ul>
      </div>
    </div>
  );
}

export default RetailerDashboard;
