// src/components/admin/MachineBreakdownTab.jsx
import React, { useState } from 'react';
import MachineManagement from './breakdown/MachineManagement';
import BreakdownReasonManagement from './breakdown/BreakdownReasonManagement';
import EmployeeManagement from './breakdown/EmployeeManagement';

const MachineBreakdownTab = () => {
    const [activeTab, setActiveTab] = useState('machines');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'machines':
                return <MachineManagement />;
            case 'reasons':
                return <BreakdownReasonManagement />;
            case 'employees':
                return <EmployeeManagement />;
            default:
                return <MachineManagement />;
        }
    };

    return (
        <div className="card w-100">
            <div className="card-header">
                <ul className="nav nav-tabs card-header-tabs">
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'machines' ? 'active' : ''}`} onClick={() => setActiveTab('machines')}>
                            Machines
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'reasons' ? 'active' : ''}`} onClick={() => setActiveTab('reasons')}>
                            Breakdown Reasons
                        </button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
                            Employees
                        </button>
                    </li>
                </ul>
            </div>
            <div className="card-body">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default MachineBreakdownTab;