// src/components/reports/MonthlyOrdersSails.jsx
import React, { useMemo, forwardRef, useRef, useImperativeHandle } from 'react';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';

const MonthlyOrdersSails = forwardRef(({ orders }, ref) => {
    const chartRef = useRef(null);

    const processedData = useMemo(() => {
        const monthlySails = orders
            .filter(order => order.productType === 'Sail')
            .reduce((acc, order) => {
                const month = format(order.orderDate, 'yyyy-MM');
                acc[month] = (acc[month] || 0) + 1;
                return acc;
            }, {});

        const sortedMonths = Object.entries(monthlySails).sort(([a], [b]) => a.localeCompare(b));

        const labels = sortedMonths.map(([month]) => month);
        const data = sortedMonths.map(([, count]) => count);
        const tableData = sortedMonths.map(([month, count]) => ({ month, count }));

        return { labels, data, tableData, title: 'Monthly Orders (Sails)' };
    }, [orders]);

    useImperativeHandle(ref, () => ({
        chart: chartRef.current,
        title: processedData.title,
        tableData: processedData.tableData.map(d => [d.month, d.count]),
        headers: ["Month", "Order Count"]
    }));

    const chartData = {
        labels: processedData.labels,
        datasets: [ { label: 'Sail Orders', data: processedData.data, fill: false, borderColor: 'rgb(75, 192, 192)', tension: 0.1 } ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: processedData.title },
        },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    };

    return (
        <div className="col-md-6 mb-4">
            <div className="card h-100">
                <div className="card-header">
                    <h5 className="card-title mb-0">{processedData.title}</h5>
                </div>
                <div className="card-body">
                    <div className="mb-4">
                        <Line options={options} data={chartData} ref={chartRef}/>
                    </div>
                    <div>
                        <table className="table table-striped table-sm">
                            <thead className="table-light">
                                <tr>
                                    <th>Month</th>
                                    <th className="text-end">Order Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedData.tableData.length > 0 ? (
                                    processedData.tableData.map(({ month, count }, index) => (
                                        <tr key={index}>
                                            <td>{month}</td>
                                            <td className="text-end">{count}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="2" className="text-center">No sail orders in this period.</td>
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

export default MonthlyOrdersSails;