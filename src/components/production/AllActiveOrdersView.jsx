// src/components/production/AllActiveOrdersView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import DatePicker from "react-datepicker";
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getWeekStringFromDate } from '../../helpers';
import OrderHistoryModal from '../modals/OrderHistoryModal'; // Note: We will create this file later

const AllActiveOrdersView = ({ user }) => {
    const [activeOrders, setActiveOrders] = useState([]);
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
                setActiveOrders([]);
                return;
            };
            q = query(collection(db, "orders"), where("customerId", "==", user.customerCompanyId));
        } else {
            q = query(collection(db, "orders"), where("status", "not-in", ["Shipped", "Cancelled"]));
        }
        
        const unsub = onSnapshot(q, (snap) => {
            let activeOrdersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            if(isCustomer) {
                activeOrdersData = activeOrdersData.filter(order => order.status !== "Shipped" && order.status !== "Cancelled");
            }

            setActiveOrders(activeOrdersData);
            setIsLoading(false);
        });
        return () => unsub();
    }, [user, isCustomer]);

    const toYYYYMMDD = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleDateChange = async (orderId, newDateString) => {
        if(isCustomer || !newDateString) return;
        const newWeek = getWeekStringFromDate(newDateString);
        await updateDoc(doc(db, "orders", orderId), { 
            deliveryDate: newDateString,
            deliveryWeek: newWeek
        });
    };

    const groupedAndFilteredOrders = useMemo(() => {
        const filtered = activeOrders.filter(order => {
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
            grouped[customer].sort((a,b) => (a.deliveryWeek || "").localeCompare(b.deliveryWeek || ""));
        }
        
        return grouped;
    }, [activeOrders, searchTerm]);

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
                        placeholder="Search active orders..."
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
                            <th style={{width: '200px'}}>Delivery Date (sets week)</th>
                        </tr>
                    </thead>
                    {Object.keys(groupedAndFilteredOrders).sort().map(customerName => (
                        <tbody key={customerName}>
                            <tr className="table-light"><th colSpan="6" className="ps-2">{customerName}</th></tr>
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
                                    <td>
                                        <DatePicker
                                            selected={order.deliveryDate ? new Date(order.deliveryDate.replace(/-/g, '/')) : null}
                                            onChange={(date) => {
                                                const dateString = date ? toYYYYMMDD(date) : '';
                                                handleDateChange(order.id, dateString);
                                            }}
                                            showWeekNumbers
                                            className="form-control form-control-sm"
                                            placeholderText="Select date"
                                            dateFormat="yyyy-MM-dd"
                                            disabled={isCustomer}
                                        />
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

export default AllActiveOrdersView;