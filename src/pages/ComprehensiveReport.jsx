// src/pages/ComprehensiveReport.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, limit } from "firebase/firestore";
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ComprehensivePDF from '../components/reports/ComprehensivePDF';

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
    const [pdfData, setPdfData] = useState(null);
    const [activeTab, setActiveTab] = useState('salesByCustomerSails');

    const reportRefs = useRef({});

    useEffect(() => {
        setLoading(true);

        const toDateSafe = (timestamp) => {
            if (timestamp && typeof timestamp.toDate === 'function') {
                return timestamp.toDate();
            }
            return null;
        };

        const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1000));
        const unsubOrders = onSnapshot(ordersQuery, (snap) => {
            const data = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                orderDate: toDateSafe(d.data().orderDate),
                createdAt: toDateSafe(d.data().createdAt)
            }));
            setAllOrders(data);
        });

        const breakdownsQuery = query(collection(db, "machineBreakdowns"), orderBy("createdAt", "desc"), limit(1000));
        const unsubBreakdowns = onSnapshot(breakdownsQuery, (snap) => {
            const data = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                startTime: toDateSafe(d.data().startTime),
                endTime: toDateSafe(d.data().endTime)
            }));
            setMachineBreakdowns(data);
        });

        const lostTimeQuery = query(collection(db, "lostTimeEntries"), orderBy("createdAt", "desc"), limit(1000));
        const unsubLostTime = onSnapshot(lostTimeQuery, (snap) => {
            const data = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                startDate: toDateSafe(d.data().startDate),
                startTime: toDateSafe(d.data().startTime),
                endTime: toDateSafe(d.data().endTime)
            }));
            setLostTimeEntries(data);
        });

        const timer = setTimeout(() => setLoading(false), 2500);

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
            let itemDate = item[dateField];
            if (dateField === 'orderDate' && !itemDate) itemDate = item.createdAt;
            if (itemDate && typeof itemDate.getTime === 'function' && !isNaN(itemDate.getTime())) {
                return itemDate >= start && itemDate <= end;
            }
            return false;
        });
    };

    const filteredOrders = useMemo(() => dateRangeFilter(allOrders, 'orderDate'), [startDate, endDate, allOrders]);
    const filteredBreakdowns = useMemo(() => dateRangeFilter(machineBreakdowns, 'startTime'), [startDate, endDate, machineBreakdowns]);
    const filteredLostTime = useMemo(() => dateRangeFilter(lostTimeEntries, 'startDate'), [startDate, endDate, lostTimeEntries]);

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

    const handlePrepareExport = () => {
        flushSync(() => {
            setIsExporting(true);
        });

        const dataForPdf = reportComponents.map(({ key }) => {
            const report = reportRefs.current[key];
            if (!report) return null;
            return {
                key,
                title: report.title,
                chart: report.chart,
                headers: report.headers,
                tableData: report.tableData
            };
        }).filter(Boolean);

        setPdfData(dataForPdf);
    };

    useEffect(() => {
        if (pdfData) {
            const downloadLink = document.getElementById('pdf-download-link');
            if (downloadLink) {
                downloadLink.click();
            }
            setIsExporting(false);
            setPdfData(null);
        }
    }, [pdfData]);

    return (
        <div className="container-fluid">
            <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h2 className="h4 mb-0">Comprehensive Report</h2>
                    <div>
                        <button
                            className="btn btn-sm btn-success"
                            onClick={handlePrepareExport}
                            disabled={loading || isExporting}
                        >
                            {isExporting ? 'Preparing...' : 'Export as PDF'}
                        </button>
                        {pdfData && (
                            <PDFDownloadLink
                                document={<ComprehensivePDF reportData={pdfData} startDate={startDate} endDate={endDate} />}
                                fileName={`comprehensive-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`}
                                id="pdf-download-link"
                                style={{ display: 'none' }}
                            >
                                {({ blob, url, loading, error }) => (loading ? 'Loading document...' : 'Download')}
                            </PDFDownloadLink>
                        )}
                    </div>
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
                            {(isExporting) && (
                                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -1 }}>
                                    {reportComponents.map(({ key, Component, props }) => (
                                        <div key={`export-${key}`} style={{ width: '800px', height: 'auto' }}>
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