import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db, functions, auth } from '../../firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

const UserManagementTab = () => {
    const [users, setUsers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [editingUserId, setEditingUserId] = useState(null);
    const [editName, setEditName] = useState('');
    const [changingPasswordUserId, setChangingPasswordUserId] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    
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
        const warning = "This permanently deletes application data and their login account.";
        toast((t) => (
            <div className="d-flex flex-column p-2">
                <p className="fw-bold text-center">Delete {userName}?</p>
                <p className="text-center small text-danger">{warning}</p>
                <div className="d-flex justify-content-center gap-2 mt-2">
                    <button 
                        className="btn btn-sm btn-danger" 
                        disabled={isActionLoading}
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
        if (!auth.currentUser) {
            toast.error("You must be logged in.");
            return;
        }
        setIsActionLoading(true);
        try {
            const deleteUserFn = httpsCallable(functions, 'adminDeleteUser');
            await deleteUserFn({ userId });
            toast.success('User data deleted successfully.');
        } catch (error) {
            console.error("Error deleting user data: ", error);
            toast.error(`Failed to delete user data: ${error.message}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleChangePasswordClick = (user) => {
        setChangingPasswordUserId(user.id);
        setNewPassword('');
    };

    const handleCancelPasswordClick = () => {
        setChangingPasswordUserId(null);
        setNewPassword('');
    };

    const handleSavePasswordClick = async () => {
        if (!newPassword.trim() || newPassword.length < 6) {
            toast.error("Password must be at least 6 characters long.");
            return;
        }
        if (!auth.currentUser) {
            toast.error("You must be logged in.");
            return;
        }
        setIsActionLoading(true);
        try {
            const updatePasswordFn = httpsCallable(functions, 'adminUpdateUserPassword');
            await updatePasswordFn({ userId: changingPasswordUserId, newPassword });
            toast.success("Password updated successfully.");
            setChangingPasswordUserId(null);
            setNewPassword('');
        } catch (error) {
            console.error("Error updating password:", error);
            toast.error(`Failed to update password: ${error.message}`);
        } finally {
            setIsActionLoading(false);
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
                                        <button className="btn btn-sm btn-success me-2" onClick={handleSaveClick} disabled={isActionLoading}>Save</button>
                                        <button className="btn btn-sm btn-secondary" onClick={handleCancelClick} disabled={isActionLoading}>Cancel</button>
                                    </>
                                ) : changingPasswordUserId === u.id ? (
                                    <div className="d-flex align-items-center">
                                        <input
                                            type="text"
                                            className="form-control form-control-sm me-2"
                                            placeholder="New Password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            style={{width: '120px'}}
                                            disabled={isActionLoading}
                                        />
                                        <button className="btn btn-sm btn-success me-1" onClick={handleSavePasswordClick} disabled={isActionLoading}>Save</button>
                                        <button className="btn btn-sm btn-secondary" onClick={handleCancelPasswordClick} disabled={isActionLoading}>Cancel</button>
                                    </div>
                                ) : (
                                    <>
                                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEditClick(u)} disabled={isActionLoading}>Edit Name</button>
                                    <button className="btn btn-sm btn-outline-warning me-2" onClick={() => handleChangePasswordClick(u)} disabled={isActionLoading}>Reset Pwd</button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDeleteUser(u.id, u.name)} disabled={isActionLoading}>Delete</button>
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
