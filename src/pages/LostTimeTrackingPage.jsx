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

    // Machine Breakdown state
    const [machines, setMachines] = useState([]);
    const [breakdownReasons, setBreakdownReasons] = useState([]);
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [selectedBreakdownReason, setSelectedBreakdownReason] = useState(null);

    // Data state
    const [employees, setEmployees] = useState([]);
    const [lostTimeCodes, setLostTimeCodes] = useState([]);
    const [lostTimeEntries, setLostTimeEntries] = useState([]);
    const [filteredEntries, setFilteredEntries] = useState([]);

    // Filter state
    const [filterStartDate, setFilterStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
    const [filterEndDate, setFilterEndDate] = useState(new Date());

    // Pagination and Tab state
    const [currentPage, setCurrentPage] = useState(1);
    const [entriesPerPage] = useState(20);
    const [activeTab, setActiveTab] = useState('All');

    const handleSearch = () => {
        const startOfDay = new Date(filterStartDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filterEndDate);
        endOfDay.setHours(23, 59, 59, 999);
        const results = lostTimeEntries.filter(entry => {
            if (!entry.startDate) return false;
            const entryDate = entry.startDate.toDate();
            return entryDate >= startOfDay && entryDate <= endOfDay;
        });
        setFilteredEntries(results);
        setCurrentPage(1); // Reset to first page on new search
        setActiveTab('All'); // Reset to "All" tab on new search
        toast.success(`${results.length} entries found.`);
    };

    const fetchLostTimeEntries = async () => {
        const entriesCollectionRef = query(collection(db, 'lostTimeEntries'), orderBy('createdAt', 'desc'));
        const data = await getDocs(entriesCollectionRef);
        const allEntries = data.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setLostTimeEntries(allEntries);

        // Default filter on initial load
        const startOfDay = new Date(filterStartDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filterEndDate);
        endOfDay.setHours(23, 59, 59, 999);
        const initialResults = allEntries.filter(entry => {
            if (!entry.startDate) return false;
            const entryDate = entry.startDate.toDate();
            return entryDate >= startOfDay && entryDate <= endOfDay;
        });
        setFilteredEntries(initialResults);
    };

    useEffect(() => {
        const fetchDropdownData = async () => {
            // Fetch employees and group them by section
            const employeesCollectionRef = collection(db, 'employees');
            const empData = await getDocs(employeesCollectionRef);
            const employeesList = empData.docs.map(doc => ({
                value: doc.data().number,
                label: `${doc.data().name} (${doc.data().number})`,
                section: doc.data().section || 'Uncategorized' // Default to Uncategorized
            }));

            // Group employees by section
            const groupedEmployees = employeesList.reduce((acc, employee) => {
                const { section } = employee;
                if (!acc[section]) {
                    acc[section] = [];
                }
                acc[section].push(employee);
                return acc;
            }, {});

            // Format for react-select
            const groupedOptions = Object.keys(groupedEmployees).sort().map(section => ({
                label: section,
                options: groupedEmployees[section]
            }));

            setEmployees(groupedOptions);

            // Fetch lost time codes
            const lostTimeCodesCollectionRef = collection(db, 'lostTimeCodes');
            const codeData = await getDocs(lostTimeCodesCollectionRef);
            const codeOptions = codeData.docs.map(doc => ({
                value: doc.data().code,
                label: `${doc.data().code} - ${doc.data().reason}`
            }));
             // Add machine breakdown as a lost time code
             const allLostTimeCodes = [
                ...codeOptions,
                { value: 'machine_breakdown', label: 'Machine Breakdown' }
            ];
            // Sort the codes alphabetically by label
            allLostTimeCodes.sort((a, b) => a.label.localeCompare(b.label));
            setLostTimeCodes(allLostTimeCodes);

            // Fetch machines
            const machinesCollectionRef = collection(db, 'machines');
            const machineData = await getDocs(machinesCollectionRef);
            const machineOptions = machineData.docs.map(doc => ({
                value: doc.id,
                label: doc.data().name
            }));
            setMachines(machineOptions);

            // Fetch breakdown reasons
            const reasonsCollectionRef = collection(db, 'breakdownReasons');
            const reasonData = await getDocs(reasonsCollectionRef);
            const reasonOptions = reasonData.docs.map(doc => ({
                value: doc.id,
                label: `${doc.data().code} - ${doc.data().reason}`
            }));
            setBreakdownReasons(reasonOptions);
        };

        fetchDropdownData();
        fetchLostTimeEntries();
    }, []);

    // Get unique sections for tabs from all filtered entries
    const sections = useMemo(() => {
        // Regular sections from 'lostTime' entries
        const regularSections = [...new Set(
            filteredEntries
                .filter(entry => entry.type !== 'machineBreakdown' && entry.section)
                .map(entry => entry.section)
        )];

        // Check if there are any machine breakdown entries
        const hasMachineBreakdowns = filteredEntries.some(entry => entry.type === 'machineBreakdown');

        const allTabs = ['All', ...regularSections.sort()];
        if (hasMachineBreakdowns) {
            // Ensure 'Machine Breakdown' is added only once and at the end
            if (!allTabs.includes('Machine Breakdown')) {
                allTabs.push('Machine Breakdown');
            }
        }

        return allTabs;
    }, [filteredEntries]);

    // Filter entries based on the active tab
    const entriesForActiveTab = useMemo(() => {
        if (activeTab === 'All') {
            return filteredEntries;
        }
        if (activeTab === 'Machine Breakdown') {
            return filteredEntries.filter(entry => entry.type === 'machineBreakdown');
        }
        // For other tabs, filter by section but exclude machine breakdowns
        return filteredEntries.filter(
            entry => entry.type !== 'machineBreakdown' && (entry.section || 'Uncategorized') === activeTab
        );
    }, [filteredEntries, activeTab]);

    // Reset page to 1 when tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    // Pagination logic
    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = entriesForActiveTab.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(entriesForActiveTab.length / entriesPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Group all filtered entries for PDF export, not just the current page
    const groupedEntriesForPdf = useMemo(() => {
        // Separate entries by type
        const lostTime = filteredEntries.filter(e => e.type !== 'machineBreakdown');
        const breakdowns = filteredEntries.filter(e => e.type === 'machineBreakdown');

        // Group lost time by section
        const groupedLostTime = lostTime.reduce((acc, entry) => {
            const section = entry.section || 'Uncategorized';
            if (!acc[section]) acc[section] = [];
            acc[section].push(entry);
            return acc;
        }, {});

        return { lostTime: groupedLostTime, breakdowns };
    }, [filteredEntries]);

    const handleExportPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let startY = 35;

        const drawPageHeader = () => {
            doc.rect(5, 5, pageWidth - 10, pageHeight - 10); // Border
            const logo = '/logo.png';
            doc.addImage(logo, 'PNG', 10, 10, 13, 11);
            doc.setFontSize(16);
            doc.text("Daily Lost Time & Machine Breakdown Report", pageWidth / 2, 15, { align: 'center' });
            doc.setFontSize(12);
            doc.text("Aqua Dynamics (Pvt) Ltd.", pageWidth / 2, 22, { align: 'center' });
        };

        const checkNewPage = () => {
            if (startY > pageHeight - 30) {
                doc.addPage();
                drawPageHeader();
                startY = 35;
            }
        };

        drawPageHeader();

        // 1. Lost Time Entries
        doc.setFontSize(14);
        doc.text("Lost Time Entries", 10, startY - 5);
        startY += 5;

        const lostTimeColumn = ["Ref.", "Date", "Order #", "Qty", "Employee", "Lost Time Reason", "Start", "End", "Duration (mins)"];
        Object.entries(groupedEntriesForPdf.lostTime).forEach(([section, entries]) => {
            checkNewPage();
            doc.setFontSize(12);
            doc.text(`Section: ${section}`, 10, startY - 5);

            const tableRows = entries.map((entry, index) => {
                const duration = (entry.endTime.toDate() - entry.startTime.toDate()) / 60000;
                return [
                    index + 1,
                    format(entry.startDate.toDate(), 'yyyy-MM-dd'),
                    entry.orderNumber,
                    entry.orderQuantity,
                    entry.employeeName,
                    entry.lostTimeReason,
                    format(entry.startTime.toDate(), 'HH:mm'),
                    format(entry.endTime.toDate(), 'HH:mm'),
                    duration.toFixed(2)
                ];
            });

            autoTable(doc, {
                head: [lostTimeColumn],
                body: tableRows,
                startY: startY,
                theme: 'striped',
                headStyles: { fillColor: [22, 160, 133] },
                styles: { fontSize: 8 },
            });
            startY = doc.lastAutoTable.finalY + 15;
        });

        // 2. Machine Breakdown Entries
        if (groupedEntriesForPdf.breakdowns.length > 0) {
            checkNewPage();
            startY += 10; // Add some space
            checkNewPage();
            doc.setFontSize(14);
            doc.text("Machine Breakdown Entries", 10, startY - 5);
            startY += 5;

            const breakdownColumn = ["Ref.", "Date", "Machine", "Breakdown Reason", "Operator", "Start", "End", "Duration (mins)"];
            const breakdownRows = groupedEntriesForPdf.breakdowns.map((entry, index) => {
                const duration = (entry.endTime.toDate() - entry.startTime.toDate()) / 60000;
                return [
                    index + 1,
                    format(entry.startDate.toDate(), 'yyyy-MM-dd'),
                    entry.machineName,
                    entry.breakdownReason,
                    entry.employeeName,
                    format(entry.startTime.toDate(), 'HH:mm'),
                    format(entry.endTime.toDate(), 'HH:mm'),
                    duration.toFixed(2)
                ];
            });

            autoTable(doc, {
                head: [breakdownColumn],
                body: breakdownRows,
                startY: startY,
                theme: 'striped',
                headStyles: { fillColor: [203, 67, 53] }, // Different color for breakdown
                styles: { fontSize: 8 },
            });
        }

        doc.save(`lost-time-and-breakdown-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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

        const isMachineBreakdown = selectedLostTimeCode.value === 'machine_breakdown';

        if (isMachineBreakdown && (!selectedMachine || !selectedBreakdownReason)) {
            return toast.error('Please select a machine and breakdown reason.');
        }

        setIsSubmitting(true);

        const entryData = {
            startDate,
            startTime,
            endDate,
            endTime,
            orderNumber,
            orderQuantity,
            epfNumber: selectedEmployee.value,
            employeeName: selectedEmployee.label.split(' (')[0],
            section: isMachineBreakdown ? 'Machine Breakdown' : selectedEmployee.section,
            lostTimeCode: selectedLostTimeCode.value,
            lostTimeReason: selectedLostTimeCode.label,
            responsiblePerson,
            type: isMachineBreakdown ? 'machineBreakdown' : 'lostTime',
            createdAt: serverTimestamp()
        };

        if (isMachineBreakdown) {
            entryData.machineName = selectedMachine.label;
            entryData.breakdownReason = selectedBreakdownReason.label;
        }

        try {
            await addDoc(collection(db, 'lostTimeEntries'), entryData);
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
            setSelectedMachine(null);
            setSelectedBreakdownReason(null);
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

                        {selectedLostTimeCode && selectedLostTimeCode.value === 'machine_breakdown' && (
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Machine Name</label>
                                    <Select options={machines} value={selectedMachine} onChange={setSelectedMachine} isClearable placeholder="Select a machine..." />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Breakdown Reason</label>
                                    <Select options={breakdownReasons} value={selectedBreakdownReason} onChange={setSelectedBreakdownReason} isClearable placeholder="Select a reason..." />
                                </div>
                            </div>
                        )}

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
                        <button className="btn btn-sm btn-primary me-2" onClick={handleSearch}>Search</button>
                        <button className="btn btn-sm btn-success" onClick={handleExportPDF} disabled={filteredEntries.length === 0}>Export PDF</button>
                    </div>
                </div>
                <div className="card-body">
                    <ul className="nav nav-tabs">
                        {sections.map(section => (
                            <li className="nav-item" key={section}>
                                <button
                                    className={`nav-link ${activeTab === section ? 'active' : ''}`}
                                    onClick={() => setActiveTab(section)}
                                >
                                    {section}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="tab-content mt-3">
                        <div className="table-responsive">
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        {activeTab === 'Machine Breakdown' ? (
                                            <>
                                                <th>Machine Name</th>
                                                <th>Breakdown Reason</th>
                                                <th>Operator</th>
                                            </>
                                        ) : (
                                            <>
                                                <th>Employee</th>
                                                <th>Section</th>
                                                <th>Lost Time Reason</th>
                                            </>
                                        )}
                                        <th>Order #</th>
                                        <th>Duration (mins)</th>
                                        {user.role === 'super_admin' && <th>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentEntries.length > 0 ? (
                                        currentEntries.map(entry => {
                                            if (!entry.startTime || !entry.endTime || !entry.startDate) {
                                                return (
                                                    <tr key={entry.id}>
                                                        <td colSpan={user.role === 'super_admin' ? 7 : 6}>
                                                            Invalid data for this entry.
                                                        </td>
                                                        {user.role === 'super_admin' && (
                                                            <td>
                                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(entry.id)}>Delete</button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            }
                                            const duration = (entry.endTime.toDate() - entry.startTime.toDate()) / 60000;
                                            return (
                                                <tr key={entry.id}>
                                                    <td>{format(entry.startDate.toDate(), 'yyyy-MM-dd')}</td>
                                                    {activeTab === 'Machine Breakdown' ? (
                                                        <>
                                                            <td>{entry.machineName}</td>
                                                            <td>{entry.breakdownReason}</td>
                                                            <td>{entry.employeeName}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td>{entry.employeeName}</td>
                                                            <td>{entry.section}</td>
                                                            <td>{entry.lostTimeReason}</td>
                                                        </>
                                                    )}
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
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={user.role === 'super_admin' ? 7 : 6} className="text-center">
                                                No entries found for this section.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <nav>
                                <ul className="pagination justify-content-center">
                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                        <button onClick={() => paginate(currentPage - 1)} className="page-link">
                                            Previous
                                        </button>
                                    </li>
                                    {[...Array(totalPages).keys()].map(number => (
                                        <li key={number + 1} className={`page-item ${currentPage === number + 1 ? 'active' : ''}`}>
                                            <button onClick={() => paginate(number + 1)} className="page-link">
                                                {number + 1}
                                            </button>
                                        </li>
                                    ))}
                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                        <button onClick={() => paginate(currentPage + 1)} className="page-link">
                                            Next
                                        </button>
                                    </li>
                                </ul>
                            </nav>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default LostTimeTrackingPage;