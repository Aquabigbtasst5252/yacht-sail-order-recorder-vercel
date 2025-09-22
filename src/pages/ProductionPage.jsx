// src/pages/ProductionPage.jsx
import React, { useState } from 'react';
import WeeklyScheduleView from '../components/production/WeeklyScheduleView';
import OrderHistoryView from '../components/production/OrderHistoryView';
import AllActiveOrdersView from '../components/production/AllActiveOrdersView';

const ProductionPage = ({ user }) => {
    const [activeTab, setActiveTab] = useState('schedule');

    return (
        <div className="card w-100">
            <div className="card-header">
                <ul className="nav nav-tabs card-header-tabs">
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>Weekly Schedule</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Order Milestone History</button>
                    </li>
                    {user.role !== 'customer' && (
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === 'allActive' ? 'active' : ''}`} onClick={() => setActiveTab('allActive')}>All Active Orders</button>
                        </li>
                    )}
                </ul>
            </div>
            <div className="card-body">
                {activeTab === 'schedule' && <WeeklyScheduleView user={user} />}
                {activeTab === 'history' && <OrderHistoryView user={user} />}
                {activeTab === 'allActive' && user.role !== 'customer' && <AllActiveOrdersView user={user} />}
            </div>
        </div>
    );
};

export default ProductionPage;