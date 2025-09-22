// src/pages/ServicesPage.jsx
import React from 'react';

const ServicesPage = () => (
    <div className="container py-5">
        <div className="text-center mb-5">
            <h1 className="display-5 fw-bold">Precision Marine Solutions</h1>
            <p className="lead text-muted">From world-class custom sails to comprehensive servicing and canvas work.</p>
        </div>
        <div className="row g-4">
            <div className="col-md-6 col-lg-3">
                <div className="card h-100 text-center shadow-sm">
                    <div className="card-body">
                        <h3 className="h5 card-title">Custom Sail Design</h3>
                        <p className="card-text">Collaborative design process using advanced 3D modeling to create the perfect sail for your cruising or racing needs.</p>
                    </div>
                </div>
            </div>
            <div className="col-md-6 col-lg-3">
                <div className="card h-100 text-center shadow-sm">
                    <div className="card-body">
                        <h3 className="h5 card-title">Sail Manufacturing</h3>
                        <p className="card-text">Precision manufacturing in our state-of-the-art loft, using only the highest quality materials for exceptional durability and performance.</p>
                    </div>
                </div>
            </div>
            <div className="col-md-6 col-lg-3">
                <div className="card h-100 text-center shadow-sm">
                    <div className="card-body">
                        <h3 className="h5 card-title">Repair & Servicing</h3>
                        <p className="card-text">Comprehensive inspection, re-stitching, UV strip replacement, and hardware servicing to extend the life of your sails.</p>
                    </div>
                </div>
            </div>
            <div className="col-md-6 col-lg-3">
                <div className="card h-100 text-center shadow-sm">
                    <div className="card-body">
                        <h3 className="h5 card-title">Canvas & Accessories</h3>
                        <p className="card-text">Custom-fit sail covers, biminis, dodgers, and other marine canvas work designed for a perfect fit and maximum protection.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default ServicesPage;