import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import OrderHistoryModal from '../modals/OrderHistoryModal';

const ShippedOrdersView = ({ user }) => {
    const [shippedOrders, setShippedOrders] = useState([]);
    const [productionStatuses, setProductionStatuses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingHistoryFor, setViewingHistoryFor] = useState(null);
    const isCustomer = user.role === 'customer';

    useEffect(() => {
        if (!user) return;
        let q;

        if (isCustomer) {
            if (!user.customerCompanyId) {
                setIsLoading(false);
                setShippedOrders([]);
                return;
            };
            q = query(collection(db, "orders"),
                where("customerId", "==", user.customerCompanyId),
                where("status", "==", "Shipped")
            );
        } else {
            q = query(collection(db, "orders"), where("status", "==", "Shipped"));
        }

        const unsubOrders = onSnapshot(q, (snap) => {
            setShippedOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setIsLoading(false);
        });

        const unsubStatuses = onSnapshot(collection(db, "productionStatuses"), (snap) => {
            setProductionStatuses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubOrders();
            unsubStatuses();
        };
    }, [user, isCustomer]);

    const handleStatusChange = async (order, newStatusId) => {
        const newStatus = productionStatuses.find(s => s.id === newStatusId);
        if (!newStatus) return;

        const historyRef = collection(db, "orders", order.id, "statusHistory");
        const historyEntry = { status: newStatus.description, changedBy: user.name, timestamp: serverTimestamp() };
        const orderRef = doc(db, "orders", order.id);
        const orderUpdate = { status: newStatus.description, statusId: newStatusId };

        const batch = writeBatch(db);
        batch.update(orderRef, orderUpdate);
        batch.set(doc(historyRef), historyEntry);
        await batch.commit();
        toast.success(`Order ${order.aquaOrderNumber} status updated.`);
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
                            <th>IFS Order #</th>
                            <th>Order Description</th>
                            <th>Qty</th>
                            <th>Delivery Date</th>
                            <th style={{width: '200px'}}>Status</th>
                        </tr>
                    </thead>
                    {Object.keys(groupedAndFilteredOrders).sort().map(customerName => (
                        <tbody key={customerName}>
                            <tr className="table-light"><th colSpan="7" className="ps-2">{customerName}</th></tr>
                            {groupedAndFilteredOrders[customerName].map(order => (
                                <tr key={order.id}>
                                    <td>
                                        <a href="#" onClick={(e) => { e.preventDefault(); setViewingHistoryFor(order); }}>
                                            {order.aquaOrderNumber}
                                        </a>
                                    </td>
                                    <td>{order.customerPO}</td>
                                    <td>{order.ifsOrderNo}</td>
                                    <td>{`${order.productName} - ${order.material} - ${order.size}`}</td>
                                    <td>{order.quantity}</td>
                                    <td>{order.deliveryDate}</td>
                                    <td>
                                        <select
                                            className="form-select form-select-sm"
                                            value={order.statusId || ''}
                                            onChange={(e) => handleStatusChange(order, e.target.value)}
                                            disabled={isCustomer}
                                        >
                                            <option value="" disabled>{order.status || 'Change...'}</option>
                                            {getValidStatuses(order).map(s => <option key={s.id} value={s.id}>{s.description}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    ))}
                </table>
            </div>
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
