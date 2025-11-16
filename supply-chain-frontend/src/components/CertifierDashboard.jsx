import React from 'react';
import './RoleDashboard.css';

function CertifierDashboard({ account, signer }) {
  return (
    <div className="role-dashboard-container">
      <header className="dashboard-header">
        <h1>✅ Certifier Dashboard</h1>
        <p className="account-badge">Connected: {account.substring(0, 6)}...{account.substring(38)}</p>
      </header>
      <div className="dashboard-content">
        <p className="coming-soon">Certifier features coming soon...</p>
        <ul className="feature-list">
          <li>Receive Products</li>
          <li>Test & Certify</li>
          <li>Ship to Distributors</li>
        </ul>
      </div>
    </div>
  );
}

export default CertifierDashboard;
