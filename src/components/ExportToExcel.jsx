import React from 'react';
import * as XLSX from 'xlsx';

const ExportToExcel = ({ orders }) => {
  const exportToExcel = () => {
    const sails = orders.filter(order => order.orderTypeName === 'Sail');
    const accessories = orders.filter(order => order.orderTypeName !== 'Sail');

    const sailsWorksheet = XLSX.utils.json_to_sheet(sails);
    const accessoriesWorksheet = XLSX.utils.json_to_sheet(accessories);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sailsWorksheet, 'Sails');
    XLSX.utils.book_append_sheet(workbook, accessoriesWorksheet, 'Accessories');

    XLSX.writeFile(workbook, 'OrderList.xlsx');
  };

  return (
    <button onClick={exportToExcel} className="btn btn-success">
      Export to Excel
    </button>
  );
};

export default ExportToExcel;
