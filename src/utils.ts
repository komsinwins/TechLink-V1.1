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

// Convert any Google Drive URL (or external image URL) to a Base64 string to bypass CORS issues in html2canvas/jsPDF
export async function convertDriveUrlToBase64(url: string, token: string | null): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url; // Already base64 format

  // Extract Google Drive File ID
  let fileId = '';
  // Match standard /file/d/(ID)/view format
  const dMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) {
    fileId = dMatch[1];
  } else {
    // Match queries like ?id=(ID)
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      fileId = idMatch[1];
    }
  }

  // If we couldn't parse a file ID, or if it is not a Google Drive URL, fetch it directly
  if (!fileId) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("convertDriveUrlToBase64: Failed direct fetch, returning original url:", e);
      return url;
    }
  }

  // If we have a fileId and a token, fetch via the Google Drive API v3
  if (token) {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        console.warn(`convertDriveUrlToBase64: Google Drive API returned status ${res.status} for file ${fileId}`);
      }
    } catch (e) {
      console.error(`convertDriveUrlToBase64: Error fetching file ${fileId} from Drive API:`, e);
    }
  }

  // Fallback: Try downloading via the public export endpoint
  try {
    const res = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error(`convertDriveUrlToBase64: Fallback direct fetch failed for file ${fileId}:`, err);
    // Ultimate fallback: return original url
    return url;
  }
}

function parsePercentOrFloat(str: string, maxVal: number): number {
  str = str.trim();
  if (str.endsWith('%')) {
    return (parseFloat(str) / 100) * maxVal;
  }
  return parseFloat(str);
}

function oklabToRgbValues(L: number, a: number, b: number, alpha: number): string {
  // OKLAB to LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855414 * b;
  
  // LMS to linear RGB
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  
  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  
  // linear RGB to sRGB
  const toSRGB = (x: number) => {
    if (x <= 0.0031308) return 12.92 * x;
    return 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };
  
  let R = Math.round(Math.max(0, Math.min(1, toSRGB(r))) * 255);
  let G = Math.round(Math.max(0, Math.min(1, toSRGB(g))) * 255);
  let B = Math.round(Math.max(0, Math.min(1, toSRGB(bl))) * 255);
  
  if (alpha === 1 || isNaN(alpha)) {
    return `rgb(${R}, ${G}, ${B})`;
  } else {
    return `rgba(${R}, ${G}, ${B}, ${alpha})`;
  }
}

function oklchToRgb(oklchStr: string): string {
  try {
    const match = oklchStr.match(/oklch\(([^)]+)\)/);
    if (!match) return 'rgb(255, 255, 255)';
    const partsStr = match[1];
    
    let mainParts: string[] = [];
    let alphaPart = '1';
    
    if (partsStr.includes('/')) {
      const slashParts = partsStr.split('/');
      mainParts = slashParts[0].trim().split(/[\s,]+/);
      alphaPart = slashParts[1].trim();
    } else {
      mainParts = partsStr.trim().split(/[\s,]+/);
      if (mainParts.length === 4) {
        alphaPart = mainParts[3];
        mainParts = mainParts.slice(0, 3);
      }
    }
    
    if (mainParts.length < 3) return 'rgb(255, 255, 255)';
    
    const L = parsePercentOrFloat(mainParts[0], 1);
    const C = parsePercentOrFloat(mainParts[1], 1);
    let hStr = mainParts[2].trim();
    if (hStr.endsWith('deg')) hStr = hStr.slice(0, -3);
    const H = parseFloat(hStr) * (Math.PI / 180);
    
    const alpha = alphaPart.endsWith('%') ? parseFloat(alphaPart) / 100 : parseFloat(alphaPart);
    
    const a = C * Math.cos(H);
    const b = C * Math.sin(H);
    
    return oklabToRgbValues(L, a, b, alpha);
  } catch (e) {
    console.error('Failed parsing oklch:', oklchStr, e);
    return 'rgb(255, 255, 255)';
  }
}

function oklabToRgb(oklabStr: string): string {
  try {
    const match = oklabStr.match(/oklab\(([^)]+)\)/);
    if (!match) return 'rgb(255, 255, 255)';
    const partsStr = match[1];
    
    let mainParts: string[] = [];
    let alphaPart = '1';
    
    if (partsStr.includes('/')) {
      const slashParts = partsStr.split('/');
      mainParts = slashParts[0].trim().split(/[\s,]+/);
      alphaPart = slashParts[1].trim();
    } else {
      mainParts = partsStr.trim().split(/[\s,]+/);
      if (mainParts.length === 4) {
        alphaPart = mainParts[3];
        mainParts = mainParts.slice(0, 3);
      }
    }
    
    if (mainParts.length < 3) return 'rgb(255, 255, 255)';
    
    const L = parsePercentOrFloat(mainParts[0], 1);
    const a = parsePercentOrFloat(mainParts[1], 1);
    const b = parsePercentOrFloat(mainParts[2], 1);
    const alpha = alphaPart.endsWith('%') ? parseFloat(alphaPart) / 100 : parseFloat(alphaPart);
    
    return oklabToRgbValues(L, a, b, alpha);
  } catch (e) {
    console.error('Failed parsing oklab:', oklabStr, e);
    return 'rgb(255, 255, 255)';
  }
}

function cleanColorStrings(str: string): string {
  if (typeof str !== 'string') return str;
  if (!str.includes('oklch') && !str.includes('oklab')) return str;
  
  let cleaned = str.replace(/oklch\([^)]+\)/g, (match) => {
    return oklchToRgb(match);
  });
  
  cleaned = cleaned.replace(/oklab\([^)]+\)/g, (match) => {
    return oklabToRgb(match);
  });
  
  return cleaned;
}

export async function withColorCleanedComputedStyle<T>(fn: () => Promise<T>): Promise<T> {
  const originalGetComputedStyle = window.getComputedStyle;
  
  window.getComputedStyle = function (element, pseudoElt) {
    const style = originalGetComputedStyle.call(window, element, pseudoElt);
    return new Proxy(style, {
      get(target, prop, receiver) {
        if (prop === 'getPropertyValue') {
          return function(propertyName: string) {
            const val = target.getPropertyValue(propertyName);
            return cleanColorStrings(val);
          };
        }
        
        // Retrieve the value directly from the native target object.
        // Avoid using Reflect.get(target, prop, receiver) because it passes the proxy as 'receiver',
        // which causes 'Illegal invocation' errors on native CSSStyleDeclaration getters.
        const val = target[prop as any] as any;
        if (typeof val === 'string') {
          return cleanColorStrings(val);
        }
        if (typeof val === 'function') {
          return val.bind(target);
        }
        return val;
      }
    });
  } as any;

  try {
    return await fn();
  } finally {
    window.getComputedStyle = originalGetComputedStyle;
  }
}
