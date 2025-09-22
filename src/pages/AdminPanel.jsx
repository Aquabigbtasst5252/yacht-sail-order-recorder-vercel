// src/pages/AdminPanel.jsx
import React, { useState } from 'react';
import UserManagementTab from '../components/admin/UserManagementTab';
import CustomerManagementTab from '../components/admin/CustomerManagementTab'; // We will create this next
import DataManagementTab from '../components/admin/DataManagementTab'; // We will create this next

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('users');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'users':
                return <UserManagementTab />;
            case 'customers':
                return <CustomerManagementTab />;
            case 'data':
                return <DataManagementTab />;
            default:
                return <UserManagementTab />;
        }
    };

    return (
        <div className="card w-100">
            <div className="card-header">
                 <ul className="nav nav-tabs card-header-tabs">
                    <li className="nav-item"><button className={`nav-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>User Management</button></li>
                    <li className="nav-item"><button className={`nav-link ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>Customer Profiles</button></li>
                    <li className="nav-item"><button className={`nav-link ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>System Data</button></li>
                 </ul>
            </div>
            <div className="card-body">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default AdminPanel;