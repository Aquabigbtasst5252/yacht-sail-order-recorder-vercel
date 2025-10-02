// src/pages/ComprehensiveReport.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, limit } from "firebase/firestore";
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

        // Fetch the most recent 1000 records to balance performance and data availability
        const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1000));
        const unsubOrders = onSnapshot(ordersQuery, (snap) => {
            const data = snap.docs.map(d => ({
                id: d.id, ...d.data(),
                // Use createdAt for filtering, but keep orderDate for any other logic
                orderDate: d.data().orderDate?.toDate(),
                createdAt: d.data().createdAt?.toDate()
            }));
            setAllOrders(data);
        }, (err) => console.error("Error fetching orders:", err));

        const breakdownsQuery = query(collection(db, "machineBreakdowns"), orderBy("createdAt", "desc"), limit(1000));
        const unsubBreakdowns = onSnapshot(breakdownsQuery, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data(), startTime: d.data().startTime?.toDate(), endTime: d.data().endTime?.toDate() }));
            setMachineBreakdowns(data);
        }, (err) => console.error("Error fetching machine breakdowns:", err));

        const lostTimeQuery = query(collection(db, "lostTimeEntries"), orderBy("createdAt", "desc"), limit(1000));
        const unsubLostTime = onSnapshot(lostTimeQuery, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data(), startDate: d.data().startDate?.toDate(), startTime: d.data().startTime?.toDate(), endTime: d.data().endTime?.toDate() }));
            setLostTimeEntries(data);
        }, (err) => console.error("Error fetching lost time entries:", err));

        const timer = setTimeout(() => setLoading(false), 2500); // Allow time for all queries

        return () => {
            unsubOrders();
            unsubBreakdowns();
            unsubLostTime();
            clearTimeout(timer);
        };
    }, []);

    const dateRangeFilter = (items, dateField) => {
        if (!startDate || !endDate) return items;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return items.filter(item => {
            // Use the specified date field for filtering. Fallback to createdAt for orders if needed.
            let itemDate = item[dateField];
            if (dateField === 'orderDate' && !itemDate) {
                itemDate = item.createdAt;
            }

            if (itemDate && typeof itemDate.getTime === 'function' && !isNaN(itemDate.getTime())) {
                return itemDate >= start && itemDate <= end;
            }
            return false;
        });
    };

    const filteredOrders = useMemo(() => dateRangeFilter(allOrders, 'orderDate'), [startDate, endDate, allOrders]);
    const filteredBreakdowns = useMemo(() => dateRangeFilter(machineBreakdowns, 'startTime'), [startDate, endDate, machineBreakdowns]);
    const filteredLostTime = useMemo(() => dateRangeFilter(lostTimeEntries, 'startDate'), [startDate, endDate, lostTimeEntries]);


    const handleExportPDF = async () => {
        // 1. Set exporting state and use flushSync to force immediate re-render
        flushSync(() => {
            setIsExporting(true);
        });

        // 2. Generate the PDF
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        let yPos = margin;

        // Pre-load the logo
        const logoImg = new Image();
        logoImg.src = '/logo.png';

        try {
            await new Promise((resolve, reject) => {
                logoImg.onload = resolve;
                logoImg.onerror = reject;
            });

            doc.addImage(logoImg, 'PNG', margin, yPos, 13, 11);
            doc.setFontSize(18);
            doc.text("Comprehensive Report", pageWidth / 2, yPos + 5, { align: 'center' });
            doc.setFontSize(12);
            doc.text("Yacht Sails Department", pageWidth / 2, yPos + 12, { align: 'center' });
            yPos += 20;

            doc.setFontSize(10);
            const dateRangeStr = `Date Range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`;
            doc.text(dateRangeStr, margin, yPos);
            yPos += 10;

            for (const { key } of reportComponents) {
                const report = reportRefs.current[key];
                if (!report || !report.chart || !report.tableData || report.tableData.length === 0) continue;

                const { title, tableData, headers, chart } = report;

                if (yPos + 100 > pageHeight - margin) { // Approximate height for chart + table
                    doc.addPage();
                    yPos = margin;
                }

                doc.setFontSize(14);
                doc.text(title, margin, yPos);
                yPos += 8;

                try {
                    const chartImage = chart.toBase64Image();
                    doc.addImage(chartImage, 'PNG', margin, yPos, pageWidth - (margin * 2), 80);
                    yPos += 90;

                    doc.autoTable({
                        head: [headers],
                        body: tableData,
                        startY: yPos,
                        theme: 'striped',
                        headStyles: { fillColor: [22, 160, 133] },
                        margin: { left: margin, right: margin }
                    });
                    yPos = doc.autoTable.previous.finalY + 10;
                } catch (error) {
                    console.error(`Failed to process report section "${title}":`, error);
                    yPos += 10; // Add space to avoid overlap
                }
            }

            doc.save(`comprehensive-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

        } catch (error) {
            console.error("Failed to load logo, PDF generation aborted.", error);
            alert("Error loading assets for PDF. Please try again.");
        } finally {
            // 3. Reset the exporting state
            flushSync(() => {
                setIsExporting(false);
            });
        }
    };

    const reportComponents = useMemo(() => [
        { key: 'salesByCustomerSails', label: 'Sales by Customer (Sails)', Component: SalesByCustomerSails, props: { orders: filteredOrders } },
        { key: 'salesByCustomerAccessories', label: 'Sales by Customer (Acc.)', Component: SalesByCustomerAccessories, props: { orders: filteredOrders } },
        { key: 'monthlyOrdersSails', label: 'Monthly Orders (Sails)', Component: MonthlyOrdersSails, props: { orders: filteredOrders } },
        { key: 'monthlyOrdersAccessories', label: 'Monthly Orders (Acc.)', Component: MonthlyOrdersAccessories, props: { orders: filteredOrders } },
        { key: 'monthlyMaterialUsageSails', label: 'Material Usage (Sails)', Component: MonthlyMaterialUsageSails, props: { orders: filteredOrders } },
        { key: 'monthlyMaterialUsageAccessories', label: 'Material Usage (Acc.)', Component: MonthlyMaterialUsageAccessories, props: { orders: filteredOrders } },
        { key: 'productTypeAnalysisSails', label: 'Product Analysis (Sails)', Component: ProductTypeAnalysisSails, props: { orders: filteredOrders } },
        { key: 'productTypeAnalysisAccessories', label: 'Product Analysis (Acc.)', Component: ProductTypeAnalysisAccessories, props: { orders: filteredOrders } },
        { key: 'machineBreakdown', label: 'Machine Breakdowns', Component: MachineBreakdownReport, props: { breakdowns: filteredBreakdowns } },
        { key: 'lostTime', label: 'Lost Time', Component: LostTimeReport, props: { lostTimeEntries: filteredLostTime } },
    ], [filteredOrders, filteredBreakdowns, filteredLostTime]);

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
                        <div>
                            {isExporting && (
                                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                                    {reportComponents.map(({ key, Component, props }) => (
                                        <div key={key} style={{ width: '800px', height: '600px' }}>
                                            <Component {...props} ref={el => (reportRefs.current[key] = el)} />
                                        </div>
                                    ))}
                                </div>
                            )}

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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComprehensiveReport;