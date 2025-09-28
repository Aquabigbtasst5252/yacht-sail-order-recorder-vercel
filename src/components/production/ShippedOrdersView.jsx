// src/components/production/ShippedOrdersView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, writeBatch, serverTimestamp, orderBy } from 'firebase/firestore';
import OrderHistoryModal from '../modals/OrderHistoryModal';

const ShippedOrdersView = ({ user }) => {
    const [shippedOrders, setShippedOrders] = useState([]);
    const [productionStatuses, setProductionStatuses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingHistoryFor, setViewingHistoryFor] = useState(null);
    const [stoppingOrder, setStoppingOrder] = useState(null);
    const [stopReason, setStopReason] = useState('');

    useEffect(() => {
        if (!user) return;

        const ordersQuery = query(collection(db, "orders"), where("status", "==", "Shipped"));
        const unsubOrders = onSnapshot(ordersQuery, (snap) => {
            const ordersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setShippedOrders(ordersData);
            setIsLoading(false);
        });

        const statusesQuery = query(collection(db, "productionStatuses"), orderBy("order"));
        const unsubStatuses = onSnapshot(statusesQuery, (snap) => {
            setProductionStatuses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubOrders();
            unsubStatuses();
        };
    }, [user]);

    const updateOrderStatus = async (order, newStatusId, reason = null) => {
        const newStatus = productionStatuses.find(s => s.id === newStatusId);
        if (!newStatus) return;

        const historyRef = collection(db, "orders", order.id, "statusHistory");
        const historyEntry = {
            status: newStatus.description,
            changedBy: user.name,
            timestamp: serverTimestamp(),
            ...(reason && { reason }),
            revertedFrom: "Shipped"
        };
        const orderRef = doc(db, "orders", order.id);
        const orderUpdate = { status: newStatus.description, statusId: newStatusId };

        const batch = writeBatch(db);
        batch.update(orderRef, orderUpdate);
        batch.set(doc(historyRef), historyEntry);
        await batch.commit();
        toast.success(`Order ${order.aquaOrderNumber} status reverted to "${newStatus.description}".`);
    };

    const handleStatusChange = (order, newStatusId) => {
        const newStatus = productionStatuses.find(s => s.id === newStatusId);
        if (!newStatus) return;

        if (newStatus.description.toLowerCase() === 'temporary stop') {
            setStoppingOrder({ order, newStatusId });
        } else {
            updateOrderStatus(order, newStatusId);
        }
    };

    const handleStopReasonSubmit = async (e) => {
        e.preventDefault();
        if (!stopReason) {
            toast.error("Please provide a reason for stopping the order.");
            return;
        }
        await updateOrderStatus(stoppingOrder.order, stoppingOrder.newStatusId, stopReason);
        setStoppingOrder(null);
        setStopReason('');
    };

    const getValidStatuses = (order) => {
        return productionStatuses.filter(status =>
            order.orderTypeId && order.productId &&
            status.orderTypeIds?.includes(order.orderTypeId) &&
            status.productTypeIds?.includes(order.productId)
        );
    };

    const groupedAndFilteredOrders = useMemo(() => {
        const filtered = shippedOrders.filter(order => {
            if (!searchTerm) return true;
            const lowercasedFilter = searchTerm.toLowerCase();
            return Object.values(order).some(value =>
                String(value).toLowerCase().includes(lowercasedFilter)
            );
        });

        const grouped = filtered.reduce((acc, order) => {
            const customer = order.customerCompanyName || 'Unknown Customer';
            if (!acc[customer]) acc[customer] = [];
            acc[customer].push(order);
            return acc;
        }, {});

        for (const customer in grouped) {
            grouped[customer].sort((a,b) => (a.deliveryDate || "").localeCompare(b.deliveryDate || ""));
        }

        return grouped;
    }, [shippedOrders, searchTerm]);

    if (isLoading) {
        return <div className="text-center"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>;
    }

    return (
        <div>
            <div className="d-flex justify-content-end mb-3">
                <div className="col-md-4">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search shipped orders..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="table-responsive">
                <table className="table table-sm table-hover table-bordered">
                    <thead>
                        <tr>
                            <th>Aqua Order #</th>
                            <th>Customer PO</th>
                            <th>Order Description</th>
                            <th>Qty</th>
                            <th>Delivery Date</th>
                            <th style={{ width: '200px' }}>Revert Status To</th>
                        </tr>
                    </thead>
                    {Object.keys(groupedAndFilteredOrders).sort().map(customerName => (
                        <tbody key={customerName}>
                            <tr className="table-light">
                                <th colSpan="6" className="ps-2">
                                    {customerName} ({groupedAndFilteredOrders[customerName].length} Orders)
                                </th>
                            </tr>
                            {groupedAndFilteredOrders[customerName].map(order => (
                                <tr key={order.id}>
                                    <td>
                                        <a href="#" onClick={(e) => { e.preventDefault(); setViewingHistoryFor(order); }}>
                                            {order.aquaOrderNumber}
                                        </a>
                                    </td>
                                    <td>{order.customerPO}</td>
                                    <td>{`${order.productName} - ${order.material} - ${order.size}`}</td>
                                    <td>{order.quantity}</td>
                                    <td>{order.deliveryDate}</td>
                                    <td>
                                        <select
                                            className="form-select form-select-sm"
                                            value={''} // Always show placeholder
                                            onChange={(e) => handleStatusChange(order, e.target.value)}
                                        >
                                            <option value="" disabled>Change Status...</option>
                                            {getValidStatuses(order).map(s => (
                                                <option key={s.id} value={s.id}>{s.description}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    ))}
                </table>
                {Object.keys(groupedAndFilteredOrders).length === 0 && !isLoading && <p className="text-center text-muted mt-3">No shipped orders found.</p>}
            </div>

            {stoppingOrder && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content"><div className="modal-header"><h5 className="modal-title">Temporary Stop Reason</h5><button type="button" className="btn-close" onClick={() => setStoppingOrder(null)}></button></div>
                            <form onSubmit={handleStopReasonSubmit}><div className="modal-body">
                                <p>Please provide a reason for reverting order: <strong>{stoppingOrder.order.aquaOrderNumber}</strong> to "Temporary Stop".</p>
                                <textarea className="form-control" rows="3" value={stopReason} onChange={(e) => setStopReason(e.target.value)} required />
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setStoppingOrder(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save Reason</button></div></form>
                        </div>
                    </div>
                </div>
            )}

            {viewingHistoryFor && (
                <OrderHistoryModal
                    order={viewingHistoryFor}
                    onClose={() => setViewingHistoryFor(null)}
                />
            )}
        </div>
    );
};

export default ShippedOrdersView;