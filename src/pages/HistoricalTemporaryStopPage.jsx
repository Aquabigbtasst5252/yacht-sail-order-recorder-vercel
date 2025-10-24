
import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import {
    collectionGroup,
    query,
    where,
    onSnapshot,
    orderBy,
    getDoc
} from 'firebase/firestore';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ExportToExcel from '../components/ExportToExcel';
import { startOfDay, endOfDay } from 'date-fns';

const HistoricalTemporaryStopPage = ({ user }) => {
    const [history, setHistory] = useState([]);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const entriesPerPage = 25;

    useEffect(() => {
        if (!user || !startDate || !endDate) {
            setHistory([]);
            return;
        };

        const q = query(
            collectionGroup(db, "statusHistory"),
            where("status", "==", "Temporary Stop"),
            where("timestamp", ">=", startOfDay(startDate)),
            where("timestamp", "<=", endOfDay(endDate)),
            orderBy("timestamp", "desc")
        );

        const unsub = onSnapshot(q,
            async (snap) => {
                const historyPromises = snap.docs.map(async (doc) => {
                    const historyData = doc.data();
                    const orderRef = doc.ref.parent.parent;
                    const orderSnap = await getDoc(orderRef);
                    const orderData = orderSnap.exists() ? orderSnap.data() : {};
                    return { id: doc.id, ...historyData, ...orderData };
                });
                const combinedData = await Promise.all(historyPromises);
                setHistory(combinedData);
            },
            (error) => {
                console.error("Firestore Error: ", error);
                toast.error("Could not fetch history. The query requires a composite index. Please check the Firestore console.");
            }
        );

        return () => unsub();
    }, [user, startDate, endDate]);

    const handleClearDates = () => {
        setStartDate(null);
        setEndDate(null);
    };

    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = history.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(history.length / entriesPerPage);

    return (
        <div className="card w-100">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap">
                <h5 className="mb-0">Historical Temporary Stop Orders</h5>
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
                    <ExportToExcel orders={history} />
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
                                <th>Reason for Stop</th>
                                <th>Updated By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentEntries.map(entry => (
                                <tr key={entry.id}>
                                    <td>{entry.timestamp?.toDate().toLocaleDateString() || 'N/A'}</td>
                                    <td>{entry.aquaOrderNumber}</td>
                                    <td>{entry.customerPO}</td>
                                    <td>{entry.ifsOrderNo}</td>
                                    <td>{entry.customerCompanyName}</td>
                                    <td>{`${entry.productName} - ${entry.material}`}</td>
                                    <td>{entry.reason}</td>
                                    <td>{entry.changedBy}</td>
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

export default HistoricalTemporaryStopPage;
