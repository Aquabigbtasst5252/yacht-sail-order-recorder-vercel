// src/pages/ComprehensiveReport.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from "firebase/firestore";
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

const ComprehensiveReport = () => {
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
    const [endDate, setEndDate] = useState(new Date());
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // This ref will hold the imperative handles of the report components
    const reportRefs = useRef({});

    useEffect(() => {
        const ordersQuery = query(collection(db, "orders"));
        const unsubscribe = onSnapshot(ordersQuery, (snap) => {
            const ordersData = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                orderDate: d.data().orderDate?.toDate ? d.data().orderDate.toDate() : new Date(d.data().orderDate)
            }));
            setAllOrders(ordersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching orders:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredOrders = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return allOrders.filter(order => {
            if (order.orderDate && typeof order.orderDate.getTime === 'function') {
                return order.orderDate >= start && order.orderDate <= end;
            }
            return false;
        });
    }, [startDate, endDate, allOrders]);

    const handleExportPDF = () => {
        setIsExporting(true);

        // Use a timeout to allow the UI to update before the heavy PDF generation task
        setTimeout(() => {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10;
            let yPos = margin;

            // Header
            const logo = '/logo.png';
            doc.addImage(logo, 'PNG', margin, yPos, 13, 11);
            doc.setFontSize(18);
            doc.text("Comprehensive Report", pageWidth / 2, yPos + 5, { align: 'center' });
            doc.setFontSize(12);
            doc.text("Yacht Sails Department", pageWidth / 2, yPos + 12, { align: 'center' });
            yPos += 20;

            // Date Range
            doc.setFontSize(10);
            const dateRangeStr = `Date Range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`;
            doc.text(dateRangeStr, margin, yPos);
            yPos += 10;

            const reportOrder = [
                'salesByCustomerSails', 'salesByCustomerAccessories', 'monthlyOrdersSails',
                'monthlyOrdersAccessories', 'monthlyMaterialUsageSails', 'monthlyMaterialUsageAccessories',
                'productTypeAnalysisSails', 'productTypeAnalysisAccessories'
            ];

            reportOrder.forEach(key => {
                const report = reportRefs.current[key];
                if (!report || !report.chart || !report.tableData || report.tableData.length === 0) return;

                const { title, tableData, headers, chart } = report;
                const chartImage = chart.toBase64Image();
                const chartHeight = 70;
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
                yPos += chartHeight + 5;

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
        { key: 'salesByCustomerSails', Component: SalesByCustomerSails },
        { key: 'salesByCustomerAccessories', Component: SalesByCustomerAccessories },
        { key: 'monthlyOrdersSails', Component: MonthlyOrdersSails },
        { key: 'monthlyOrdersAccessories', Component: MonthlyOrdersAccessories },
        { key: 'monthlyMaterialUsageSails', Component: MonthlyMaterialUsageSails },
        { key: 'monthlyMaterialUsageAccessories', Component: MonthlyMaterialUsageAccessories },
        { key: 'productTypeAnalysisSails', Component: ProductTypeAnalysisSails },
        { key: 'productTypeAnalysisAccessories', Component: ProductTypeAnalysisAccessories },
    ];

    return (
        <div className="container-fluid">
            <div className="card" id="comprehensive-report-content">
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
                        <div className="text-center py-5">
                            <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
                        </div>
                    ) : (
                        <div className="row">
                            {reportComponents.map(({ key, Component }) => (
                                <Component
                                    key={key}
                                    orders={filteredOrders}
                                    ref={el => (reportRefs.current[key] = el)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComprehensiveReport;