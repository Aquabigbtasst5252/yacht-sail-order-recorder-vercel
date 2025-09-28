// src/components/reports/LostTimeReport.jsx
import React, { useMemo, forwardRef, useRef, useImperativeHandle } from 'react';
import { Bar } from 'react-chartjs-2';
import { differenceInMinutes } from 'date-fns';

const LostTimeReport = forwardRef(({ lostTimeEntries }, ref) => {
    const chartRef = useRef(null);

    const processedData = useMemo(() => {
        const lostTimeByReason = lostTimeEntries.reduce((acc, entry) => {
            const reason = entry.lostTimeReason || 'Unknown Reason';
            const duration = (entry.startTime && entry.endTime)
                ? differenceInMinutes(entry.endTime, entry.startTime)
                : 0;

            acc[reason] = (acc[reason] || 0) + duration;
            return acc;
        }, {});

        const sortedReasons = Object.entries(lostTimeByReason)
            .sort(([, a], [, b]) => b - a);

        const labels = sortedReasons.map(([reason]) => reason);
        const data = sortedReasons.map(([, duration]) => duration);

        const tableData = lostTimeEntries.map(entry => ({
            reason: entry.lostTimeReason,
            employee: entry.employeeName,
            duration: (entry.startTime && entry.endTime) ? differenceInMinutes(entry.endTime, entry.startTime) : 0,
        }));

        return { labels, data, tableData, title: 'Lost Time by Reason' };
    }, [lostTimeEntries]);

    useImperativeHandle(ref, () => ({
        chart: chartRef.current,
        title: processedData.title,
        tableData: processedData.tableData.map(d => [d.reason, d.employee, `${d.duration} mins`]),
        headers: ["Reason", "Employee", "Duration (mins)"]
    }));

    const chartData = {
        labels: processedData.labels,
        datasets: [{ label: 'Total Minutes Lost', data: processedData.data, backgroundColor: 'rgba(255, 206, 86, 0.6)' }],
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
                        <Bar options={options} data={chartData} ref={chartRef} />
                    </div>
                    <div>
                        <table className="table table-striped table-sm">
                            <thead className="table-light">
                                <tr>
                                    <th>Reason</th>
                                    <th>Employee</th>
                                    <th className="text-end">Duration (mins)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedData.tableData.length > 0 ? (
                                    processedData.tableData.map(({ reason, employee, duration }, index) => (
                                        <tr key={index}>
                                            <td>{reason}</td>
                                            <td>{employee}</td>
                                            <td className="text-end">{duration}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="text-center">No lost time entries in this period.</td>
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

export default LostTimeReport;