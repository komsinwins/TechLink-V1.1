/**
 * Utility functions for WSS_TechLink V.1.1
 */

// Calculate difference in days between two YYYY-MM-DD dates
export function calculateDaysDiff(startDateStr: string, endDateStr: string): number | null {
  if (!startDateStr || !endDateStr) return null;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays < 0 ? 0 : diffDays;
}

// Calculate remaining warranty from purchase date and duration in months
export function calculateRemainingWarranty(purchaseDateStr: string, durationMonths: number): string {
  if (!purchaseDateStr || isNaN(durationMonths)) return 'ไม่มีข้อมูล';
  const purchase = new Date(purchaseDateStr);
  if (isNaN(purchase.getTime())) return 'ไม่มีข้อมูล';

  const expiry = new Date(purchase);
  expiry.setMonth(purchase.getMonth() + Number(durationMonths));
  
  const today = new Date();
  
  if (today.getTime() > expiry.getTime()) {
    return 'หมดประกันแล้ว';
  }

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const years = Math.floor(diffDays / 365);
  const remainingDaysAfterYears = diffDays % 365;
  const months = Math.floor(remainingDaysAfterYears / 30);
  const days = remainingDaysAfterYears % 30;

  const result: string[] = [];
  if (years > 0) result.push(`${years} ปี`);
  if (months > 0) result.push(`${months} เดือน`);
  if (days > 0 || result.length === 0) result.push(`${days} วัน`);

  return result.join(' ');
}

// Export data to CSV file
export function exportToCSV(data: any[], headers: string[], filename: string) {
  const csvContent = "\uFEFF" + [ // UTF-8 BOM for Thai language support in Excel
    headers.join(","),
    ...data.map(row => 
      headers.map(header => {
        const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
        // Escape quotes
        const cleanVal = val.replace(/"/g, '""');
        return `"${cleanVal}"`;
      }).join(",")
    )
  ].join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Parse CSV text to array of objects
export function parseCSV(csvText: string): any[] {
  // Simple CSV parser that handles quotes and commas
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Remove BOM if present
  let firstLine = lines[0];
  if (firstLine.startsWith("\uFEFF")) {
    firstLine = firstLine.substring(1);
  }

  // Parse headers
  const headers = parseCSVLine(firstLine);
  const result: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : '';
    });
    result.push(row);
  }

  return result;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Export to Microsoft Word .doc
export function exportToWord(elementId: string, filename: string) {
  const htmlContent = document.getElementById(elementId)?.innerHTML || '';
  
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <title>Export Word</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      table { border-collapse: collapse; width: 100%; margin-top: 15px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #1e40af; color: white; }
      .text-center { text-align: center; }
      .font-bold { font-weight: bold; }
      .header-info { margin-bottom: 20px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
      .photo-container { display: flex; flex-direction: column; margin-top: 20px; page-break-before: always; }
      .photo-item { margin-bottom: 30px; text-align: center; }
      .photo-img { max-width: 500px; max-height: 400px; border: 1px solid #ccc; }
      .photo-caption { margin-top: 8px; font-weight: bold; font-size: 14px; }
    </style>
  </head>
  <body>`;
  
  const footer = `</body></html>`;
  
  const source = header + htmlContent + footer;
  const blob = new Blob(['\ufeff' + source], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate an Excel sheet using an HTML Table Blob (opens natively in Excel perfectly)
export function exportToExcelTable(elementId: string, filename: string) {
  const htmlContent = document.getElementById(elementId)?.innerHTML || '';
  
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <style>
      table { border-collapse: collapse; }
      td, th { border: 0.5pt solid #ddd; padding: 5px; }
      th { background-color: #1e40af; color: white; font-weight: bold; }
    </style>
  </head>
  <body>`;
  const footer = `</body></html>`;
  
  const source = header + htmlContent + footer;
  const blob = new Blob(['\ufeff' + source], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
