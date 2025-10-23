import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy
} from 'firebase/firestore';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ExportToExcel from '../components/ExportToExcel';

const TemporaryStopPage = ({ user }) => {
    const [orders, setOrders] = useState([]);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const entriesPerPage = 25;

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, "orders"),
            where("status", "==", "Temporary Stop"),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(q, snap => {
            setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [user]);

    const handleClearDates = () => {
        setStartDate(null);
        setEndDate(null);
    };

    const filteredAndSortedOrders = useMemo(() => {
        let filtered = orders;

        if (startDate && endDate) {
            // Set endDate to the end of the day to include all orders on that day
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);

            filtered = orders.filter(order => {
                const orderDate = order.createdAt?.toDate();
                return orderDate && orderDate >= startDate && orderDate <= endOfDay;
            });
        }

        const parseOrderNumber = (orderString) => {
            if (!orderString) return 0;
            const match = orderString.match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
        };

        return filtered.sort((a, b) => {
            const numA = parseOrderNumber(a.aquaOrderNumber);
            const numB = parseOrderNumber(b.aquaOrderNumber);
            return numB - numA;
        });
    }, [orders, startDate, endDate]);


    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = filteredAndSortedOrders.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(filteredAndSortedOrders.length / entriesPerPage);

    return (
        <div className="card w-100">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap">
                <h5 className="mb-0">Temporary Stop Orders</h5>
                <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
                    <DatePicker
                        selected={startDate}
                        onChange={(date) => setStartDate(date)}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        placeholderText="Start Date"
                        className="form-control"
                    />
                    <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        placeholderText="End Date"
                        className="form-control"
                    />
                     <button className="btn btn-sm btn-outline-secondary" onClick={handleClearDates}>Clear</button>
                </div>
                <div className="ms-3">
                    <ExportToExcel orders={filteredAndSortedOrders} />
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
                                <th>Customer</th>
                                <th>Order Description</th>
                                <th>PO Qty</th>
                                <th>Created By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentEntries.map(order => (
                                <tr key={order.id}>
                                    <td>{order.createdAt?.toDate().toLocaleDateString() || 'N/A'}</td>
                                    <td>{order.aquaOrderNumber}</td>
                                    <td>{order.customerPO}</td>
                                    <td>{order.ifsOrderNo}</td>
                                    <td>{order.customerCompanyName}</td>
                                    <td>{`${order.productName} - ${order.material}`}</td>
                                    <td>{order.quantity}</td>
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
        </div>
    );
};

export default TemporaryStopPage;
