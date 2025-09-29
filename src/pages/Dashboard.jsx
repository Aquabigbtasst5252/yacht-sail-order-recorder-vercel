// src/pages/Dashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getCurrentWeekString } from '../helpers';
import OrderHistoryModal from '../components/modals/OrderHistoryModal'; // Note: We will create this file later

const Dashboard = ({ user }) => {
    const [weeklyOrders, setWeeklyOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingHistoryFor, setViewingHistoryFor] = useState(null);
    const currentWeek = useMemo(() => getCurrentWeekString(), []);

    const getStatusBadgeClass = (status) => {
        const lowerCaseStatus = status?.toLowerCase() || '';
        const primary = [
            'panel received', 'panel sticking', 'sail joint sticking', 'batten pocket sticking',
            'patch sticking', 'loop sticking', 'flat tape sticking', 'insignia stick around sail',
            'luff tape sticking', 'uv sticking', 'foam cover stick'
        ];
        const success = [
            'panel sewing', 'sail joint sewing', 'batten pocket sewing', 'patch sewing',
            'loop sewing', 'flat tape sewing', 'leech / foot taping sewing', 'uv sewing',
            'foam cover sewing', 'luff tape sewing'
        ];
        const info = ['sail recut', 'webbing', 'end control'];
        const warning = ['finished', 'shipped'];
        const danger = ['temporary stop'];

        if (primary.includes(lowerCaseStatus)) return 'bg-primary';
        if (success.includes(lowerCaseStatus)) return 'bg-success';
        if (info.includes(lowerCaseStatus)) return 'bg-info';
        if (warning.includes(lowerCaseStatus)) return 'bg-warning';
        if (danger.includes(lowerCaseStatus)) return 'bg-danger';
        return 'bg-secondary'; // Default color
    };

    useEffect(() => {
        const isCustomer = user.role === 'customer';
        let q;

        if (isCustomer) {
            if (!user.customerCompanyId) {
                setIsLoading(false);
                setWeeklyOrders([]);
                return;
            }
            q = query(collection(db, "orders"), where("customerId", "==", user.customerCompanyId));
        } else {
            q = query(collection(db, "orders"), where("deliveryWeek", "==", currentWeek));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (isCustomer) {
                ordersData = ordersData.filter(order => order.deliveryWeek === currentWeek);
            }

            setWeeklyOrders(ordersData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching weekly orders:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, currentWeek]);


    const ordersByCustomer = useMemo(() => {
        if (user.role === 'customer' || !weeklyOrders) return {};
        return weeklyOrders.reduce((acc, order) => {
            const customer = order.customerCompanyName || 'Unknown Customer';
            if (!acc[customer]) acc[customer] = [];
            acc[customer].push(order);
            return acc;
        }, {});
    }, [weeklyOrders, user.role]);


    return (
        <div className="container-fluid">
            <div className="card">
                <div className="card-header">
                    <h2 className="h5 mb-0">This Week's Production Schedule ({currentWeek})</h2>
                </div>
                <div className="card-body">
                    {isLoading ? (
                        <div className="text-center"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>
                    ) : weeklyOrders.length === 0 ? (
                        <p className="text-muted">No orders scheduled for production this week.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-sm table-hover">
                                <thead>
                                    <tr>
                                        <th>Aqua Order #</th>
                                        {user.role === 'customer' && <th>Customer</th>}
                                        <th>Customer PO</th>
                                        <th>Product</th>
                                        <th>PO Qty</th>
                                        <th>Ship Qty</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                {user.role === 'customer' ? (
                                    <tbody>
                                        {weeklyOrders.map(order => (
                                            <tr key={order.id}>
                                                <td><a href="#" onClick={(e) => { e.preventDefault(); setViewingHistoryFor(order); }}>{order.aquaOrderNumber}</a></td>
                                                <td>{order.customerCompanyName}</td>
                                                <td>{order.customerPO}</td>
                                                <td>{order.productName}</td>
                                                <td>{order.quantity}</td>
                                                <td>{order.shipQty || 'N/A'}</td>
                                                <td><span className={`badge ${getStatusBadgeClass(order.status)}`}>{order.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                ) : (
                                    Object.keys(ordersByCustomer).sort().map(customerName => (
                                        <tbody key={customerName}>
                                            <tr className="table-light">
                                                <th colSpan="5" className="ps-2">{customerName}</th>
                                            </tr>
                                            {ordersByCustomer[customerName].map(order => (
                                                <tr key={order.id}>
                                                    <td><a href="#" onClick={(e) => { e.preventDefault(); setViewingHistoryFor(order); }}>{order.aquaOrderNumber}</a></td>
                                                    <td>{order.customerPO}</td>
                                                    <td>{order.productName}</td>
                                                    <td>{order.quantity}</td>
                                                    <td>{order.shipQty || 'N/A'}</td>
                                                    <td><span className={`badge ${getStatusBadgeClass(order.status)}`}>{order.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    ))
                                )}
                            </table>
                        </div>
                    )}
                </div>
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

export default Dashboard;