// src/components/reports/MachineBreakdownReport.jsx
import React, { useMemo, forwardRef, useRef, useImperativeHandle } from 'react';
import { Bar } from 'react-chartjs-2';
import { differenceInMinutes } from 'date-fns';

const MachineBreakdownReport = forwardRef(({ breakdowns }, ref) => {
    const chartRef = useRef(null);

    const processedData = useMemo(() => {
        const breakdownsByMachine = breakdowns.reduce((acc, breakdown) => {
            const machineName = breakdown.machineName || 'Unknown Machine';
            acc[machineName] = (acc[machineName] || 0) + 1;
            return acc;
        }, {});

        const sortedMachines = Object.entries(breakdownsByMachine)
            .sort(([, a], [, b]) => b - a);

        const labels = sortedMachines.map(([name]) => name);
        const data = sortedMachines.map(([, count]) => count);

        const tableData = breakdowns.map(b => ({
            machine: b.machineName,
            reason: b.reasonText,
            duration: (b.startTime && b.endTime) ? differenceInMinutes(b.endTime, b.startTime) : 0,
        }));

        return { labels, data, tableData, title: 'Machine Breakdowns' };
    }, [breakdowns]);

    useImperativeHandle(ref, () => ({
        chart: chartRef.current,
        title: processedData.title,
        tableData: processedData.tableData.map(d => [d.machine, d.reason, `${d.duration} mins`]),
        headers: ["Machine", "Reason", "Duration"]
    }));

    const chartData = {
        labels: processedData.labels,
        datasets: [{ label: 'Number of Breakdowns', data: processedData.data, backgroundColor: 'rgba(153, 102, 255, 0.6)' }],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Breakdowns by Machine' },
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
                        <Bar options={options} data={chartData} ref={chartRef} />
                    </div>
                    <div>
                        <table className="table table-striped table-sm">
                            <thead className="table-light">
                                <tr>
                                    <th>Machine</th>
                                    <th>Reason</th>
                                    <th className="text-end">Duration (mins)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedData.tableData.length > 0 ? (
                                    processedData.tableData.map(({ machine, reason, duration }, index) => (
                                        <tr key={index}>
                                            <td>{machine}</td>
                                            <td>{reason}</td>
                                            <td className="text-end">{duration}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="text-center">No breakdowns in this period.</td>
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

export default MachineBreakdownReport;