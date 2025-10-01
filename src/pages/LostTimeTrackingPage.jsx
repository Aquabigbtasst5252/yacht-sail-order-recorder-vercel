// src/pages/LostTimeTrackingPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LostTimeTrackingPage = ({ user }) => {
    // Form state
    const [startDate, setStartDate] = useState(new Date());
    const [startTime, setStartTime] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const [orderNumber, setOrderNumber] = useState('');
    const [orderQuantity, setOrderQuantity] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedLostTimeCode, setSelectedLostTimeCode] = useState(null);
    const [responsiblePerson, setResponsiblePerson] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data state
    const [employees, setEmployees] = useState([]);
    const [lostTimeCodes, setLostTimeCodes] = useState([]);
    const [lostTimeEntries, setLostTimeEntries] = useState([]);

    // Filter state
    const [filterStartDate, setFilterStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
    const [filterEndDate, setFilterEndDate] = useState(new Date());

    const fetchLostTimeEntries = async () => {
        const entriesCollectionRef = query(collection(db, 'lostTimeEntries'), orderBy('createdAt', 'desc'));
        const data = await getDocs(entriesCollectionRef);
        setLostTimeEntries(data.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    };

    useEffect(() => {
        const fetchDropdownData = async () => {
            // Fetch employees
            const employeesCollectionRef = collection(db, 'employees');
            const empData = await getDocs(employeesCollectionRef);
            const employeeOptions = empData.docs.map(doc => ({
                value: doc.data().number,
                label: `${doc.data().name} (${doc.data().number})`,
                section: doc.data().section
            }));
            setEmployees(employeeOptions);

            // Fetch lost time codes
            const lostTimeCodesCollectionRef = collection(db, 'lostTimeCodes');
            const codeData = await getDocs(lostTimeCodesCollectionRef);
            const codeOptions = codeData.docs.map(doc => ({
                value: doc.data().code,
                label: `${doc.data().code} - ${doc.data().reason}`
            }));
            setLostTimeCodes(codeOptions);
        };

        fetchDropdownData();
        fetchLostTimeEntries();
    }, []);

    const filteredEntries = useMemo(() => {
        return lostTimeEntries.filter(entry => {
            // Add a defensive check here
            if (!entry.startDate) {
                return false;
            }
            const entryDate = entry.startDate.toDate();
            const startOfDay = new Date(filterStartDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(filterEndDate);
            endOfDay.setHours(23, 59, 59, 999);
            return entryDate >= startOfDay && entryDate <= endOfDay;
        });
    }, [lostTimeEntries, filterStartDate, filterEndDate]);

    const handleExportPDF = () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Add black border
        doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

        // Add Logo with specified dimensions
        const logo = '/logo.png';
        doc.addImage(logo, 'PNG', 10, 10, 13, 11); // width 1.3cm, height 1.1cm

        // Add Header Text
        doc.setFontSize(16);
        doc.text("Daily Lost Time Recording Form - Yacht sail Department", pageWidth / 2, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.text("Aqua Dynamics (Pvt) Ltd.", pageWidth / 2, 22, { align: 'center' });

        // Define table columns as per new requirements
        const tableColumn = [
            "Ref. No", "Date", "Order number", "Qty", "employee number",
            "Lost Time Reason", "Start time", "end time", "Signature if responsible person"
        ];
        const tableRows = [];

        // Prepare table rows from filtered entries
        filteredEntries.forEach((entry, index) => {
            const entryData = [
                index + 1, // Ref. No
                entry.startDate ? format(entry.startDate.toDate(), 'yyyy-MM-dd') : '',
                entry.orderNumber,
                entry.orderQuantity,
                entry.epfNumber,
                entry.lostTimeReason,
                entry.startTime ? format(entry.startTime.toDate(), 'HH:mm') : '',
                entry.endTime ? format(entry.endTime.toDate(), 'HH:mm') : '',
                '' // Blank for signature
            ];
            tableRows.push(entryData);
        });

        // Add the table to the PDF
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            theme: 'striped',
            headStyles: { fillColor: [22, 160, 133] },
            styles: { fontSize: 8 },
            columnStyles: {
                8: { cellWidth: 40 }, // Widen the signature column
            }
        });

        doc.save(`lost-time-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this entry?")) {
            try {
                await deleteDoc(doc(db, "lostTimeEntries", id));
                toast.success("Entry deleted successfully!");
                fetchLostTimeEntries(); // Refresh the list
            } catch (error) {
                toast.error("Failed to delete entry. Please try again.");
                console.error("Error deleting document: ", error);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee || !selectedLostTimeCode) {
            return toast.error('Please fill out all required fields.');
        }
        setIsSubmitting(true);

        try {
            await addDoc(collection(db, 'lostTimeEntries'), {
                startDate,
                startTime,
                endDate,
                endTime,
                orderNumber,
                orderQuantity,
                epfNumber: selectedEmployee.value,
                employeeName: selectedEmployee.label.split(' (')[0],
                section: selectedEmployee.section,
                lostTimeCode: selectedLostTimeCode.value,
                lostTimeReason: selectedLostTimeCode.label,
                responsiblePerson,
                createdAt: serverTimestamp()
            });
            toast.success('Lost time entry saved successfully!');
            fetchLostTimeEntries(); // Refresh data
            // Reset form
            setStartDate(new Date());
            setStartTime(new Date());
            setEndDate(new Date());
            setEndTime(new Date());
            setOrderNumber('');
            setOrderQuantity('');
            setSelectedEmployee(null);
            setSelectedLostTimeCode(null);
            setResponsiblePerson('');
        } catch (error) {
            toast.error('Failed to save lost time entry. Please try again.');
            console.error("Error adding document: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="card mb-4">
                <div className="card-header">
                    <h3 className="mb-0">Daily Lost Time Recording Form</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        {/* Form fields remain the same */}
                        <div className="row">
                            <div className="col-md-6 border-end">
                                <p className="mb-1 fw-bold">Start</p>
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Date</label>
                                        <DatePicker selected={startDate} onChange={date => setStartDate(date)} className="form-control" />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Time</label>
                                        <DatePicker selected={startTime} onChange={date => setStartTime(date)} showTimeSelect showTimeSelectOnly timeIntervals={15} timeCaption="Time" dateFormat="h:mm aa" className="form-control" />
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <p className="mb-1 fw-bold">End</p>
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Date</label>
                                        <DatePicker selected={endDate} onChange={date => setEndDate(date)} className="form-control" />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Time</label>
                                        <DatePicker selected={endTime} onChange={date => setEndTime(date)} showTimeSelect showTimeSelectOnly timeIntervals={15} timeCaption="Time" dateFormat="h:mm aa" className="form-control" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Order Number</label>
                            <input type="text" className="form-control" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Order Quantity</label>
                            <input type="number" className="form-control" value={orderQuantity} onChange={e => setOrderQuantity(e.target.value)} />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">EPF Number (Employee)</label>
                            <Select options={employees} value={selectedEmployee} onChange={setSelectedEmployee} isClearable isSearchable placeholder="Search by name or EPF number..." />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Lost Time Code</label>
                             <Select options={lostTimeCodes} value={selectedLostTimeCode} onChange={setSelectedLostTimeCode} isClearable placeholder="Select a lost time code..." />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Signature of Responsible Person</label>
                        <input type="text" className="form-control" value={responsiblePerson} onChange={e => setResponsiblePerson(e.target.value)} />
                    </div>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Entry'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h3 className="mb-0">Lost Time Entries</h3>
                    <div className="d-flex align-items-center">
                        <DatePicker selected={filterStartDate} onChange={date => setFilterStartDate(date)} className="form-control form-control-sm me-2" />
                        <span className="me-2">to</span>
                        <DatePicker selected={filterEndDate} onChange={date => setFilterEndDate(date)} className="form-control form-control-sm me-3" />
                        <button className="btn btn-sm btn-success" onClick={handleExportPDF}>Export PDF</button>
                    </div>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-striped">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Employee</th>
                                    <th>Section</th>
                                    <th>Lost Time Reason</th>
                                    <th>Order #</th>
                                    <th>Duration (mins)</th>
                                    {user.role === 'super_admin' && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.map(entry => {
                                    // Defensive checks for dates before calculating duration
                                    if (!entry.startTime || !entry.endTime || !entry.startDate) {
                                        // Optionally, render a placeholder or skip the row
                                        return (
                                            <tr key={entry.id}>
                                                <td colSpan={user.role === 'super_admin' ? 7 : 6}>
                                                    Invalid data for this entry.
                                                </td>
                                            </tr>
                                        );
                                    }
                                    const duration = (entry.endTime.toDate() - entry.startTime.toDate()) / 60000; // duration in minutes
                                    return (
                                        <tr key={entry.id}>
                                            <td>{format(entry.startDate.toDate(), 'yyyy-MM-dd')}</td>
                                            <td>{entry.employeeName}</td>
                                            <td>{entry.section}</td>
                                            <td>{entry.lostTimeReason}</td>
                                            <td>{entry.orderNumber}</td>
                                            <td>{duration.toFixed(2)}</td>
                                            {user.role === 'super_admin' && (
                                                <td>
                                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(entry.id)}>
                                                        Delete
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LostTimeTrackingPage;