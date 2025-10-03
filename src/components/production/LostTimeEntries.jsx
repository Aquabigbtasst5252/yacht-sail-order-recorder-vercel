// src/components/production/LostTimeEntries.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LostTimeEntries = ({ user }) => {
    const [lostTimeEntries, setLostTimeEntries] = useState([]);
    const [filterStartDate, setFilterStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
    const [filterEndDate, setFilterEndDate] = useState(new Date());
    const [searchedStartDate, setSearchedStartDate] = useState(filterStartDate);
    const [searchedEndDate, setSearchedEndDate] = useState(filterEndDate);
    const [activeTab, setActiveTab] = useState('All');

    const sections = useMemo(() => {
        const allSections = lostTimeEntries.map(entry => entry.section).filter(Boolean);
        return ['All', ...[...new Set(allSections)]];
    }, [lostTimeEntries]);

    const fetchLostTimeEntries = async () => {
        const entriesCollectionRef = query(collection(db, 'lostTimeEntries'), orderBy('createdAt', 'desc'));
        const data = await getDocs(entriesCollectionRef);
        setLostTimeEntries(data.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    };

    useEffect(() => {
        fetchLostTimeEntries();
    }, []);

    const handleSearch = () => {
        setSearchedStartDate(filterStartDate);
        setSearchedEndDate(filterEndDate);
    };

    const filteredEntries = useMemo(() => {
        return lostTimeEntries.filter(entry => {
            if (!entry.startDate) {
                return false;
            }
            const entryDate = entry.startDate.toDate();
            const startOfDay = new Date(searchedStartDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(searchedEndDate);
            endOfDay.setHours(23, 59, 59, 999);
            const dateMatches = entryDate >= startOfDay && entryDate <= endOfDay;
            if (!dateMatches) return false;

            if (activeTab === 'All') return true;

            return entry.section === activeTab;
        });
    }, [lostTimeEntries, searchedStartDate, searchedEndDate, activeTab]);

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

        const tableColumn = [
            "Ref. No", "Date", "Order number", "Qty", "employee number",
            "Lost Time Reason", "Start time", "end time", "Signature if responsible person"
        ];

        // Filter entries by date range for the entire PDF
        const dateFilteredEntries = lostTimeEntries.filter(entry => {
            if (!entry.startDate) return false;
            const entryDate = entry.startDate.toDate();
            const startOfDay = new Date(searchedStartDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(searchedEndDate);
            endOfDay.setHours(23, 59, 59, 999);
            return entryDate >= startOfDay && entryDate <= endOfDay;
        });

        // Group entries by section
        const groupedBySection = dateFilteredEntries.reduce((acc, entry) => {
            const section = entry.section || 'Uncategorized';
            if (!acc[section]) {
                acc[section] = [];
            }
            acc[section].push(entry);
            return acc;
        }, {});

        let startY = 35;
        const sectionsToExport = Object.keys(groupedBySection).sort();

        if (sectionsToExport.length === 0) {
            doc.text("No entries found for the selected date range.", 10, startY);
        } else {
            sectionsToExport.forEach((section, index) => {
                if (index > 0) {
                    startY = doc.lastAutoTable.finalY + 15;
                }

                if (startY > pageHeight - 30) {
                    doc.addPage();
                    startY = 15;
                }

                doc.setFontSize(14);
                doc.text(`Section: ${section}`, 10, startY);
                startY += 8;

                const tableRows = groupedBySection[section].map((entry, i) => ([
                    i + 1,
                    format(entry.startDate.toDate(), 'yyyy-MM-dd'),
                    entry.orderNumber,
                    entry.orderQuantity,
                    entry.epfNumber,
                    entry.lostTimeReason,
                    format(entry.startTime.toDate(), 'HH:mm'),
                    format(entry.endTime.toDate(), 'HH:mm'),
                    ''
                ]));

                autoTable(doc, {
                    head: [tableColumn],
                    body: tableRows,
                    startY: startY,
                    theme: 'striped',
                    headStyles: { fillColor: [22, 160, 133] },
                    styles: { fontSize: 8 },
                    columnStyles: {
                        8: { cellWidth: 40 },
                    }
                });
            });
        }

        doc.save(`lost-time-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this entry?")) {
            try {
                await deleteDoc(doc(db, "lostTimeEntries", id));
                toast.success("Entry deleted successfully!");
                fetchLostTimeEntries();
            } catch (error) {
                toast.error("Failed to delete entry. Please try again.");
                console.error("Error deleting document: ", error);
            }
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h3 className="mb-0">Lost Time Entries</h3>
                    <div className="d-flex align-items-center">
                        <DatePicker selected={filterStartDate} onChange={date => setFilterStartDate(date)} className="form-control form-control-sm me-2" />
                        <span className="me-2">to</span>
                        <DatePicker selected={filterEndDate} onChange={date => setFilterEndDate(date)} className="form-control form-control-sm me-3" />
                        <button className="btn btn-sm btn-primary me-2" onClick={handleSearch}>Search</button>
                        <button className="btn btn-sm btn-success" onClick={handleExportPDF}>Export PDF</button>
                    </div>
                </div>
                <ul className="nav nav-tabs card-header-tabs">
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
            </div>
        </div>
    );
};

export default LostTimeEntries;