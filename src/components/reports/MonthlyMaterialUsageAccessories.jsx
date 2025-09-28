// src/components/reports/MonthlyMaterialUsageAccessories.jsx
import React, { useMemo, forwardRef, useRef, useImperativeHandle } from 'react';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';

const MonthlyMaterialUsageAccessories = forwardRef(({ orders }, ref) => {
    const chartRef = useRef(null);

    const processedData = useMemo(() => {
        const materialUsage = orders
            .filter(order => order.productType === 'Accessory' && order.material)
            .reduce((acc, order) => {
                const month = format(order.orderDate, 'yyyy-MM');
                const material = order.material.trim();
                const quantity = Number(order.quantity) || 0;

                if (!acc[month]) acc[month] = {};
                acc[month][material] = (acc[month][material] || 0) + quantity;
                return acc;
            }, {});

        const sortedMonths = Object.keys(materialUsage).sort();
        const allMaterials = [...new Set(Object.values(materialUsage).flatMap(m => Object.keys(m)))];
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'].reverse();

        const datasets = allMaterials.map((material, index) => ({
            label: material,
            data: sortedMonths.map(month => materialUsage[month][material] || 0),
            borderColor: colors[index % colors.length],
            fill: false,
        }));

        const tableData = sortedMonths.flatMap(month =>
            Object.entries(materialUsage[month]).map(([material, quantity]) => ({ month, material, quantity }))
        );

        return { labels: sortedMonths, datasets, tableData, title: 'Monthly Material Usage (Accessories)' };
    }, [orders]);

    useImperativeHandle(ref, () => ({
        chart: chartRef.current,
        title: processedData.title,
        tableData: processedData.tableData.map(d => [d.month, d.material, d.quantity]),
        headers: ["Month", "Material", "Total Quantity"]
    }));

    const chartData = {
        labels: processedData.labels,
        datasets: processedData.datasets,
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
                        <Line options={options} data={chartData} ref={chartRef} />
                    </div>
                    <div>
                        <table className="table table-striped table-sm">
                            <thead className="table-light">
                                <tr>
                                    <th>Month</th>
                                    <th>Material</th>
                                    <th className="text-end">Total Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedData.tableData.length > 0 ? (
                                    processedData.tableData.map(({ month, material, quantity }, index) => (
                                        <tr key={index}>
                                            <td>{month}</td>
                                            <td>{material}</td>
                                            <td className="text-end">{quantity}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="text-center">No accessory material usage in this period.</td>
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

export default MonthlyMaterialUsageAccessories;