import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const UserManagementTab = () => {
    const [users, setUsers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [editingUserId, setEditingUserId] = useState(null);
    const [editName, setEditName] = useState('');
    
    useEffect(() => { 
        const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        
        return () => {
            unsubUsers();
            unsubCustomers();
        };
    }, []);

    const handleUpdateField = async (id, field, value) => {
        const updateData = { [field]: value };
        if (field === 'customerCompanyId') {
            const selectedCustomer = customers.find(c => c.id === value);
            updateData.customerCompanyName = selectedCustomer ? selectedCustomer.companyName : '';
        }
        await updateDoc(doc(db, "users", id), updateData);
        toast.success("User updated.");
    };

    const handleEditClick = (user) => {
        setEditingUserId(user.id);
        setEditName(user.name);
    };

    const handleCancelClick = () => {
        setEditingUserId(null);
        setEditName('');
    };

    const handleSaveClick = async () => {
        if (!editName.trim()) {
            toast.error("Name cannot be empty.");
            return;
        }
        await updateDoc(doc(db, "users", editingUserId), { name: editName });
        toast.success("User name updated.");
        setEditingUserId(null);
        setEditName('');
    };

    const confirmDeleteUser = (userId, userName) => {
        const warning = "This only deletes application data, not their login account.";
        toast((t) => (
            <div className="d-flex flex-column p-2">
                <p className="fw-bold text-center">Delete {userName}?</p>
                <p className="text-center small text-danger">{warning}</p>
                <div className="d-flex justify-content-center gap-2 mt-2">
                    <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => {
                            handleDeleteUser(userId);
                            toast.dismiss(t.id);
                        }}
                    >
                        Yes, Delete
                    </button>
                    <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => toast.dismiss(t.id)}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ));
    };

    const handleDeleteUser = async (userId) => {
        try {
            await deleteDoc(doc(db, "users", userId));
            toast.success('User data deleted successfully.');
        } catch (error) {
            console.error("Error deleting user data: ", error);
            toast.error('Failed to delete user data.');
        }
    };

    return (
        <div>
            <h3 className="h5 mb-3">Manage User Roles and Status</h3>
            <div className="table-responsive">
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Assign Customer</th>
                            <th style={{width: "220px"}}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>{users.map(u => (
                        <tr key={u.id}>
                            <td>
                                {editingUserId === u.id ? (
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                ) : (
                                    u.name
                                )}
                            </td>
                            <td>{u.email}</td>
                            <td>
                                <select 
                                    className="form-select form-select-sm" 
                                    value={u.role} 
                                    onChange={e => handleUpdateField(u.id, 'role', e.target.value)}
                                    disabled={editingUserId === u.id}
                                >
                                    <option value="customer">Customer</option>
                                    <option value="production">Production</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </td>
                            <td>
                                <select 
                                    className="form-select form-select-sm" 
                                    value={u.status} 
                                    onChange={e => handleUpdateField(u.id, 'status', e.target.value)}
                                    disabled={editingUserId === u.id}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="active">Active</option>
                                </select>
                            </td>
                            <td>
                                {u.role === 'customer' && (
                                    <select 
                                        className="form-select form-select-sm" 
                                        value={u.customerCompanyId || ''} 
                                        onChange={e => handleUpdateField(u.id, 'customerCompanyId', e.target.value)}
                                        disabled={editingUserId === u.id}
                                    >
                                        <option value="">Not Assigned</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                                    </select>
                                )}
                            </td>
                             <td>
                                {editingUserId === u.id ? (
                                    <>
                                        <button className="btn btn-sm btn-success me-2" onClick={handleSaveClick}>Save</button>
                                        <button className="btn btn-sm btn-secondary" onClick={handleCancelClick}>Cancel</button>
                                    </>
                                ) : (
                                    <>
                                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEditClick(u)}>Edit Name</button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDeleteUser(u.id, u.name)}>Delete</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagementTab;
