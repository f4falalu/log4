import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function exportToCSV(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(data: any[], filename: string, title: string) {
  const doc = new jsPDF();
  doc.text(title, 14, 15);
  
  const headers = Object.keys(data[0] || {});
  const rows = data.map(item => headers.map(header => item[header]));
  
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 25
  });
  
  doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
}
import { DeliveryBatch, Facility, Driver, Vehicle } from '@/types';

export function exportFacilitiesToCSV(facilities: Facility[]) {
  const headers = ['Name', 'Type', 'Address', 'Latitude', 'Longitude', 'Phone', 'Contact Person'];
  const rows = facilities.map(f => [
    f.name,
    f.type,
    f.address,
    f.lat,
    f.lng,
    f.phone || '',
    f.contactPerson || ''
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  downloadFile(csv, 'facilities.csv', 'text/csv');
}

export function exportBatchesToExcel(batches: DeliveryBatch[]) {
  const data = batches.map(b => ({
    'Batch Name': b.name,
    'Priority': b.priority,
    'Status': b.status,
    'Scheduled Date': b.scheduledDate,
    'Scheduled Time': b.scheduledTime,
    'Medication': b.medicationType,
    'Quantity': b.totalQuantity,
    'Distance (km)': b.totalDistance,
    'Duration (min)': b.estimatedDuration,
    'Facilities': b.facilities.length,
    'Warehouse': b.warehouseName || b.warehouseId
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Delivery Batches');
  
  XLSX.writeFile(workbook, 'delivery-batches.xlsx');
}

export function exportReportToPDF(
  title: string,
  data: any[],
  columns: string[],
  filename: string
) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  
  // Table
  autoTable(doc, {
    head: [columns],
    body: data,
    startY: 35,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] }
  });
  
  doc.save(filename);
}

export function exportDriverPerformancePDF(drivers: Driver[], metrics: any[]) {
  const data = drivers.map((d, i) => {
    const metric = metrics[i] || {};
    return [
      d.name,
      metric.totalDeliveries || 0,
      `${metric.onTimePercentage || 0}%`,
      metric.avgDeliveryTime || '-',
      d.status
    ];
  });

  exportReportToPDF(
    'Driver Performance Report',
    data,
    ['Driver', 'Total Deliveries', 'On-Time %', 'Avg Time', 'Status'],
    'driver-performance.pdf'
  );
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
