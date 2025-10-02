import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
    },
    header: {
        textAlign: 'center',
        marginBottom: 20,
    },
    logo: {
        width: 50,
        height: 45,
        position: 'absolute',
        top: 20,
        left: 30,
    },
    companyName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    reportTitle: {
        fontSize: 18,
        marginTop: 10,
    },
    dateRange: {
        fontSize: 10,
        color: 'grey',
        marginBottom: 20,
        textAlign: 'center',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        marginBottom: 10,
        fontWeight: 'bold',
        borderBottomWidth: 1,
        borderBottomColor: '#cccccc',
        paddingBottom: 3,
    },
    chartImage: {
        width: '100%',
        height: 250,
        marginBottom: 10,
        objectFit: 'contain',
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
        width: "33.33%",
        borderStyle: "solid",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        backgroundColor: '#f0f0f0',
        padding: 5,
        fontWeight: 'bold',
        fontSize: 10,
    },
    tableCol: {
        width: "33.33%",
        borderStyle: "solid",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 5,
        fontSize: 9,
    }
});

const ComprehensivePDF = ({ reportData, startDate, endDate }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <Image
                style={styles.logo}
                src="/logo.png"
            />
            <View style={styles.header}>
                <Text style={styles.companyName}>Yacht Sails Department</Text>
                <Text style={styles.reportTitle}>Comprehensive Report</Text>
            </View>
            <Text style={styles.dateRange}>
                Date Range: {format(startDate, 'yyyy-MM-dd')} to {format(endDate, 'yyyy-MM-dd')}
            </Text>

            {reportData.map(({ key, title, chart, headers, tableData }) => {
                if (!chart || tableData.length === 0) return null;

                return (
                    <View key={key} style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>{title}</Text>
                        <Image
                            style={styles.chartImage}
                            src={chart.toBase64Image()}
                        />
                        <View style={styles.table}>
                            <View style={styles.tableRow}>
                                {headers.map((header, i) => (
                                    <View key={i} style={styles.tableColHeader}>
                                        <Text>{header}</Text>
                                    </View>
                                ))}
                            </View>
                            {tableData.map((row, rowIndex) => (
                                <View key={rowIndex} style={styles.tableRow}>
                                    {row.map((cell, cellIndex) => (
                                        <View key={cellIndex} style={styles.tableCol}>
                                            <Text>{cell}</Text>
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </View>
                    </View>
                );
            })}
        </Page>
    </Document>
);

export default ComprehensivePDF;