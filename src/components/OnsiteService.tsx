import React, { useState, useRef } from 'react';
import { OnsiteService, Customer, ServicePhoto } from '../types';
import { 
  Search, Plus, Trash2, Edit3, Eye, FileText, Download, Upload, AlertCircle, 
  Calendar, Check, User, Info, FileSpreadsheet, Paperclip, CheckSquare, Image as ImageIcon, X
} from 'lucide-react';
import { calculateDaysDiff, exportToCSV, parseCSV, exportToWord, exportToExcelTable } from '../utils';
import { uploadFileToDrive } from '../drive';
import { getAccessToken } from '../firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface OnsiteServiceProps {
  onsiteJobs: OnsiteService[];
  customers: Customer[];
  serviceTypes: string[];
  operators: string[];
  salesReps: string[];
  productTypes: string[];
  onAddJob: (job: OnsiteService) => Promise<any>;
  onUpdateJob: (id: string, job: OnsiteService) => Promise<any>;
  onDeleteJob: (id: string) => Promise<any>;
  onImportJobs: (jobs: OnsiteService[]) => Promise<any>;
  selectedOnsiteForView?: OnsiteService | null;
  setSelectedOnsiteForView?: (job: OnsiteService | null) => void;
  onAddDropdownOption: (key: any, value: string) => Promise<void>;
  onDeleteDropdownOption: (key: any, value: string) => Promise<void>;
}

export default function OnsiteServiceTab({
  onsiteJobs,
  customers,
  serviceTypes,
  operators,
  salesReps,
  productTypes,
  onAddJob,
  onUpdateJob,
  onDeleteJob,
  onImportJobs,
  selectedOnsiteForView,
  setSelectedOnsiteForView,
  onAddDropdownOption,
  onDeleteDropdownOption
}: OnsiteServiceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'}>({key: 'createdAt', direction: 'desc'});
  
  // PDF export modal view
  const [exportTargetJob, setExportTargetJob] = useState<OnsiteService | null>(null);
  const [reportViewMode, setReportViewMode] = useState<'full' | 'simple'>('full');

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
  const [referenceDocument, setReferenceDocument] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [productType, setProductType] = useState('');
  const [serviceLocation, setServiceLocation] = useState('');
  const [operator1, setOperator1] = useState('');
  const [operator2, setOperator2] = useState('');
  const [salesRep, setSalesRep] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [startServiceDate, setStartServiceDate] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [cause, setCause] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [remarks, setRemarks] = useState('');
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState('');
  const [status, setStatus] = useState<'Open' | 'In Progress' | 'Pending' | 'Resolved'>('Open');
  const [photos, setPhotos] = useState<ServicePhoto[]>([]);
  const [signedReportUrl, setSignedReportUrl] = useState('');
  const [signedReportName, setSignedReportName] = useState('');
  const [signedReportFileId, setSignedReportFileId] = useState('');

  // Dropdown quick addition inputs
  const [newServiceType, setNewServiceType] = useState('');
  const [newOperator, setNewOperator] = useState('');
  const [newSalesRep, setNewSalesRep] = useState('');

  const [isUploading, setIsUploading] = useState(false);

  // Refs for files
  const photoInputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (selectedOnsiteForView) {
      handleEdit(selectedOnsiteForView);
      setSelectedOnsiteForView?.(null); // Clear after opening
    }
  }, [selectedOnsiteForView]);

  const resetForm = () => {
    setEditingId(null);
    setCustomerCompany('');
    setCustomerAddress('');
    setContactName('');
    setContactDetail('');
    setContactPhone('');
    setContactEmail('');
    setPartnerCompany('');
    setReferenceDocument('');
    setServiceType('');
    setProductType('');
    setServiceLocation('');
    setOperator1('');
    setOperator2('');
    setSalesRep('');
    const today = new Date().toISOString().split('T')[0];
    setReceivedDate(today);
    setStartServiceDate(today);
    setResolutionDate(today);
    setSymptoms('');
    setDiagnosis('');
    setCause('');
    setActionTaken('');
    setRemarks('');
    setWarrantyExpiryDate('');
    setStatus('Open');
    setPhotos([]);
    setSignedReportUrl('');
    setSignedReportName('');
    setSignedReportFileId('');
    setCustomerSearchQuery('');
    setIsFormOpen(false);
  };

  const handleEdit = (job: OnsiteService) => {
    setEditingId(job.id || null);
    setCustomerCompany(job.customerCompany || '');
    setCustomerAddress(job.customerAddress || '');
    setContactName(job.contactName || '');
    setContactDetail(job.contactDetail || '');
    setContactPhone(job.contactPhone || '');
    setContactEmail(job.contactEmail || '');
    setPartnerCompany(job.partnerCompany || '');
    setReferenceDocument(job.referenceDocument || '');
    setServiceType(job.serviceType || '');
    setProductType(job.productType || '');
    setServiceLocation(job.serviceLocation || '');
    setOperator1(job.operator1 || '');
    setOperator2(job.operator2 || '');
    setSalesRep(job.salesRep || '');
    setReceivedDate(job.receivedDate || '');
    setStartServiceDate(job.startServiceDate || '');
    setResolutionDate(job.resolutionDate || '');
    setSymptoms(job.symptoms || '');
    setDiagnosis(job.diagnosis || '');
    setCause(job.cause || '');
    setActionTaken(job.actionTaken || '');
    setRemarks(job.remarks || '');
    setWarrantyExpiryDate(job.warrantyExpiryDate || '');
    setStatus(job.status || 'Open');
    setPhotos(job.photos || []);
    setSignedReportUrl(job.signedReportUrl || '');
    setSignedReportName(job.signedReportName || '');
    setSignedReportFileId(job.signedReportFileId || '');
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
    if (c.salesRep) {
      setSalesRep(c.salesRep);
    }
    setShowCustomerDropdown(false);
    setCustomerSearchQuery('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (photos.length + files.length > 4) {
      alert('แนบรูปถ่ายได้ไม่เกิน 4 รูป');
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      alert('ไม่พบสิทธิ์การเชื่อมต่อ Google Drive (เซสชันอาจหมดอายุจากการรีเฟรชหน้าเว็บ) \n\nกรุณากด "ออกจากระบบ" แล้ว "เข้าสู่ระบบ" ใหม่อีกครั้ง และอย่าลืมติ๊กถูกอนุญาตสิทธิ์ Google Drive ในหน้าต่างเข้าสู่ระบบ');
      return;
    }

    setIsUploading(true);
    try {
      const uploadedPhotos: ServicePhoto[] = [];
      for (const file of Array.from(files) as File[]) {
        // Upload directly to Drive
        const result = await uploadFileToDrive(file, file.name, 'TechLink_PIC', token);
        uploadedPhotos.push({
          url: result.thumbnailLink || result.webContentLink || result.webViewLink || result.fileId,
          caption: '',
          timestamp: Date.now()
        });
      }
      setPhotos(prev => [...prev, ...uploadedPhotos]);
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ' + err.message);
    } finally {
      setIsUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleCaptionChange = (index: number, val: string) => {
    const updated = [...photos];
    updated[index].caption = val;
    setPhotos(updated);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = await getAccessToken();
    if (!token) {
      alert('ไม่พบสิทธิ์การเชื่อมต่อ Google Drive (เซสชันอาจหมดอายุจากการรีเฟรชหน้าเว็บ) \n\nกรุณากด "ออกจากระบบ" แล้ว "เข้าสู่ระบบ" ใหม่อีกครั้ง และอย่าลืมติ๊กถูกอนุญาตสิทธิ์ Google Drive ในหน้าต่างเข้าสู่ระบบ');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadFileToDrive(file, file.name, 'TechLink_PDF', token);
      setSignedReportUrl(result.webContentLink || result.webViewLink || result.fileId);
      setSignedReportName(file.name);
      setSignedReportFileId(result.fileId);
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัปโหลดเอกสาร: ' + err.message);
    } finally {
      setIsUploading(false);
      if (reportInputRef.current) reportInputRef.current.value = '';
    }
  };

  const generateJobNo = (): string => {
    const currentYear = new Date().getFullYear();
    const shortYear = String(currentYear).substring(2);
    const sameYearJobs = onsiteJobs.filter(j => {
      const parts = j.jobNo?.split('/');
      if (parts && parts.length > 1) {
        return parts[1] === String(currentYear) || parts[1] === shortYear;
      }
      return false;
    });

    const nextSeq = sameYearJobs.length + 1;
    const formattedSeq = String(nextSeq).padStart(3, '0');
    // JobNo style: WSS_Service001/26 or WSS_Service001/2026
    return `WSS_Service${formattedSeq}/${shortYear}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerCompany.trim()) {
      alert('กรุณากรอกชื่อบริษัทลูกค้า');
      return;
    }

    const resolvedJobNo = editingId ? (onsiteJobs.find(j => j.id === editingId)?.jobNo || generateJobNo()) : generateJobNo();

    const payload: OnsiteService = {
      jobNo: resolvedJobNo,
      customerCompany,
      customerAddress,
      contactName,
      contactDetail,
      contactPhone,
      contactEmail,
      partnerCompany,
      referenceDocument,
      serviceType,
      productType,
      serviceLocation,
      operator1,
      operator2,
      salesRep,
      receivedDate,
      startServiceDate,
      resolutionDate,
      symptoms,
      diagnosis,
      cause,
      actionTaken,
      remarks,
      warrantyExpiryDate,
      status,
      photos,
      signedReportUrl,
      signedReportName,
      signedReportFileId
    };

    try {
      if (editingId) {
        await onUpdateJob(editingId, payload);
      } else {
        await onAddJob(payload);
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล Onsite Service');
    }
  };

  // CSV Import / Export
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = () => {
    const headers = [
      'เลขที่ใบงาน', 'ชื่อบริษัทลูกค้า', 'ที่อยู่บริษัทลูกค้า', 'ชื่อผู้ติดต่อ', 'รายละเอียดผู้ติดต่อ', 
      'เบอร์โทรผู้ติดต่อ', 'อีเมลผู้ติดต่อ', 'บริษัทคู่ค้า', 'หมายเลขเอกสารอ้างอิง', 'ประเภทบริการ', 'สถานที่ปฏิบัติงาน', 
      'ผู้ปฏิบัติงาน 1', 'ผู้ปฏิบัติงาน 2', 'พนักงานขาย', 'วันที่รับแจ้ง', 'วันที่เข้าปฏิบัติงาน', 
      'วันที่แก้ไขเสร็จงาน', 'สถานะ', 'บรรยายรับแจ้งอาการ', 'ขั้นตอนการตรวจสอบ', 'สาเหตุ', 'การแก้ไข', 'หมายเหตุ'
    ];
    const data = onsiteJobs.map(j => ({
      'เลขที่ใบงาน': j.jobNo,
      'ชื่อบริษัทลูกค้า': j.customerCompany,
      'ที่อยู่บริษัทลูกค้า': j.customerAddress,
      'ชื่อผู้ติดต่อ': j.contactName,
      'รายละเอียดผู้ติดต่อ': j.contactDetail,
      'เบอร์โทรผู้ติดต่อ': j.contactPhone,
      'อีเมลผู้ติดต่อ': j.contactEmail,
      'บริษัทคู่ค้า': j.partnerCompany,
      'หมายเลขเอกสารอ้างอิง': j.referenceDocument || '',
      'ประเภทบริการ': j.serviceType,
      'สถานที่ปฏิบัติงาน': j.serviceLocation,
      'ผู้ปฏิบัติงาน 1': j.operator1,
      'ผู้ปฏิบัติงาน 2': j.operator2,
      'พนักงานขาย': j.salesRep,
      'วันที่รับแจ้ง': j.receivedDate,
      'วันที่เข้าปฏิบัติงาน': j.startServiceDate,
      'วันที่แก้ไขเสร็จงาน': j.resolutionDate,
      'สถานะ': j.status,
      'บรรยายรับแจ้งอาการ': j.symptoms || '',
      'ขั้นตอนการตรวจสอบ': j.diagnosis || '',
      'สาเหตุ': j.cause || '',
      'การแก้ไข': j.actionTaken || '',
      'หมายเหตุ': j.remarks || ''
    }));
    exportToCSV(data, headers, 'Onsite_Service_Jobs');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCSV(text);
      
      const mapped: OnsiteService[] = parsed.map(item => ({
        jobNo: item['เลขที่ใบงาน'] || item['jobNo'] || generateJobNo(),
        customerCompany: item['ชื่อบริษัทลูกค้า'] || item['customerCompany'] || '',
        customerAddress: item['ที่อยู่บริษัทลูกค้า'] || item['customerAddress'] || '',
        contactName: item['ชื่อผู้ติดต่อ'] || item['contactName'] || '',
        contactDetail: item['รายละเอียดผู้ติดต่อ'] || item['contactDetail'] || '',
        contactPhone: item['เบอร์โทรผู้ติดต่อ'] || item['contactPhone'] || '',
        contactEmail: item['อีเมลผู้ติดต่อ'] || item['contactEmail'] || '',
        partnerCompany: item['บริษัทคู่ค้า'] || item['partnerCompany'] || '',
        serviceType: item['ประเภทบริการ'] || item['serviceType'] || '',
        serviceLocation: item['สถานที่ปฏิบัติงาน'] || item['serviceLocation'] || '',
        operator1: item['ผู้ปฏิบัติงาน 1'] || item['operator1'] || '',
        operator2: item['ผู้ปฏิบัติงาน 2'] || item['operator2'] || '',
        salesRep: item['พนักงานขาย'] || item['salesRep'] || '',
        receivedDate: item['วันที่รับแจ้ง'] || item['receivedDate'] || '',
        startServiceDate: item['วันที่เข้าปฏิบัติงาน'] || item['startServiceDate'] || '',
        resolutionDate: item['วันที่แก้ไขเสร็จงาน'] || item['resolutionDate'] || '',
        status: (item['สถานะ'] || item['status'] || 'Open') as any,
        symptoms: item['บรรยายรับแจ้งอาการ'] || '',
        diagnosis: item['ขั้นตอนการตรวจสอบ'] || '',
        cause: item['สาเหตุ'] || item['cause'] || '',
        actionTaken: item['การแก้ไข'] || '',
        remarks: item['หมายเหตุ'] || '',
        photos: [],
        signedReportUrl: '',
        signedReportName: '',
        signedReportFileId: ''
      })).filter(j => j.customerCompany);

      if (mapped.length > 0) {
        await onImportJobs(mapped);
        alert(`นำเข้าสำเร็จ ${mapped.length} รายการ`);
      } else {
        alert('ไม่พบข้อมูลงาน onsite ที่ถูกต้องในไฟล์ CSV');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // HTML canvas export PDF
  const handleExportPDF = async () => {
    const element = document.getElementById('printable-job-service-doc');
    if (!element) return;

    try {
      const pages = element.querySelectorAll('.pdf-page');
      if (pages.length === 0) return;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;

      for (let i = 0; i < pages.length; i++) {
        const pageElement = pages[i] as HTMLElement;
        const canvas = await html2canvas(pageElement, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        if (i > 0) pdf.addPage();
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft > 5) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      const prefix = reportViewMode === 'simple' ? 'CustomerSummary' : 'JobService';
      pdf.save(`${prefix}_${exportTargetJob?.jobNo?.replace('/', '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    }
  };

  const filteredJobs = onsiteJobs.filter(j => {
    const search = searchTerm.toLowerCase();
    return (
      j.jobNo?.toLowerCase().includes(search) ||
      j.customerCompany?.toLowerCase().includes(search) ||
      j.contactName?.toLowerCase().includes(search) ||
      j.operator1?.toLowerCase().includes(search) ||
      j.operator2?.toLowerCase().includes(search) ||
      j.serviceType?.toLowerCase().includes(search)
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
    <div className="space-y-3" id="onsite-tab">
      {/* Title & Top Options */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5">
            <Calendar className="text-blue-600 w-4 h-4" />
            ตารางงาน Onsite Service
          </h2>
          <p className="text-[10px] text-slate-500">บันทึกขั้นตอนการตรวจซ่อมและติดตามสถานะงาน Onsite พร้อมเอกสาร Job Service & แผนแนบภาพ</p>
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

          <button
            onClick={() => { resetForm(); setIsFormOpen(true); }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            เพิ่มงาน Onsite Service
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white px-3 py-1.5 rounded-lg shadow-xs border border-slate-200 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="ค้นหาเลขใบงาน, ชื่อลูกค้า, ชื่อผู้ติดต่อ, ประเภทบริการ, หรือช่างผู้ตรวจงาน..."
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

      {/* SLA Alert Counter Callout */}
      {onsiteJobs.filter(j => j.status !== 'Resolved' && calculateDaysDiff(j.receivedDate, new Date().toISOString().split('T')[0])! > 15).length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-2.5 rounded-lg flex items-center gap-2 text-[11px] font-bold">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>
            แจ้งเตือน: มี {onsiteJobs.filter(j => j.status !== 'Resolved' && calculateDaysDiff(j.receivedDate, new Date().toISOString().split('T')[0])! > 15).length} งานที่ยังไม่ปิดการดำเนินงานเกิน 15 วัน นับจากวันที่รับแจ้ง กรุณาตรวจสอบสถานะงาน
          </span>
        </div>
      )}

      {/* Table List of Jobs */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50/70">
              <tr className="text-left text-slate-500 font-black text-[10px] uppercase tracking-wider">
                <th className="py-2 px-2.5 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('jobNo')}>เลขใบงาน {sortConfig.key === 'jobNo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="py-2 px-2.5 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('customerCompany')}>ลูกค้า / ผู้ติดต่อ {sortConfig.key === 'customerCompany' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="py-2 px-2.5 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('serviceType')}>ประเภท / สถานที่ {sortConfig.key === 'serviceType' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="py-2 px-2.5 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('operator1')}>ผู้ปฏิบัติงาน / เซลส์ {sortConfig.key === 'operator1' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="py-2 px-2.5 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('startServiceDate')}>วันที่ดำเนินการ {sortConfig.key === 'startServiceDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="py-2 px-2.5">คำนวณเวลา</th>
                <th className="py-2 px-2.5">เอกสาร / เซ็นชื่อ</th>
                <th className="py-2 px-2.5 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('status')}>สถานะ {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="py-2 px-2.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500 text-sm">
                    ไม่พบรายการงาน Onsite ในระบบ
                  </td>
                </tr>
              ) : (
                filteredJobs.map(job => {
                  const nowStr = new Date().toISOString().split('T')[0];
                  const workDaysRaw = calculateDaysDiff(job.startServiceDate, job.resolutionDate);
                  const workDays = workDaysRaw === 0 ? 1 : workDaysRaw;
                  const resolutionDaysRaw = calculateDaysDiff(job.receivedDate, job.resolutionDate);
                  const resolutionDays = resolutionDaysRaw === 0 ? 1 : resolutionDaysRaw;
                  const daysSinceReceived = calculateDaysDiff(job.receivedDate, nowStr) || 0;
                  
                  // Check if overdue > 15 days
                  const isOverdue = job.status !== 'Resolved' && daysSinceReceived > 15;

                  return (
                    <tr key={job.id} className={`hover:bg-blue-50/20 text-xs transition-colors ${isOverdue ? 'bg-red-50/20' : ''}`}>
                      {/* Job No with Alert indicator */}
                      <td className="py-1.5 px-2.5 font-mono font-bold text-blue-600">
                        <div className="flex items-center gap-1">
                          {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" title="งานค้างเกิน 15 วัน!" />}
                          <span>{job.jobNo}</span>
                        </div>
                      </td>

                      {/* Customer Company & contact */}
                      <td className="py-1.5 px-2.5">
                        <div className="font-bold text-slate-900">{job.customerCompany}</div>
                        <div className="text-[10px] text-slate-500 mt-0.2">{job.contactName} ({job.contactPhone})</div>
                      </td>

                      {/* Service Type & Location */}
                      <td className="py-1.5 px-2.5">
                        <div className="font-semibold text-slate-800">{job.serviceType}</div>
                        <div className="text-[10px] text-slate-500 max-w-xs truncate">{job.serviceLocation}</div>
                      </td>

                      {/* Operators & Sales Rep */}
                      <td className="py-1.5 px-2.5">
                        <div className="font-semibold text-slate-700">
                          {[job.operator1, job.operator2].filter(Boolean).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.2">เซลส์: {job.salesRep}</div>
                      </td>

                      {/* Service Dates */}
                      <td className="py-1.5 px-2.5 text-[10px] text-slate-600 space-y-0.2">
                        <div>แจ้ง: {job.receivedDate}</div>
                        <div>เข้า: {job.startServiceDate}</div>
                        <div>เสร็จ: {job.resolutionDate}</div>
                      </td>

                      {/* Computed days durations */}
                      <td className="py-1.5 px-2.5 font-semibold text-slate-800 text-[10px] space-y-0.2">
                        <div>ทำ: <span className="text-blue-700">{workDays !== null ? `${workDays} วัน` : '-'}</span></div>
                        <div>แก้: <span className="text-indigo-700">{resolutionDays !== null ? `${resolutionDays} วัน` : '-'}</span></div>
                      </td>

                      {/* Signed Report Indicator */}
                      <td className="py-1.5 px-2.5">
                        {job.signedReportUrl ? (
                          <a href={job.signedReportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] hover:underline" title={job.signedReportName}>
                            <Paperclip className="w-3 h-3" />
                            <span>เปิด / ดาวน์โหลด</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">ไม่มีรายงานเซ็นกลับ</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="py-1.5 px-2.5 font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                          job.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          job.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          job.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {job.status === 'Resolved' ? 'Resolved (เสร็จสิ้น)' :
                           job.status === 'In Progress' ? 'In Progress (กำลังทำ)' :
                           job.status === 'Pending' ? 'Pending (รออุปกรณ์)' :
                           'Open (เปิดงาน)'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-1.5 px-2.5 text-right">
                        <div className="flex justify-end gap-0.5">
                          <button
                            onClick={() => setExportTargetJob(job)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-slate-50 rounded cursor-pointer"
                            title="เปิดใบงาน Job Service & Export"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(job)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded cursor-pointer"
                            title="แก้ไขข้อมูลงาน"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`ยืนยันการลบใบงาน "${job.jobNo}"? ประวัติจะถูกนำออกจากระบบถาวร`)) {
                                onDeleteJob(job.id!);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded cursor-pointer"
                            title="ลบงาน"
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

      {/* Add / Edit Onsite Job Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white py-2.5 px-4 font-black flex justify-between items-center shrink-0">
              <span className="text-xs">{editingId ? `แก้ไขใบงาน Onsite: ${customerCompany}` : 'เพิ่มบันทึกงาน Onsite Service ใหม่'}</span>
              <button onClick={resetForm} className="text-white hover:text-white/80 text-lg font-bold cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
              
              {/* Customer Linkage / Auto-fill Section */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
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
                        placeholder="พิมพ์เพื่อค้นหาบริษัทลูกค้าจากฐานข้อมูลหลัก..."
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="w-full text-xs pl-8 pr-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white"
                      />
                    </div>
                    {customerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearchQuery('');
                          setShowCustomerDropdown(false);
                        }}
                        className="px-3 py-2 bg-gray-200 rounded-lg text-xs"
                      >
                        ล้าง
                      </button>
                    )}
                  </div>

                  {/* Customer Search Dropdown */}
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
                              <span className="text-gray-500 ml-2">({c.contactName || 'ไม่มีผู้ติดต่อ'})</span>
                            </div>
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">เลือกดึงข้อมูล</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Main Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. Customer Details */}
                <div className="space-y-3 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1">ข้อมูลหลักและผู้ติดต่อ</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ชื่อบริษัทลูกค้า <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={customerCompany}
                      onChange={(e) => setCustomerCompany(e.target.value)}
                      placeholder="บจก. ลูกค้า"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-gray-800"
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
                      placeholder="คุณสมชาย"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">รายละเอียดผู้ติดต่อ (ถ้ามี)</label>
                    <input
                      type="text"
                      value={contactDetail}
                      onChange={(e) => setContactDetail(e.target.value)}
                      placeholder="เช่น ฝ่ายไอที"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">เบอร์โทรศัพท์ผู้ติดต่อ</label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="081-234-5678"
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

                {/* 2. Service Options & Assignments */}
                <div className="space-y-3 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1">การมอบหมายงาน</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">หมายเลขเอกสารอ้างอิง (ถ้ามี)</label>
                    <input
                      type="text"
                      value={referenceDocument}
                      onChange={(e) => setReferenceDocument(e.target.value)}
                      placeholder="เช่น PO, PR..."
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
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
                  
                  {/* Service Type Dropdown selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ประเภทบริการ</label>
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-800"
                    >
                      <option value="">-- เลือกประเภทบริการ --</option>
                      {serviceTypes.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">สถานที่ปฏิบัติงาน</label>
                    <input
                      type="text"
                      value={serviceLocation}
                      onChange={(e) => setServiceLocation(e.target.value)}
                      placeholder="เช่น นิคมอุตสาหกรรมบางปู"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>

                  {/* Operator 1 */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ผู้ปฏิบัติงานคนที่ 1</label>
                    <select
                      value={operator1}
                      onChange={(e) => setOperator1(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-800"
                    >
                      <option value="">-- เลือกผู้ปฏิบัติงาน --</option>
                      {operators.map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>

                  {/* Operator 2 */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ผู้ปฏิบัติงานคนที่ 2 (ถ้ามี)</label>
                    <select
                      value={operator2}
                      onChange={(e) => setOperator2(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-800"
                    >
                      <option value="">-- เลือกผู้ปฏิบัติงานสำรอง --</option>
                      {operators.map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sales Rep selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">พนักงานขาย</label>
                    <select
                      value={salesRep}
                      onChange={(e) => setSalesRep(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-800"
                    >
                      <option value="">-- เลือกพนักงานขาย --</option>
                      {salesReps.map(sr => (
                        <option key={sr} value={sr}>{sr}</option>
                      ))}
                    </select>
                  </div>

                  {/* Product Type (ประเภทสินค้า) */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ประเภทสินค้า</label>
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
                </div>

                {/* 3. Dates & Status */}
                <div className="space-y-3 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1">วันเวลาและสถานะดำเนินการ</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">วันที่รับแจ้ง</label>
                    <input
                      type="date"
                      value={receivedDate}
                      onChange={(e) => setReceivedDate(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">วันที่เข้าปฏิบัติงาน</label>
                    <input
                      type="date"
                      value={startServiceDate}
                      onChange={(e) => setStartServiceDate(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">วันที่แก้ไขเสร็จงาน</label>
                    <input
                      type="date"
                      value={resolutionDate}
                      onChange={(e) => setResolutionDate(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">สถานะการดำเนินงาน</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-800 font-bold"
                    >
                      <option value="Open">Open (เปิดงาน)</option>
                      <option value="In Progress">In Progress (กำลังดำเนินการ)</option>
                      <option value="Pending">Pending (อยู่ระหว่างรอ / ค้างส่ง)</option>
                      <option value="Resolved">Resolved (แก้ไขเสร็จสิ้น)</option>
                    </select>
                  </div>

                  {/* Calculations Info Callout */}
                  <div className="bg-blue-50 border border-blue-100 p-2.5 rounded text-[10px] space-y-1 text-blue-800">
                    <div>
                      <strong>สรุปวันทำงาน:</strong> {calculateDaysDiff(startServiceDate, resolutionDate) !== null ? `${calculateDaysDiff(startServiceDate, resolutionDate)} วัน` : 'ไม่มีข้อมูลวันที่'}
                    </div>
                    <div>
                      <strong>สรุประยะเวลาแก้ไขปัญหา:</strong> {calculateDaysDiff(receivedDate, resolutionDate) !== null ? `${calculateDaysDiff(receivedDate, resolutionDate)} วัน` : 'ไม่มีข้อมูลวันที่'}
                    </div>
                  </div>
                </div>

              </div>

              {/* Descriptions & Captions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1">รายละเอียดอาการและการตรวจสอบ</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">อาการที่ได้รับแจ้ง / ปัญหาที่พบ</label>
                    <textarea
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="พิมพ์ลักษณะการรับแจ้งอาการปัญหาขัดข้อง..."
                      rows={3}
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">รายละเอียดการดำเนินงาน</label>
                    <textarea
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="ระบุร่องรอยการตรวจสอบ ข้อวิเคราะห์ทางเทคนิค..."
                      rows={2}
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">สาเหตุของปัญหา</label>
                    <textarea
                      value={cause}
                      onChange={(e) => setCause(e.target.value)}
                      placeholder="ระบุสาเหตุปัญหาขัดข้อง..."
                      rows={2}
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1">การแก้ไขและหมายเหตุประกอบ</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">การแก้ไขปัญหา</label>
                    <textarea
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      placeholder="พิมพ์อธิบายการแก้ไขปัญหา ข้อมูลอะไหล่หรือการตั้งค่าอุปกรณ์..."
                      rows={3}
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">หมายเหตุ</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="ข้อความเพิ่มเติมหรือข้อตกลงกับลูกค้า..."
                      rows={3}
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Photos attachment module */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="text-blue-600 w-5 h-5" />
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">แนบรูปภาพถ่ายการปฏิบัติงาน (สูงสุด 4 รูปภาพ)</h4>
                      <p className="text-[10px] text-gray-500">เก็บประวัติรูปถ่ายปฏิบัติงานไว้ 30 วันก่อนทำการลบออกจาก Firebase อัตโนมัติเพื่อลดขนาดฐานข้อมูล</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photos.length >= 4}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-50 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />
                    อัปโหลดรูปภาพ
                  </button>
                  <input
                    type="file"
                    ref={photoInputRef}
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    {photos.map((p, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-gray-200 relative group flex flex-col justify-between">
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs font-bold hover:bg-red-600 shadow transition-colors z-10"
                        >
                          &times;
                        </button>
                        <div className="aspect-video w-full rounded overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-100">
                          <img src={p.url} alt={`Upload ${idx+1}`} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                        </div>
                        <div className="mt-2.5">
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">คำอธิบายภาพ {idx+1}</label>
                          <input
                            type="text"
                            required
                            placeholder="พิมพ์คําบรรยายรูปถ่าย..."
                            value={p.caption}
                            onChange={(e) => handleCaptionChange(idx, e.target.value)}
                            className="w-full text-[10px] px-2 py-1 border border-gray-300 rounded"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Signed Report Upload area */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-start gap-2.5">
                  <FileText className="text-emerald-600 w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-gray-900">แนบไฟล์ใบงานรายงานการตรวจเช็คที่ลูกค้าลงชื่อแล้ว</h4>
                    <p className="text-[10px] text-gray-500">อัปโหลดรูปภาพหรือ PDF ใบงานที่ลูกค้าลงลายมือชื่อ เพื่อบันทึกเก็บเป็นประวัติการปฏิบัติงานที่ Firebase</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  {signedReportUrl && (
                    <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2.5 py-1 flex items-center gap-1 font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <a href={signedReportUrl} target="_blank" rel="noopener noreferrer" className="truncate max-w-[150px] hover:underline cursor-pointer">{signedReportName || 'เปิดไฟล์'}</a>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => reportInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-50 cursor-pointer"
                  >
                    <Paperclip className="w-4 h-4 text-blue-600" />
                    {signedReportUrl ? 'เปลี่ยนไฟล์' : 'แนบไฟล์ใบงานเซ็นแล้ว'}
                  </button>
                  <input
                    type="file"
                    ref={reportInputRef}
                    accept="image/*,application/pdf,.pdf"
                    onChange={handleReportUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Action Buttons */}
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
                  className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'กำลังอัปโหลด...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exporter Printable Preview Modal for Job Service */}
      {exportTargetJob && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col my-8 max-h-[90vh]">
            <div className="bg-blue-700 text-white p-4 font-bold flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
              <span className="text-sm">พิมพ์ / ส่งออกเอกสารใบงาน</span>
              <div className="flex bg-blue-800/80 p-0.5 rounded-lg border border-blue-600 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setReportViewMode('full')}
                  className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${reportViewMode === 'full' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-100 hover:text-white'}`}
                >
                  รายงานสรุปการบริการ
                </button>
                <button
                  type="button"
                  onClick={() => setReportViewMode('simple')}
                  className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${reportViewMode === 'simple' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-100 hover:text-white'}`}
                >
                  ใบงาน
                </button>
              </div>
              <button onClick={() => setExportTargetJob(null)} className="text-white hover:text-white/80 text-xl font-bold">&times;</button>
            </div>

            {/* Document preview container */}
            <div className="p-6 overflow-y-auto bg-gray-100 flex-1">
              
              {/* Actual Printable element */}
              <div 
                id="printable-job-service-doc" 
                className="bg-gray-100 flex flex-col gap-6 items-center select-text"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {reportViewMode === 'full' ? (
                  <div className="pdf-page bg-white p-10 shadow-sm border border-gray-200 text-xs text-gray-800 leading-relaxed space-y-6 shrink-0 w-[794px] min-h-[1123px]">
                    {/* Header layout according to prompt */}
                    <div className="border-b-2 border-blue-600 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                      <div>
                        <h1 className="text-lg font-extrabold text-blue-900">รายงานสรุปการบริการ</h1>
                        <p className="text-gray-600 font-bold mt-0.5">ฝ่ายสนับสนุนด้านเทคนิคและซ่อมบำรุง</p>
                        <p className="text-gray-500 text-[10px] mt-1">Email: <span className="font-semibold text-blue-700">wssservice.wins@gmail.com</span> | เบอร์โทรติดต่อ: <span className="font-semibold text-blue-700">085 502 9624</span></p>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-500 font-bold">หมายเลขใบงาน</div>
                        <div className="text-sm font-extrabold text-blue-700 font-mono mt-0.5">{exportTargetJob.jobNo}</div>
                      </div>
                    </div>

                    {/* Grid Customer details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded border border-gray-100">
                      <div className="space-y-1">
                        <div className="text-gray-500 font-bold uppercase text-[10px]">ข้อมูลลูกค้า</div>
                        <div><strong>บริษัท:</strong> {exportTargetJob.customerCompany}</div>
                        <div><strong>ที่อยู่:</strong> {exportTargetJob.customerAddress || '-'}</div>
                        <div><strong>สถานที่ทำงาน:</strong> {exportTargetJob.serviceLocation || '-'}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-gray-500 font-bold uppercase text-[10px]">ผู้ติดต่อ & บริการ</div>
                        <div><strong>ผู้ติดต่อ:</strong> {exportTargetJob.contactName} {exportTargetJob.contactDetail ? `(${exportTargetJob.contactDetail})` : ''}</div>
                        <div><strong>เบอร์โทร:</strong> {exportTargetJob.contactPhone || '-'}</div>
                        <div><strong>อีเมล:</strong> {exportTargetJob.contactEmail || '-'}</div>
                        <div><strong>ประเภทบริการ:</strong> {exportTargetJob.serviceType}</div>
                      </div>
                    </div>

                    {/* Operations & Dates (No issue date and no Sales rep as requested) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] border-b border-gray-100 pb-4">
                      <div>
                        <div className="text-gray-400 font-bold uppercase text-[9px]">วันที่รับแจ้ง</div>
                        <div className="font-semibold">{exportTargetJob.receivedDate || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-bold uppercase text-[9px]">วันที่เข้าปฏิบัติงาน</div>
                        <div className="font-semibold">{exportTargetJob.startServiceDate || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-bold uppercase text-[9px]">วันที่แก้ไขเสร็จงาน</div>
                        <div className="font-semibold">{exportTargetJob.resolutionDate || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-bold uppercase text-[9px]">บริษัทคู่ค้า</div>
                        <div className="font-semibold">{exportTargetJob.partnerCompany || 'ไม่มี'}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-bold uppercase text-[9px]">หมายเลขเอกสารอ้างอิง</div>
                        <div className="font-semibold">{exportTargetJob.referenceDocument || '-'}</div>
                      </div>
                    </div>

                    {/* Diagnostic descriptions */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-[11px]">บรรยายอาการรับแจ้ง:</h3>
                        <p className="mt-1 text-gray-700 whitespace-pre-wrap pl-1">{exportTargetJob.symptoms || '-'}</p>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-[11px]">ขั้นตอนการตรวจสอบ:</h3>
                        <p className="mt-1 text-gray-700 whitespace-pre-wrap pl-1">{exportTargetJob.diagnosis || '-'}</p>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-[11px]">สาเหตุ:</h3>
                        <p className="mt-1 text-gray-700 whitespace-pre-wrap pl-1">{exportTargetJob.cause || '-'}</p>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-[11px]">รายละเอียดการแก้ไขปัญหา:</h3>
                        <p className="mt-1 text-gray-700 whitespace-pre-wrap pl-1">{exportTargetJob.actionTaken || '-'}</p>
                      </div>
                      {exportTargetJob.remarks && (
                        <div>
                          <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-[11px]">หมายเหตุเพิ่มเติม:</h3>
                          <p className="mt-1 text-gray-600 whitespace-pre-wrap pl-1">{exportTargetJob.remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pdf-page bg-white p-10 shadow-sm border border-gray-200 text-xs text-gray-800 leading-relaxed space-y-6 shrink-0 w-[794px] min-h-[1123px]">
                    {/* Simple summary view for customer reporting */}
                    <div className="border-b-2 border-emerald-600 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                      <div>
                        <h1 className="text-lg font-extrabold text-emerald-950">ใบงาน</h1>
                        <p className="text-gray-600 font-bold mt-0.5">ฝ่ายสนับสนุนด้านเทคนิคและซ่อมบำรุง</p>
                        <p className="text-gray-500 text-[10px] mt-1">Email: <span className="font-semibold text-emerald-700">wssservice.wins@gmail.com</span> | เบอร์โทรติดต่อ: <span className="font-semibold text-emerald-700">085 502 9624</span></p>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-500 font-bold text-[10px] uppercase">หมายเลขเอกสาร / Document No</div>
                        <div className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5">{exportTargetJob.jobNo}</div>
                      </div>
                    </div>

                    {/* Grid Customer details for Simple Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/20 p-4 rounded border border-emerald-100">
                      <div className="space-y-1">
                        <div className="text-emerald-800 font-extrabold uppercase text-[10px]">ข้อมูลลูกค้า (Customer Information)</div>
                        <div><strong>บริษัท / บริษัทลูกค้า:</strong> {exportTargetJob.customerCompany}</div>
                        <div><strong>ที่อยู่ / สถานที่ดำเนินงาน:</strong> {exportTargetJob.serviceLocation || exportTargetJob.customerAddress || '-'}</div>
                        <div><strong>ผู้ติดต่อลูกค้า:</strong> {exportTargetJob.contactName} {exportTargetJob.contactPhone ? `(${exportTargetJob.contactPhone})` : ''}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-emerald-800 font-extrabold uppercase text-[10px]">รายละเอียดการให้บริการ (Service Summary)</div>
                        <div><strong>ประเภทการบริการ:</strong> {exportTargetJob.serviceType}</div>
                        <div><strong>วันที่เข้าปฏิบัติงาน:</strong> {exportTargetJob.startServiceDate || '-'}</div>
                        <div><strong>ผู้ปฏิบัติงานหลัก:</strong> {[exportTargetJob.operator1, exportTargetJob.operator2].filter(Boolean).join(', ') || '-'}</div>
                      </div>
                    </div>

                    {/* Status panel */}
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded border border-emerald-100/70">
                      <div className="text-[11px] font-bold text-emerald-900">สถานะการให้บริการแก่ลูกค้า (Service Status)</div>
                      <div className="font-extrabold text-xs text-emerald-800 bg-white px-3 py-1 rounded shadow-xs border border-emerald-200">
                        {exportTargetJob.status === 'Resolved' ? 'Resolved (เสร็จสิ้นการบริการเรียบร้อย)' :
                         exportTargetJob.status === 'In Progress' ? 'In Progress (กำลังดำเนินการแก้ไข)' :
                         exportTargetJob.status === 'Pending' ? 'Pending (รออะไหล่/อุปกรณ์เพิ่มเติม)' :
                         'Open (กำลังตรวจสอบปัญหา)'}
                      </div>
                    </div>

                    {/* Descriptive sections for Customer report */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-[11px]">อาการที่ได้รับแจ้ง / ปัญหาที่พบ:</h3>
                        <p className="mt-1 text-gray-700 whitespace-pre-wrap pl-1">{exportTargetJob.symptoms || '-'}</p>
                      </div>

                      <div>
                        <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-[11px]">รายละเอียดการดำเนินงาน:</h3>
                        <p className="mt-1 text-gray-700 whitespace-pre-wrap pl-1">{exportTargetJob.diagnosis || '-'}</p>
                      </div>

                      {exportTargetJob.cause && (
                        <div>
                          <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-[11px]">สาเหตุของปัญหา:</h3>
                          <p className="mt-1 text-gray-700 whitespace-pre-wrap pl-1">{exportTargetJob.cause}</p>
                        </div>
                      )}

                      <div>
                        <h3 className="font-bold text-emerald-950 border-b border-emerald-100 pb-1 text-[11px]">การแก้ไขปัญหา:</h3>
                        <p className="mt-1.5 text-gray-700 whitespace-pre-wrap pl-2 pr-1 font-medium bg-emerald-50/10 py-2.5 rounded border border-emerald-100/30">{exportTargetJob.actionTaken || '-'}</p>
                      </div>

                      {exportTargetJob.remarks && (
                        <div>
                          <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-1 text-[11px]">หมายเหตุ:</h3>
                          <p className="mt-1 text-gray-600 whitespace-pre-wrap pl-1">{exportTargetJob.remarks}</p>
                        </div>
                      )}
                    </div>

                    {/* Signature pads for customer report */}
                    <div className="pt-8 grid grid-cols-2 gap-8 text-center border-t border-gray-100">
                      <div className="space-y-12">
                        <div className="text-gray-700 font-bold text-[12px]">ผู้ปฏิบัติงาน</div>
                        <div className="border-b border-gray-300 w-48 mx-auto h-5"></div>
                        <div className="text-gray-500 text-[11px]">(........................................................)</div>
                      </div>
                      <div className="space-y-12">
                        <div className="text-gray-700 font-bold text-[12px]">ลูกค้า</div>
                        <div className="border-b border-gray-300 w-48 mx-auto h-5"></div>
                        <div className="text-gray-500 text-[11px]">(........................................................)</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Photo Pages (Pages 2, 3, 4 sequentially as requested) */}
                {exportTargetJob.photos && exportTargetJob.photos.length > 0 && (
                  <div className="pdf-page bg-white p-10 shadow-sm border border-gray-200 text-xs text-gray-800 leading-relaxed space-y-6 shrink-0 w-[794px] min-h-[1123px]">
                    <h3 className="font-extrabold text-blue-900 text-sm border-b border-blue-100 pb-1.5 flex items-center gap-1">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>รูปถ่ายบันทึกการปฏิบัติงาน</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {exportTargetJob.photos.map((p, pIdx) => (
                        <div key={pIdx} className="border border-gray-200 p-3 rounded bg-gray-50 text-center space-y-2">
                          <div className="font-bold text-gray-500 text-[10px] uppercase">รูปถ่ายหน้า {pIdx + 2}</div>
                          <div className="aspect-video w-full rounded overflow-hidden bg-white border border-gray-100 flex items-center justify-center max-h-48">
                            <img src={p.url} alt={`Preview ${pIdx + 2}`} className="object-cover w-full h-full" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                          </div>
                          <div className="font-bold text-gray-800 text-[11px] bg-white p-2 rounded shadow-sm">{p.caption || 'ไม่มีคำบรรยายใต้ภาพ'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Export trigger bar */}
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex flex-wrap justify-between gap-3 items-center shrink-0">
              <span className="text-xs text-gray-500">เลือกประเภทไฟล์เพื่อส่งออกไปยังคอมพิวเตอร์ของคุณ</span>
              <div className="flex gap-2 w-full sm:w-auto">
                {/* Excel export (Excel table blob) */}
                <button
                  onClick={() => exportToExcelTable('printable-job-service-doc', `JobService_${exportTargetJob.jobNo.replace('/', '_')}`)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ส่งออก Excel</span>
                </button>

                {/* Word export */}
                <button
                  onClick={() => exportToWord('printable-job-service-doc', `JobService_${exportTargetJob.jobNo.replace('/', '_')}`)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>ส่งออก Word</span>
                </button>

                {/* PDF export */}
                <button
                  onClick={handleExportPDF}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ส่งออก PDF</span>
                </button>

                <button
                  onClick={() => setExportTargetJob(null)}
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
