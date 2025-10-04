// src/pages/ContactPage.jsx
import React from 'react';

const ContactPage = ({ settings }) => {
    const contactContent = settings?.contactContent || {};
    const defaultText = `Aqua Dynamics Sail Loft
123 Maritime Way,
Negombo, Western Province,
Sri Lanka

---
**Phone:**
+94 77 123 4567

**Email:**
sales@aquadynamics.lk

---
**Business Hours:**
Monday - Friday: 8:00 AM - 5:00 PM`;

    return (
        <div className="container py-5">
            <div className="text-center mb-5">
                <h1 className="display-5 fw-bold">Get In Touch</h1>
                <p className="lead text-muted">We're here to help with your next project or answer any questions you may have.</p>
            </div>
            <div className="row g-5">
                <div className="col-lg-6">
                    <h3 className="h4 mb-3">Contact Details</h3>
                    <div style={{ whiteSpace: 'pre-line' }}>
                        {contactContent.text || defaultText}
                    </div>
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
};

export default ContactPage;