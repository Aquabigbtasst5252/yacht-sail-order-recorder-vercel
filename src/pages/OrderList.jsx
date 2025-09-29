import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    orderBy, 
    deleteDoc, 
    doc,
    updateDoc
} from 'firebase/firestore';
import QcModal from '../components/modals/QcModal';
import OrderHistoryModal from '../components/modals/OrderHistoryModal';
import IhcDetailsModal from '../components/modals/IhcDetailsModal';

const OrderList = ({ user }) => {
    const [orders, setOrders] = useState([]);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editableShipQty, setEditableShipQty] = useState({});
    const [qcOrder, setQcOrder] = useState(null);
    const [viewingHistoryFor, setViewingHistoryFor] = useState(null);
    const [ihcOrder, setIhcOrder] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const entriesPerPage = 25;
    const isCustomer = user.role === 'customer';

    useEffect(() => {
        if (!user) return;
        let q;
        if (isCustomer) { 
            if (!user.customerCompanyId) return;
            q = query(collection(db, "orders"), where("customerId", "==", user.customerCompanyId));
        } else { 
            q = query(collection(db, "orders"), orderBy("createdAt", "desc")); 
        }
        const unsub = onSnapshot(q, snap => setOrders(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        return () => unsub();
    }, [user, isCustomer]);


    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

    const parseOrderNumber = (orderString) => {
        if (!orderString) return 0;
        const match = orderString.match(/\d+/); 
        return match ? parseInt(match[0], 10) : 0;
    };
    
    const categorizedOrders = useMemo(() => {
        let filtered;
        if (activeTab === 'ihc') {
            filtered = orders.filter(order => order.isIHC === true);
        } else if (activeTab === 'sails') {
            filtered = orders.filter(order => order.orderTypeName?.toLowerCase() === 'sail');
        } else if (activeTab === 'accessories') {
            filtered = orders.filter(order => order.orderTypeName?.toLowerCase() !== 'sail');
        } else {
            filtered = orders;
        }

        return filtered.sort((a, b) => {
            const numA = parseOrderNumber(a.aquaOrderNumber);
            const numB = parseOrderNumber(b.aquaOrderNumber);
            return numB - numA; 
        });
    }, [orders, activeTab]);

    const filteredOrders = useMemo(() => {
        if (!searchTerm) return categorizedOrders;
        const lowercasedFilter = searchTerm.toLowerCase();
        return categorizedOrders.filter(order =>
            Object.values(order).some(value =>
                String(value).toLowerCase().includes(lowercasedFilter)
            )
        );
    }, [categorizedOrders, searchTerm]);
    
    const confirmAction = (message, onConfirm) => {
        toast((t) => (
            <div className="d-flex flex-column p-2">
                <p className="fw-bold text-center">{message}</p>
                <div className="d-flex justify-content-center gap-2 mt-2">
                    <button 
                        className="btn btn-sm btn-primary" 
                        onClick={() => {
                            onConfirm();
                            toast.dismiss(t.id);
                        }}
                    >
                        Yes
                    </button>
                    <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => toast.dismiss(t.id)}
                    >
                        No
                    </button>
                </div>
            </div>
        ));
    };

    const handleDelete = (id) => {
        confirmAction("Are you sure you want to delete this order?", async () => {
            await deleteDoc(doc(db, "orders", id));
            toast.success("Order deleted.");
        });
    };
    
    const handleCancelToggle = (order) => {
        const newStatus = order.status === 'Cancelled' ? 'New' : 'Cancelled';
        const message = newStatus === 'Cancelled'
            ? "Are you sure you want to cancel this order?"
            : "Are you sure you want to reactivate this order?";
            
        confirmAction(message, async () => {
            await updateDoc(doc(db, "orders", order.id), { status: newStatus });
            toast.success(`Order has been ${newStatus.toLowerCase()}.`);
        });
    };

    const handleUpdateOrder = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        await updateDoc(doc(db, "orders", editingOrder.id), data);
        toast.success("Order updated successfully.");
        setEditingOrder(null);
    };

    const handleShipQtyChange = (orderId, value) => {
        setEditableShipQty(prev => ({ ...prev, [orderId]: value }));
    };

    const handleShipQtyUpdate = async (orderId) => {
        if (editableShipQty[orderId] === undefined) return;

        const originalOrder = orders.find(o => o.id === orderId);
        const newQty = editableShipQty[orderId];

        if (originalOrder && originalOrder.shipQty?.toString() === newQty) {
            setEditableShipQty(prev => {
                const newState = { ...prev };
                delete newState[orderId];
                return newState;
            });
            return;
        }

        try {
            await updateDoc(doc(db, "orders", orderId), { shipQty: newQty });
            toast.success("Ship Qty updated successfully.");
            setEditableShipQty(prev => {
                const newState = { ...prev };
                delete newState[orderId];
                return newState;
            });
        } catch (error) {
            toast.error("Failed to update Ship Qty.");
            console.error("Error updating Ship Qty: ", error);
        }
    };
    
    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = filteredOrders.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(filteredOrders.length / entriesPerPage);

    return (
        <div className="card w-100">
            <div className="card-header d-flex justify-content-between align-items-center">
                <ul className="nav nav-tabs card-header-tabs">
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Orders</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'sails' ? 'active' : ''}`} onClick={() => setActiveTab('sails')}>Sails</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'ihc' ? 'active' : ''}`} onClick={() => setActiveTab('ihc')}>IHC Sails</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'accessories' ? 'active' : ''}`} onClick={() => setActiveTab('accessories')}>Accessories</button>
                    </li>
                </ul>
                 <div className="col-md-4">
                    <input
                        type="text"
                        className="form-control"
                        placeholder={`Search in ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="card-body">
                <div className="table-responsive">
                    <table className="table table-striped table-hover table-sm">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Aqua Order No.</th>
                                <th>Customer PO</th>
                                <th>IFS Order No</th>
                                {!isCustomer && <th>Customer</th>}
                                <th>Order Description</th>
                                <th>PO Qty</th>
                                <th>Ship Qty</th>
                                <th>Actions</th>
                                <th>Created By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentEntries.map(order => (
                                <tr key={order.id} className={order.status === 'Cancelled' ? 'table-danger' : ''}>
                                    <td>{order.createdAt?.toDate().toLocaleDateString() || 'N/A'}</td>
                                    <td>
                                        <a href="#" onClick={(e) => { e.preventDefault(); setViewingHistoryFor(order); }}>
                                            {order.aquaOrderNumber}
                                        </a>
                                    </td>
                                    <td>{order.customerPO}</td>
                                    <td>{order.ifsOrderNo}</td>
                                    {!isCustomer && <td>{order.customerCompanyName}</td>}
                                    <td>{`${order.productName} - ${order.material}`}</td>
                                    <td>{order.quantity}</td>
                                    <td>
                                        {user.role === 'super_admin' ? (
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                value={editableShipQty[order.id] ?? (order.shipQty || order.quantity)}
                                                onChange={(e) => handleShipQtyChange(order.id, e.target.value)}
                                                onBlur={() => handleShipQtyUpdate(order.id)}
                                                style={{ width: '80px' }}
                                            />
                                        ) : (
                                            order.shipQty ?? order.quantity
                                        )}
                                    </td>
                                    <td>
                                        {!isCustomer ? (
                                            activeTab === 'ihc' ? (
                                                <button className="btn btn-sm btn-outline-primary me-1" onClick={() => setIhcOrder(order)}>
                                                    Edit IHC Details
                                                </button>
                                            ) : (
                                                <>
                                                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => setEditingOrder(order)}>Edit</button>
                                                    <button className="btn btn-sm btn-outline-danger me-1" onClick={() => handleDelete(order.id)}>Delete</button>
                                                    <button className="btn btn-sm btn-outline-warning me-1" onClick={() => handleCancelToggle(order)}>
                                                        {order.status === 'Cancelled' ? 'Reactivate' : 'Cancel'}
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-info" onClick={() => setQcOrder(order)}>QC</button>
                                                </>
                                            )
                                        ) : (
                                            <button className="btn btn-sm btn-outline-info" onClick={() => setQcOrder(order)}>View QC Photos</button>
                                        )}
                                    </td>
                                    <td>{order.createdBy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <nav>
                    <ul className="pagination justify-content-center">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Previous</button>
                        </li>
                         <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</button>
                        </li>
                    </ul>
                </nav>
            </div>

            {editingOrder && (
                 <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Edit Order: {editingOrder.aquaOrderNumber}</h5>
                                <button type="button" className="btn-close" onClick={() => setEditingOrder(null)}></button>
                            </div>
                            <form onSubmit={handleUpdateOrder}>
                                <div className="modal-body">
                                     <div className="row g-3">
                                        <div className="col-md-6"><label className="form-label">Customer PO</label><input name="customerPO" defaultValue={editingOrder.customerPO} className="form-control" /></div>
                                        <div className="col-md-6"><label className="form-label">IFS Order No</label><input name="ifsOrderNo" defaultValue={editingOrder.ifsOrderNo} className="form-control" /></div>
                                        <div className="col-md-6"><label className="form-label">Material</label><input name="material" defaultValue={editingOrder.material} className="form-control" /></div>
                                        <div className="col-md-6"><label className="form-label">Size</label><input name="size" defaultValue={editingOrder.size} className="form-control" /></div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditingOrder(null)}>Close</button>
                                    <button type="submit" className="btn btn-primary">Save changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            
            {qcOrder && (
                <QcModal
                    order={qcOrder}
                    user={user}
                    onClose={() => setQcOrder(null)}
                />
            )}

            {viewingHistoryFor && (
                <OrderHistoryModal 
                    order={viewingHistoryFor}
                    onClose={() => setViewingHistoryFor(null)}
                />
            )}
            
            {ihcOrder && (
                <IhcDetailsModal
                    order={ihcOrder}
                    user={user}
                    onClose={() => setIhcOrder(null)}
                />
            )}
        </div>
    );
};

export default OrderList;
