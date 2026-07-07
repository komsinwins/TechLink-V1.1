import React, { useState, useRef } from 'react';
import { ProductClaim, Customer } from '../types';
import { 
  Search, Plus, Trash2, Edit3, Eye, Download, Upload, AlertCircle, 
  PackageOpen, FileText, Calendar, CheckSquare, ShieldCheck, MapPin, Image as ImageIcon, FileSpreadsheet,
  Check, X
} from 'lucide-react';
import { calculateDaysDiff, calculateRemainingWarranty, exportToCSV, parseCSV, exportToWord, exportToExcelTable } from '../utils';
import { uploadFileToDrive } from '../drive';
import { getAccessToken } from '../firebase';
import { exportDataToGoogleSheets } from '../sheets';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ProductClaimsProps {
  claims: ProductClaim[];
  customers: Customer[];
  productTypes: string[];
  operators: string[];
  onAddClaim: (claim: ProductClaim) => Promise<any>;
  onUpdateClaim: (id: string, claim: ProductClaim) => Promise<any>;
  onDeleteClaim: (id: string) => Promise<any>;
  onImportClaims: (claims: ProductClaim[]) => Promise<any>;
  selectedClaimForView?: ProductClaim | null;
  setSelectedClaimForView?: (claim: ProductClaim | null) => void;
  onAddDropdownOption: (key: any, value: string) => Promise<void>;
  onDeleteDropdownOption: (key: any, value: string) => Promise<void>;
}

export default function ProductClaimsTab({
  claims,
  customers,
  productTypes,
  operators,
  onAddClaim,
  onUpdateClaim,
  onDeleteClaim,
  onImportClaims,
  selectedClaimForView,
  setSelectedClaimForView,
  onAddDropdownOption,
  onDeleteDropdownOption
}: ProductClaimsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'}>({key: 'createdAt', direction: 'desc'});

  // Claim printable document view modal
  const [printableClaimDoc, setPrintableClaimDoc] = useState<ProductClaim | null>(null);

  // Search customer query for auto-fill
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Form states
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactDetail, setContactDetail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [partnerCompany, setPartnerCompany] = useState('');
  const [productType, setProductType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyDuration, setWarrantyDuration] = useState<number>(12); // months default
  const [claimDestination, setClaimDestination] = useState('');
  const [claimBuilding, setClaimBuilding] = useState('');
  const [claimReceivedDate, setClaimReceivedDate] = useState('');
  const [claimSentDate, setClaimSentDate] = useState('');
  const [inspector, setInspector] = useState('');
  const [claimStatus, setClaimStatus] = useState<'Claiming' | 'Replaced' | 'Repaired' | 'Returned'>('Claiming');
  const [receivedPhoto, setReceivedPhoto] = useState('');
  const [returnedPhoto, setReturnedPhoto] = useState('');
  const [remarks, setRemarks] = useState('');



  const receivedPhotoInputRef = useRef<HTMLInputElement>(null);
  const returnedPhotoInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (selectedClaimForView) {
      handleEdit(selectedClaimForView);
      setSelectedClaimForView?.(null); // Clear after opening
    }
  }, [selectedClaimForView]);

  const resetForm = () => {
    setEditingId(null);
    setCustomerCompany('');
    setCustomerAddress('');
    setContactName('');
    setContactDetail('');
    setContactPhone('');
    setContactEmail('');
    setPartnerCompany('');
    setProductType('');
    setBrand('');
    setModel('');
    setSerialNumber('');
    const today = new Date().toISOString().split('T')[0];
    setPurchaseDate(today);
    setWarrantyDuration(12);
    setClaimDestination('');
    setClaimBuilding('');
    setClaimReceivedDate(today);
    setClaimSentDate(today);
    setInspector('');
    setClaimStatus('Claiming');
    setReceivedPhoto('');
    setReturnedPhoto('');
    setRemarks('');
    setCustomerSearchQuery('');
    setIsFormOpen(false);
  };

  const handleEdit = (claim: ProductClaim) => {
    setEditingId(claim.id || null);
    setCustomerCompany(claim.customerCompany || '');
    setCustomerAddress(claim.customerAddress || '');
    setContactName(claim.contactName || '');
    setContactDetail(claim.contactDetail || '');
    setContactPhone(claim.contactPhone || '');
    setContactEmail(claim.contactEmail || '');
    setPartnerCompany(claim.partnerCompany || '');
    setProductType(claim.productType || '');
    setBrand(claim.brand || '');
    setModel(claim.model || '');
    setSerialNumber(claim.serialNumber || '');
    setPurchaseDate(claim.purchaseDate || '');
    setWarrantyDuration(Number(claim.warrantyDuration) || 12);
    setClaimDestination(claim.claimDestination || '');
    setClaimBuilding(claim.claimBuilding || '');
    setClaimReceivedDate(claim.claimReceivedDate || '');
    setClaimSentDate(claim.claimSentDate || '');
    setInspector(claim.inspector || '');
    setClaimStatus(claim.claimStatus || 'Claiming');
    setReceivedPhoto(claim.receivedPhoto || '');
    setReturnedPhoto(claim.returnedPhoto || '');
    setRemarks(claim.remarks || '');
    setIsFormOpen(true);
  };

  const selectCustomer = (c: Customer) => {
    setCustomerCompany(c.companyName);
    setCustomerAddress(c.address || '');
    setContactName(c.contactName || '');
    setContactDetail(c.contactDetail || '');
    setContactPhone(c.contactPhone || '');
    setContactEmail(c.contactEmail || '');
    setPartnerCompany(c.partnerCompany || '');
    setShowCustomerDropdown(false);
    setCustomerSearchQuery('');
  };

  const handlePhotoUpload = async (ref: 'received' | 'returned', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = await getAccessToken();
    if (!token) {
      alert('กรุณาเข้าสู่ระบบ Google เพื่ออัปโหลดรูปภาพไปยัง Google Drive');
      return;
    }

    // Determine Claim No to use as file name
    const resolvedClaimNo = editingId ? (claims.find(c => c.id === editingId)?.claimNo || generateClaimNo()) : generateClaimNo();
    const fileName = `${resolvedClaimNo}_${ref === 'received' ? 'Received' : 'Returned'}_${file.name}`;

    setIsUploading(true);
    try {
      const result = await uploadFileToDrive(file, fileName, 'TechLink_Claim Product', token);
      const url = result.webViewLink || result.fileId;
      if (ref === 'received') {
        setReceivedPhoto(url);
      } else {
        setReturnedPhoto(url);
      }
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ' + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const generateClaimNo = (): string => {
    const currentYear = new Date().getFullYear();
    const shortYear = String(currentYear).substring(2);
    const sameYearClaims = claims.filter(c => {
      const parts = c.claimNo?.split('/');
      if (parts && parts.length > 1) {
        return parts[1] === String(currentYear) || parts[1] === shortYear;
      }
      return false;
    });

    const nextSeq = sameYearClaims.length + 1;
    const formattedSeq = String(nextSeq).padStart(3, '0');
    // ClaimNo style: WSS_Product claim001/26
    return `WSS_Product claim${formattedSeq}/${shortYear}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerCompany.trim()) {
      alert('กรุณากรอกชื่อบริษัทลูกค้า');
      return;
    }

    const resolvedClaimNo = editingId ? (claims.find(c => c.id === editingId)?.claimNo || generateClaimNo()) : generateClaimNo();

    const payload: ProductClaim = {
      claimNo: resolvedClaimNo,
      customerCompany,
      customerAddress,
      contactName,
      contactDetail,
      contactPhone,
      contactEmail,
      partnerCompany,
      productType,
      brand,
      model,
      serialNumber,
      purchaseDate,
      warrantyDuration: Number(warrantyDuration),
      claimDestination,
      claimBuilding,
      claimReceivedDate,
      claimSentDate,
      inspector,
      claimStatus,
      receivedPhoto,
      returnedPhoto,
      remarks
    };

    try {
      if (editingId) {
        await onUpdateClaim(editingId, payload);
      } else {
        await onAddClaim(payload);
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลเคลมสินค้า');
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportSheets = async () => {
    setIsExporting(true);
    try {
      const headers = [
        'ชื่อของบริษัทลูกค้า', 'ที่อยู่บริษัทลูกค้า', 'ชื่อผู้ติดต่อ', 'รายละเอียดผู้ติดต่อ', 'เบอร์โทรผู้ติดต่อ', 
        'อีเมลติดต่อ', 'บริษัทคู่ค้า', 'ประเภทสินค้าที่ส่งเคลม', 'ยี่ห้อสินค้า', 'รุ่น', 'ซีเรียลนัมเบอร์', 
        'วันที่ซื้อสินค้า', 'ระยะเวลาการรับประกัน(เดือน)', 'สถานที่ส่งเคลม', 'อาคารที่แจ้งเคลม', 
        'วันที่รับสินค้าเคลม', 'วันส่งสินค้าเคลม', 'ชื่อผู้ตรวจสอบ', 'สถานะสินค้าเคลม', 'หมายเหตุ'
      ];
      const dataRows = claims.map(c => [
        c.customerCompany,
        c.customerAddress,
        c.contactName,
        c.contactDetail,
        c.contactPhone,
        c.contactEmail,
        c.partnerCompany,
        c.productType,
        c.brand,
        c.model,
        c.serialNumber,
        c.purchaseDate,
        c.warrantyDuration,
        c.claimDestination,
        c.claimBuilding,
        c.claimReceivedDate,
        c.claimSentDate,
        c.inspector,
        c.claimStatus,
        c.remarks
      ]);
      const url = await exportDataToGoogleSheets('TechLink_Product_Claims_Records', headers, dataRows);
      alert(`ส่งออกข้อมูลสำเร็จ! เปิดดูได้ที่:\n${url}`);
      window.open(url, '_blank');
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่งออกไปยัง Google Sheets: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ชื่อของบริษัทลูกค้า', 'ที่อยู่บริษัทลูกค้า', 'ชื่อผู้ติดต่อ', 'รายละเอียดผู้ติดต่อ', 'เบอร์โทรผู้ติดต่อ', 
      'อีเมลติดต่อ', 'บริษัทคู่ค้า', 'ประเภทสินค้าที่ส่งเคลม', 'ยี่ห้อสินค้า', 'รุ่น', 'ซีเรียลนัมเบอร์', 
      'วันที่ซื้อสินค้า', 'ระยะเวลาการรับประกัน(เดือน)', 'สถานที่ส่งเคลม', 'อาคารที่แจ้งเคลม', 
      'วันที่รับสินค้าเคลม', 'วันส่งสินค้าเคลม', 'ชื่อผู้ตรวจสอบ', 'สถานะสินค้าเคลม', 'หมายเหตุ'
    ];
    const data = claims.map(c => ({
      'ชื่อของบริษัทลูกค้า': c.customerCompany,
      'ที่อยู่บริษัทลูกค้า': c.customerAddress,
      'ชื่อผู้ติดต่อ': c.contactName,
      'รายละเอียดผู้ติดต่อ': c.contactDetail,
      'เบอร์โทรผู้ติดต่อ': c.contactPhone,
      'อีเมลติดต่อ': c.contactEmail,
      'บริษัทคู่ค้า': c.partnerCompany,
      'ประเภทสินค้าที่ส่งเคลม': c.productType,
      'ยี่ห้อสินค้า': c.brand,
      'รุ่น': c.model,
      'ซีเรียลนัมเบอร์': c.serialNumber,
      'วันที่ซื้อสินค้า': c.purchaseDate,
      'ระยะเวลาการรับประกัน(เดือน)': c.warrantyDuration,
      'สถานที่ส่งเคลม': c.claimDestination,
      'อาคารที่แจ้งเคลม': c.claimBuilding,
      'วันที่รับสินค้าเคลม': c.claimReceivedDate,
      'วันส่งสินค้าเคลม': c.claimSentDate,
      'ชื่อผู้ตรวจสอบ': c.inspector,
      'สถานะสินค้าเคลม': c.claimStatus,
      'หมายเหตุ': c.remarks
    }));
    exportToCSV(data, headers, 'Product_Claims_Records');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCSV(text);
      
      const mapped: ProductClaim[] = parsed.map(item => ({
        customerCompany: item['ชื่อของบริษัทลูกค้า'] || item['customerCompany'] || '',
        customerAddress: item['ที่อยู่บริษัทลูกค้า'] || item['customerAddress'] || '',
        contactName: item['ชื่อผู้ติดต่อ'] || item['contactName'] || '',
        contactDetail: item['รายละเอียดผู้ติดต่อ'] || item['contactDetail'] || '',
        contactPhone: item['เบอร์โทรผู้ติดต่อ'] || item['contactPhone'] || '',
        contactEmail: item['อีเมลติดต่อ'] || item['contactEmail'] || '',
        partnerCompany: item['บริษัทคู่ค้า'] || item['partnerCompany'] || '',
        productType: item['ประเภทสินค้าที่ส่งเคลม'] || item['productType'] || '',
        brand: item['ยี่ห้อสินค้า'] || item['brand'] || '',
        model: item['รุ่น'] || item['model'] || '',
        serialNumber: item['ซีเรียลนัมเบอร์'] || item['serialNumber'] || '',
        purchaseDate: item['วันที่ซื้อสินค้า'] || item['purchaseDate'] || '',
        warrantyDuration: Number(item['ระยะเวลาการรับประกัน(เดือน)']) || 12,
        claimDestination: item['สถานที่ส่งเคลม'] || item['claimDestination'] || '',
        claimBuilding: item['อาคารที่แจ้งเคลม'] || item['claimBuilding'] || '',
        claimReceivedDate: item['วันที่รับสินค้าเคลม'] || item['claimReceivedDate'] || '',
        claimSentDate: item['วันส่งสินค้าเคลม'] || item['claimSentDate'] || '',
        inspector: item['ชื่อผู้ตรวจสอบ'] || item['inspector'] || '',
        claimStatus: (item['สถานะสินค้าเคลม'] || item['claimStatus'] || 'Claiming') as any,
        remarks: item['หมายเหตุ'] || item['remarks'] || '',
        receivedPhoto: '',
        returnedPhoto: ''
      })).filter(c => c.customerCompany);

      if (mapped.length > 0) {
        await onImportClaims(mapped);
        alert(`นำเข้าสำเร็จ ${mapped.length} รายการ`);
      } else {
        alert('ไม่พบข้อมูลการเคลมที่ถูกต้องในไฟล์ CSV');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleExportPDFReport = async () => {
    const element = document.getElementById('printable-claim-report-doc');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`ClaimReport_${printableClaimDoc?.serialNumber || 'S_N'}.pdf`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF รายงานการเคลม');
    }
  };

  const filteredClaims = claims.filter(c => {
    const search = searchTerm.toLowerCase();
    return (
      c.claimNo?.toLowerCase().includes(search) ||
      c.customerCompany?.toLowerCase().includes(search) ||
      c.brand?.toLowerCase().includes(search) ||
      c.model?.toLowerCase().includes(search) ||
      c.serialNumber?.toLowerCase().includes(search) ||
      c.claimStatus?.toLowerCase().includes(search)
    );
  }).sort((a, b) => {
    const aVal = (a as any)[sortConfig.key] || '';
    const bVal = (b as any)[sortConfig.key] || '';
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const searchedCustomers = customers.filter(c => 
    c.companyName?.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3" id="claims-tab">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5">
            <PackageOpen className="text-blue-600 w-4 h-4" />
            ตารางงานเคลมสินค้า
          </h2>
          <p className="text-[10px] text-slate-500">ติดตามสถานะเคลมสินค้าของลูกค้ากับผู้จำหน่าย, คำนวณประกันคงเหลือ และสร้างเอกสารรายงานการเคลม</p>
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {/* CSV Import */}
          <label className="flex items-center gap-1 px-2 py-1.5 bg-white border border-slate-200 text-slate-700 rounded text-[11px] font-bold cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors">
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>นำเข้า CSV</span>
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>

          {/* CSV Export */}
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2 py-1.5 bg-white border border-slate-200 text-slate-700 rounded text-[11px] font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            ส่งออก CSV
          </button>

          {/* Sheets Export */}
          <button 
            onClick={handleExportSheets}
            disabled={isExporting}
            className="flex items-center gap-1 px-2 py-1.5 bg-white border border-green-600 text-green-700 rounded text-[11px] font-bold hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
            {isExporting ? 'กำลังส่งออก...' : 'ส่งออก Sheets'}
          </button>

          <button
            onClick={() => { resetForm(); setIsFormOpen(true); }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            เพิ่มงานเคลมสินค้า
          </button>
        </div>
      </div>

      {/* Search Filter input */}
      <div className="bg-white px-3 py-1.5 rounded-lg shadow-xs border border-slate-200 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="ค้นหาชื่อบริษัทลูกค้า, ยี่ห้อ, รุ่นสินค้า, ซีเรียลนัมเบอร์ หรือสถานะการเคลม..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none text-xs focus:outline-none text-slate-800 placeholder-slate-400"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-[10px] text-slate-400 hover:text-slate-600 font-bold px-1.5">
            ล้าง
          </button>
        )}
      </div>

      {/* SLA Alert Callout for >30 days pending claim */}
      {claims.filter(c => c.claimStatus !== 'Returned' && calculateDaysDiff(c.claimReceivedDate, new Date().toISOString().split('T')[0])! > 30).length > 0 && (
        <div className="bg-purple-50 border border-purple-200 text-purple-800 p-2.5 rounded-lg flex items-center gap-2 text-[11px] font-bold">
          <AlertCircle className="w-4 h-4 text-purple-500 shrink-0" />
          <span>
            แจ้งเตือน: มี {claims.filter(c => c.claimStatus !== 'Returned' && calculateDaysDiff(c.claimReceivedDate, new Date().toISOString().split('T')[0])! > 30).length} รายการเคลมสินค้าที่ยังดำเนินการไม่แล้วเสร็จเกิน 30 วัน กรุณาเร่งติดตามสินค้าเคลมกับบริษัทผู้จำหน่าย
          </span>
        </div>
      )}

      {/* Data Grid Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-250 text-xs animate-fade-in">
            <thead className="bg-slate-50/70">
              <tr className="text-left text-slate-500 font-black text-[10px] uppercase tracking-wider">
                <th className="py-2 px-2.5 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('customerCompany')}>ลูกค้า / ผู้ติดต่อ {sortConfig.key === 'customerCompany' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="py-2 px-2.5 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('model')}>สินค้าหลัก / รุ่น {sortConfig.key === 'model' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="py-2 px-2.5 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('serialNumber')}>ซีเรียลนัมเบอร์ {sortConfig.key === 'serialNumber' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="py-2 px-2.5 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('purchaseDate')}>ข้อมูลประกันสินค้า {sortConfig.key === 'purchaseDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="py-2 px-2.5">ประกันที่เหลืออยู่</th>
                <th className="py-2 px-2.5 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('claimDestination')}>สถานที่ส่ง / อาคาร {sortConfig.key === 'claimDestination' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="py-2 px-2.5 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('claimReceivedDate')}>วันที่รับ / ส่งเคลม {sortConfig.key === 'claimReceivedDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="py-2 px-2.5">รูปถ่าย</th>
                <th className="py-2 px-2.5 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('claimStatus')}>สถานะเคลม {sortConfig.key === 'claimStatus' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="py-2 px-2.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-155">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-gray-500 text-sm">
                    ไม่พบรายการสินค้าเคลมในระบบ
                  </td>
                </tr>
              ) : (
                filteredClaims.map(claim => {
                  const nowStr = new Date().toISOString().split('T')[0];
                  const claimAge = calculateDaysDiff(claim.claimReceivedDate, nowStr) || 0;
                  const isClaimOverdue = claim.claimStatus !== 'Returned' && claimAge > 30;
                  const warrantyLeft = calculateRemainingWarranty(claim.purchaseDate, claim.warrantyDuration);

                  return (
                    <tr key={claim.id} className={`hover:bg-blue-50/20 text-xs transition-colors ${isClaimOverdue ? 'bg-purple-50/20' : ''}`}>
                      {/* Customer Company info */}
                      <td className="py-1.5 px-2.5">
                        <div className="flex items-center gap-1">
                          {isClaimOverdue && <AlertCircle className="w-3.5 h-3.5 text-purple-500 shrink-0" title="สินค้าเคลมค้างส่งเกิน 30 วัน!" />}
                          <div className="font-bold text-slate-900">{claim.customerCompany}</div>
                        </div>
                        {claim.claimNo && <div className="text-[10px] text-blue-600 font-bold mt-0.2">{claim.claimNo}</div>}
                        <div className="text-[10px] text-slate-550 mt-0.2">{claim.contactName} ({claim.contactPhone})</div>
                      </td>

                      {/* Brand & Model */}
                      <td className="py-1.5 px-2.5">
                        <div className="font-bold text-slate-800">{claim.brand} - {claim.model}</div>
                        <div className="text-[10px] text-slate-500 mt-0.2">{claim.productType}</div>
                      </td>

                      {/* Serial Number */}
                      <td className="py-1.5 px-2.5 font-mono font-black text-slate-700 text-[10px]">
                        {claim.serialNumber || '-'}
                      </td>

                      {/* Purchase Info */}
                      <td className="py-1.5 px-2.5 text-[10px] text-slate-600">
                        <div>ซื้อ: {claim.purchaseDate || '-'}</div>
                        <div className="text-slate-400 mt-0.2">ระยะรับประกัน: {claim.warrantyDuration} เดือน</div>
                      </td>

                      {/* Warranty remaining calculation */}
                      <td className="py-1.5 px-2.5">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${
                          warrantyLeft === 'หมดประกันแล้ว' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {warrantyLeft}
                        </span>
                      </td>

                      {/* Destinations */}
                      <td className="py-1.5 px-2.5">
                        <div className="font-semibold text-slate-800">{claim.claimDestination || '-'}</div>
                        <div className="text-slate-400 text-[10px] mt-0.2">{claim.claimBuilding || '-'}</div>
                      </td>

                      {/* Claim received / sent dates */}
                      <td className="py-1.5 px-2.5 text-[10px] text-slate-600 space-y-0.2">
                        <div>รับเคลม: {claim.claimReceivedDate || '-'}</div>
                        <div>ส่งดิว: {claim.claimSentDate || '-'}</div>
                      </td>

                      {/* Photos attached indicator */}
                      <td className="py-1.5 px-2.5 text-center">
                        <div className="flex gap-0.5 justify-center">
                          {claim.receivedPhoto && (
                            <span className="w-4 h-4 rounded bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[8px] border border-blue-200" title="มีภาพรับเคลม">รับ</span>
                          )}
                          {claim.returnedPhoto && (
                            <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-[8px] border border-emerald-200" title="มีภาพส่งคืน">คืน</span>
                          )}
                        </div>
                      </td>

                      {/* Claim status badge */}
                      <td className="py-1.5 px-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                          claim.claimStatus === 'Returned' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                          claim.claimStatus === 'Replaced' ? 'bg-blue-50 text-blue-700 border-blue-250' :
                          claim.claimStatus === 'Repaired' ? 'bg-amber-50 text-amber-700 border-amber-250' :
                          'bg-purple-50 text-purple-700 border-purple-250'
                        }`}>
                          {claim.claimStatus === 'Returned' ? 'Returned (คืนแล้ว)' :
                           claim.claimStatus === 'Replaced' ? 'Replaced (เปลี่ยนใหม่)' :
                           claim.claimStatus === 'Repaired' ? 'Repaired (ซ่อมเสร็จ)' :
                           'Claiming (ส่งเคลม)'}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-1.5 px-2.5 text-right">
                        <div className="flex justify-end gap-0.5">
                          <button
                            onClick={() => setPrintableClaimDoc(claim)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-slate-50 rounded cursor-pointer"
                            title="พิมพ์รายงานการเคลมสินค้า"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(claim)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded cursor-pointer"
                            title="แก้ไขข้อมูลเคลม"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`ยืนยันการลบข้อมูลสินค้าเคลม S/N: "${claim.serialNumber}"?`)) {
                                onDeleteClaim(claim.id!);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded cursor-pointer"
                            title="ลบข้อมูลเคลม"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white py-2.5 px-4 font-black flex justify-between items-center shrink-0">
              <span className="text-xs">{editingId ? 'แก้ไขข้อมูลการเคลมสินค้า' : 'บันทึกรายการสินค้าส่งเคลมตัวใหม่'}</span>
              <button onClick={resetForm} className="text-white hover:text-white/80 text-lg font-bold cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
              
              {/* Customer autofill linkage */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center gap-1.5 text-blue-800 font-black text-[11px]">
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>ค้นหาและดึงข้อมูลลูกค้าอัตโนมัติ (Customer Database Integration)</span>
                </div>
                <div className="relative">
                  <div className="flex gap-1.5">
                    <div className="relative w-full">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อบริษัทจากฐานลูกค้าหลัก..."
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                      />
                    </div>
                    {customerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearchQuery('');
                          setShowCustomerDropdown(false);
                        }}
                        className="px-3 py-2 bg-gray-200 rounded text-xs"
                      >
                        ล้าง
                      </button>
                    )}
                  </div>

                  {/* dropdown filter list */}
                  {showCustomerDropdown && customerSearchQuery && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 divide-y divide-gray-50 text-xs">
                      {searchedCustomers.length === 0 ? (
                        <div className="p-3 text-gray-500 italic">ไม่พบรายชื่อลูกค้านี้ในฐานข้อมูล</div>
                      ) : (
                        searchedCustomers.map(c => (
                          <div
                            key={c.id}
                            onClick={() => selectCustomer(c)}
                            className="p-2.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                          >
                            <div>
                              <span className="font-bold text-gray-900">{c.companyName}</span>
                              <span className="text-gray-500 ml-2">({c.contactName || 'ไม่มีข้อมูลผู้ติดต่อ'})</span>
                            </div>
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">ดึงข้อมูล</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Main Fields Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                
                {/* Col 1 */}
                <div className="space-y-3 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1">ข้อมูลลูกค้าผู้ซื้อ</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ชื่อบริษัทลูกค้า <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={customerCompany}
                      onChange={(e) => setCustomerCompany(e.target.value)}
                      placeholder="บจก. ผู้ซื้อ"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ที่อยู่บริษัทลูกค้า</label>
                    <textarea
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="ที่อยู่ลูกค้า..."
                      rows={2}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ชื่อ-นามสกุลผู้ติดต่อ</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="ผู้ติดต่อ"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">เบอร์โทรศัพท์ผู้ติดต่อ</label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="08X-XXX-XXXX"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">อีเมลผู้ติดต่อ</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="email@customer.com"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                {/* Col 2 */}
                <div className="space-y-3 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1">รายละเอียดสินค้าและประกัน</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ประเภทสินค้าหลัก</label>
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-800"
                    >
                      <option value="">-- เลือกประเภทสินค้า --</option>
                      {productTypes.map(pt => (
                        <option key={pt} value={pt}>{pt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ยี่ห้อสินค้า</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="เช่น Cisco, Fortinet"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">รุ่นสินค้า (Model)</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="เช่น C1000-24T-4G-L"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ซีเรียลนัมเบอร์ (S/N)</label>
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="เช่น FCN12345XYZ"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">วันที่ซื้อสินค้า</label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ระยะเวลารับประกัน (เดือน)</label>
                    <input
                      type="number"
                      value={warrantyDuration}
                      onChange={(e) => setWarrantyDuration(Number(e.target.value))}
                      placeholder="เช่น 12, 36"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                {/* Col 3 */}
                <div className="space-y-3 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1">ข้อมูลจัดส่งและสถานะเคลม</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">บริษัทคู่ค้า (ถ้ามี)</label>
                    <input
                      type="text"
                      value={partnerCompany}
                      onChange={(e) => setPartnerCompany(e.target.value)}
                      placeholder="ไม่มี"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">สถานที่ส่งเคลม</label>
                    <input
                      type="text"
                      value={claimDestination}
                      onChange={(e) => setClaimDestination(e.target.value)}
                      placeholder="เช่น ศูนย์บริการหลัก Cisco TH"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">อาคารที่แจ้งเคลม</label>
                    <input
                      type="text"
                      value={claimBuilding}
                      onChange={(e) => setClaimBuilding(e.target.value)}
                      placeholder="เช่น อาคารภิรัช ทาวเวอร์ ชั้น 18"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">วันที่รับสินค้าเคลม</label>
                    <input
                      type="date"
                      value={claimReceivedDate}
                      onChange={(e) => setClaimReceivedDate(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">วันส่งสินค้าคืนเคลม</label>
                    <input
                      type="date"
                      value={claimSentDate}
                      onChange={(e) => setClaimSentDate(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                   <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ชื่อผู้ตรวจสอบ (ช่างเทคนิค)</label>
                    <select
                      value={inspector}
                      onChange={(e) => setInspector(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-800"
                    >
                      <option value="">-- เลือกช่างผู้ตรวจสอบ --</option>
                      {operators.map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">สถานะสินค้าเคลม</label>
                    <select
                      value={claimStatus}
                      onChange={(e) => setClaimStatus(e.target.value as any)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded bg-white font-bold"
                    >
                      <option value="Claiming">Claiming (ส่งเคลม)</option>
                      <option value="Replaced">Replaced (เปลี่ยนของใหม่)</option>
                      <option value="Repaired">Repaired (ซ่อมเสร็จ)</option>
                      <option value="Returned">Returned (คืนลูกค้าเรียบร้อย)</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Photos upload area for claims */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Received Photo */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      รูปถ่ายสินค้าตอนรับเคลม
                    </span>
                    <button
                      type="button"
                      onClick={() => receivedPhotoInputRef.current?.click()}
                      className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded text-[10px] font-bold hover:bg-gray-100"
                    >
                      อัปโหลด
                    </button>
                    <input
                      type="file"
                      ref={receivedPhotoInputRef}
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload('received', e)}
                      className="hidden"
                    />
                  </div>
                  {receivedPhoto ? (
                    <div className="relative aspect-video rounded overflow-hidden bg-white border border-gray-200">
                      <img src={receivedPhoto} alt="Received product" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setReceivedPhoto('')}
                        className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-video rounded border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 font-medium">
                      <span>ไม่มีรูปถ่ายตอนรับเคลม</span>
                    </div>
                  )}
                </div>

                {/* 2. Returned Photo */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      รูปถ่ายสินค้าหลังซ่อม / ตัวเปลี่ยนทดแทน
                    </span>
                    <button
                      type="button"
                      onClick={() => returnedPhotoInputRef.current?.click()}
                      className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded text-[10px] font-bold hover:bg-gray-100"
                    >
                      อัปโหลด
                    </button>
                    <input
                      type="file"
                      ref={returnedPhotoInputRef}
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload('returned', e)}
                      className="hidden"
                    />
                  </div>
                  {returnedPhoto ? (
                    <div className="relative aspect-video rounded overflow-hidden bg-white border border-gray-200">
                      <img src={returnedPhoto} alt="Returned product" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setReturnedPhoto('')}
                        className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-video rounded border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 font-medium">
                      <span>ไม่มีรูปถ่ายตอนเคลมเสร็จ</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks area */}
              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1">หมายเหตุประกอบการเคลม</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="รายละเอียดหมายเหตุเพิ่มเติม เช่น เลขพัสดุเคลม อาการชำรุดเชิงลึก..."
                  rows={2}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-150 shrink-0">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'กำลังอัปโหลด...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exporter Printable Preview Modal for Claim Report */}
      {printableClaimDoc && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-4xl flex flex-col max-h-[95vh]">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white py-2.5 px-4 font-black flex justify-between items-center shrink-0">
              <span className="text-xs">พิมพ์ / ส่งออกเอกสารรายงานการเคลมสินค้า (Claim Report)</span>
              <button onClick={() => setPrintableClaimDoc(null)} className="text-white hover:text-white/80 text-lg font-bold cursor-pointer">&times;</button>
            </div>

            {/* Document preview container */}
            <div className="p-6 overflow-y-auto bg-gray-100 flex-1">
              
              {/* Actual Printable element */}
              <div 
                id="printable-claim-report-doc" 
                className="bg-white p-8 shadow-sm border border-gray-200 max-w-2xl mx-auto text-xs text-gray-800 leading-relaxed space-y-6"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {/* Header layout */}
                <div className="border-b-2 border-amber-500 pb-4 flex justify-between items-center">
                  <div>
                    <h1 className="text-lg font-extrabold text-blue-900">เอกสารรายงานการเคลมสินค้า (Claim Report)</h1>
                    <p className="text-gray-600 font-bold mt-0.5">ฝ่ายวิเคราะห์คุณภาพอุปกรณ์และอะไหล่สินค้าเคลม</p>
                    <p className="text-gray-500 text-[10px]">Email: <span className="font-semibold text-blue-700">wssservice.wins@gmail.com</span> | เบอร์โทรติดต่อ: <span className="font-semibold text-blue-700">085 502 9624</span></p>
                  </div>
                  <div className="text-right">
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-3 py-1 rounded font-bold uppercase">{printableClaimDoc.claimStatus}</span>
                  </div>
                </div>

                {/* Main Product metadata */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border border-gray-100">
                  <div className="space-y-1">
                    <div className="text-gray-500 font-bold uppercase text-[9px]">ข้อมูลผลิตภัณฑ์</div>
                    <div><strong>ยี่ห้อสินค้า:</strong> {printableClaimDoc.brand || '-'}</div>
                    <div><strong>รุ่นผลิตภัณฑ์ (Model):</strong> {printableClaimDoc.model || '-'}</div>
                    <div><strong>ซีเรียลนัมเบอร์ (S/N):</strong> <span className="font-mono font-bold text-blue-800">{printableClaimDoc.serialNumber || '-'}</span></div>
                    <div><strong>ประเภทสินค้า:</strong> {printableClaimDoc.productType || '-'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-gray-500 font-bold uppercase text-[9px]">ประวัติการซื้อ & ประกัน</div>
                    <div><strong>บริษัทเจ้าของ:</strong> {printableClaimDoc.customerCompany}</div>
                    <div><strong>ที่อยู่ผู้ซื้อ:</strong> {printableClaimDoc.customerAddress || '-'}</div>
                    <div><strong>วันที่สั่งซื้อสินค้า:</strong> {printableClaimDoc.purchaseDate || '-'}</div>
                    <div><strong>ประกันคงเหลือ:</strong> {calculateRemainingWarranty(printableClaimDoc.purchaseDate, printableClaimDoc.warrantyDuration)}</div>
                  </div>
                </div>

                {/* Claim Logistics */}
                <div className="grid grid-cols-3 gap-4 border-b border-gray-100 pb-4 text-[11px]">
                  <div>
                    <div className="text-gray-400 font-bold uppercase text-[9px]">สถานที่ส่งเคลม</div>
                    <div className="font-semibold">{printableClaimDoc.claimDestination || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 font-bold uppercase text-[9px]">อาคารที่แจ้งเคลม</div>
                    <div className="font-semibold">{printableClaimDoc.claimBuilding || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 font-bold uppercase text-[9px]">พนักงานคู่ร่วม</div>
                    <div className="font-semibold">{printableClaimDoc.partnerCompany || 'ไม่มี'}</div>
                  </div>
                </div>

                {/* Claim Dates */}
                <div className="grid grid-cols-3 gap-4 bg-gray-50/50 p-3 rounded">
                  <div>
                    <div className="text-gray-400 font-bold text-[9px]">วันที่รับสินค้าเคลม</div>
                    <div className="font-bold text-gray-700">{printableClaimDoc.claimReceivedDate || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 font-bold text-[9px]">วันที่ส่งคืน/ส่งเสร็จ</div>
                    <div className="font-bold text-gray-700">{printableClaimDoc.claimSentDate || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 font-bold text-[9px]">ผู้ตรวจสอบ</div>
                    <div className="font-bold text-gray-700">{printableClaimDoc.inspector || '-'}</div>
                  </div>
                </div>

                {/* Remarks analysis */}
                {printableClaimDoc.remarks && (
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-[11px]">บันทึกการวิเคราะห์และการส่งคืน:</h3>
                    <p className="mt-1 text-gray-700 whitespace-pre-wrap">{printableClaimDoc.remarks}</p>
                  </div>
                )}

                {/* Images Attachment Visual section */}
                {(printableClaimDoc.receivedPhoto || printableClaimDoc.returnedPhoto) && (
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="font-bold text-gray-900 text-xs mb-3 flex items-center gap-1">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>หลักฐานรูปถ่ายประกอบรายงานการเคลม (Claims Visual Proof)</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {printableClaimDoc.receivedPhoto && (
                        <div className="border border-gray-200 p-2.5 rounded bg-gray-50 text-center">
                          <div className="text-[10px] text-gray-500 font-bold mb-1">สภาพสินค้ารับเคลมครั้งแรก</div>
                          <div className="aspect-video w-full rounded overflow-hidden bg-white flex items-center justify-center max-h-36">
                            <img src={printableClaimDoc.receivedPhoto} alt="Received" className="object-cover w-full h-full" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                          </div>
                        </div>
                      )}
                      {printableClaimDoc.returnedPhoto && (
                        <div className="border border-gray-200 p-2.5 rounded bg-gray-50 text-center">
                          <div className="text-[10px] text-gray-500 font-bold mb-1">สินค้ารุ่นใหม่ / ซ่อมคืนสินค้าเคลมเรียบร้อย</div>
                          <div className="aspect-video w-full rounded overflow-hidden bg-white flex items-center justify-center max-h-36">
                            <img src={printableClaimDoc.returnedPhoto} alt="Returned" className="object-cover w-full h-full" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Signature slot claim sheet */}
                <div className="pt-8 grid grid-cols-2 gap-8 text-center border-t border-gray-100">
                  <div className="space-y-12">
                    <div className="text-gray-500 font-bold">พนักงานผู้ส่งเคลมและวิเคราะห์</div>
                    <div className="border-b border-gray-300 w-44 mx-auto h-5"></div>
                    <div className="text-gray-600">(........................................................)</div>
                  </div>
                  <div className="space-y-12">
                    <div className="text-gray-500 font-bold">ลูกค้าผู้รับมอบของคืนเคลม</div>
                    <div className="border-b border-gray-300 w-44 mx-auto h-5"></div>
                    <div className="text-gray-600">(........................................................)</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Document export bar */}
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex flex-wrap justify-between gap-3 items-center shrink-0">
              <span className="text-xs text-gray-500">เลือกรูปแบบการส่งออกสำหรับ Claim Report ของคุณ</span>
              <div className="flex gap-2 w-full sm:w-auto">
                {/* Excel export */}
                <button
                  onClick={() => exportToExcelTable('printable-claim-report-doc', `ClaimReport_${printableClaimDoc.serialNumber}`)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ส่งออก Excel</span>
                </button>

                {/* Word export */}
                <button
                  onClick={() => exportToWord('printable-claim-report-doc', `ClaimReport_${printableClaimDoc.serialNumber}`)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>ส่งออก Word</span>
                </button>

                {/* PDF export */}
                <button
                  onClick={handleExportPDFReport}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ส่งออก PDF</span>
                </button>

                <button
                  onClick={() => setPrintableClaimDoc(null)}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-bold text-xs cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
