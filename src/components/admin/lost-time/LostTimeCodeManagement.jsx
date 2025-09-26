// src/components/admin/lost-time/LostTimeCodeManagement.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const LostTimeCodeManagement = () => {
    const [codes, setCodes] = useState([]);
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [editingCode, setEditingCode] = useState(null);

    const codesCollectionRef = collection(db, 'lostTimeCodes');

    const fetchCodes = async () => {
        const data = await getDocs(codesCollectionRef);
        setCodes(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    };

    useEffect(() => {
        fetchCodes();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!code || !description) {
            return toast.error('Both code and description are required.');
        }

        if (editingCode) {
            const codeDoc = doc(db, 'lostTimeCodes', editingCode.id);
            await updateDoc(codeDoc, { code, description });
            toast.success('Lost time code updated successfully!');
            setEditingCode(null);
        } else {
            await addDoc(codesCollectionRef, { code, description });
            toast.success('Lost time code added successfully!');
        }

        setCode('');
        setDescription('');
        fetchCodes();
    };

    const handleEdit = (code) => {
        setEditingCode(code);
        setCode(code.code);
        setDescription(code.description);
    };

    const handleDelete = async (id) => {
        const codeDoc = doc(db, 'lostTimeCodes', id);
        await deleteDoc(codeDoc);
        toast.success('Lost time code deleted successfully!');
        fetchCodes();
    };

    const cancelEdit = () => {
        setEditingCode(null);
        setCode('');
        setDescription('');
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
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="description" className="form-label">Description</label>
                    <input
                        type="text"
                        className="form-control"
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary me-2">
                    {editingCode ? 'Update' : 'Add'} Code
                </button>
                {editingCode && (
                    <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                        Cancel
                    </button>
                )}
            </form>

            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {codes.map((c) => (
                        <tr key={c.id}>
                            <td>{c.code}</td>
                            <td>{c.description}</td>
                            <td>
                                <button className="btn btn-sm btn-warning me-2" onClick={() => handleEdit(c)}>
                                    Edit
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>
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