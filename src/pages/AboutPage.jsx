// src/pages/AboutPage.jsx
import React from 'react';

const AboutPage = ({ settings }) => {
    const aboutContent = settings?.aboutContent || {};
    const defaultText = `The Art and Science of Sailmaking...
At Aqua Dynamics, we merge generations of traditional craftsmanship with cutting-edge technology to create sails that are not just powerful, but are extensions of the vessel and the sailor. Our passion is performance, and our promise is quality.

Founded by sailors for sailors, we understand the demand for precision, durability, and speed on the water. Every sail that leaves our loft is a testament to our commitment to excellence, meticulously designed and constructed from the world's most advanced materials.

Our team of master sailmakers, designers, and engineers collaborate closely with clients to deliver bespoke solutions that meet the unique demands of any vessel, from cruising yachts to competitive racing fleets.`;

    return (
        <div className="container py-5">
            <div className="row align-items-center g-5">
                <div className="col-lg-6">
                    <div style={{ whiteSpace: 'pre-line' }}>
                        {aboutContent.text || defaultText}
                    </div>
                </div>
                <div className="col-md-6 mb-4 mb-md-0 d-flex align-items-center justify-content-center bg-light rounded-3" style={{ minHeight: '300px' }}>
                    <div className="text-center text-muted">
                        <i className="bi bi-image fs-1"></i>
                        <p>Image Placeholder</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;