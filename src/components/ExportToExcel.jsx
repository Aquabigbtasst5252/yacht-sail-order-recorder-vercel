import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';

const ExportToExcel = ({ orders }) => {
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handleExport = () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates.");
      return;
    }

    // Filter orders by date range
    const filteredOrders = orders.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = order.createdAt.toDate();
        // Normalize dates to ignore time for inclusive comparison
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return orderDate >= start && orderDate <= end;
    });

    if (filteredOrders.length === 0) {
        toast.error("No orders found for the selected date range.");
        return;
    }

    // Map to requested format
    // Requested: Date, Aqua Order No.,Customer, Order Description,PO Qty
    const dataToExport = filteredOrders.map(order => ({
        "Date": order.createdAt?.toDate().toLocaleDateString('en-GB') || '', // dd/MM/yyyy format preference
        "Aqua Order No.": order.aquaOrderNumber || '',
        "Customer": order.customerCompanyName || '',
        "Order Description": `${order.productName || ''} - ${order.material || ''}`,
        "PO Qty": order.quantity || ''
    }));

    // Sort by Aqua Order No. descending as per list view (optional but good)
    dataToExport.sort((a, b) => {
         const numA = parseInt((a["Aqua Order No."] || "0").match(/\d+/)?.[0] || "0", 10);
         const numB = parseInt((b["Aqua Order No."] || "0").match(/\d+/)?.[0] || "0", 10);
         return numB - numA;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Auto-width columns
    const wscols = [
        { wch: 12 }, // Date
        { wch: 15 }, // Aqua Order No.
        { wch: 25 }, // Customer
        { wch: 40 }, // Description
        { wch: 10 }, // Qty
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    XLSX.writeFile(workbook, `OrderList_${startDate.toLocaleDateString().replace(/\//g, '-')}_to_${endDate.toLocaleDateString().replace(/\//g, '-')}.xlsx`);

    setShowModal(false);
    toast.success("Export successful!");
  };

  return (
    <>
      <button onClick={() => setShowModal(true)} className="btn btn-success">
        Export to Excel
      </button>

      {showModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Export Orders to Excel</h5>
                        <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                    </div>
                    <div className="modal-body">
                        <div className="mb-3">
                            <label className="form-label d-block">Select Date Range</label>
                            <div className="d-flex gap-2">
                                <div className="flex-grow-1">
                                    <DatePicker
                                        selected={startDate}
                                        onChange={(date) => setStartDate(date)}
                                        selectsStart
                                        startDate={startDate}
                                        endDate={endDate}
                                        placeholderText="Start Date"
                                        className="form-control"
                                        dateFormat="dd/MM/yyyy"
                                    />
                                </div>
                                <div className="flex-grow-1">
                                    <DatePicker
                                        selected={endDate}
                                        onChange={(date) => setEndDate(date)}
                                        selectsEnd
                                        startDate={startDate}
                                        endDate={endDate}
                                        minDate={startDate}
                                        placeholderText="End Date"
                                        className="form-control"
                                        dateFormat="dd/MM/yyyy"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="alert alert-info small">
                            Export will include: Date, Aqua Order No., Customer, Order Description, and PO Qty.
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="button" className="btn btn-primary" onClick={handleExport}>Download Excel</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default ExportToExcel;
