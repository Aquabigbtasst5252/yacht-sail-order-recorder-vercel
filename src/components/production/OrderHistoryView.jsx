// src/components/production/OrderHistoryView.jsx
import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';

const OrderHistoryView = ({ user }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchedOrder, setSearchedOrder] = useState(null);
    const [orderHistory, setOrderHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;
        setIsLoading(true);
        setError('');
        setSearchedOrder(null);
        setOrderHistory([]);

        try {
            const constraints = [where("aquaOrderNumber", "==", searchQuery)];
            if (user.role === 'customer') {
                if (!user.customerCompanyId) {
                    setError("Customer account is not properly configured.");
                    setIsLoading(false);
                    return;
                }
                constraints.push(where("customerId", "==", user.customerCompanyId));
            }
            const orderQuery = query(collection(db, "orders"), ...constraints);
            
            const querySnapshot = await getDocs(orderQuery);
            if (querySnapshot.empty) {
                setError("Order not found or you do not have permission to view it.");
            } else {
                const orderDoc = querySnapshot.docs[0];
                setSearchedOrder({ id: orderDoc.id, ...orderDoc.data() });
                
                const historyQuery = query(collection(db, "orders", orderDoc.id, "statusHistory"), orderBy("timestamp", "desc"));
                onSnapshot(historyQuery, (historySnap) => {
                    setOrderHistory(historySnap.docs.map(d => d.data()));
                });
            }
        } catch (err) { // This was the line with the error
            console.error(err);
            setError("An error occurred while searching.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <form onSubmit={handleSearch} className="row g-3 justify-content-center mb-4">
                <div className="col-md-5">
                    <input type="text" className="form-control" placeholder="Enter Aqua Order Number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="col-auto">
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Searching...' : 'Search'}</button>
                </div>
            </form>
            {error && <div className="alert alert-danger">{error}</div>}
            {searchedOrder && (
                <div className="card">
                    <div className="card-header"><h5 className="mb-0">History for Order: {searchedOrder.aquaOrderNumber}</h5></div>
                    <div className="card-body">
                        <p><strong>Customer:</strong> {searchedOrder.customerCompanyName}</p>
                        <p><strong>Product:</strong> {`${searchedOrder.productName} - ${searchedOrder.material} - ${searchedOrder.size}`}</p>
                        <table className="table table-striped">
                            <thead><tr><th>Status</th><th>Updated By</th><th>Date & Time</th><th>Reason for Stop</th></tr></thead>
                            <tbody>{orderHistory.map((h, i) => (
                                <tr key={i}>
                                    <td>{h.status}</td>
                                    <td>{h.changedBy}</td>
                                    <td>{h.timestamp?.toDate().toLocaleString() || '...'}</td>
                                    <td>{h.reason || 'N/A'}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderHistoryView;