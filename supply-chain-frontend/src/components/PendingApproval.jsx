import React from 'react';
import './PendingApproval.css';

function PendingApproval({ account }) {
  return (
    <div className="pending-approval-container">
      <div className="pending-approval-card">
        <div className="pending-icon">⏳</div>
        <h2>Role Request Pending</h2>
        <p className="account-info">Account: {account}</p>
        <p className="pending-message">
          Your role request is currently being reviewed by the system administrator.
        </p>
        <p className="pending-submessage">
          Please check back later or contact the administrator for more information.
        </p>
        <div className="refresh-note">
          💡 Refresh the page after your request is approved
        </div>
      </div>
    </div>
  );
}

export default PendingApproval;
