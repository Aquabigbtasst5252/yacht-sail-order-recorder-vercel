import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// Using default fonts. For custom fonts, you would use Font.register.

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 8, // Smaller font for landscape
    },
    header: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    table: {
        display: "table",
        width: "auto",
        borderStyle: "solid",
        borderWidth: 0.5,
        borderColor: '#bfbfbf',
        borderRightWidth: 0,
        borderBottomWidth: 0,
        marginBottom: 10,
    },
    tableRow: {
        flexDirection: "row",
        backgroundColor: '#ffffff',
        borderBottomStyle: 'solid',
        borderBottomWidth: 0.5,
        borderBottomColor: '#bfbfbf',
    },
    tableColHeader: {
        borderStyle: "solid",
        borderWidth: 0.5,
        borderColor: '#bfbfbf',
        borderLeftWidth: 0,
        borderTopWidth: 0,
        backgroundColor: '#f2f2f2',
        padding: 4,
        fontWeight: 'bold',
        fontSize: 9,
    },
    tableCol: {
        borderStyle: "solid",
        borderWidth: 0.5,
        borderColor: '#bfbfbf',
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 4,
    },
    // Specific widths for the main table (7 columns)
    mainTableCol: { width: "14.28%" },
    // Specific widths for the shipped table (6 columns)
    shippedTableCol: { width: "16.66%" },

    customerHeader: {
        backgroundColor: '#e6f7ff',
        padding: 5,
        fontWeight: 'bold',
        fontSize: 10,
        marginTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#bfbfbf',
    },
    shippedHeader: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        textDecoration: 'underline'
    },
    noOrdersText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 10,
        color: 'grey',
    },
    footer: {
        position: 'absolute',
        bottom: 15,
        left: 30,
        right: 30,
        textAlign: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 9,
        color: 'grey',
    }
});

const WeeklySchedulePDF = ({ ordersByCustomer, shippedOrders, selectedWeek }) => {
    const weekNumber = selectedWeek.split('-')[1];
    const documentTitle = `Production Schedule Week ${weekNumber} Yacht Sail Dept.`;
    const hasActiveOrders = Object.keys(ordersByCustomer).length > 0;

    return (
        <Document title={documentTitle}>
            <Page size="A4" orientation="landscape" style={styles.page}>
                <Text style={styles.header}>{documentTitle}</Text>

                {hasActiveOrders ? (
                    Object.keys(ordersByCustomer).sort().map((customerName) => (
                        <View key={customerName}>
                            <Text style={styles.customerHeader}>{customerName}</Text>
                            <View style={styles.table}>
                                {/* Header Row */}
                                <View style={styles.tableRow} fixed>
                                    <Text style={{...styles.tableColHeader, ...styles.mainTableCol}}>Aqua Order #</Text>
                                    <Text style={{...styles.tableColHeader, ...styles.mainTableCol}}>Customer PO</Text>
                                    <Text style={{...styles.tableColHeader, ...styles.mainTableCol}}>IFS Order #</Text>
                                    <Text style={{...styles.tableColHeader, ...styles.mainTableCol}}>Order Description</Text>
                                    <Text style={{...styles.tableColHeader, ...styles.mainTableCol}}>Ship Qty</Text>
                                    <Text style={{...styles.tableColHeader, ...styles.mainTableCol}}>Delivery Date</Text>
                                    <Text style={{...styles.tableColHeader, ...styles.mainTableCol}}>Production Status</Text>
                                </View>
                                {/* Data Rows */}
                                {ordersByCustomer[customerName].map(order => (
                                    <View key={order.id} style={styles.tableRow}>
                                        <Text style={{...styles.tableCol, ...styles.mainTableCol}}>{order.aquaOrderNumber}</Text>
                                        <Text style={{...styles.tableCol, ...styles.mainTableCol}}>{order.customerPO}</Text>
                                        <Text style={{...styles.tableCol, ...styles.mainTableCol}}>{order.ifsOrderNo}</Text>
                                        <Text style={{...styles.tableCol, ...styles.mainTableCol}}>{`${order.productName} - ${order.material} - ${order.size}`}</Text>
                                        <Text style={{...styles.tableCol, ...styles.mainTableCol}}>{order.shipQty ?? order.quantity}</Text>
                                        <Text style={{...styles.tableCol, ...styles.mainTableCol}}>{order.deliveryDate}</Text>
                                        <Text style={{...styles.tableCol, ...styles.mainTableCol}}>{order.status}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.noOrdersText}>No active orders for this week.</Text>
                )}

                {shippedOrders.length > 0 && (
                    <View break>
                        <Text style={styles.shippedHeader}>Shipped Orders</Text>
                        <View style={styles.table}>
                             {/* Header Row for Shipped */}
                            <View style={styles.tableRow} fixed>
                                <Text style={{...styles.tableColHeader, ...styles.shippedTableCol}}>Aqua Order #</Text>
                                <Text style={{...styles.tableColHeader, ...styles.shippedTableCol}}>Customer PO</Text>
                                <Text style={{...styles.tableColHeader, ...styles.shippedTableCol}}>Customer</Text>
                                <Text style={{...styles.tableColHeader, ...styles.shippedTableCol}}>Order Description</Text>
                                <Text style={{...styles.tableColHeader, ...styles.shippedTableCol}}>Ship Qty</Text>
                                <Text style={{...styles.tableColHeader, ...styles.shippedTableCol}}>Delivery Date</Text>
                            </View>
                            {/* Data Rows for Shipped */}
                            {shippedOrders.map(order => (
                                <View key={order.id} style={styles.tableRow}>
                                    <Text style={{...styles.tableCol, ...styles.shippedTableCol}}>{order.aquaOrderNumber}</Text>
                                    <Text style={{...styles.tableCol, ...styles.shippedTableCol}}>{order.customerPO}</Text>
                                    <Text style={{...styles.tableCol, ...styles.shippedTableCol}}>{order.customerCompanyName}</Text>
                                    <Text style={{...styles.tableCol, ...styles.shippedTableCol}}>{`${order.productName} - ${order.material} - ${order.size}`}</Text>
                                    <Text style={{...styles.tableCol, ...styles.shippedTableCol}}>{order.shipQty ?? order.quantity}</Text>
                                    <Text style={{...styles.tableCol, ...styles.shippedTableCol}}>{order.deliveryDate}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
                <View style={styles.footer} fixed>
                    <Text>Prepared by Chamal Madushanke</Text>
                    <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
};

export default WeeklySchedulePDF;