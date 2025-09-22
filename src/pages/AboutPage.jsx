// src/pages/AboutPage.jsx
import React from 'react';

const AboutPage = () => (
    <div className="container py-5">
        <div className="row align-items-center g-5">
            <div className="col-lg-6">
                <h1 className="display-5 fw-bold">The Art and Science of Sailmaking</h1>
                <p className="lead text-muted mb-4">
                    At Aqua Dynamics, we merge generations of traditional craftsmanship with cutting-edge technology to create sails that are not just powerful, but are extensions of the vessel and the sailor. Our passion is performance, and our promise is quality.
                </p>
                <p>
                    Founded by sailors for sailors, we understand the demand for precision, durability, and speed on the water. Every sail that leaves our loft is a testament to our commitment to excellence, meticulously designed and constructed from the world's most advanced materials.
                </p>
                <p>
                    Our team of master sailmakers, designers, and engineers collaborate closely with clients to deliver bespoke solutions that meet the unique demands of any vessel, from cruising yachts to competitive racing fleets.
                </p>
            </div>
            <div className="col-lg-6">
                <img src="https://images.unsplash.com/photo-1589602518993-9610531557a2?q=80&w=2070&auto=format&fit=crop" className="img-fluid rounded-3 shadow-sm" alt="Sailmaking process" />
            </div>
        </div>
    </div>
);

export default AboutPage;