// src/components/admin/breakdown/LostTimeCodeManagement.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const LostTimeCodeManagement = () => {
    const [lostTimeCodes, setLostTimeCodes] = useState([]);
    const [lostTimeCode, setLostTimeCode] = useState('');
    const [lostTimeReason, setLostTimeReason] = useState('');
    const [editingLostTimeCode, setEditingLostTimeCode] = useState(null);

    const lostTimeCodesCollectionRef = collection(db, 'lostTimeCodes');

    const fetchLostTimeCodes = async () => {
        const data = await getDocs(lostTimeCodesCollectionRef);
        setLostTimeCodes(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    };

    useEffect(() => {
        fetchLostTimeCodes();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!lostTimeCode || !lostTimeReason) {
            return toast.error('Both code and reason are required.');
        }

        const lostTimeData = { code: lostTimeCode, reason: lostTimeReason };

        if (editingLostTimeCode) {
            const lostTimeCodeDoc = doc(db, 'lostTimeCodes', editingLostTimeCode.id);
            await updateDoc(lostTimeCodeDoc, lostTimeData);
            toast.success('Lost time code updated successfully!');
            setEditingLostTimeCode(null);
        } else {
            await addDoc(lostTimeCodesCollectionRef, lostTimeData);
            toast.success('Lost time code added successfully!');
        }

        setLostTimeCode('');
        setLostTimeReason('');
        fetchLostTimeCodes();
    };

    const handleEdit = (code) => {
        setEditingLostTimeCode(code);
        setLostTimeCode(code.code);
        setLostTimeReason(code.reason);
    };

    const handleDelete = async (id) => {
        const lostTimeCodeDoc = doc(db, 'lostTimeCodes', id);
        await deleteDoc(lostTimeCodeDoc);
        toast.success('Lost time code deleted successfully!');
        fetchLostTimeCodes();
    };

    const cancelEdit = () => {
        setEditingLostTimeCode(null);
        setLostTimeCode('');
        setLostTimeReason('');
    };

    return (
        <div>
            <form onSubmit={handleSubmit} className="mb-4">
                <div className="mb-3">
                    <label htmlFor="lostTimeCode" className="form-label">Lost Time Code</label>
                    <input
                        type="text"
                        className="form-control"
                        id="lostTimeCode"
                        value={lostTimeCode}
                        onChange={(e) => setLostTimeCode(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="lostTimeReason" className="form-label">Lost Time Reason</label>
                    <input
                        type="text"
                        className="form-control"
                        id="lostTimeReason"
                        value={lostTimeReason}
                        onChange={(e) => setLostTimeReason(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary me-2">
                    {editingLostTimeCode ? 'Update' : 'Add'} Code
                </button>
                {editingLostTimeCode && (
                    <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                        Cancel
                    </button>
                )}
            </form>

            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Reason</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {lostTimeCodes.map((code) => (
                        <tr key={code.id}>
                            <td>{code.code}</td>
                            <td>{code.reason}</td>
                            <td>
                                <button className="btn btn-sm btn-warning me-2" onClick={() => handleEdit(code)}>
                                    Edit
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(code.id)}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default LostTimeCodeManagement;