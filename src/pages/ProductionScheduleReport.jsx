// src/pages/ProductionScheduleReport.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import logo from '/logo.png';

// --- PDF Document Component ---
const SchedulePDFDocument = ({ ordersByCustomer, selectedWeekLabel }) => {
    const styles = StyleSheet.create({
        page: { paddingTop: 35, paddingBottom: 65, paddingHorizontal: 30, fontSize: 10, fontFamily: 'Helvetica' },
        headerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#111', paddingBottom: 10 },
        logo: { width: 50, height: 50, marginRight: 20 },
        title: { fontSize: 18, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
        customerHeader: { fontSize: 12, backgroundColor: '#f0f0f0', padding: 5, marginTop: 10, fontFamily: 'Helvetica-Bold' },
        table: { display: 'table', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0 },
        tableRow: { flexDirection: 'row' },
        tableColHeader: { width: '14.28%', borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: '#e0e0e0', padding: 5, fontFamily: 'Helvetica-Bold' },
        tableCol: { width: '14.28%', borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, padding: 5 },
        descriptionCol: { width: '28.56%' },
        footer: { position: 'absolute', bottom: 30, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, color: 'grey' }
    });

    const descriptionColStyle = {...styles.tableCol, ...styles.descriptionCol};
    const descriptionHeaderStyle = {...styles.tableColHeader, ...styles.descriptionCol};

    return (
        <Document>
            <Page style={styles.page} orientation="landscape">
                <View style={styles.headerContainer} fixed>
                    <Image style={styles.logo} src={logo} />
                    <Text style={styles.title}>{selectedWeekLabel} - Yacht Sail Production Schedule</Text>
                </View>
                <View style={styles.table}>
                    <View style={styles.tableRow} fixed>
                        <Text style={styles.tableColHeader}>Aqua Order #</Text>
                        <Text style={styles.tableColHeader}>Customer PO</Text>
                        <Text style={styles.tableColHeader}>IFS Order #</Text>
                        <Text style={descriptionHeaderStyle}>Order Description</Text>
                        <Text style={styles.tableColHeader}>PO Qty</Text>
                        <Text style={styles.tableColHeader}>Ship Qty</Text>
                        <Text style={styles.tableColHeader}>Delivery Date</Text>
                    </View>
                    {Object.keys(ordersByCustomer).sort().map(customerName => (
                        <View key={customerName} break={false}>
                            <Text style={styles.customerHeader}>{customerName}</Text>
                            {ordersByCustomer[customerName].map(order => (
                                <View style={styles.tableRow} key={order.id}>
                                    <Text style={styles.tableCol}>{order.aquaOrderNumber || ''}</Text>
                                    <Text style={styles.tableCol}>{order.customerPO || ''}</Text>
                                    <Text style={styles.tableCol}>{order.ifsOrderNo || ''}</Text>
                                    <Text style={descriptionColStyle}>{`${order.productName || ''} - ${order.material || ''} - ${order.size || ''}`}</Text>
                                    <Text style={styles.tableCol}>{order.quantity ?? ''}</Text>
                                    <Text style={styles.tableCol}>{order.shipQty ?? order.quantity ?? ''}</Text>
                                    <Text style={styles.tableCol}>{order.deliveryDate ?? ''}</Text>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
                <View style={styles.footer} fixed>
                    <Text>Prepared By Chamal Madushanke</Text>
                    <Text render={({ pageNumber, totalPages }) => (`Page ${pageNumber} of ${totalPages}`)} />
                </View>
            </Page>
        </Document>
    );
};

const getWeek = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const getCurrentWeek = () => {
    const now = new Date();
    const year = now.getFullYear();
    const week = getWeek(now);
    return `${year}-${String(week).padStart(2, '0')}`;
};

// --- Main Production Schedule Report Page Component ---
const ProductionScheduleReport = () => {
    const [allOrders, setAllOrders] = useState([]);
    const [deliveryWeeks, setDeliveryWeeks] = useState([]);
    const [selectedWeek, setSelectedWeek] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const ordersQuery = query(collection(db, "orders"), where("status", "!=", "Cancelled"));
        const unsubscribe = onSnapshot(ordersQuery, (snap) => {
            const ordersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllOrders(ordersData);
            // Filter out shipped orders before generating the list of weeks
            const nonShippedOrders = ordersData.filter(o => o.status?.toLowerCase() !== 'shipped');
            const weeks = [...new Set(nonShippedOrders.map(o => o.deliveryWeek).filter(Boolean))];
            weeks.sort();
            setDeliveryWeeks(weeks);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (deliveryWeeks.length > 0 && !selectedWeek) {
            const currentWeek = getCurrentWeek();
            if (deliveryWeeks.includes(currentWeek)) {
                setSelectedWeek(currentWeek);
            } else {
                const futureWeeks = deliveryWeeks.filter(w => w > currentWeek);
                if (futureWeeks.length > 0) {
                    setSelectedWeek(futureWeeks[0]);
                } else if (deliveryWeeks.length > 0) {
                    setSelectedWeek(deliveryWeeks[deliveryWeeks.length - 1]);
                }
            }
        }
    }, [deliveryWeeks, selectedWeek]);

    const ordersByCustomer = useMemo(() => {
        if (!selectedWeek || !allOrders.length) return {};
        const weekOrders = allOrders.filter(o => o.deliveryWeek === selectedWeek && o.status?.toLowerCase() !== 'shipped');
        return weekOrders.reduce((acc, order) => {
            const customer = order.customerCompanyName || 'Unknown Customer';
            if (!acc[customer]) acc[customer] = [];
            acc[customer].push(order);
            return acc;
        }, {});
    }, [selectedWeek, allOrders]);

    const weekOptions = useMemo(() => {
        return deliveryWeeks.map(weekId => {
            if (typeof weekId !== 'string' || !weekId.includes('-')) return null;
            const [year, weekNumber] = weekId.split('-');
            const parsedWeekNumber = parseInt(weekNumber, 10);
            if (isNaN(parsedWeekNumber)) return null;
            return {
                value: weekId,
                label: `Week ${parsedWeekNumber}, ${year}`
            };
        }).filter(Boolean);
    }, [deliveryWeeks]);

    const selectedWeekLabel = weekOptions.find(opt => opt.value === selectedWeek)?.label || 'Production Schedule';

    return (
        <div className="container-fluid">
            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="card">
                        <div className="card-header"><h2 className="h4 mb-0">Production Schedule Report</h2></div>
                        <div className="card-body text-center">
                            <p className="card-text text-muted">Select a delivery week to view the schedule or download it as a PDF.</p>
                            <div className="my-4">
                                <label htmlFor="week-select" className="form-label fw-bold">Delivery Week</label>
                                <select id="week-select" className="form-select form-select-lg" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} disabled={isLoading}>
                                    <option value="">{isLoading ? "Loading weeks..." : "Choose a week..."}</option>
                                    {weekOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                            <PDFDownloadLink
                                document={<SchedulePDFDocument ordersByCustomer={ordersByCustomer} selectedWeekLabel={selectedWeekLabel} />}
                                fileName={selectedWeek ? `production_schedule_${selectedWeekLabel.replace(/\s/g, '_')}.pdf` : 'production_schedule.pdf'}
                                className={`btn btn-primary btn-lg ${!selectedWeek ? 'disabled' : ''}`}
                                style={!selectedWeek ? { pointerEvents: 'none' } : {}}>
                                {({ loading }) => (loading ? 'Generating PDF...' : 'Export to PDF')}
                            </PDFDownloadLink>
                        </div>
                    </div>
                </div>
            </div>
            {selectedWeek && Object.keys(ordersByCustomer).length > 0 && (
                <div className="row mt-4"><div className="col-12"><div className="card">
                    <div className="card-header"><h3 className="h5 mb-0">Production Schedule for {selectedWeekLabel}</h3></div>
                    <div className="card-body"><div className="table-responsive">
                        <table className="table table-bordered table-striped">
                            <thead className="table-light"><tr><th>Aqua Order #</th><th>Customer PO</th><th>IFS Order #</th><th>Order Description</th><th>PO Qty</th><th>Ship Qty</th><th>Delivery Date</th></tr></thead>
                            <tbody>
                                {Object.keys(ordersByCustomer).sort().map(customerName => (
                                    <React.Fragment key={customerName}>
                                        <tr className="table-secondary"><td colSpan="7" className="fw-bold">{customerName}</td></tr>
                                        {ordersByCustomer[customerName].map(order => (
                                            <tr key={order.id}>
                                                <td>{order.aquaOrderNumber || ''}</td>
                                                <td>{order.customerPO || ''}</td>
                                                <td>{order.ifsOrderNo || ''}</td>
                                                <td>{`${order.productName || ''} - ${order.material || ''} - ${order.size || ''}`}</td>
                                                <td>{order.quantity ?? ''}</td>
                                                <td>{order.shipQty ?? order.quantity ?? ''}</td>
                                                <td>{order.deliveryDate ?? ''}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div></div>
                </div></div></div>
            )}
            {selectedWeek && Object.keys(ordersByCustomer).length === 0 && !isLoading && (
                 <div className="row mt-4"><div className="col-12"><div className="card card-body text-center">
                    <p className="mb-0 text-muted">No orders found for the selected week.</p>
                </div></div></div>
            )}
        </div>
    );
};

export default ProductionScheduleReport;