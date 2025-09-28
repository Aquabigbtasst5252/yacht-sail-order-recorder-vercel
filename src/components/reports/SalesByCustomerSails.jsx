// src/components/reports/SalesByCustomerSails.jsx
import React, { useMemo, forwardRef, useRef, useImperativeHandle } from 'react';
import { Bar } from 'react-chartjs-2';
const SalesByCustomerSails = forwardRef(({ orders }, ref) => {
    const chartRef = useRef(null);

    const processedData = useMemo(() => {
        const salesByCustomer = orders
            .filter(order => order.productType === 'Sail')
            .reduce((acc, order) => {
                const customerName = order.customerCompanyName || 'Unknown Customer';
                const quantity = Number(order.quantity) || 0;
                acc[customerName] = (acc[customerName] || 0) + quantity;
                return acc;
            }, {});

        const sortedCustomers = Object.entries(salesByCustomer)
            .sort(([, a], [, b]) => b - a);

        const labels = sortedCustomers.map(([customer]) => customer);
        const data = sortedCustomers.map(([, quantity]) => quantity);
        const tableData = sortedCustomers.map(([customer, quantity]) => ({ customer, quantity }));

        return { labels, data, tableData, title: 'Sales by Customer (Sails)' };
    }, [orders]);

    useImperativeHandle(ref, () => ({
        chart: chartRef.current,
        title: processedData.title,
        tableData: processedData.tableData.map(d => [d.customer, d.quantity]),
        headers: ["Customer", "Quantity"]
    }));

    const chartData = {
        labels: processedData.labels,
        datasets: [ { label: 'Sails Sold', data: processedData.data, backgroundColor: 'rgba(54, 162, 235, 0.6)' } ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: processedData.title },
        },
        scales: { y: { beginAtZero: true } }
    };

    return (
        <div className="col-md-6 mb-4">
            <div className="card h-100">
                <div className="card-header">
                    <h5 className="card-title mb-0">{processedData.title}</h5>
                </div>
                <div className="card-body">
                    <div className="mb-4">
                        <Bar options={options} data={chartData} ref={chartRef} />
                    </div>
                    <div>
                        <table className="table table-striped table-sm">
                            <thead className="table-light">
                                <tr>
                                    <th>Customer</th>
                                    <th className="text-end">Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedData.tableData.length > 0 ? (
                                    processedData.tableData.map(({ customer, quantity }, index) => (
                                        <tr key={index}>
                                            <td>{customer}</td>
                                            <td className="text-end">{quantity}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="2" className="text-center">No sail sales in this period.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default SalesByCustomerSails;