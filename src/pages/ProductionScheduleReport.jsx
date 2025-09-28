// src/pages/ReportsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from "firebase/firestore";

// --- PDF Document Component ---
// This defines the structure and style of the PDF file.
const SchedulePDFDocument = ({ ordersByCustomer, selectedWeek }) => {
    const styles = StyleSheet.create({
        page: {
            paddingTop: 35,
            paddingBottom: 65,
            paddingHorizontal: 30,
            fontSize: 10,
            fontFamily: 'Helvetica'
        },
        title: {
            fontSize: 18,
            textAlign: 'center',
            marginBottom: 20,
            fontFamily: 'Helvetica-Bold'
        },
        customerHeader: {
            fontSize: 12,
            backgroundColor: '#f0f0f0',
            padding: 5,
            marginTop: 10,
            fontFamily: 'Helvetica-Bold'
        },
        table: {
            display: 'table',
            width: 'auto',
            borderStyle: 'solid',
            borderWidth: 1,
            borderRightWidth: 0,
            borderBottomWidth: 0
        },
        tableRow: {
            flexDirection: 'row'
        },
        tableColHeader: {
            width: '16.66%',
            borderStyle: 'solid',
            borderWidth: 1,
            borderLeftWidth: 0,
            borderTopWidth: 0,
            backgroundColor: '#e0e0e0',
            padding: 5,
            fontFamily: 'Helvetica-Bold'
        },
        tableCol: {
            width: '16.66%',
            borderStyle: 'solid',
            borderWidth: 1,
            borderLeftWidth: 0,
            borderTopWidth: 0,
            padding: 5
        },
        descriptionCol: {
             width: '33.32%',
        },
        footer: {
            position: 'absolute',
            bottom: 30,
            left: 30,
            right: 30,
            flexDirection: 'row',
            justifyContent: 'space-between',
            fontSize: 9,
            color: 'grey',
        }
    });

    const descriptionColStyle = {...styles.tableCol, ...styles.descriptionCol};
    const descriptionHeaderStyle = {...styles.tableColHeader, ...styles.descriptionCol};


    return (
        <Document>
            <Page style={styles.page} orientation="landscape">
                <Text style={styles.title} fixed>{selectedWeek} - Yacht Sail Production Schedule</Text>

                <View style={styles.table}>
                    <View style={styles.tableRow} fixed>
                        <Text style={styles.tableColHeader}>Aqua Order #</Text>
                        <Text style={styles.tableColHeader}>Customer PO</Text>
                        <Text style={styles.tableColHeader}>IFS Order #</Text>
                        <Text style={descriptionHeaderStyle}>Order Description</Text>
                        <Text style={styles.tableColHeader}>Qty</Text>
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
                                    <Text style={styles.tableCol}>{order.quantity || ''}</Text>
                                    <Text style={styles.tableCol}>{order.deliveryDate || ''}</Text>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>

                <View style={styles.footer} fixed>
                    <Text>Prepared By Chamal Madushanke</Text>
                    <Text render={({ pageNumber, totalPages }) => (
                        `Page ${pageNumber} of ${totalPages}`
                    )} />
                </View>
            </Page>
        </Document>
    );
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

            const weeks = [...new Set(ordersData.map(o => o.deliveryWeek).filter(Boolean))];
            weeks.sort();
            setDeliveryWeeks(weeks);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const ordersForPdf = useMemo(() => {
        if (!selectedWeek) return {};

        const weekOrders = allOrders.filter(o => o.deliveryWeek === selectedWeek);

        return weekOrders.reduce((acc, order) => {
            const customer = order.customerCompanyName || 'Unknown Customer';
            if (!acc[customer]) acc[customer] = [];
            acc[customer].push(order);
            return acc;
        }, {});
    }, [selectedWeek, allOrders]);

    return (
        <div className="row justify-content-center">
            <div className="col-lg-6">
                <div className="card">
                    <div className="card-header">
                        <h2 className="h4 mb-0">Generate Production Schedule Report</h2>
                    </div>
                    <div className="card-body text-center">
                        <p className="card-text text-muted">
                            Select a delivery week to generate and download the production schedule as a PDF file.
                        </p>
                        <div className="my-4">
                            <label htmlFor="week-select" className="form-label fw-bold">Delivery Week</label>
                            <select
                                id="week-select"
                                className="form-select form-select-lg"
                                value={selectedWeek}
                                onChange={(e) => setSelectedWeek(e.target.value)}
                                disabled={isLoading}
                            >
                                <option value="">{isLoading ? "Loading weeks..." : "Choose a week..."}</option>
                                {deliveryWeeks.map(week => <option key={week} value={week}>{week}</option>)}
                            </select>
                        </div>

                        <PDFDownloadLink
                            document={<SchedulePDFDocument ordersByCustomer={ordersForPdf} selectedWeek={selectedWeek} />}
                            fileName={selectedWeek ? `production_schedule_${selectedWeek}.pdf` : 'production_schedule.pdf'}
                            className={`btn btn-primary btn-lg ${!selectedWeek ? 'disabled' : ''}`}
                            style={!selectedWeek ? { pointerEvents: 'none' } : {}}
                        >
                            {({ loading }) => (loading ? 'Generating PDF...' : 'Export to PDF')}
                        </PDFDownloadLink>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductionScheduleReport;