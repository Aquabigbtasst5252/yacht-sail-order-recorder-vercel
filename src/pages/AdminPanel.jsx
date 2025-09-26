// src/pages/AdminPanel.jsx
import React, { useState } from 'react';
import UserManagementTab from '../components/admin/UserManagementTab';
import CustomerManagementTab from '../components/admin/CustomerManagementTab';
import DataManagementTab from '../components/admin/DataManagementTab';
import MachineBreakdownTab from '../components/admin/MachineBreakdownTab'; // Import the new component

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
            case 'machine-breakdown': // Add a case for the new tab
                return <MachineBreakdownTab />;
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
                    <li className="nav-item"><button className={`nav-link ${activeTab === 'machine-breakdown' ? 'active' : ''}`} onClick={() => setActiveTab('machine-breakdown')}>Machine Breakdown</button></li> {/* Add the new tab */}
                 </ul>
            </div>
            <div className="card-body">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default AdminPanel;