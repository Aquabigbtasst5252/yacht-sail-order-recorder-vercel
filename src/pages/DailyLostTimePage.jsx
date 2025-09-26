// src/pages/DailyLostTimePage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp, onSnapshot } from 'firebase/firestore';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import toast from 'react-hot-toast';
import { formatDistanceStrict } from 'date-fns';
import { PDFDownloadLink } from '@react-pdf/renderer';
import DailyLostTimeReport from '../components/pdf/DailyLostTimeReport';

const DailyLostTimePage = ({ user }) => {
    const [employees, setEmployees] = useState([]);
    const [lostTimeCodes, setLostTimeCodes] = useState([]);
    const [lostTimeRecords, setLostTimeRecords] = useState([]);
    const [filteredRecords, setFilteredRecords] = useState([]);

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [orderNumber, setOrderNumber] = useState('');
    const [orderQuantity, setOrderQuantity] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedLostTimeCode, setSelectedLostTimeCode] = useState(null);
    const [responsiblePerson, setResponsiblePerson] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState([null, null]);

    useEffect(() => {
        const fetchData = async () => {
            const employeesData = await getDocs(collection(db, 'employees'));
            setEmployees(employeesData.docs.map(doc => ({
                value: doc.id,
                label: `${doc.data().number} - ${doc.data().name}`,
                section: doc.data().section
            })));

            const codesData = await getDocs(collection(db, 'lostTimeCodes'));
            setLostTimeCodes(codesData.docs.map(doc => ({
                value: doc.id,
                label: `${doc.data().code} - ${doc.data().description}`
            })));
        };
        fetchData();

        const unsubscribe = onSnapshot(collection(db, 'dailyLostTime'), (snapshot) => {
            const recordsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setLostTimeRecords(recordsData);
            setFilteredRecords(recordsData);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let filtered = lostTimeRecords;

        if (searchQuery) {
            filtered = filtered.filter(r =>
                r.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.employeeLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.lostTimeCodeLabel.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        const [start, end] = dateRange;
        if (start && end) {
            filtered = filtered.filter(r => {
                const recordStartTime = r.startTime.toDate();
                return recordStartTime >= start && recordStartTime <= end;
            });
        }

        setFilteredRecords(filtered);
    }, [searchQuery, dateRange, lostTimeRecords]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!startDate || !endDate || !orderNumber || !orderQuantity || !selectedEmployee || !selectedLostTimeCode || !responsiblePerson) {
            return toast.error('Please fill out all fields.');
        }
        if (endDate < startDate) {
            return toast.error('End date cannot be before start date.');
        }

        try {
            await addDoc(collection(db, 'dailyLostTime'), {
                startTime: startDate,
                endTime: endDate,
                orderNumber,
                orderQuantity,
                employeeId: selectedEmployee.value,
                employeeLabel: selectedEmployee.label,
                employeeSection: selectedEmployee.section,
                lostTimeCodeId: selectedLostTimeCode.value,
                lostTimeCodeLabel: selectedLostTimeCode.label,
                responsiblePerson,
                recordedBy: user.uid,
                createdAt: serverTimestamp(),
            });

            toast.success('Lost time recorded successfully!');
            setStartDate(new Date());
            setEndDate(new Date());
            setOrderNumber('');
            setOrderQuantity('');
            setSelectedEmployee(null);
            setSelectedLostTimeCode(null);
            setResponsiblePerson('');
        } catch (error) {
            toast.error('Failed to record lost time.');
            console.error("Error adding document: ", error);
        }
    };

    return (
        <div>
            <div className="card mb-4">
                <div className="card-header">
                    <h5 className="card-title">Log Daily Lost Time</h5>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        {/* Form fields remain the same */}
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Start Date & Time</label>
                                <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="MMMM d, yyyy h:mm aa" className="form-control" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">End Date & Time</label>
                                <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="MMMM d, yyyy h:mm aa" className="form-control" />
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Order Number</label>
                                <input type="text" className="form-control" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Order Quantity</label>
                                <input type="number" className="form-control" value={orderQuantity} onChange={(e) => setOrderQuantity(e.target.value)} />
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Employee EPF Number</label>
                                <Select options={employees} value={selectedEmployee} onChange={setSelectedEmployee} isClearable />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Lost Time Code</label>
                                <Select options={lostTimeCodes} value={selectedLostTimeCode} onChange={setSelectedLostTimeCode} isClearable />
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Signature of Responsible Person</label>
                                <input type="text" className="form-control" value={responsiblePerson} onChange={(e) => setResponsiblePerson(e.target.value)} />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary">Save Record</button>
                    </form>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h5 className="card-title">Lost Time Report</h5>
                </div>
                <div className="card-body">
                    <div className="row mb-3 align-items-center">
                        <div className="col-md-5">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by order, employee, or reason..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="col-md-5">
                            <DatePicker
                                selectsRange
                                startDate={dateRange[0]}
                                endDate={dateRange[1]}
                                onChange={(update) => setDateRange(update)}
                                isClearable={true}
                                placeholderText="Filter by date range"
                                className="form-control"
                            />
                        </div>
                        <div className="col-md-2 text-end">
                            <PDFDownloadLink
                                document={<DailyLostTimeReport data={filteredRecords} />}
                                fileName="daily_lost_time_report.pdf"
                            >
                                {({ loading }) => (
                                    <button className="btn btn-secondary" disabled={loading}>
                                        {loading ? 'Loading...' : 'Export PDF'}
                                    </button>
                                )}
                            </PDFDownloadLink>
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-striped">
                            <thead>
                                <tr>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Duration</th>
                                    <th>Order #</th>
                                    <th>Qty</th>
                                    <th>Employee</th>
                                    <th>Section</th>
                                    <th>Lost Time Reason</th>
                                    <th>Responsible Person</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((r) => (
                                    <tr key={r.id}>
                                        <td>{new Date(r.startTime.seconds * 1000).toLocaleString()}</td>
                                        <td>{new Date(r.endTime.seconds * 1000).toLocaleString()}</td>
                                        <td>{formatDistanceStrict(new Date(r.endTime.seconds * 1000), new Date(r.startTime.seconds * 1000))}</td>
                                        <td>{r.orderNumber}</td>
                                        <td>{r.orderQuantity}</td>
                                        <td>{r.employeeLabel}</td>
                                        <td>{r.employeeSection}</td>
                                        <td>{r.lostTimeCodeLabel}</td>
                                        <td>{r.responsiblePerson}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyLostTimePage;