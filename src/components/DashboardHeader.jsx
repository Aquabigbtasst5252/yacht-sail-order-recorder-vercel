// src/components/DashboardHeader.jsx
import React from 'react';

const DashboardHeader = ({ user, onSignOut, onNavigate, settings }) => {
    const isAdmin = user.role === 'super_admin';
    const isProduction = user.role === 'production';
    const isCustomer = user.role === 'customer';

    return (
        <nav className="navbar navbar-expand bg-body-tertiary border-bottom shadow-sm">
            <div className="container-fluid">
                <div className="d-flex align-items-center">
                    <a className="navbar-brand" href="#" onClick={(e) => { e.preventDefault(); onNavigate('dashboard'); }}>
                        <img src={settings.logoUrl || 'https://i.imgur.com/cAyxfn7.png'} alt="Logo" style={{height: '32px'}}/>
                    </a>
                    <ul className="navbar-nav d-flex flex-row">
                        {!isCustomer && (
                             <>
                                <li className="nav-item">
                                    <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('new-order'); }}>New Order</a>
                                </li>
                                <li className="nav-item ms-3">
                                    <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('order-list'); }}>Order List</a>
                                </li>
                                <li className="nav-item ms-3">
                                    <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('planning'); }}>Production Schedule</a>
                                </li>
                                <li className="nav-item ms-3">
                                    <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('reports'); }}>Reports</a>
                                </li>
                                <li className="nav-item ms-3">
                                    <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('machine-breakdown'); }}>Machine Breakdown</a>
                                </li>
                                <li className="nav-item ms-3">
                                    <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('daily-lost-time'); }}>Daily Lost Time</a>
                                </li>
                             </>
                        )}
                        {isCustomer && (
                            <>
                                <li className="nav-item ms-3">
                                    <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('order-list'); }}>My Orders</a>
                                </li>
                                <li className="nav-item ms-3">
                                    <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('planning'); }}>Production Status</a>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
                
                <div className="d-flex align-items-center ms-auto">
                    <div className="dropdown">
                        <button className="btn btn-light d-flex align-items-center" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                           <div className="text-end me-2">
                                <div className="fw-semibold" style={{lineHeight: 1}}>{user.name}</div>
                                <small className="text-muted text-capitalize" style={{fontSize: '0.8em'}}>{user.role.replace('_', ' ')}</small>
                            </div>
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-person-circle" viewBox="0 0 16 16">
                              <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                              <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
                            </svg>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                            <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('dashboard'); }}>Dashboard</a></li>
                            {isCustomer && <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('order-list'); }}>My Orders</a></li>}
                            {isCustomer && <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('planning'); }}>Production Status</a></li>}
                            <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('stock'); }}>My Stock</a></li>
                            
                            {(isAdmin || isProduction) && <li><hr className="dropdown-divider" /></li>}
                            {(isAdmin || isProduction) && <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('order-list'); }}>Order List</a></li>}
                            {(isAdmin || isProduction) && <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('planning'); }}>Production Schedule</a></li>}
                            {(isAdmin || isProduction) && <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('reports'); }}>Reports</a></li>}
                            {(isAdmin || isProduction) && <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('machine-breakdown'); }}>Machine Breakdown</a></li>}
                            {(isAdmin || isProduction) && <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('daily-lost-time'); }}>Daily Lost Time</a></li>}
                            
                            {isAdmin && <li><hr className="dropdown-divider" /></li>}
                            {isAdmin && <li><a className="dropdown-item fw-bold" href="#" onClick={(e) => { e.preventDefault(); onNavigate('admin'); }}>Admin Panel</a></li>}
                            {isAdmin && <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('settings'); }}>Settings</a></li>}
                            
                            <li><hr className="dropdown-divider" /></li>
                            <li><a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); onSignOut(); }}>Sign Out</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default DashboardHeader;