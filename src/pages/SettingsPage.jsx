// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from "firebase/firestore";

const SettingsPage = () => {
    const [settings, setSettings] = useState({ 
        companyName: "", 
        welcomeMessage: "", 
        logoUrl: "", 
        lastSailOrder: 0, 
        lastAccessoryOrder: 0, 
        qcEmailSubject: "", 
        qcEmailBody: "" 
    });
    
    const docRef = doc(db, "settings", "main");

    useEffect(() => {
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                setSettings(prev => ({ ...prev, ...doc.data() }));
            }
        });
        return () => unsubscribe();
    }, []);

    const handleChange = e => {
        setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        const settingsToSave = {
            ...settings,
            lastSailOrder: Number(settings.lastSailOrder),
            lastAccessoryOrder: Number(settings.lastAccessoryOrder)
        };
        await setDoc(docRef, settingsToSave, { merge: true });
        alert("Settings Saved!");
    };

    return (
        <div className="card w-100">
            <div className="card-header"><h2 className="h4 mb-0">Application Settings</h2></div>
            <div className="card-body">
                <div className="row g-4">
                    <div className="col-12">
                        <h3 className="h5">General</h3>
                        <div className="row g-3">
                            <div className="col-md-6"><label className="form-label">Company Name</label><input type="text" name="companyName" value={settings.companyName} onChange={handleChange} className="form-control" /></div>
                            <div className="col-md-6"><label className="form-label">Company Logo URL</label><input type="text" name="logoUrl" value={settings.logoUrl} onChange={handleChange} className="form-control" /></div>
                            <div className="col-12"><label className="form-label">Welcome Message</label><textarea name="welcomeMessage" value={settings.welcomeMessage} onChange={handleChange} rows="3" className="form-control"></textarea></div>
                        </div>
                    </div>
                     <div className="col-12"><hr /></div>
                    <div className="col-12">
                        <h3 className="h5">Order Numbering</h3>
                        <div className="row g-3">
                            <div className="col-md-6"><label className="form-label">Last 'Sail' Order Number</label><input type="number" name="lastSailOrder" value={settings.lastSailOrder} onChange={handleChange} className="form-control" /></div>
                            <div className="col-md-6"><label className="form-label">Last 'Accessory' Order Number</label><input type="number" name="lastAccessoryOrder" value={settings.lastAccessoryOrder} onChange={handleChange} className="form-control" /></div>
                        </div>
                    </div>
                    <div className="col-12"><hr /></div>
                    <div className="col-12">
                         <h3 className="h5">Email Templates</h3>
                         <p className="form-text">Use placeholders: {`{customerName}`}, {`{customerPo}`}, {`{aquaOrderNo}`}</p>
                         <div className="row g-3 mt-1">
                             <div className="col-12"><label className="form-label">QC Photos Subject</label><input type="text" name="qcEmailSubject" value={settings.qcEmailSubject} onChange={handleChange} className="form-control" /></div>
                             <div className="col-12"><label className="form-label">QC Photos Body</label><textarea name="qcEmailBody" value={settings.qcEmailBody} onChange={handleChange} rows="6" className="form-control"></textarea></div>
                         </div>
                    </div>
                </div>
                 <div className="text-end mt-4"><button onClick={handleSave} className="btn btn-primary">Save Settings</button></div>
            </div>
        </div>
    );
};

export default SettingsPage;