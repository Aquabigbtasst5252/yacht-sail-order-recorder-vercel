// src/pages/ComprehensiveReport.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Import all report components
import SalesByCustomerSails from '../components/reports/SalesByCustomerSails';
import SalesByCustomerAccessories from '../components/reports/SalesByCustomerAccessories';
import MonthlyOrdersSails from '../components/reports/MonthlyOrdersSails';
import MonthlyOrdersAccessories from '../components/reports/MonthlyOrdersAccessories';
import MonthlyMaterialUsageSails from '../components/reports/MonthlyMaterialUsageSails';
import MonthlyMaterialUsageAccessories from '../components/reports/MonthlyMaterialUsageAccessories';
import ProductTypeAnalysisSails from '../components/reports/ProductTypeAnalysisSails';
import ProductTypeAnalysisAccessories from '../components/reports/ProductTypeAnalysisAccessories';
import MachineBreakdownReport from '../components/reports/MachineBreakdownReport';
import LostTimeReport from '../components/reports/LostTimeReport';

const ComprehensiveReport = () => {
    const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)));
    const [endDate, setEndDate] = useState(new Date());

    const [allOrders, setAllOrders] = useState([]);
    const [machineBreakdowns, setMachineBreakdowns] = useState([]);
    const [lostTimeEntries, setLostTimeEntries] = useState([]);

    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState('salesByCustomerSails');

    const reportRefs = useRef({});

    useEffect(() => {
        setLoading(true);

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (!startDate || !endDate) return;

        const ordersQuery = query(collection(db, "orders"), where("orderDate", ">=", start), where("orderDate", "<=", end));
        const unsubOrders = onSnapshot(ordersQuery, (snap) => {
            setAllOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), orderDate: d.data().orderDate?.toDate() })));
        }, (err) => console.error("Error fetching orders:", err));

        const breakdownsQuery = query(collection(db, "machineBreakdowns"), where("startTime", ">=", start), where("startTime", "<=", end));
        const unsubBreakdowns = onSnapshot(breakdownsQuery, (snap) => {
            setMachineBreakdowns(snap.docs.map(d => ({ id: d.id, ...d.data(), startTime: d.data().startTime?.toDate(), endTime: d.data().endTime?.toDate() })));
        }, (err) => console.error("Error fetching machine breakdowns:", err));

        const lostTimeQuery = query(collection(db, "lostTimeEntries"), where("startDate", ">=", start), where("startDate", "<=", end));
        const unsubLostTime = onSnapshot(lostTimeQuery, (snap) => {
            setLostTimeEntries(snap.docs.map(d => ({ id: d.id, ...d.data(), startDate: d.data().startDate?.toDate(), startTime: d.data().startTime?.toDate(), endTime: d.data().endTime?.toDate() })));
        }, (err) => console.error("Error fetching lost time entries:", err));

        const timer = setTimeout(() => setLoading(false), 1500);

        return () => {
            unsubOrders();
            unsubBreakdowns();
            unsubLostTime();
            clearTimeout(timer);
        };
    }, [startDate, endDate]);

    const handleExportPDF = () => {
        setIsExporting(true);

        setTimeout(() => {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10;
            let yPos = margin;

            const logo = '/logo.png';
            doc.addImage(logo, 'PNG', margin, yPos, 13, 11);
            doc.setFontSize(18);
            doc.text("Comprehensive Report", pageWidth / 2, yPos + 5, { align: 'center' });
            doc.setFontSize(12);
            doc.text("Yacht Sails Department", pageWidth / 2, yPos + 12, { align: 'center' });
            yPos += 20;

            doc.setFontSize(10);
            const dateRangeStr = `Date Range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`;
            doc.text(dateRangeStr, margin, yPos);
            yPos += 10;

            reportComponents.forEach(({ key }) => {
                const report = reportRefs.current[key];
                if (!report || !report.chart || !report.tableData || report.tableData.length === 0) return;

                const { title, tableData, headers, chart } = report;
                const chartImage = chart.toBase64Image();
                const chartHeight = 80; // Adjusted for a larger chart area
                const tableHeight = (tableData.length + 1) * 5 + 10;
                const sectionHeight = chartHeight + tableHeight + 20;

                if (yPos + sectionHeight > pageHeight - margin) {
                    doc.addPage();
                    yPos = margin;
                }

                doc.setFontSize(14);
                doc.text(title, margin, yPos);
                yPos += 8;

                doc.addImage(chartImage, 'PNG', margin, yPos, pageWidth - (margin * 2), chartHeight);
                yPos += chartHeight + 10;

                doc.autoTable({
                    head: [headers],
                    body: tableData,
                    startY: yPos,
                    theme: 'striped',
                    headStyles: { fillColor: [22, 160, 133] },
                    margin: { left: margin, right: margin }
                });

                yPos = doc.autoTable.previous.finalY + 10;
            });

            doc.save(`comprehensive-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
            setIsExporting(false);
        }, 100);
    };

    const reportComponents = [
        { key: 'salesByCustomerSails', label: 'Sales by Customer (Sails)', Component: SalesByCustomerSails, props: { orders: allOrders } },
        { key: 'salesByCustomerAccessories', label: 'Sales by Customer (Acc.)', Component: SalesByCustomerAccessories, props: { orders: allOrders } },
        { key: 'monthlyOrdersSails', label: 'Monthly Orders (Sails)', Component: MonthlyOrdersSails, props: { orders: allOrders } },
        { key: 'monthlyOrdersAccessories', label: 'Monthly Orders (Acc.)', Component: MonthlyOrdersAccessories, props: { orders: allOrders } },
        { key: 'monthlyMaterialUsageSails', label: 'Material Usage (Sails)', Component: MonthlyMaterialUsageSails, props: { orders: allOrders } },
        { key: 'monthlyMaterialUsageAccessories', label: 'Material Usage (Acc.)', Component: MonthlyMaterialUsageAccessories, props: { orders: allOrders } },
        { key: 'productTypeAnalysisSails', label: 'Product Analysis (Sails)', Component: ProductTypeAnalysisSails, props: { orders: allOrders } },
        { key: 'productTypeAnalysisAccessories', label: 'Product Analysis (Acc.)', Component: ProductTypeAnalysisAccessories, props: { orders: allOrders } },
        { key: 'machineBreakdown', label: 'Machine Breakdowns', Component: MachineBreakdownReport, props: { breakdowns: machineBreakdowns } },
        { key: 'lostTime', label: 'Lost Time', Component: LostTimeReport, props: { lostTimeEntries: lostTimeEntries } },
    ];

    return (
        <div className="container-fluid">
            <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h2 className="h4 mb-0">Comprehensive Report</h2>
                    <button className="btn btn-sm btn-success" onClick={handleExportPDF} disabled={loading || isExporting}>
                        {isExporting ? 'Exporting...' : 'Export as PDF'}
                    </button>
                </div>
                <div className="card-body">
                    <div className="row mb-4 align-items-end">
                        <div className="col-md-3">
                            <label htmlFor="start-date" className="form-label">Start Date</label>
                            <DatePicker id="start-date" selected={startDate} onChange={(date) => setStartDate(date)} className="form-control" />
                        </div>
                        <div className="col-md-3">
                            <label htmlFor="end-date" className="form-label">End Date</label>
                            <DatePicker id="end-date" selected={endDate} onChange={(date) => setEndDate(date)} className="form-control" />
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>
                    ) : (
                        <>
                            <ul className="nav nav-tabs">
                                {reportComponents.map(({ key, label }) => (
                                    <li className="nav-item" key={key}>
                                        <button className={`nav-link ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
                                            {label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="tab-content pt-3">
                                {reportComponents.map(({ key, Component, props }) => (
                                    <div className={`tab-pane fade ${activeTab === key ? 'show active' : ''}`} key={key}>
                                        <div className="row">
                                            <Component {...props} ref={el => (reportRefs.current[key] = el)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComprehensiveReport;