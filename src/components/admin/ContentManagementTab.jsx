// src/components/admin/ContentManagementTab.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import toast from 'react-hot-toast';

const ContentManagementTab = () => {
    const [activeSection, setActiveSection] = useState('home');
    const [content, setContent] = useState({
        home: { title: '', subtitle: '' },
        about: { text: '' },
        services: { title: '', subtitle: '', cards: Array(4).fill({ title: '', text: '' }) },
        contact: { text: '' }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const docRef = doc(db, "settings", "main");

    useEffect(() => {
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const servicesData = data.servicesContent || {};
                setContent(prev => ({
                    home: data.homeContent || prev.home,
                    about: data.aboutContent || prev.about,
                    services: {
                        title: servicesData.title || '',
                        subtitle: servicesData.subtitle || '',
                        cards: servicesData.cards && servicesData.cards.length === 4 ? servicesData.cards : prev.services.cards,
                    },
                    contact: data.contactContent || prev.contact,
                }));
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleChange = (page, field, value) => {
        setContent(prev => ({
            ...prev,
            [page]: { ...prev[page], [field]: value }
        }));
    };

    const handleServiceCardChange = (index, field, value) => {
        setContent(prev => {
            const newCards = [...prev.services.cards];
            newCards[index] = { ...newCards[index], [field]: value };
            return {
                ...prev,
                services: { ...prev.services, cards: newCards }
            };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(docRef, {
                homeContent: content.home,
                aboutContent: content.about,
                servicesContent: content.services,
                contactContent: content.contact,
            }, { merge: true });
            toast.success("Content updated successfully!");
        } catch (error) {
            console.error("Error saving content: ", error);
            toast.error("Failed to update content.");
        } finally {
            setSaving(false);
        }
    };

    const renderSection = () => {
        switch (activeSection) {
            case 'home':
                return (
                    <>
                        <div className="mb-3"><label htmlFor="homeTitle" className="form-label">Title</label><input id="homeTitle" type="text" className="form-control" value={content.home.title} onChange={e => handleChange('home', 'title', e.target.value)} /></div>
                        <div className="mb-3"><label htmlFor="homeSubtitle" className="form-label">Subtitle / Slogan</label><textarea id="homeSubtitle" className="form-control" rows="3" value={content.home.subtitle} onChange={e => handleChange('home', 'subtitle', e.target.value)}></textarea></div>
                    </>
                );
            case 'about':
                return (<div className="mb-3"><label htmlFor="aboutText" className="form-label">Main Content</label><textarea id="aboutText" className="form-control" rows="8" value={content.about.text} onChange={e => handleChange('about', 'text', e.target.value)}></textarea></div>);
            case 'services':
                return (
                    <>
                        <div className="mb-3"><label htmlFor="servicesTitle" className="form-label">Main Title</label><input id="servicesTitle" type="text" className="form-control" value={content.services.title} onChange={e => handleChange('services', 'title', e.target.value)} /></div>
                        <div className="mb-3"><label htmlFor="servicesSubtitle" className="form-label">Subtitle</label><textarea id="servicesSubtitle" className="form-control" rows="2" value={content.services.subtitle} onChange={e => handleChange('services', 'subtitle', e.target.value)}></textarea></div>
                        <hr />
                        <h4 className="h6 mb-3">Service Cards</h4>
                        {content.services.cards.map((card, index) => (
                            <div className="card mb-3" key={index}>
                                <div className="card-body">
                                    <h5 className="card-title mb-3">Card {index + 1}</h5>
                                    <div className="mb-3"><label htmlFor={`serviceCardTitle${index}`} className="form-label">Card Title</label><input id={`serviceCardTitle${index}`} type="text" className="form-control" value={card.title} onChange={e => handleServiceCardChange(index, 'title', e.target.value)} /></div>
                                    <div className="mb-3"><label htmlFor={`serviceCardText${index}`} className="form-label">Card Text</label><textarea id={`serviceCardText${index}`} className="form-control" rows="3" value={card.text} onChange={e => handleServiceCardChange(index, 'text', e.target.value)}></textarea></div>
                                </div>
                            </div>
                        ))}
                    </>
                );
            case 'contact':
                return (<div className="mb-3"><label htmlFor="contactText" className="form-label">Contact Details / Address</label><textarea id="contactText" className="form-control" rows="5" value={content.contact.text} onChange={e => handleChange('contact', 'text', e.target.value)}></textarea></div>);
            default:
                return null;
        }
    };

    if (loading) {
        return <div className="text-center p-5"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>;
    }

    return (
        <div>
            <h3 className="h5 mb-4">Public Page Content</h3>
            <ul className="nav nav-pills mb-3"><li className="nav-item"><button className={`nav-link ${activeSection === 'home' ? 'active' : ''}`} onClick={() => setActiveSection('home')}>Home Page</button></li><li className="nav-item"><button className={`nav-link ${activeSection === 'about' ? 'active' : ''}`} onClick={() => setActiveSection('about')}>About Page</button></li><li className="nav-item"><button className={`nav-link ${activeSection === 'services' ? 'active' : ''}`} onClick={() => setActiveSection('services')}>Services Page</button></li><li className="nav-item"><button className={`nav-link ${activeSection === 'contact' ? 'active' : ''}`} onClick={() => setActiveSection('contact')}>Contact Page</button></li></ul>
            <div className="card"><div className="card-body">{renderSection()}</div></div>
            <div className="text-end mt-4"><button onClick={handleSave} className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner-border spinner-border-sm" aria-hidden="true"></span> : 'Save Content'}</button></div>
        </div>
    );
};

export default ContentManagementTab;