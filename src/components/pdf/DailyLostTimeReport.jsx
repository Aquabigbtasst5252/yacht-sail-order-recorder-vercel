// src/components/pdf/DailyLostTimeReport.jsx
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { formatDistanceStrict } from 'date-fns';

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 10,
        border: '1pt solid black',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    logo: {
        position: 'absolute',
        left: 10,
        top: -5,
        width: 60,
        height: 31.18, // 1.1cm height at 96 DPI
    },
    titleContainer: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    mainTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    subTitle: {
        fontSize: 12,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        backgroundColor: '#f0f0f0',
        padding: 5,
    },
    table: {
        display: "table",
        width: "auto",
        borderStyle: "solid",
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0
    },
    tableRow: {
        margin: "auto",
        flexDirection: "row"
    },
    tableColHeader: {
        width: "11.11%",
        borderStyle: "solid",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        backgroundColor: '#f0f0f0',
        padding: 5,
        fontSize: 8,
        fontWeight: 'bold',
    },
    tableCol: {
        width: "11.11%",
        borderStyle: "solid",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 5,
        fontSize: 7,
    },
});

const DailyLostTimeReport = ({ data }) => {
    const groupedData = data.reduce((acc, record) => {
        const section = record.employeeSection || 'Unassigned';
        if (!acc[section]) {
            acc[section] = [];
        }
        acc[section].push(record);
        return acc;
    }, {});

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                <View style={styles.header}>
                    <Image style={styles.logo} src="/logo.png" />
                    <View style={styles.titleContainer}>
                        <Text style={styles.mainTitle}>Daily Lost Time Recording Form - Yacht sail Department</Text>
                        <Text style={styles.subTitle}>Aqua Dynamics (Pvt) Ltd.</Text>
                    </View>
                </View>

                {Object.keys(groupedData).map(section => (
                    <View key={section} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section}</Text>
                        <View style={styles.table}>
                            <View style={styles.tableRow}>
                                <Text style={styles.tableColHeader}>Start Time</Text>
                                <Text style={styles.tableColHeader}>End Time</Text>
                                <Text style={styles.tableColHeader}>Duration</Text>
                                <Text style={styles.tableColHeader}>Order #</Text>
                                <Text style={styles.tableColHeader}>Qty</Text>
                                <Text style={styles.tableColHeader}>Employee</Text>
                                <Text style={styles.tableColHeader}>Lost Time Reason</Text>
                                <Text style={styles.tableColHeader}>Responsible Person</Text>
                            </View>
                            {groupedData[section].map((r) => (
                                <View key={r.id} style={styles.tableRow}>
                                    <Text style={styles.tableCol}>{new Date(r.startTime.seconds * 1000).toLocaleString()}</Text>
                                    <Text style={styles.tableCol}>{new Date(r.endTime.seconds * 1000).toLocaleString()}</Text>
                                    <Text style={styles.tableCol}>{formatDistanceStrict(new Date(r.endTime.seconds * 1000), new Date(r.startTime.seconds * 1000))}</Text>
                                    <Text style={styles.tableCol}>{r.orderNumber}</Text>
                                    <Text style={styles.tableCol}>{r.orderQuantity}</Text>
                                    <Text style={styles.tableCol}>{r.employeeLabel}</Text>
                                    <Text style={styles.tableCol}>{r.lostTimeCodeLabel}</Text>
                                    <Text style={styles.tableCol}>{r.responsiblePerson}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ))}
            </Page>
        </Document>
    );
};

export default DailyLostTimeReport;