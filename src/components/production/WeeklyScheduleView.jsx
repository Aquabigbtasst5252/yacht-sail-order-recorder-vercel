import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { getCurrentWeekString } from '../../helpers';
import OrderHistoryModal from '../modals/OrderHistoryModal';

const WeeklyScheduleView = ({ user }) => {
    const [allOrders, setAllOrders] = useState([]);
    const [productionStatuses, setProductionStatuses] = useState([]);
    const [deliveryWeeks, setDeliveryWeeks] = useState([]);
    const [selectedWeek, setSelectedWeek] = useState('');
    const [stoppingOrder, setStoppingOrder] = useState(null);
    const [stopReason, setStopReason] = useState('');
    const [viewingHistoryFor, setViewingHistoryFor] = useState(null);
    const isCustomer = user.role === 'customer';

    useEffect(() => {
        if (!user) return;
        let ordersQuery;

        if (isCustomer) {
            if (!user.customerCompanyId) return;
            ordersQuery = query(collection(db, "orders"), where("customerId", "==", user.customerCompanyId));
        } else {
            ordersQuery = query(collection(db, "orders"), where("status", "!=", "Cancelled"));
        }
        
        const unsubOrders = onSnapshot(ordersQuery, (snap) => {
            let ordersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (isCustomer) {
                ordersData = ordersData.filter(order => order.status !== 'Cancelled');
            }

            setAllOrders(ordersData);
            const weeks = [...new Set(ordersData.map(o => o.deliveryWeek).filter(Boolean))];
            weeks.sort();
            setDeliveryWeeks(weeks);
        });

        const statusesQuery = query(collection(db, "productionStatuses"), orderBy("order"));
        const unsubStatuses = onSnapshot(statusesQuery, (snap) => {
            setProductionStatuses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubOrders(); unsubStatuses(); };
    }, [user, isCustomer]);

    useEffect(() => {
        if (deliveryWeeks.length > 0) {
            const currentWeek = getCurrentWeekString();
            if (deliveryWeeks.includes(currentWeek)) {
                setSelectedWeek(currentWeek);
            } else if (deliveryWeeks.length > 0) {
                setSelectedWeek(deliveryWeeks[0]);
            }
        }
    }, [deliveryWeeks]);
    
    const ordersByCustomer = useMemo(() => {
        if (!selectedWeek || !Array.isArray(allOrders)) return {};
        const weekOrders = allOrders.filter(o => o.deliveryWeek === selectedWeek && o.status?.toLowerCase() !== 'shipped');
        return weekOrders.reduce((acc, order) => {
            const customer = order.customerCompanyName || 'Unknown Customer';
            if (!acc[customer]) acc[customer] = [];
            acc[customer].push(order);
            return acc;
        }, {});
    }, [selectedWeek, allOrders]);

    const shippedOrders = useMemo(() => {
        if (!selectedWeek || !Array.isArray(allOrders)) return [];
        return allOrders.filter(o => o.deliveryWeek === selectedWeek && o.status?.toLowerCase() === 'shipped');
    }, [selectedWeek, allOrders]);

    const updateOrderStatus = async (order, newStatusId, reason = null) => {
        const newStatus = productionStatuses.find(s => s.id === newStatusId);
        if (!newStatus) return;

        const historyRef = collection(db, "orders", order.id, "statusHistory");
        const historyEntry = { status: newStatus.description, changedBy: user.name, timestamp: serverTimestamp(), ...(reason && { reason }) };
        const orderRef = doc(db, "orders", order.id);
        const orderUpdate = { status: newStatus.description, statusId: newStatusId };
        
        const batch = writeBatch(db);
        batch.update(orderRef, orderUpdate);
        batch.set(doc(historyRef), historyEntry);
        await batch.commit();
        toast.success(`Order ${order.aquaOrderNumber} status updated.`);
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
    
    return (
        <div>
            <div className="d-flex justify-content-end align-items-center mb-3">
                <div className="col-md-4">
                    <select className="form-select" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
                        <option value="">Select Delivery Week...</option>
                        {deliveryWeeks.map(week => <option key={week} value={week}>{week}</option>)}
                    </select>
                </div>
            </div>
            {selectedWeek ? (
                <>
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
                                    <th style={{width: '200px'}}>Production Status</th>
                                </tr>
                            </thead>
                            {Object.keys(ordersByCustomer).sort().map(customerName => (
                                <tbody key={customerName}>
                                    <tr className="table-light">
                                        <th colSpan="7" className="ps-2">{customerName}</th>
                                    </tr>
                                    {ordersByCustomer[customerName].map(order => (
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
                                                    disabled={isCustomer || order.status?.toLowerCase() === 'shipped'}
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
                    
                    <hr className="my-4" />

                    <div id="shipped-orders-accordion">
                        <div className="accordion-item">
                            <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#shipped-orders-collapse">Shipped Orders ({shippedOrders.length})</button></h2>
                            <div id="shipped-orders-collapse" className="accordion-collapse collapse">
                                <div className="accordion-body p-0">
                                     <div className="table-responsive"><table className="table table-sm table-hover mb-0">
                                        <thead><tr><th>Aqua Order #</th><th>Customer PO</th><th>Customer</th><th>Order Description</th><th>Qty</th><th>Delivery Date</th><th style={{width: '200px'}}>Status</th></tr></thead>
                                        <tbody>{shippedOrders.map(order => (
                                            <tr key={order.id} className="table-success">
                                                <td>{order.aquaOrderNumber}</td>
                                                <td>{order.customerPO}</td>
                                                <td>{order.customerCompanyName}</td>
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
                                        ))}</tbody>
                                    </table></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : <p className="text-center text-muted">Please select a delivery week.</p>}

            {stoppingOrder && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content"><div className="modal-header"><h5 className="modal-title">Temporary Stop Reason</h5><button type="button" className="btn-close" onClick={() => setStoppingOrder(null)}></button></div>
                            <form onSubmit={handleStopReasonSubmit}><div className="modal-body">
                                <p>Please provide a reason for stopping order: <strong>{stoppingOrder.order.aquaOrderNumber}</strong></p>
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

export default WeeklyScheduleView;
