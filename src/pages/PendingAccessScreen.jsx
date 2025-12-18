// src/pages/PendingAccessScreen.jsx
import React from 'react';

const PendingAccessScreen = ({ message, companyName, logoUrl }) => (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-body-tertiary">
        <div className="card text-center shadow-sm" style={{maxWidth: '500px'}}>
            <div className="card-body p-5">
                <img src={logoUrl || '/logo.png'} alt="Company Logo" style={{height: '50px'}} className="mb-4" />
                <h1 className="h4 card-title">Welcome to {companyName || "AQUA DYNAMICS"}!</h1>
                <p className="card-text text-muted">{message || "Your account is pending approval from a super admin. Please check back later."}</p>
            </div>
        </div>
    </div>
);

export default PendingAccessScreen;