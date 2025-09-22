import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import { 
    collection, 
    onSnapshot, 
    addDoc, 
    deleteDoc, 
    doc, 
    updateDoc 
} from 'firebase/firestore';

const CustomerManagementTab = () => {
    const [customers, setCustomers] = useState([]);
    const [editingCustomer, setEditingCustomer] = useState(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "customers"), snap => {
            setCustomers(snap.docs.map(d => ({id: d.id, ...d.data()})));
        });
        return () => unsubscribe();
    }, []);

    const handleAdd = async (e) => { 
        e.preventDefault(); 
        const { companyName, contactName, email } = e.target.elements; 
        await addDoc(collection(db, "customers"), { 
            companyName: companyName.value, 
            contactName: contactName.value, 
            email: email.value 
        });
        toast.success("Customer added!");
        e.target.reset(); 
    };
    
    const confirmDelete = (id) => {
        toast((t) => (
            <div className="d-flex flex-column p-2">
                <p className="fw-bold text-center">Delete this customer?</p>
                <p className="text-center small">This action cannot be undone.</p>
                <div className="d-flex justify-content-center gap-2 mt-2">
                    <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => {
                            handleDelete(id);
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

    const handleDelete = async (id) => {
        await deleteDoc(doc(db, "customers", id));
        toast.success("Customer deleted.");
    };
    
    const handleUpdate = async (e) => {
        e.preventDefault();
        const { companyName, contactName, email } = e.target.elements;
        await updateDoc(doc(db, "customers", editingCustomer.id), {
            companyName: companyName.value,
            contactName: contactName.value,
            email: email.value
        });
        toast.success("Customer updated.");
        setEditingCustomer(null);
    };

    return (
        <div>
            <h3 className="h5 mb-3">Add New Customer</h3>
            <form onSubmit={handleAdd} className="row g-3 align-items-end mb-4">
                <div className="col-sm"><input name="companyName" placeholder="Company Name" className="form-control" required /></div>
                <div className="col-sm"><input name="contactName" placeholder="Contact Name" className="form-control" /></div>
                <div className="col-sm"><input type="email" name="email" placeholder="Email" className="form-control" required /></div>
                <div className="col-sm-auto"><button type="submit" className="btn btn-primary">Add</button></div>
            </form>
            <h3 className="h5 mb-3">Existing Customers</h3>
            <div className="table-responsive">
                <table className="table table-striped">
                    <thead>
                        <tr>
                            <th>Company Name</th>
                            <th>Contact Name</th>
                            <th>Email</th>
                            <th>Last Stock Update</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(c => (
                            <tr key={c.id}>
                                <td>{c.companyName}</td>
                                <td>{c.contactName}</td>
                                <td>{c.email}</td>
                                <td>{c.lastStockUpdate ? c.lastStockUpdate.toDate().toLocaleDateString() : 'N/A'}</td>
                                <td>
                                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditingCustomer(c)}>Edit</button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDelete(c.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingCustomer && (
                 <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Edit Customer</h5>
                                <button type="button" className="btn-close" onClick={() => setEditingCustomer(null)}></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Company Name</label>
                                        <input name="companyName" defaultValue={editingCustomer.companyName} className="form-control" required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Contact Name</label>
                                        <input name="contactName" defaultValue={editingCustomer.contactName} className="form-control" />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Email</label>
                                        <input type="email" name="email" defaultValue={editingCustomer.email} className="form-control" required />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditingCustomer(null)}>Close</button>
                                    <button type="submit" className="btn btn-primary">Save changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManagementTab;
