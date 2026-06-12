// src/components/modals/OrderHistoryModal.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import OrderAckEmailModal from './OrderAckEmailModal';

const OrderHistoryModal = ({ order, user, onClose }) => {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAckModal, setShowAckModal] = useState(false);

    useEffect(() => {
        const historyQuery = query(collection(db, "orders", order.id, "statusHistory"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(historyQuery, (historySnap) => {
            setHistory(historySnap.docs.map(d => d.data()));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [order.id]);

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header d-flex justify-content-between align-items-center">
                        <h5 className="modal-title mb-0">History for Order: {order.aquaOrderNumber}</h5>
                        <div>
                            {user && user.role !== 'customer' && (
                                <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setShowAckModal(true)}>
                                    Send Ack Email
                                </button>
                            )}
                            <button type="button" className="btn-close" onClick={onClose}></button>
                        </div>
                    </div>
                    <div className="modal-body">
                        <p><strong>Customer:</strong> {order.customerCompanyName}</p>
                        <p><strong>Product:</strong> {`${order.productName} - ${order.material} - ${order.size}`}</p>
                        {isLoading ? (
                             <div className="text-center"><div className="spinner-border" role="status"></div></div>
                        ) : history.length === 0 ? (
                            <p className="text-muted">No status history found for this order.</p>
                        ) : (
                            <table className="table table-striped table-sm">
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>Updated By</th>
                                        <th>Date & Time</th>
                                        <th>Reason for Stop</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((h, i) => (
                                        <tr key={i}>
                                            <td>{h.status}</td>
                                            <td>{h.changedBy}</td>
                                            <td>{h.timestamp?.toDate().toLocaleString() || '...'}</td>
                                            <td>{h.reason || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>

            {showAckModal && (
                <OrderAckEmailModal
                    order={order}
                    user={user}
                    onClose={() => setShowAckModal(false)}
                />
            )}
        </div>
    );
};

export default OrderHistoryModal;