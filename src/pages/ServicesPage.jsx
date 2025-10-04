// src/pages/ServicesPage.jsx
import React from 'react';

const ServicesPage = ({ settings }) => {
    const content = settings?.servicesContent || {};

    const defaultCards = [
        { title: "Custom Sail Design", text: "Collaborative design process using advanced 3D modeling to create the perfect sail for your cruising or racing needs." },
        { title: "Sail Manufacturing", text: "Precision manufacturing in our state-of-the-art loft, using only the highest quality materials for exceptional durability and performance." },
        { title: "Repair & Servicing", text: "Comprehensive inspection, re-stitching, UV strip replacement, and hardware servicing to extend the life of your sails." },
        { title: "Canvas & Accessories", text: "Custom-fit sail covers, biminis, dodgers, and other marine canvas work designed for a perfect fit and maximum protection." }
    ];

    const cards = content.cards && content.cards.length === 4 ? content.cards : defaultCards;

    return (
        <div className="container py-5">
            <div className="text-center mb-5">
                <h1 className="display-5 fw-bold">{content.title || "Precision Marine Solutions"}</h1>
                <p className="lead text-muted">{content.subtitle || "From world-class custom sails to comprehensive servicing and canvas work."}</p>
            </div>
            <div className="row g-4">
                {cards.map((card, index) => (
                    <div className="col-md-6 col-lg-3" key={index}>
                        <div className="card h-100 text-center shadow-sm">
                            <div className="card-body">
                                <h3 className="h5 card-title">{card.title}</h3>
                                <p className="card-text">{card.text}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ServicesPage;