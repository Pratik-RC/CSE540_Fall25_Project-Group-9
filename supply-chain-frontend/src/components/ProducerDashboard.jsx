import React from 'react';
import './RoleDashboard.css';

function ProducerDashboard({ account, signer }) {
  return (
    <div className="role-dashboard-container">
      <header className="dashboard-header">
        <h1>🌾 Producer Dashboard</h1>
        <p className="account-badge">Connected: {account.substring(0, 6)}...{account.substring(38)}</p>
      </header>
      <div className="dashboard-content">
        <p className="coming-soon">Producer features coming soon...</p>
        <ul className="feature-list">
          <li>Create Products</li>
          <li>Ship to Certifiers</li>
          <li>View Product History</li>
        </ul>
      </div>
    </div>
  );
}

export default ProducerDashboard;
