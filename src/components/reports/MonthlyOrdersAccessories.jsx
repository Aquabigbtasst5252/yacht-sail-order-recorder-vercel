// src/components/reports/MonthlyOrdersAccessories.jsx
import React, { useMemo, forwardRef, useRef, useImperativeHandle } from 'react';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';

const MonthlyOrdersAccessories = forwardRef(({ orders }, ref) => {
    const chartRef = useRef(null);

    const processedData = useMemo(() => {
        const monthlyAccessories = orders
            .filter(order => order.orderTypeName === 'Accessory')
            .reduce((acc, order) => {
                const month = format(order.orderDate, 'yyyy-MM');
                const quantity = Number(order.quantity) || 0;
                acc[month] = (acc[month] || 0) + quantity; // Sum quantity instead of counting orders
                return acc;
            }, {});

        const sortedMonths = Object.entries(monthlyAccessories).sort(([a], [b]) => a.localeCompare(b));

        const labels = sortedMonths.map(([month]) => month);
        const data = sortedMonths.map(([, totalQuantity]) => totalQuantity);
        const tableData = sortedMonths.map(([month, totalQuantity]) => ({ month, totalQuantity }));

        return { labels, data, tableData, title: 'Monthly Orders (Accessories)' };
    }, [orders]);

    useImperativeHandle(ref, () => ({
        chart: chartRef.current,
        title: processedData.title,
        tableData: processedData.tableData.map(d => [d.month, d.totalQuantity]),
        headers: ["Month", "Total Quantity"]
    }));

    const chartData = {
        labels: processedData.labels,
        datasets: [ { label: 'Total Accessories Quantity', data: processedData.data, fill: false, borderColor: 'rgb(255, 159, 64)', tension: 0.1 } ],
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
        <div className="col-12">
            <div className="card h-100">
                <div className="card-header">
                    <h5 className="card-title mb-0">{processedData.title}</h5>
                </div>
                <div className="card-body">
                    <div className="mb-4">
                        <Line options={options} data={chartData} ref={chartRef} />
                    </div>
                    <div>
                        <table className="table table-striped table-sm">
                            <thead className="table-light">
                                <tr>
                                    <th>Month</th>
                                    <th className="text-end">Total Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedData.tableData.length > 0 ? (
                                    processedData.tableData.map(({ month, totalQuantity }, index) => (
                                        <tr key={index}>
                                            <td>{month}</td>
                                            <td className="text-end">{totalQuantity}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="2" className="text-center">No accessory orders in this period.</td>
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

export default MonthlyOrdersAccessories;