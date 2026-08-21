import React, { useState, useRef, useEffect } from 'react';
import { OnsiteService, Customer, ServicePhoto } from '../types';
import { 
  Search, Plus, Trash2, Edit3, Eye, FileText, Download, Upload, AlertCircle, 
  Calendar, Check, User, Info, FileSpreadsheet, Paperclip, CheckSquare, Image as ImageIcon, X,
  PenTool
} from 'lucide-react';
import { calculateDaysDiff, exportToCSV, parseCSV, exportToWord, exportToExcelTable, convertDriveUrlToBase64, withColorCleanedComputedStyle } from '../utils';
import { uploadFileToDrive } from '../drive';
import { getAccessToken } from '../firebase';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { SignaturePad } from './SignaturePad';

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

export interface ReportSectionData {
  id: string;
  num: string;
  title: string;
  titleEn?: string;
  content: string;
}

// Split large paragraph blocks so they can cleanly span multiple pages without overflowing
function splitTextIntoParagraphChunks(text: string, maxChunkLength: number = 650): string[] {
  if (!text) return [];
  if (text.length <= maxChunkLength) return [text];
  
  const paragraphs = text.split('\n');
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const p of paragraphs) {
    if ((currentChunk + '\n' + p).trim().length > maxChunkLength && currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = p;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n' + p : p;
    }
  }
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  return chunks.length > 0 ? chunks : [text];
}

// Estimate rendering height weight of a section block
function estimateSectionWeight(sec: ReportSectionData): number {
  const lineCount = sec.content.split('\n').reduce((acc, line) => {
    return acc + Math.max(1, Math.ceil(line.length / 60));
  }, 0);
  return 50 + (lineCount * 18);
}

// Dynamic content section paginator: generates 1, 2, 3... pages according to content volume
function buildReportContentPages(
  job: OnsiteService,
  viewMode: 'full' | 'simple',
  includeSignatures: boolean = true
): ReportSectionData[][] {
  const rawSections: ReportSectionData[] = [];

  if (viewMode === 'full') {
    if (job.symptoms?.trim()) {
      rawSections.push({
        id: 'symptoms',
        num: '1',
        title: 'อาการรับแจ้ง / ปัญหาที่พบ',
        titleEn: 'Reported Symptoms & Issue Description',
        content: job.symptoms.trim()
      });
    }
    if (job.diagnosis?.trim()) {
      rawSections.push({
        id: 'diagnosis',
        num: '2',
        title: 'ขั้นตอนการตรวจสอบและผลการวิเคราะห์',
        titleEn: 'Inspection Steps & Diagnostic Findings',
        content: job.diagnosis.trim()
      });
    }
    if (job.cause?.trim()) {
      rawSections.push({
        id: 'cause',
        num: '3',
        title: 'สาเหตุของปัญหา',
        titleEn: 'Root Cause Analysis',
        content: job.cause.trim()
      });
    }
    if (job.actionTaken?.trim()) {
      rawSections.push({
        id: 'actionTaken',
        num: '4',
        title: 'รายละเอียดการแก้ไขปัญหา / ผลการปฏิบัติงาน',
        titleEn: 'Corrective Actions & Resolution Details',
        content: job.actionTaken.trim()
      });
    }
    if (job.remarks?.trim()) {
      rawSections.push({
        id: 'remarks',
        num: '5',
        title: 'หมายเหตุและคำแนะนำเพิ่มเติม',
        titleEn: 'Remarks & Recommendations',
        content: job.remarks.trim()
      });
    }
  } else {
    // Simple view mode
    if (job.symptoms?.trim()) {
      rawSections.push({
        id: 'symptoms',
        num: '1',
        title: 'อาการที่ได้รับแจ้ง / ปัญหาที่พบ',
        titleEn: 'Reported Problems',
        content: job.symptoms.trim()
      });
    }
    if (job.diagnosis?.trim()) {
      rawSections.push({
        id: 'diagnosis',
        num: '2',
        title: 'รายละเอียดการดำเนินงาน / การตรวจสอบ',
        titleEn: 'Operation & Inspection Details',
        content: job.diagnosis.trim()
      });
    }
    if (job.cause?.trim()) {
      rawSections.push({
        id: 'cause',
        num: '3',
        title: 'สาเหตุของปัญหา',
        titleEn: 'Root Cause',
        content: job.cause.trim()
      });
    }
    if (job.actionTaken?.trim()) {
      rawSections.push({
        id: 'actionTaken',
        num: '4',
        title: 'การแก้ไขปัญหา',
        titleEn: 'Action Taken & Resolution',
        content: job.actionTaken.trim()
      });
    }
    if (job.remarks?.trim()) {
      rawSections.push({
        id: 'remarks',
        num: '5',
        title: 'หมายเหตุ',
        titleEn: 'Remarks',
        content: job.remarks.trim()
      });
    }
  }

  if (rawSections.length === 0) {
    rawSections.push({
      id: 'summary',
      num: '1',
      title: 'บันทึกการปฏิบัติงาน',
      titleEn: 'Service Summary',
      content: 'ไม่มีข้อมูลรายละเอียดเพิ่มเติม'
    });
  }

  // Split very long individual text blocks
  const expanded: ReportSectionData[] = [];
  for (const s of rawSections) {
    if (s.content.length > 550) {
      const parts = splitTextIntoParagraphChunks(s.content, 500);
      if (parts.length <= 1) {
        expanded.push(s);
      } else {
        parts.forEach((p, idx) => {
          expanded.push({
            id: `${s.id}_p${idx}`,
            num: s.num,
            title: idx === 0 ? s.title : `${s.title} (ส่วนที่ ${idx + 1})`,
            titleEn: s.titleEn,
            content: p
          });
        });
      }
    } else {
      expanded.push(s);
    }
  }

  // Check if everything fits comfortably on a single page
  const totalWeight = expanded.reduce((a, b) => a + estimateSectionWeight(b), 0);
  const singlePageCapacity = includeSignatures ? 490 : 680;
  if (totalWeight <= singlePageCapacity) {
    return [expanded];
  }

  const pages: ReportSectionData[][] = [];
  let curPage: ReportSectionData[] = [];
  let curHeight = 0;
  let isFirst = true;

  for (const sec of expanded) {
    const w = estimateSectionWeight(sec);
    const limit = isFirst ? (includeSignatures ? 540 : 710) : (includeSignatures ? 820 : 930);
    if (curPage.length > 0 && curHeight + w > limit) {
      pages.push(curPage);
      curPage = [sec];
      curHeight = w;
      isFirst = false;
    } else {
      curPage.push(sec);
      curHeight += w;
    }
  }

  if (curPage.length > 0) {
    pages.push(curPage);
  }

  return pages.length > 0 ? pages : [expanded];
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
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);

  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [processedPhotos, setProcessedPhotos] = useState<ServicePhoto[]>([]);
  const [processedOperatorSig, setProcessedOperatorSig] = useState('');
  const [processedCustomerSig, setProcessedCustomerSig] = useState('');

  useEffect(() => {
    if (!exportTargetJob) {
      setProcessedPhotos([]);
      setProcessedOperatorSig('');
      setProcessedCustomerSig('');
      return;
    }

    const processImages = async () => {
      setIsProcessingImages(true);
      try {
        const token = await getAccessToken();
        
        // 1. Process Photos
        if (exportTargetJob.photos && exportTargetJob.photos.length > 0) {
          const promises = exportTargetJob.photos.map(async (photo) => {
            if (photo.url) {
              const base64Url = await convertDriveUrlToBase64(photo.url, token);
              return { ...photo, url: base64Url };
            }
            return photo;
          });
          const results = await Promise.all(promises);
          setProcessedPhotos(results);
        } else {
          setProcessedPhotos([]);
        }

        // 2. Process Operator Signature
        if (exportTargetJob.operatorSignature) {
          const sigBase64 = await convertDriveUrlToBase64(exportTargetJob.operatorSignature, token);
          setProcessedOperatorSig(sigBase64);
        } else {
          setProcessedOperatorSig('');
        }

        // 3. Process Customer Signature
        if (exportTargetJob.customerSignature) {
          const sigBase64 = await convertDriveUrlToBase64(exportTargetJob.customerSignature, token);
          setProcessedCustomerSig(sigBase64);
        } else {
          setProcessedCustomerSig('');
        }
      } catch (err) {
        console.error('Error pre-processing image URLs:', err);
      } finally {
        setIsProcessingImages(false);
      }
    };

    processImages();
  }, [exportTargetJob]);

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
  const [jobSheetUrl, setJobSheetUrl] = useState('');
  const [jobSheetName, setJobSheetName] = useState('');
  const [jobSheetFileId, setJobSheetFileId] = useState('');
  const [operatorSignature, setOperatorSignature] = useState('');
  const [customerSignature, setCustomerSignature] = useState('');

  // Dropdown quick addition inputs
  const [newServiceType, setNewServiceType] = useState('');
  const [newOperator, setNewOperator] = useState('');
  const [newSalesRep, setNewSalesRep] = useState('');

  const [isUploading, setIsUploading] = useState(false);

  // Refs for files
  const photoInputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);
  const jobSheetInputRef = useRef<HTMLInputElement>(null);

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
    setJobSheetUrl('');
    setJobSheetName('');
    setJobSheetFileId('');
    setOperatorSignature('');
    setCustomerSignature('');
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
    setJobSheetUrl(job.jobSheetUrl || '');
    setJobSheetName(job.jobSheetName || '');
    setJobSheetFileId(job.jobSheetFileId || '');
    setOperatorSignature(job.operatorSignature || '');
    setCustomerSignature(job.customerSignature || '');
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

    const token = await getAccessToken();
    if (!token) {
      alert('ไม่พบสิทธิ์การเชื่อมต่อ Google Drive (เซสชันอาจหมดอายุจากการรีเฟรชหน้าเว็บ) \n\nกรุณากด "ออกจากระบบ" แล้ว "เข้าสู่ระบบ" ใหม่อีกครั้ง และอย่าลืมติ๊กถูกอนุญาตสิทธิ์ Google Drive ในหน้าต่างเข้าสู่ระบบ');
      return;
    }

    setIsUploading(true);
    try {
      const resolvedJobNo = editingId ? (onsiteJobs.find(j => j.id === editingId)?.jobNo || generateJobNo()) : generateJobNo();
      const jobNoClean = resolvedJobNo.replace(/\//g, '_');
      const uploadedPhotos: ServicePhoto[] = [];
      let index = photos.length;
      for (const file of Array.from(files) as File[]) {
        index++;
        const ext = file.name.split('.').pop();
        const fileName = `${jobNoClean}_${index}.${ext}`;
        // Upload directly to Drive
        const result = await uploadFileToDrive(file, fileName, 'TechLink_PIC', token);
        const permanentUrl = result.fileId 
          ? `https://drive.google.com/file/d/${result.fileId}/view`
          : (result.webViewLink || result.thumbnailLink || '');
        uploadedPhotos.push({
          url: permanentUrl,
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
      const resolvedJobNo = editingId ? (onsiteJobs.find(j => j.id === editingId)?.jobNo || generateJobNo()) : generateJobNo();
      const jobNoClean = resolvedJobNo.replace(/\//g, '_');
      const ext = file.name.split('.').pop();
      const fileName = `${jobNoClean}_Report.${ext}`;

      const result = await uploadFileToDrive(file, fileName, 'TechLink_PDF', token);
      setSignedReportUrl(result.webContentLink || result.webViewLink || result.fileId);
      setSignedReportName(fileName);
      setSignedReportFileId(result.fileId);
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัปโหลดเอกสาร: ' + err.message);
    } finally {
      setIsUploading(false);
      if (reportInputRef.current) reportInputRef.current.value = '';
    }
  };

  const handleJobSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = await getAccessToken();
    if (!token) {
      alert('ไม่พบสิทธิ์การเชื่อมต่อ Google Drive (เซสชันอาจหมดอายุจากการรีเฟรชหน้าเว็บ) \n\nกรุณากด "ออกจากระบบ" แล้ว "เข้าสู่ระบบ" ใหม่อีกครั้ง และอย่าลืมติ๊กถูกอนุญาตสิทธิ์ Google Drive ในหน้าต่างเข้าสู่ระบบ');
      return;
    }

    setIsUploading(true);
    try {
      const resolvedJobNo = editingId ? (onsiteJobs.find(j => j.id === editingId)?.jobNo || generateJobNo()) : generateJobNo();
      const jobNoClean = resolvedJobNo.replace(/\//g, '_');
      const ext = file.name.split('.').pop();
      const fileName = `${jobNoClean}_JobSheet.${ext}`;

      const result = await uploadFileToDrive(file, fileName, 'ใบงาน', token);
      setJobSheetUrl(result.webContentLink || result.webViewLink || result.fileId);
      setJobSheetName(fileName);
      setJobSheetFileId(result.fileId);
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัปโหลดเอกสารใบงาน: ' + err.message);
    } finally {
      setIsUploading(false);
      if (jobSheetInputRef.current) jobSheetInputRef.current.value = '';
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
      signedReportFileId,
      jobSheetUrl,
      jobSheetName,
      jobSheetFileId,
      operatorSignature,
      customerSignature
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
      'เบอร์โทรผู้ติดต่อ', 'อีเมลผู้ติดต่อ', 'บริษัทคู่ค้า', 'หมายเลขเอกสารอ้างอิง', 'ประเภทบริการ', 'พื้นที่ปฏิบัติงานหรือสถานที่ปฏิบัติงาน', 
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
      'พื้นที่ปฏิบัติงานหรือสถานที่ปฏิบัติงาน': j.serviceLocation,
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
        serviceLocation: item['พื้นที่ปฏิบัติงานหรือสถานที่ปฏิบัติงาน'] || item['สถานที่ปฏิบัติงาน'] || item['serviceLocation'] || '',
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

      await withColorCleanedComputedStyle(async () => {
        for (let i = 0; i < pages.length; i++) {
          const pageElement = pages[i] as HTMLElement;
          
          // Clone the element and place it directly on the body to avoid container scroll-clipping and scaling issues
          const clone = pageElement.cloneNode(true) as HTMLElement;
          
          // Apply styling to ensure it is rendered fully and outside the viewport
          clone.style.position = 'absolute';
          clone.style.left = '-9999px';
          clone.style.top = '0';
          clone.style.width = '794px';
          clone.style.height = '1123px';
          clone.style.overflow = 'visible';
          clone.style.boxShadow = 'none';
          clone.style.border = 'none';
          
          document.body.appendChild(clone);

          // Render the clone
          const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: 794,
            height: 1123,
            scrollX: 0,
            scrollY: 0
          });

          document.body.removeChild(clone);

          const imgData = canvas.toDataURL('image/png');
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          if (i > 0) pdf.addPage();
          
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        }
      });

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
      j.referenceDocument?.toLowerCase().includes(search) ||
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

  const getAvailableContacts = () => {
    if (!customerCompany) return [];
    const selectedCustomerObj = customers.find(c => c.companyName === customerCompany);
    if (!selectedCustomerObj) return [];
    
    const list = [];
    if (selectedCustomerObj.contactName) {
      list.push({
        name: selectedCustomerObj.contactName,
        detail: selectedCustomerObj.contactDetail || '',
        phone: selectedCustomerObj.contactPhone || '',
        email: selectedCustomerObj.contactEmail || ''
      });
    }
    if (selectedCustomerObj.contacts && selectedCustomerObj.contacts.length > 0) {
      selectedCustomerObj.contacts.forEach(c => {
        if (c.name && !list.some(item => item.name === c.name)) {
          list.push({
            name: c.name,
            detail: c.detail || '',
            phone: c.phone || '',
            email: c.email || ''
          });
        }
      });
    }
    return list;
  };

  const availableContacts = getAvailableContacts();

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
          placeholder="ค้นหาเลขใบงาน, หมายเลขเอกสารอ้างอิง, ชื่อลูกค้า, ชื่อผู้ติดต่อ, หรือช่าง..."
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
                        {job.referenceDocument && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">อ้างอิง: {job.referenceDocument}</div>
                        )}
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

                      {/* Signed Report & Job Sheet Indicator */}
                      <td className="py-1.5 px-2.5 space-y-1">
                        {job.signedReportUrl ? (
                          <a href={job.signedReportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] hover:underline" title={job.signedReportName}>
                            <Paperclip className="w-3 h-3" />
                            <span>รายงานการตรวจสอบ</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[10px] block">ไม่มีรายงานเซ็นกลับ</span>
                        )}
                        {job.jobSheetUrl ? (
                          <a href={job.jobSheetUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 font-bold text-[10px] hover:underline" title={job.jobSheetName}>
                            <Paperclip className="w-3 h-3" />
                            <span>ใบงาน (Google Drive)</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[10px] block">ไม่มีไฟล์ใบงาน</span>
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
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">
                      ชื่อ-นามสกุลผู้ติดต่อ {availableContacts.length > 0 && <span className="text-blue-600 font-normal ml-1">(สามารถเลือกจากฐานข้อมูลได้)</span>}
                    </label>
                    {availableContacts.length > 0 ? (
                      <div className="flex gap-1.5">
                        <select
                          value={availableContacts.some(ac => ac.name === contactName) ? contactName : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const match = availableContacts.find(ac => ac.name === val);
                              if (match) {
                                setContactName(match.name);
                                setContactDetail(match.detail);
                                setContactPhone(match.phone);
                                setContactEmail(match.email);
                              }
                            }
                          }}
                          className="text-xs px-2 py-1.5 border border-gray-300 rounded bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px] sm:max-w-[200px]"
                        >
                          <option value="">-- เลือกผู้ติดต่อ --</option>
                          {availableContacts.map((ac, idx) => (
                            <option key={idx} value={ac.name}>
                              {ac.name} {ac.detail ? `(${ac.detail})` : ''}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="หรือพิมพ์ชื่อผู้ติดต่อ..."
                          className="flex-1 text-xs px-3 py-1.5 border border-gray-300 rounded focus:outline-none"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="คุณสมชาย"
                        className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                      />
                    )}
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
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">พื้นที่ปฏิบัติงานหรือสถานที่ปฏิบัติงาน</label>
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
                      <h4 className="font-bold text-xs text-gray-900">แนบรูปภาพถ่ายการปฏิบัติงาน (อัปโหลดได้ไม่จำกัด - แสดงหน้าละ 6 รูป)</h4>
                      <p className="text-[10px] text-gray-500">บันทึกรูปภาพและจัดเก็บถาวรใน Google Drive และ Firebase พร้อมแสดงในรายงานและภาคผนวก PDF</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-50 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />
                    อัปโหลดรูปภาพ {photos.length > 0 && `(${photos.length})`}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                    {photos.map((p, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-gray-200 relative group flex flex-col justify-between shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center hover:bg-red-600 shadow transition-colors z-10 cursor-pointer"
                        >
                          &times;
                        </button>
                        <div className="aspect-video w-full rounded overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-100">
                          <img src={p.url} alt={`Upload ${idx+1}`} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                        </div>
                        <div className="mt-2">
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">คำอธิบายภาพ {idx+1}</label>
                          <input
                            type="text"
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

              {/* Digital Signature section */}
              <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100/50 space-y-3">
                <div className="flex items-start gap-2.5">
                  <PenTool className="text-blue-600 w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-blue-900">ลงลายมือชื่อดิจิตอล (Digital Signatures)</h4>
                    <p className="text-[10px] text-gray-500">ลงชื่อออนไลน์เพื่อแสดงความยินยอมและยืนยันการปฏิบัติงาน ลายเซ็นจะปรากฏบนรายงานเมื่อสั่งพิมพ์</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <SignaturePad 
                    label="ลายมือชื่อผู้ปฏิบัติงาน (Operator Signature)" 
                    value={operatorSignature} 
                    onChange={setOperatorSignature} 
                  />
                  <SignaturePad 
                    label="ลายมือชื่อลูกค้า (Customer/Recipient Signature)" 
                    value={customerSignature} 
                    onChange={setCustomerSignature} 
                  />
                </div>
              </div>

              {/* Signed Report Upload area */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-start gap-2.5">
                  <FileText className="text-emerald-600 w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-gray-900">แนบไฟล์ใบงานรายงานการตรวจสอบ</h4>
                    <p className="text-[10px] text-gray-500">อัปโหลดรูปภาพหรือ PDF รายงานการตรวจสอบ เพื่อบันทึกเก็บเป็นประวัติการปฏิบัติงานที่ Firebase</p>
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
                    {signedReportUrl ? 'เปลี่ยนไฟล์' : 'แนบไฟล์รายงานการตรวจสอบ'}
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

              {/* Job Sheet File Upload area */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-start gap-2.5">
                  <FileText className="text-blue-600 w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-gray-900">แนบไฟล์ใบงาน</h4>
                    <p className="text-[10px] text-gray-500">อัปโหลดรูปภาพหรือ PDF ใบงานปฏิบัติงาน เพื่อจัดเก็บใน Google Drive โฟลเดอร์ชื่อ "ใบงาน"</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  {jobSheetUrl && (
                    <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 rounded px-2.5 py-1 flex items-center gap-1 font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <a href={jobSheetUrl} target="_blank" rel="noopener noreferrer" className="truncate max-w-[150px] hover:underline cursor-pointer">{jobSheetName || 'เปิดไฟล์'}</a>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => jobSheetInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-50 cursor-pointer"
                  >
                    <Paperclip className="w-4 h-4 text-blue-600" />
                    {jobSheetUrl ? 'เปลี่ยนไฟล์' : 'แนบไฟล์ใบงาน'}
                  </button>
                  <input
                    type="file"
                    ref={jobSheetInputRef}
                    accept="image/*,application/pdf,.pdf"
                    onChange={handleJobSheetUpload}
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
      {exportTargetJob && (() => {
        const contentPages = buildReportContentPages(exportTargetJob, reportViewMode, includeSignatures);
        const totalContentPages = contentPages.length;

        // Group photos into pages of 6 photos each
        const photoChunks: ServicePhoto[][] = [];
        if (processedPhotos && processedPhotos.length > 0) {
          for (let i = 0; i < processedPhotos.length; i += 6) {
            photoChunks.push(processedPhotos.slice(i, i + 6));
          }
        }
        const totalPhotoPages = photoChunks.length;
        const grandTotalPages = totalContentPages + totalPhotoPages;

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col my-8 max-h-[90vh]">
              <div className="bg-blue-700 text-white p-4 font-bold flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-200" />
                  <span className="text-sm">พิมพ์ / ส่งออกเอกสารใบงาน (PDF Dynamic Multi-Page)</span>
                  <span className="bg-blue-800 text-blue-100 text-xs px-2 py-0.5 rounded border border-blue-500 hidden sm:inline-block">
                    รวม {grandTotalPages} หน้า (เนื้อหา {totalContentPages} หน้า {totalPhotoPages > 0 ? `+ ภาคผนวกรูป ${totalPhotoPages} หน้า` : ''})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* View Mode Switch */}
                  <div className="flex bg-blue-800/80 p-0.5 rounded-lg border border-blue-600 text-xs">
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

                  {/* Toggle Signatures Section */}
                  <button
                    type="button"
                    onClick={() => setIncludeSignatures(!includeSignatures)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer select-none ${
                      includeSignatures
                        ? 'bg-blue-800 text-white border-blue-400 shadow-xs ring-1 ring-blue-400/50'
                        : 'bg-blue-900/60 text-blue-200 border-blue-600/70 hover:text-white'
                    }`}
                    title="คลิกเพื่อเลือกว่าจะแสดงหรือซ่อนส่วนลงนาม (ลายเซ็นช่างและลูกค้า)"
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] font-black ${
                      includeSignatures ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-gray-400 bg-transparent'
                    }`}>
                      {includeSignatures ? '✓' : ''}
                    </div>
                    <PenTool className="w-3.5 h-3.5 text-blue-200" />
                    <span>ส่วนลงนาม {includeSignatures ? '(แสดง)' : '(ซ่อน)'}</span>
                  </button>

                  <button onClick={() => setExportTargetJob(null)} className="text-white hover:text-white/80 text-xl font-bold px-1 cursor-pointer">&times;</button>
                </div>
              </div>

              {/* Document preview container */}
              <div className="p-6 overflow-y-auto bg-slate-200/90 flex-1">
                {/* Printable container rendered into A4 dimensions */}
                <div 
                  id="printable-job-service-doc" 
                  className="flex flex-col gap-8 items-center select-text"
                  style={{ fontFamily: 'Inter, "Noto Sans Thai", system-ui, sans-serif' }}
                >
                  {/* DYNAMIC CONTENT PAGES (Page 1, Page 2, etc.) */}
                  {contentPages.map((pageSections, contentPageIdx) => {
                    const isFirstPage = contentPageIdx === 0;
                    const isLastContentPage = contentPageIdx === totalContentPages - 1;
                    const pageNumber = contentPageIdx + 1;

                    return (
                      <div 
                        key={`content-page-${contentPageIdx}`}
                        className="pdf-page bg-white p-8 sm:p-9 shadow-lg border border-slate-300 text-xs text-slate-800 leading-relaxed shrink-0 w-[794px] min-h-[1123px] max-h-[1123px] h-[1123px] flex flex-col justify-between box-border overflow-hidden select-text"
                      >
                        {/* Top Content Area */}
                        <div>
                          {isFirstPage ? (
                            /* FIRST PAGE HEADER */
                            reportViewMode === 'full' ? (
                              <div className="space-y-3 mb-3">
                                {/* Corporate Header Banner */}
                                <div className="border-b-2 border-blue-700 pb-3 flex justify-between items-start gap-3">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white font-black text-sm w-12 h-12 rounded-xl flex items-center justify-center shadow-xs shrink-0 tracking-wider">
                                      WSS
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h1 className="text-xl font-extrabold text-blue-950 tracking-tight">รายงานสรุปการบริการ</h1>
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase tracking-wider">SERVICE REPORT</span>
                                      </div>
                                      <p className="text-slate-600 font-bold text-[11px] mt-0.5">ฝ่ายสนับสนุนด้านเทคนิคและบริการลูกค้า (Technical Support & Service Operations)</p>
                                      <div className="flex items-center gap-3 text-slate-500 text-[10px] mt-1">
                                        <span>📧 <strong className="text-slate-700">wssservice.wins@gmail.com</strong></span>
                                        <span>•</span>
                                        <span>📞 <strong className="text-slate-700">085 502 9624</strong></span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Top Right Meta Badge Card */}
                                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-right min-w-[200px] shadow-2xs">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">เลขที่ใบงาน (JOB NO.)</div>
                                    <div className="text-base font-extrabold text-blue-700 font-mono tracking-tight">{exportTargetJob.jobNo}</div>
                                    
                                    {exportTargetJob.referenceDocument && (
                                      <div className="text-[10px] font-semibold text-slate-700 mt-0.5">
                                        <span className="text-slate-400">อ้างอิง:</span> <span className="font-bold text-blue-900 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-200">{exportTargetJob.referenceDocument}</span>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-end gap-1.5 mt-1.5 pt-1.5 border-t border-slate-200 text-[10px]">
                                      <span className="text-slate-400">สถานะ:</span>
                                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                                        exportTargetJob.status === 'Resolved' 
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : exportTargetJob.status === 'In Progress'
                                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                          : exportTargetJob.status === 'Pending'
                                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                                      }`}>
                                        {exportTargetJob.status === 'Resolved' ? 'แก้ไขเสร็จสิ้น' :
                                         exportTargetJob.status === 'In Progress' ? 'กำลังดำเนินการ' :
                                         exportTargetJob.status === 'Pending' ? 'รอดำเนินการ' : 'เปิดงาน'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Information Cards: 2 Columns Balanced */}
                                <div className="grid grid-cols-2 gap-3">
                                  {/* Customer Info Card */}
                                  <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 text-[11px] shadow-2xs">
                                    <div className="text-blue-950 font-bold uppercase text-[10.5px] pb-1.5 mb-2 border-b border-slate-200 flex items-center justify-between">
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                        <span>ข้อมูลลูกค้า (Customer Details)</span>
                                      </span>
                                      {exportTargetJob.partnerCompany && (
                                        <span className="text-[9.5px] text-slate-500 font-normal truncate max-w-[150px]">คู่ค้า: {exportTargetJob.partnerCompany}</span>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-baseline gap-1 text-[11px]">
                                        <span className="text-slate-500 font-medium whitespace-nowrap min-w-[70px]">ชื่อบริษัท:</span>
                                        <strong className="text-slate-900 font-bold truncate">{exportTargetJob.customerCompany}</strong>
                                      </div>
                                      <div className="flex items-baseline gap-1 text-[11px]">
                                        <span className="text-slate-500 font-medium whitespace-nowrap min-w-[70px]">สถานที่ทำงาน:</span>
                                        <span className="text-slate-800 truncate">{exportTargetJob.serviceLocation || exportTargetJob.customerAddress || '-'}</span>
                                      </div>
                                      <div className="flex items-baseline gap-1 text-[11px]">
                                        <span className="text-slate-500 font-medium whitespace-nowrap min-w-[70px]">ผู้ติดต่อ:</span>
                                        <span className="text-slate-800 truncate">
                                          <strong className="text-slate-900 font-semibold">{exportTargetJob.contactName || '-'}</strong>
                                          {exportTargetJob.contactDetail ? ` (${exportTargetJob.contactDetail})` : ''}
                                        </span>
                                      </div>
                                      <div className="flex items-baseline gap-1 text-[11px]">
                                        <span className="text-slate-500 font-medium whitespace-nowrap min-w-[70px]">เบอร์โทรศัพท์:</span>
                                        <span className="text-slate-800 font-semibold text-blue-800">{exportTargetJob.contactPhone || '-'}</span>
                                      </div>
                                      {exportTargetJob.contactEmail && (
                                        <div className="flex items-baseline gap-1 text-[11px]">
                                          <span className="text-slate-500 font-medium whitespace-nowrap min-w-[70px]">อีเมล:</span>
                                          <span className="text-slate-800 truncate">{exportTargetJob.contactEmail}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Service & Schedule Card */}
                                  <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 text-[11px] shadow-2xs">
                                    <div className="text-blue-950 font-bold uppercase text-[10.5px] pb-1.5 mb-2 border-b border-slate-200 flex items-center justify-between">
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                                        <span>ข้อมูลการบริการ (Service Details)</span>
                                      </span>
                                      <span className="text-[9.5px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded truncate max-w-[130px]">
                                        {exportTargetJob.serviceType || 'Onsite Service'}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-baseline gap-1 text-[11px]">
                                        <span className="text-slate-500 font-medium whitespace-nowrap min-w-[80px]">ประเภทสินค้า:</span>
                                        <span className="text-slate-800 font-semibold truncate">{exportTargetJob.productType || '-'}</span>
                                      </div>
                                      <div className="flex items-baseline gap-1 text-[11px]">
                                        <span className="text-slate-500 font-medium whitespace-nowrap min-w-[80px]">ผู้ปฏิบัติงาน:</span>
                                        <span className="text-slate-800 font-semibold text-blue-900 truncate">
                                          {[exportTargetJob.operator1, exportTargetJob.operator2].filter(Boolean).join(', ') || '-'}
                                        </span>
                                      </div>
                                      <div className="flex items-baseline gap-1 text-[11px]">
                                        <span className="text-slate-500 font-medium whitespace-nowrap min-w-[80px]">พนักงานขาย:</span>
                                        <span className="text-slate-800 truncate">{exportTargetJob.salesRep || '-'}</span>
                                      </div>
                                      <div className="flex items-baseline gap-1 text-[11px]">
                                        <span className="text-slate-500 font-medium whitespace-nowrap min-w-[80px]">วันที่ปฏิบัติงาน:</span>
                                        <span className="text-slate-800 truncate">
                                          <strong className="text-slate-900">{exportTargetJob.startServiceDate || '-'}</strong>
                                          {exportTargetJob.resolutionDate && exportTargetJob.resolutionDate !== exportTargetJob.startServiceDate && (
                                            <span className="text-slate-500 text-[10px] ml-1">(เสร็จ: {exportTargetJob.resolutionDate})</span>
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex items-baseline gap-1 text-[11px]">
                                        <span className="text-slate-500 font-medium whitespace-nowrap min-w-[80px]">วันหมดประกัน:</span>
                                        <span className="text-slate-800 truncate">{exportTargetJob.warrantyExpiryDate || '-'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* SIMPLE VIEW HEADER */
                              <div className="space-y-3 mb-3">
                                <div className="border-b-2 border-emerald-700 pb-3 flex justify-between items-start gap-3">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white font-black text-sm w-12 h-12 rounded-xl flex items-center justify-center shadow-xs shrink-0 tracking-wider">
                                      WSS
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h1 className="text-xl font-extrabold text-emerald-950 tracking-tight">ใบมอบหมายงาน / ใบงาน</h1>
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase tracking-wider">WORK ORDER</span>
                                      </div>
                                      <p className="text-slate-600 font-bold text-[11px] mt-0.5">ฝ่ายสนับสนุนด้านเทคนิคและบริการลูกค้า (Technical Support & Service)</p>
                                      <div className="flex items-center gap-3 text-slate-500 text-[10px] mt-1">
                                        <span>📧 <strong className="text-slate-700">wssservice.wins@gmail.com</strong></span>
                                        <span>•</span>
                                        <span>📞 <strong className="text-slate-700">085 502 9624</strong></span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-2.5 text-right min-w-[200px] shadow-2xs">
                                    <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">หมายเลขเอกสาร (DOC NO.)</div>
                                    <div className="text-base font-extrabold text-emerald-800 font-mono tracking-tight">{exportTargetJob.jobNo}</div>
                                    
                                    {exportTargetJob.referenceDocument && (
                                      <div className="text-[10px] font-semibold text-slate-700 mt-0.5">
                                        <span className="text-slate-400">อ้างอิง:</span> <span className="font-bold text-emerald-900 bg-emerald-100/60 px-1.5 py-0.5 rounded border border-emerald-200">{exportTargetJob.referenceDocument}</span>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-end gap-1.5 mt-1.5 pt-1.5 border-t border-emerald-200 text-[10px]">
                                      <span className="text-slate-500">สถานะ:</span>
                                      <span className="px-2 py-0.5 rounded-full font-bold text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        {exportTargetJob.status === 'Resolved' ? 'แก้ไขเสร็จสิ้น' :
                                         exportTargetJob.status === 'In Progress' ? 'กำลังดำเนินการ' :
                                         exportTargetJob.status === 'Pending' ? 'รอดำเนินการ' : 'เปิดงาน'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-emerald-50/30 p-3 rounded-lg border border-emerald-100 text-[11px] space-y-1 shadow-2xs">
                                    <div className="text-emerald-950 font-bold uppercase text-[10.5px] pb-1.5 mb-2 border-b border-emerald-100">
                                      ข้อมูลลูกค้า (Customer Details)
                                    </div>
                                    <div className="flex items-baseline gap-1 text-[11px]">
                                      <span className="text-slate-500 font-medium whitespace-nowrap min-w-[70px]">ชื่อบริษัท:</span>
                                      <strong className="text-slate-900 font-bold truncate">{exportTargetJob.customerCompany}</strong>
                                    </div>
                                    <div className="flex items-baseline gap-1 text-[11px]">
                                      <span className="text-slate-500 font-medium whitespace-nowrap min-w-[70px]">สถานที่ทำงาน:</span>
                                      <span className="text-slate-800 truncate">{exportTargetJob.serviceLocation || exportTargetJob.customerAddress || '-'}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1 text-[11px]">
                                      <span className="text-slate-500 font-medium whitespace-nowrap min-w-[70px]">ผู้ติดต่อ:</span>
                                      <span className="text-slate-800 truncate">{exportTargetJob.contactName} {exportTargetJob.contactPhone ? `(${exportTargetJob.contactPhone})` : ''}</span>
                                    </div>
                                  </div>

                                  <div className="bg-emerald-50/30 p-3 rounded-lg border border-emerald-100 text-[11px] space-y-1 shadow-2xs">
                                    <div className="text-emerald-950 font-bold uppercase text-[10.5px] pb-1.5 mb-2 border-b border-emerald-100 flex items-center justify-between">
                                      <span>ข้อมูลการบริการ (Service Details)</span>
                                      <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded truncate max-w-[130px]">
                                        {exportTargetJob.serviceType}
                                      </span>
                                    </div>
                                    <div className="flex items-baseline gap-1 text-[11px]">
                                      <span className="text-slate-500 font-medium whitespace-nowrap min-w-[80px]">ผู้ปฏิบัติงาน:</span>
                                      <span className="text-slate-800 font-semibold text-emerald-900 truncate">{[exportTargetJob.operator1, exportTargetJob.operator2].filter(Boolean).join(', ') || '-'}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1 text-[11px]">
                                      <span className="text-slate-500 font-medium whitespace-nowrap min-w-[80px]">วันที่ปฏิบัติงาน:</span>
                                      <span className="text-slate-800 font-semibold truncate">{exportTargetJob.startServiceDate || '-'}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1 text-[11px]">
                                      <span className="text-slate-500 font-medium whitespace-nowrap min-w-[80px]">บริษัทคู่ค้า:</span>
                                      <span className="text-slate-800 truncate">{exportTargetJob.partnerCompany || '-'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          ) : (
                            /* CONTINUATION HEADER FOR PAGE 2, 3, etc. */
                            <div className="border-b-2 border-blue-700 pb-2 mb-3 flex justify-between items-center bg-blue-50/70 p-2.5 rounded-lg border border-blue-100">
                              <div className="flex items-center gap-2">
                                <div className="bg-blue-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">WSS</div>
                                <span className="font-extrabold text-blue-950 text-xs">
                                  {reportViewMode === 'full' ? 'รายงานสรุปการบริการ (ต่อ)' : 'ใบงาน / WORK ORDER (ต่อ)'}
                                </span>
                                <span className="text-slate-300 text-[10px]">|</span>
                                <span className="text-slate-700 text-[11px] font-semibold">ลูกค้า: {exportTargetJob.customerCompany}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-slate-400 mr-1.5">JOB NO:</span>
                                <span className="text-xs font-mono font-extrabold text-blue-700">{exportTargetJob.jobNo}</span>
                                {exportTargetJob.referenceDocument && (
                                  <span className="text-[9.5px] text-slate-500 ml-2 font-medium">(อ้างอิง: {exportTargetJob.referenceDocument})</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Render this Page's Content Sections */}
                          <div className="space-y-2.5 mt-2">
                            {pageSections.map((sec) => {
                              const isActionTaken = sec.id.startsWith('actionTaken');
                              return (
                                <div 
                                  key={sec.id} 
                                  className={`p-3 rounded-lg border shadow-2xs transition-all ${
                                    isActionTaken
                                      ? (reportViewMode === 'full' 
                                          ? 'border-l-4 border-l-blue-700 border-t-blue-100 border-r-blue-100 border-b-blue-100 bg-blue-50/30' 
                                          : 'border-l-4 border-l-emerald-700 border-t-emerald-100 border-r-emerald-100 border-b-emerald-100 bg-emerald-50/30')
                                      : 'border-l-4 border-l-slate-400 border-t-slate-200 border-r-slate-200 border-b-slate-200 bg-slate-50/60'
                                  }`}
                                >
                                  <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200/80">
                                    <h3 className="font-bold text-slate-900 text-[11.5px] flex items-center gap-1.5">
                                      <span className={`w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-extrabold shadow-2xs ${
                                        isActionTaken 
                                          ? (reportViewMode === 'full' ? 'bg-blue-700' : 'bg-emerald-700') 
                                          : 'bg-slate-600'
                                      }`}>
                                        {sec.num}
                                      </span>
                                      <span className={isActionTaken ? 'text-blue-950 font-extrabold' : 'text-slate-900'}>{sec.title}</span>
                                    </h3>
                                    {sec.titleEn && <span className="text-[9.5px] font-medium text-slate-400 italic">{sec.titleEn}</span>}
                                  </div>
                                  <p className="text-[11px] text-slate-800 whitespace-pre-wrap pl-1 leading-relaxed">{sec.content || '-'}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Bottom Area: Signatures (on Last Content Page if enabled) & Page Footer */}
                        <div className="pt-2">
                          {isLastContentPage && includeSignatures && (
                            <div className="pt-2 pb-1 border-t border-slate-200 mt-2">
                              <p className="text-[9.5px] text-slate-500 text-center mb-2 italic">
                                * ข้าพเจ้าได้ตรวจสอบและรับมอบงานบริการตามรายการข้างต้นเป็นที่เรียบร้อยและถูกต้องสมบูรณ์
                              </p>
                              <div className="grid grid-cols-2 gap-6 text-center">
                                {/* Technician signature box */}
                                <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between h-28 shadow-2xs">
                                  <div className="text-slate-800 font-bold text-[10.5px] pb-1 border-b border-slate-200">
                                    ผู้ปฏิบัติงาน / ช่างเทคนิค (Service Engineer)
                                  </div>
                                  <div className="h-12 flex items-center justify-center my-auto">
                                    {processedOperatorSig ? (
                                      <img src={processedOperatorSig} alt="Operator Signature" className="max-h-11 object-contain" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="border-b border-dashed border-slate-300 w-40 mx-auto mt-4"></div>
                                    )}
                                  </div>
                                  <div className="text-slate-700 text-[10px] font-medium truncate px-1">
                                    ({exportTargetJob.operator1 || exportTargetJob.operator2 || '................................................'})
                                  </div>
                                  <div className="text-slate-400 text-[9px]">วันที่ (Date): ______ / ______ / __________</div>
                                </div>

                                {/* Customer signature box */}
                                <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between h-28 shadow-2xs">
                                  <div className="text-slate-800 font-bold text-[10.5px] pb-1 border-b border-slate-200">
                                    ลูกค้า / ผู้ตรวจรับมอบงาน (Customer Acceptance)
                                  </div>
                                  <div className="h-12 flex items-center justify-center my-auto">
                                    {processedCustomerSig ? (
                                      <img src={processedCustomerSig} alt="Customer Signature" className="max-h-11 object-contain" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="border-b border-dashed border-slate-300 w-40 mx-auto mt-4"></div>
                                    )}
                                  </div>
                                  <div className="text-slate-700 text-[10px] font-medium truncate px-1">
                                    ({exportTargetJob.contactName || '................................................'})
                                  </div>
                                  <div className="text-slate-400 text-[9px]">วันที่ (Date): ______ / ______ / __________</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Page Footer */}
                          <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-200 pt-2 mt-2">
                            <span className="font-medium">เอกสารรายงานผลการให้บริการ Onsite Service</span>
                            <span className="font-mono font-bold text-slate-500">JOB: {exportTargetJob.jobNo}</span>
                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              หน้า {pageNumber} จาก {grandTotalPages}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* PHOTO APPENDIX PAGES (6 photos per page) */}
                  {photoChunks.map((chunk, photoPageIdx) => {
                    const photoPageNumber = totalContentPages + photoPageIdx + 1;
                    const fromPhoto = photoPageIdx * 6 + 1;
                    const toPhoto = Math.min((photoPageIdx + 1) * 6, processedPhotos.length);

                    return (
                      <div 
                        key={`photo-page-${photoPageIdx}`}
                        className="pdf-page bg-white p-8 sm:p-9 shadow-lg border border-slate-300 text-xs text-slate-800 leading-relaxed shrink-0 w-[794px] min-h-[1123px] max-h-[1123px] h-[1123px] flex flex-col justify-between box-border overflow-hidden select-text"
                      >
                        <div>
                          {/* Photo Appendix Header Banner */}
                          <div className="border-b-2 border-blue-700 pb-2.5 mb-4 flex justify-between items-center bg-blue-50/60 p-3 rounded-lg border border-blue-100 shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <div className="bg-blue-700 text-white p-1.5 rounded-lg shadow-2xs">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="font-extrabold text-blue-950 text-sm">
                                  ภาคผนวก: รูปถ่ายบันทึกการปฏิบัติงาน (Photo Appendix)
                                </h3>
                                <p className="text-slate-500 text-[10px] mt-0.5">
                                  แสดงรูปภาพที่ <strong className="text-blue-900">{fromPhoto} - {toPhoto}</strong> จากทั้งหมด {processedPhotos.length} รูป
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-extrabold text-blue-700 font-mono">{exportTargetJob.jobNo}</div>
                              {exportTargetJob.referenceDocument && (
                                <div className="text-[10px] font-semibold text-slate-500">อ้างอิง: {exportTargetJob.referenceDocument}</div>
                              )}
                            </div>
                          </div>

                          {/* 6 Photos Grid (2x3 Equal Sized Cards) */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                            {chunk.map((p, itemIdx) => {
                              const globalIdx = photoPageIdx * 6 + itemIdx;
                              return (
                                <div key={itemIdx} className="border border-slate-200 p-2.5 rounded-lg bg-slate-50/70 text-center flex flex-col justify-between shadow-2xs">
                                  <div className="font-bold text-slate-700 text-[10px] flex justify-between items-center px-1 pb-1 border-b border-slate-200">
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-3.5 h-3.5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[8px] font-extrabold shadow-2xs">{globalIdx + 1}</span>
                                      <span className="font-bold text-slate-800">รูปถ่ายที่ {globalIdx + 1}</span>
                                    </span>
                                    {p.timestamp && (
                                      <span className="text-[9px] font-medium text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                        {new Date(p.timestamp).toLocaleDateString('th-TH')}
                                      </span>
                                    )}
                                  </div>

                                  {/* Photo Image Frame */}
                                  <div className="aspect-[16/10] w-full rounded overflow-hidden bg-white border border-slate-200 flex items-center justify-center max-h-40 my-1.5 shadow-2xs">
                                    {p.url ? (
                                      <img src={p.url} alt={`Photo ${globalIdx + 1}`} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="text-slate-400 text-xs flex flex-col items-center gap-1">
                                        <ImageIcon className="w-6 h-6 text-slate-300" />
                                        <span>ไม่มีรูปภาพ</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Caption Block */}
                                  <div className="font-medium text-slate-800 text-[10.5px] bg-white p-1.5 rounded border border-slate-200 min-h-[30px] flex items-center justify-center text-center leading-snug">
                                    {p.caption ? (
                                      <span>{p.caption}</span>
                                    ) : (
                                      <span className="text-slate-400 italic text-[9.5px]">- ไม่มีคำบรรยายใต้ภาพ -</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Photo Appendix Footer */}
                        <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-200 pt-2 mt-2">
                          <span className="font-medium">ภาคผนวกรูปถ่ายบันทึกการปฏิบัติงาน Onsite Service</span>
                          <span className="font-mono font-bold text-slate-500">JOB: {exportTargetJob.jobNo}</span>
                          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            หน้า {photoPageNumber} จาก {grandTotalPages}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Export trigger bar */}
              <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-3 items-center shrink-0">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-700 font-bold">เลือกประเภทไฟล์เพื่อส่งออกเอกสาร</span>
                  {isProcessingImages ? (
                    <span className="text-[10px] text-blue-600 animate-pulse mt-0.5 font-bold">
                      ⌛ กำลังดาวน์โหลดและแปลงข้อมูลรูปภาพเพื่อส่งออก... (โปรดรอสักครู่)
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                      ✓ พร้อมส่งออก PDF ({grandTotalPages} หน้าสมบูรณ์แบบ รูปภาพและข้อมูลครบถ้วน)
                    </span>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {/* Excel export */}
                  <button
                    onClick={() => exportToExcelTable('printable-job-service-doc', `JobService_${exportTargetJob.jobNo.replace('/', '_')}`)}
                    disabled={isProcessingImages}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>ส่งออก Excel</span>
                  </button>

                  {/* Word export */}
                  <button
                    onClick={() => exportToWord('printable-job-service-doc', `JobService_${exportTargetJob.jobNo.replace('/', '_')}`)}
                    disabled={isProcessingImages}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  >
                    <FileText className="w-4 h-4" />
                    <span>ส่งออก Word</span>
                  </button>

                  {/* PDF export */}
                  <button
                    onClick={handleExportPDF}
                    disabled={isProcessingImages}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isProcessingImages ? 'กำลังเตรียมไฟล์...' : 'ส่งออก PDF'}</span>
                  </button>

                  <button
                    onClick={() => setExportTargetJob(null)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold text-xs cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
