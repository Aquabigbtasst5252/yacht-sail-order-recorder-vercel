// src/components/reports/ProductTypeAnalysisSails.jsx
import React, { useMemo, forwardRef, useRef, useImperativeHandle } from 'react';
import { Pie } from 'react-chartjs-2';

const ProductTypeAnalysisSails = forwardRef(({ orders }, ref) => {
    const chartRef = useRef(null);

    const processedData = useMemo(() => {
        const productQuantities = orders
            .filter(order => order.orderTypeName === 'Sail')
            .reduce((acc, order) => {
                const productName = order.productName || 'Unknown Product';
                const quantity = Number(order.quantity) || 0;
                acc[productName] = (acc[productName] || 0) + quantity;
                return acc;
            }, {});

        const sortedProducts = Object.entries(productQuantities)
            .sort(([, a], [, b]) => b - a);

        const labels = sortedProducts.map(([product]) => product);
        const data = sortedProducts.map(([, quantity]) => quantity);
        const tableData = sortedProducts.map(([product, quantity]) => ({ product, quantity }));

        const backgroundColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FFCD56', '#C9CBCF', '#4D5360', '#F7464A'
        ];

        return { labels, data, tableData, backgroundColors, title: 'Product Type Analysis (Sails)' };
    }, [orders]);

    useImperativeHandle(ref, () => ({
        chart: chartRef.current,
        title: processedData.title,
        tableData: processedData.tableData.map(d => [d.product, d.quantity]),
        headers: ["Product Type", "Total Quantity"]
    }));

    const chartData = {
        labels: processedData.labels,
        datasets: [ { label: 'Quantity', data: processedData.data, backgroundColor: processedData.backgroundColors, hoverOffset: 4 } ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: processedData.title },
        },
    };

    return (
        <div className="col-12">
            <div className="card h-100">
                <div className="card-header">
                    <h5 className="card-title mb-0">{processedData.title}</h5>
                </div>
                <div className="card-body">
                    <div className="mb-4 mx-auto" style={{maxWidth: '300px'}}>
                        <Pie options={options} data={chartData} ref={chartRef} />
                    </div>
                    <div>
                        <table className="table table-striped table-sm">
                            <thead className="table-light">
                                <tr>
                                    <th>Product Type</th>
                                    <th className="text-end">Total Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedData.tableData.length > 0 ? (
                                    processedData.tableData.map(({ product, quantity }, index) => (
                                        <tr key={index}>
                                            <td>{product}</td>
                                            <td className="text-end">{quantity}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="2" className="text-center">No sail products in this period.</td>
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

export default ProductTypeAnalysisSails;