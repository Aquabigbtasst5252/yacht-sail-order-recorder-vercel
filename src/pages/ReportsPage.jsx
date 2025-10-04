// src/pages/ReportsPage.jsx
import React from 'react';

const ReportsPage = ({ onNavigate }) => {
    return (
        <div className="container mt-4">
            <h1 className="mb-4">Reports</h1>
            <div className="list-group">
                <button
                    type="button"
                    className="list-group-item list-group-item-action"
                    onClick={() => onNavigate('comprehensive-report')}
                >
                    Comprehensive Report
                </button>
            </div>
        </div>
    );
};

export default ReportsPage;