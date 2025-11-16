import React, { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/contract';
import './RoleRequestForm.css';

function RoleRequestForm({ account, signer }) {
  const [formData, setFormData] = useState({
    organizationName: '',
    role: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.organizationName || !formData.role) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Connect to contract
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Call appropriate role request function
      let tx;
      switch (formData.role) {
        case 'producer':
          tx = await contract.requestProducerRole(formData.organizationName);
          break;
        case 'certifier':
          tx = await contract.requestCertifierRole(formData.organizationName);
          break;
        case 'distributor':
          tx = await contract.requestDistributorRole(formData.organizationName);
          break;
        case 'retailer':
          tx = await contract.requestRetailerRole(formData.organizationName);
          break;
        default:
          throw new Error('Invalid role selected');
      }

      // Wait for transaction confirmation
      await tx.wait();

      setSuccess('Role request submitted successfully! Waiting for admin approval.');
      setFormData({ organizationName: '', role: '', description: '' });

    } catch (err) {
      console.error('Error submitting role request:', err);
      setError(err.reason || err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-request-container">
      <div className="role-request-card">
        <div className="header">
          <h2>Request Role Access</h2>
          <p className="account-info">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
        </div>

        <form onSubmit={handleSubmit} className="request-form">
          <div className="form-group">
            <label htmlFor="organizationName">Organization Name *</label>
            <input
              type="text"
              id="organizationName"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              placeholder="Enter your organization name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Requested Role *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="">Select a role</option>
              <option value="producer">Producer</option>
              <option value="certifier">Certifier</option>
              <option value="distributor">Distributor</option>
              <option value="retailer">Retailer</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Briefly describe your organization and why you need this role"
              rows="4"
            />
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
        </form>
      </div>
    </div>
  );
}

export default RoleRequestForm;
