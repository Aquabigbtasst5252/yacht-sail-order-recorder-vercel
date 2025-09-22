// src/pages/ContactPage.jsx
import React from 'react';

const ContactPage = () => (
    <div className="container py-5">
        <div className="text-center mb-5">
            <h1 className="display-5 fw-bold">Get In Touch</h1>
            <p className="lead text-muted">We're here to help with your next project or answer any questions you may have.</p>
        </div>
        <div className="row g-5">
            <div className="col-lg-6">
                <h3 className="h4 mb-3">Contact Details</h3>
                <p><strong>Aqua Dynamics Sail Loft</strong></p>
                <p>123 Maritime Way,<br />Negombo, Western Province,<br />Sri Lanka</p>
                <hr />
                <p><strong>Phone:</strong><br /> +94 77 123 4567</p>
                <p><strong>Email:</strong><br /> sales@aquadynamics.lk</p>
                <hr />
                <p><strong>Business Hours:</strong><br />Monday - Friday: 8:00 AM - 5:00 PM</p>
            </div>
            <div className="col-lg-6">
                 <h3 className="h4 mb-3">Send Us a Message</h3>
                 <form>
                    <div className="mb-3">
                        <label htmlFor="contactName" className="form-label">Your Name</label>
                        <input type="text" className="form-control" id="contactName" required />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="contactEmail" className="form-label">Email Address</label>
                        <input type="email" className="form-control" id="contactEmail" required />
                    </div>
                     <div className="mb-3">
                        <label htmlFor="contactSubject" className="form-label">Subject</label>
                        <input type="text" className="form-control" id="contactSubject" required />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="contactMessage" className="form-label">Message</label>
                        <textarea className="form-control" id="contactMessage" rows="5" required></textarea>
                    </div>
                    <button type="submit" className="btn btn-primary">Submit Message</button>
                 </form>
            </div>
        </div>
    </div>
);

export default ContactPage;