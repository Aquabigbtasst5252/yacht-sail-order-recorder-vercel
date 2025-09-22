// src/components/PublicHeader.jsx
import React from 'react';

const PublicHeader = ({ onNavigate, settings }) => (
    <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom shadow-sm sticky-top">
        <div className="container">
            <a className="navbar-brand" href="#" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>
                <img src={settings.logoUrl || 'https://i.imgur.com/cAyxfn7.png'} alt="Logo" style={{height: '40px'}} />
            </a>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#publicNavbar">
                <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="publicNavbar">
                <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
                    <li className="nav-item"><a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Home</a></li>
                    <li className="nav-item"><a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('about'); }}>About</a></li>
                    <li className="nav-item"><a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('services'); }}>Services</a></li>
                    <li className="nav-item"><a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('contact'); }}>Contact</a></li>
                </ul>
            </div>
        </div>
    </nav>
);

export default PublicHeader;