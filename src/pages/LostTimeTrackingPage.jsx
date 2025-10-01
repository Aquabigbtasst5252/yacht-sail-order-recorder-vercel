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
    const [activeFilterStartDate, setActiveFilterStartDate] = useState(filterStartDate);
    const [activeFilterEndDate, setActiveFilterEndDate] = useState(filterEndDate);
    const [activeTab, setActiveTab] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const entriesPerPage = 20;

    const handleSearch = () => {
        setActiveFilterStartDate(filterStartDate);
        setActiveFilterEndDate(filterEndDate);
        setCurrentPage(1); // Reset to first page on new search
    };

    useEffect(() => {
        setCurrentPage(1); // Reset to first page when tab changes
    }, [activeTab]);

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

    const dateFilteredEntries = useMemo(() => {
        return lostTimeEntries.filter(entry => {
            if (!entry.startDate) {
                return false;
            }
            const entryDate = entry.startDate.toDate();
            const startOfDay = new Date(activeFilterStartDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(activeFilterEndDate);
            endOfDay.setHours(23, 59, 59, 999);
            return entryDate >= startOfDay && entryDate <= endOfDay;
        });
    }, [lostTimeEntries, activeFilterStartDate, activeFilterEndDate]);

    const tabFilteredEntries = useMemo(() => {
        if (activeTab === 'All') {
            return dateFilteredEntries;
        }
        return dateFilteredEntries.filter(entry => entry.section === activeTab);
    }, [dateFilteredEntries, activeTab]);

    const totalPages = Math.ceil(tabFilteredEntries.length / entriesPerPage);
    const paginatedEntries = useMemo(() => {
        const startIndex = (currentPage - 1) * entriesPerPage;
        const endIndex = startIndex + entriesPerPage;
        return tabFilteredEntries.slice(startIndex, endIndex);
    }, [tabFilteredEntries, currentPage]);

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
        
        // Filter entries for the PDF based on the current date picker values, not the active search
        const pdfFilteredEntries = lostTimeEntries.filter(entry => {
            if (!entry.startDate) {
                return false;
            }
            const entryDate = entry.startDate.toDate();
            const startOfDay = new Date(filterStartDate); // Use staging filter
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(filterEndDate); // Use staging filter
            endOfDay.setHours(23, 59, 59, 999);
            return entryDate >= startOfDay && entryDate <= endOfDay;
        });

        // Group all date-filtered entries by section for the PDF
        const groupedForPdf = pdfFilteredEntries.reduce((acc, entry) => {
            const section = entry.section || 'Uncategorized';
            if (!acc[section]) {
                acc[section] = [];
            }
            acc[section].push(entry);
            return acc;
        }, {});

        const tableColumn = [
            "Ref. No", "Date", "Order number", "Qty", "employee number",
            "Lost Time Reason", "Start time", "end time", "Signature if responsible person"
        ];

        let startY = 35; // Initial Y position for the first table

        Object.keys(groupedForPdf).sort().forEach(section => {
            const entries = groupedForPdf[section];
            if (entries.length === 0) return;

            if (startY > pageHeight - 40) { // Check for space
                doc.addPage();
                startY = 20;
            }

            doc.setFontSize(14);
            doc.text(section, 14, startY);
            startY += 8;

            const tableRows = [];
            entries.forEach((entry, index) => {
                const entryData = [
                    index + 1,
                    entry.startDate ? format(entry.startDate.toDate(), 'yyyy-MM-dd') : '',
                    entry.orderNumber,
                    entry.orderQuantity,
                    entry.epfNumber,
                    entry.lostTimeReason,
                    entry.startTime ? format(entry.startTime.toDate(), 'HH:mm') : '',
                    entry.endTime ? format(entry.endTime.toDate(), 'HH:mm') : '',
                    ''
                ];
                tableRows.push(entryData);
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: startY,
                theme: 'striped',
                headStyles: { fillColor: [22, 160, 133] },
                styles: { fontSize: 8 },
                columnStyles: { 8: { cellWidth: 40 } }
            });

            startY = doc.lastAutoTable.finalY + 10;
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
                        <DatePicker selected={filterEndDate} onChange={date => setFilterEndDate(date)} className="form-control form-control-sm me-2" />
                        <button className="btn btn-sm btn-primary me-3" onClick={handleSearch}>Search</button>
                        <button className="btn btn-sm btn-success" onClick={handleExportPDF}>Export PDF</button>
                    </div>
                </div>
                <ul className="nav nav-tabs px-3 pt-3" id="lostTimeTab" role="tablist">
                    {['All', 'Sticking', 'Sewing', 'End Control'].map(tabName => (
                        <li className="nav-item" role="presentation" key={tabName}>
                            <button 
                                className={`nav-link ${activeTab === tabName ? 'active' : ''}`} 
                                onClick={() => setActiveTab(tabName)}
                            >
                                {tabName}
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-striped table-bordered">
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
                                {paginatedEntries.map(entry => {
                                    if (!entry.startTime || !entry.endTime || !entry.startDate) {
                                        return (
                                            <tr key={entry.id}>
                                                <td colSpan={user.role === 'super_admin' ? 7 : 6}>
                                                    Invalid data for this entry.
                                                </td>
                                            </tr>
                                        );
                                    }
                                    const duration = (entry.endTime.toDate() - entry.startTime.toDate()) / 60000;
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
                    {totalPages > 1 && (
                        <div className="d-flex justify-content-end align-items-center mt-3">
                            <span className="me-3">
                                Page {currentPage} of {totalPages}
                            </span>
                            <div className="btn-group">
                                <button 
                                    className="btn btn-outline-secondary" 
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </button>
                                <button 
                                    className="btn btn-outline-secondary" 
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default LostTimeTrackingPage;
