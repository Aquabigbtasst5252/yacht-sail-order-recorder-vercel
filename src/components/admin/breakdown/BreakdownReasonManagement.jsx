// src/components/admin/breakdown/BreakdownReasonManagement.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const BreakdownReasonManagement = () => {
    const [reasons, setReasons] = useState([]);
    const [reasonCode, setReasonCode] = useState('');
    const [reasonText, setReasonText] = useState('');
    const [editingReason, setEditingReason] = useState(null);

    const reasonsCollectionRef = collection(db, 'breakdownReasons');

    const fetchReasons = async () => {
        const data = await getDocs(reasonsCollectionRef);
        setReasons(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    };

    useEffect(() => {
        fetchReasons();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reasonCode || !reasonText) {
            return toast.error('Both reason code and text are required.');
        }

        if (editingReason) {
            const reasonDoc = doc(db, 'breakdownReasons', editingReason.id);
            await updateDoc(reasonDoc, { code: reasonCode, reason: reasonText });
            toast.success('Breakdown reason updated successfully!');
            setEditingReason(null);
        } else {
            await addDoc(reasonsCollectionRef, { code: reasonCode, reason: reasonText });
            toast.success('Breakdown reason added successfully!');
        }

        setReasonCode('');
        setReasonText('');
        fetchReasons();
    };

    const handleEdit = (reason) => {
        setEditingReason(reason);
        setReasonCode(reason.code);
        setReasonText(reason.reason);
    };

    const handleDelete = async (id) => {
        const reasonDoc = doc(db, 'breakdownReasons', id);
        await deleteDoc(reasonDoc);
        toast.success('Breakdown reason deleted successfully!');
        fetchReasons();
    };

    const cancelEdit = () => {
        setEditingReason(null);
        setReasonCode('');
        setReasonText('');
    };

    return (
        <div>
            <form onSubmit={handleSubmit} className="mb-4">
                <div className="mb-3">
                    <label htmlFor="reasonCode" className="form-label">Breakdown Code</label>
                    <input
                        type="text"
                        className="form-control"
                        id="reasonCode"
                        value={reasonCode}
                        onChange={(e) => setReasonCode(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="reasonText" className="form-label">Breakdown Reason</label>
                    <input
                        type="text"
                        className="form-control"
                        id="reasonText"
                        value={reasonText}
                        onChange={(e) => setReasonText(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary me-2">
                    {editingReason ? 'Update' : 'Add'} Reason
                </button>
                {editingReason && (
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
                    {reasons.map((reason) => (
                        <tr key={reason.id}>
                            <td>{reason.code}</td>
                            <td>{reason.reason}</td>
                            <td>
                                <button className="btn btn-sm btn-warning me-2" onClick={() => handleEdit(reason)}>
                                    Edit
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(reason.id)}>
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

export default BreakdownReasonManagement;