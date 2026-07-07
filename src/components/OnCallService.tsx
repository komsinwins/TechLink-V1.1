import React, { useState } from 'react';
import { OnCallService, Customer } from '../types';
import { 
  Search, Plus, Trash2, Edit3, Download, Upload, AlertCircle, 
  PhoneCall, CheckCircle, Clock, User, Info, CheckSquare, Check, X, FileSpreadsheet
} from 'lucide-react';
import { calculateDaysDiff, exportToCSV, parseCSV } from '../utils';
import { exportDataToGoogleSheets } from '../sheets';

interface OnCallServiceProps {
  oncallJobs: OnCallService[];
  customers: Customer[];
  productTypes: string[];
  salesReps: string[];
  reportedCategories: string[];
  operators: string[];
  onAddJob: (job: OnCallService) => Promise<any>;
  onUpdateJob: (id: string, job: OnCallService) => Promise<any>;
  onDeleteJob: (id: string) => Promise<any>;
  onImportJobs: (jobs: OnCallService[]) => Promise<any>;
  selectedOncallForView?: OnCallService | null;
  setSelectedOncallForView?: (job: OnCallService | null) => void;
  onAddDropdownOption: (key: any, value: string) => Promise<void>;
  onDeleteDropdownOption: (key: any, value: string) => Promise<void>;
}

export default function OnCallServiceTab({
  oncallJobs,
  customers,
  productTypes,
  salesReps,
  reportedCategories,
  operators,
  onAddJob,
  onUpdateJob,
  onDeleteJob,
  onImportJobs,
  selectedOncallForView,
  setSelectedOncallForView,
  onAddDropdownOption,
  onDeleteDropdownOption
}: OnCallServiceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search customer query for auto-fill
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Form states
  const [customerCompany, setCustomerCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactDetail, setContactDetail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [partnerCompany, setPartnerCompany] = useState('');
  const [productType, setProductType] = useState('');
  const [salesRep, setSalesRep] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [reportedCategory, setReportedCategory] = useState('');
  const [operator, setOperator] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'Open' | 'In Progress' | 'Pending' | 'Resolved'>('Open');

  React.useEffect(() => {
    if (selectedOncallForView) {
      handleEdit(selectedOncallForView);
      setSelectedOncallForView?.(null);
    }
  }, [selectedOncallForView]);

  const resetForm = () => {
    setEditingId(null);
    setCustomerCompany('');
    setContactName('');
    setContactDetail('');
    setContactPhone('');
    setContactEmail('');
    setPartnerCompany('');
    setProductType('');
    setSalesRep('');
    const today = new Date().toISOString().split('T')[0];
    setReceivedDate(today);
    setResolutionDate(today);
    setReportedCategory('');
    setOperator('');
    setSymptoms('');
    setActionTaken('');
    setRemarks('');
    setStatus('Open');
    setCustomerSearchQuery('');
    setIsFormOpen(false);
  };

  const handleEdit = (job: OnCallService) => {
    setEditingId(job.id || null);
    setCustomerCompany(job.customerCompany || '');
    setContactName(job.contactName || '');
    setContactDetail(job.contactDetail || '');
    setContactPhone(job.contactPhone || '');
    setContactEmail(job.contactEmail || '');
    setPartnerCompany(job.partnerCompany || '');
    setProductType(job.productType || '');
    setSalesRep(job.salesRep || '');
    setReceivedDate(job.receivedDate || '');
    setResolutionDate(job.resolutionDate || '');
    setReportedCategory(job.reportedCategory || '');
    setOperator(job.operator || '');
    setSymptoms(job.symptoms || '');
    setActionTaken(job.actionTaken || '');
    setRemarks(job.remarks || '');
    setStatus(job.status || 'Open');
    setIsFormOpen(true);
  };

  const selectCustomer = (c: Customer) => {
    setCustomerCompany(c.companyName);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerCompany.trim()) {
      alert('กรุณากรอกชื่อบริษัทลูกค้า');
      return;
    }

    const payload: OnCallService = {
      customerCompany,
      contactName,
      contactDetail,
      contactPhone,
      contactEmail,
      partnerCompany,
      productType,
      salesRep,
      receivedDate,
      resolutionDate,
      reportedCategory,
      operator,
      symptoms,
      actionTaken,
      remarks,
      status
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
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล OnCall Service');
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportSheets = async () => {
    setIsExporting(true);
    try {
      const headers = [
        'ชื่อบริษัทลูกค้า', 'ชื่อผู้ติดต่อ', 'รายละเอียดผู้ติดต่อ', 'เบอร์โทรผู้ติดต่อ', 'อีเมลติดต่อ', 
        'บริษัทคู่ค้า', 'บริการ/ประเภทบริการ', 'พนักงานขาย', 'วันที่รับแจ้ง', 'วันที่แก้ไขเสร็จงาน', 
        'ประเภทสินค้าที่รับแจ้ง', 'ชื่อผู้ปฏิบัติงาน', 'อาการรับแจ้ง', 'สรุปการแก้ไข', 'หมายเหตุ', 'สถานะ'
      ];
      const dataRows = oncallJobs.map(j => [
        j.customerCompany,
        j.contactName,
        j.contactDetail,
        j.contactPhone,
        j.contactEmail,
        j.partnerCompany,
        j.productType,
        j.salesRep,
        j.receivedDate,
        j.resolutionDate,
        j.reportedCategory,
        j.operator,
        j.symptoms,
        j.actionTaken,
        j.remarks,
        j.status
      ]);
      const url = await exportDataToGoogleSheets('TechLink_OnCall_Service_Jobs', headers, dataRows);
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
      'ชื่อบริษัทลูกค้า', 'ชื่อผู้ติดต่อ', 'รายละเอียดผู้ติดต่อ', 'เบอร์โทรผู้ติดต่อ', 'อีเมลติดต่อ', 
      'บริษัทคู่ค้า', 'บริการ/ประเภทบริการ', 'พนักงานขาย', 'วันที่รับแจ้ง', 'วันที่แก้ไขเสร็จงาน', 
      'ประเภทสินค้าที่รับแจ้ง', 'ชื่อผู้ปฏิบัติงาน', 'อาการรับแจ้ง', 'สรุปการแก้ไข', 'หมายเหตุ', 'สถานะ'
    ];
    const data = oncallJobs.map(j => ({
      'ชื่อบริษัทลูกค้า': j.customerCompany,
      'ชื่อผู้ติดต่อ': j.contactName,
      'รายละเอียดผู้ติดต่อ': j.contactDetail,
      'เบอร์โทรผู้ติดต่อ': j.contactPhone,
      'อีเมลติดต่อ': j.contactEmail,
      'บริษัทคู่ค้า': j.partnerCompany,
      'บริการ/ประเภทบริการ': j.productType,
      'พนักงานขาย': j.salesRep,
      'วันที่รับแจ้ง': j.receivedDate,
      'วันที่แก้ไขเสร็จงาน': j.resolutionDate,
      'ประเภทสินค้าที่รับแจ้ง': j.reportedCategory,
      'ชื่อผู้ปฏิบัติงาน': j.operator,
      'อาการรับแจ้ง': j.symptoms,
      'สรุปการแก้ไข': j.actionTaken,
      'หมายเหตุ': j.remarks,
      'สถานะ': j.status
    }));
    exportToCSV(data, headers, 'OnCall_Service_Jobs');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCSV(text);
      
      const mapped: OnCallService[] = parsed.map(item => ({
        customerCompany: item['ชื่อบริษัทลูกค้า'] || item['customerCompany'] || '',
        contactName: item['ชื่อผู้ติดต่อ'] || item['contactName'] || '',
        contactDetail: item['รายละเอียดผู้ติดต่อ'] || item['contactDetail'] || '',
        contactPhone: item['เบอร์โทรผู้ติดต่อ'] || item['contactPhone'] || '',
        contactEmail: item['อีเมลติดต่อ'] || item['contactEmail'] || '',
        partnerCompany: item['บริษัทคู่ค้า'] || item['partnerCompany'] || '',
        productType: item['บริการ/ประเภทบริการ'] || item['productType'] || '',
        salesRep: item['พนักงานขาย'] || item['salesRep'] || '',
        receivedDate: item['วันที่รับแจ้ง'] || item['receivedDate'] || '',
        resolutionDate: item['วันที่แก้ไขเสร็จงาน'] || item['resolutionDate'] || '',
        reportedCategory: item['ประเภทสินค้าที่รับแจ้ง'] || item['reportedCategory'] || '',
        operator: item['ชื่อผู้ปฏิบัติงาน'] || item['operator'] || '',
        symptoms: item['อาการรับแจ้ง'] || item['symptoms'] || '',
        actionTaken: item['สรุปการแก้ไข'] || item['actionTaken'] || '',
        remarks: item['หมายเหตุ'] || item['remarks'] || '',
        status: (item['สถานะ'] || item['status'] || 'Open') as any
      })).filter(j => j.customerCompany);

      if (mapped.length > 0) {
        await onImportJobs(mapped);
        alert(`นำเข้าสำเร็จ ${mapped.length} รายการ`);
      } else {
        alert('ไม่พบข้อมูลงาน OnCall ที่ถูกต้องในไฟล์ CSV');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const filteredJobs = oncallJobs.filter(j => {
    const search = searchTerm.toLowerCase();
    return (
      j.customerCompany?.toLowerCase().includes(search) ||
      j.contactName?.toLowerCase().includes(search) ||
      j.operator?.toLowerCase().includes(search) ||
      j.productType?.toLowerCase().includes(search) ||
      j.reportedCategory?.toLowerCase().includes(search)
    );
  });

  const searchedCustomers = customers.filter(c => 
    c.companyName?.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3" id="oncall-tab">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5">
            <PhoneCall className="text-blue-600 animate-pulse w-4 h-4" />
            ตารางงาน OnCall Service
          </h2>
          <p className="text-[10px] text-slate-500">บันทึกประวัติการช่วยเหลือทางโทรศัพท์ / รีโมทแก้ไขปัญหา และสถิติความเร็วในการแก้ปัญหา</p>
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
            เพิ่มงาน OnCall
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white px-3 py-1.5 rounded-lg shadow-xs border border-slate-200 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="ค้นหาชื่อบริษัทลูกค้า, ชื่อผู้ติดต่อ, ช่างรับเรื่อง, ประเภทบริการ หรืออาการ..."
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

      {/* SLA Exceeded Alert Notification */}
      {oncallJobs.filter(j => j.status !== 'Resolved' && calculateDaysDiff(j.receivedDate, new Date().toISOString().split('T')[0])! > 7).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg flex items-center gap-2 text-[11px] font-bold">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            แจ้งเตือน: มี {oncallJobs.filter(j => j.status !== 'Resolved' && calculateDaysDiff(j.receivedDate, new Date().toISOString().split('T')[0])! > 7).length} งาน OnCall ที่ยังแก้ปัญหาไม่แล้วเสร็จเกิน 7 วัน นับตั้งแต่วันที่รับแจ้ง
          </span>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50/70">
              <tr className="text-left text-slate-500 font-black text-[10px] uppercase tracking-wider">
                <th className="py-2 px-2.5">ลูกค้า / ผู้ติดต่อ</th>
                <th className="py-2 px-2.5">เบอร์โทร / อีเมล</th>
                <th className="py-2 px-2.5">คู่ค้า / บริการที่ขอ</th>
                <th className="py-2 px-2.5">สินค้าหลัก / ช่าง</th>
                <th className="py-2 px-2.5">วันที่รับ / เสร็จ</th>
                <th className="py-2 px-2.5">เวลาแก้ไขปัญหา</th>
                <th className="py-2 px-2.5">อาการและวิธีแก้</th>
                <th className="py-2 px-2.5">สถานะ</th>
                <th className="py-2 px-2.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500 text-sm">
                    ไม่พบข้อมูลงาน OnCall ในระบบ
                  </td>
                </tr>
              ) : (
                filteredJobs.map(job => {
                  const nowStr = new Date().toISOString().split('T')[0];
                  const resDiff = calculateDaysDiff(job.receivedDate, job.resolutionDate);
                  const daysSinceRec = calculateDaysDiff(job.receivedDate, nowStr) || 0;
                  
                  // SLA breach flag > 7 days
                  const isSlaBreached = job.status !== 'Resolved' && daysSinceRec > 7;

                  return (
                    <tr key={job.id} className={`hover:bg-blue-50/20 text-xs transition-colors ${isSlaBreached ? 'bg-amber-50/20' : ''}`}>
                      {/* Customer Name */}
                      <td className="py-1.5 px-2.5">
                        <div className="flex items-center gap-1">
                          {isSlaBreached && <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="งานค้างเกิน 7 วัน!" />}
                          <div className="font-bold text-slate-900">{job.customerCompany}</div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.2">{job.contactName} {job.contactDetail ? `(${job.contactDetail})` : ''}</div>
                      </td>

                      {/* Phone & Email */}
                      <td className="py-1.5 px-2.5 text-[10px] text-slate-600">
                        <div>{job.contactPhone || '-'}</div>
                        <div className="text-slate-400 mt-0.2">{job.contactEmail || '-'}</div>
                      </td>

                      {/* Service & Partner */}
                      <td className="py-1.5 px-2.5">
                        <div className="font-semibold text-blue-700">{job.productType || '-'}</div>
                        <div className="text-slate-400 text-[10px]">คู่ค้า: {job.partnerCompany || 'ไม่มี'}</div>
                      </td>

                      {/* Reported Category & Operator */}
                      <td className="py-1.5 px-2.5">
                        <div className="font-semibold text-slate-800">{job.reportedCategory}</div>
                        <div className="text-blue-600 font-semibold text-[10px] mt-0.2">ช่าง: {job.operator || '-'}</div>
                      </td>

                      {/* Dates */}
                      <td className="py-1.5 px-2.5 text-[10px] text-slate-600 space-y-0.2 whitespace-nowrap">
                        <div>รับแจ้ง: {job.receivedDate}</div>
                        <div>เสร็จสิ้น: {job.resolutionDate}</div>
                      </td>

                      {/* Duration Result */}
                      <td className="py-1.5 px-2.5 font-bold text-indigo-700 text-center text-[10px]">
                        {resDiff !== null ? `${resDiff} วัน` : '-'}
                      </td>

                      {/* Descriptions */}
                      <td className="py-1.5 px-2.5 max-w-xs text-[10px]">
                        <div className="truncate text-slate-750 font-semibold">แจ้ง: {job.symptoms}</div>
                        <div className="truncate text-slate-500 mt-0.2">แก้: {job.actionTaken}</div>
                      </td>

                      {/* Status */}
                      <td className="py-1.5 px-2.5">
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
                            onClick={() => handleEdit(job)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded cursor-pointer"
                            title="แก้ไขข้อมูลงาน"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`ยืนยันการลบงาน OnCall ของลูกค้า "${job.customerCompany}"?`)) {
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

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white py-2.5 px-4 font-black flex justify-between items-center shrink-0">
              <span className="text-xs">{editingId ? 'แก้ไขข้อมูลงาน OnCall' : 'บันทึกประวัติงาน OnCall Service ใหม่'}</span>
              <button onClick={resetForm} className="text-white hover:text-white/80 text-lg font-bold cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
              
              {/* Customer database linking selector */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center gap-1.5 text-blue-800 font-black text-[11px]">
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>ค้นหาข้อมูลลูกค้าและดึงข้อมูลอัตโนมัติ (Customer Database Integration)</span>
                </div>
                <div className="relative">
                  <div className="flex gap-1.5">
                    <div className="relative w-full">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อบริษัทจากฐานลูกค้า..."
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

                  {/* dropdown query options */}
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

              {/* Grid 3 Columns fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Col 1 */}
                <div className="space-y-3 bg-gray-50/50 p-3 rounded-lg border border-gray-100 text-xs">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1">รายละเอียดลูกค้า</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ชื่อบริษัทลูกค้า <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={customerCompany}
                      onChange={(e) => setCustomerCompany(e.target.value)}
                      placeholder="บจก. เอ็กซ์วายแซด"
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ชื่อ-นามสกุลผู้ติดต่อ</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="ผู้ติดต่อหลัก"
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
                <div className="space-y-3 bg-gray-50/50 p-3 rounded-lg border border-gray-100 text-xs">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1">รายละเอียดงาน</h4>
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
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">บริการ/ประเภทบริการที่เลือก</label>
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-800"
                    >
                      <option value="">-- เลือกประเภทบริการ --</option>
                      {productTypes.map(pt => (
                        <option key={pt} value={pt}>{pt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ประเภทสินค้าที่รับแจ้ง</label>
                    <select
                      value={reportedCategory}
                      onChange={(e) => setReportedCategory(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-800"
                    >
                      <option value="">-- เลือกประเภทอาการสินค้า --</option>
                      {reportedCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ชื่อผู้ปฏิบัติงาน (ช่างรับเรื่อง)</label>
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-800"
                    >
                      <option value="">-- เลือกช่างผู้รับเรื่อง --</option>
                      {operators.map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">ชื่อพนักงานขายผู้ดูแล</label>
                    <select
                      value={salesRep}
                      onChange={(e) => setSalesRep(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-800"
                    >
                      <option value="">-- เลือกพนักงานขาย --</option>
                      {salesReps.map(rep => (
                        <option key={rep} value={rep}>{rep}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Col 3 */}
                <div className="space-y-3 bg-gray-50/50 p-3 rounded-lg border border-gray-100 text-xs">
                  <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1">วันดำเนินการ & สถานะ</h4>
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
                      className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded bg-white font-bold"
                    >
                      <option value="Open">Open (เปิดงาน)</option>
                      <option value="In Progress">In Progress (กำลังดำเนินการ)</option>
                      <option value="Pending">Pending (อยู่ระหว่างรอ / ค้างส่ง)</option>
                      <option value="Resolved">Resolved (แก้ไขเสร็จสิ้น)</option>
                    </select>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded text-[10px] text-indigo-900">
                    <strong>ระยะเวลาแก้ไขปัญหา (คำนวณ):</strong> {calculateDaysDiff(receivedDate, resolutionDate) !== null ? `${calculateDaysDiff(receivedDate, resolutionDate)} วัน` : 'ยังแก้ไขไม่สำเร็จ'}
                  </div>
                </div>

              </div>

              {/* Descriptions block */}
              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200 pb-1">อาการและวิถีทางแก้ไขปัญหา</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">รับแจ้งอาการ</label>
                    <textarea
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="ระบุรายระเอียดปัญหาของอุปกรณ์หรือสายสัญญาณที่รับแจ้ง..."
                      rows={3}
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">การแก้ไข</label>
                    <textarea
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      placeholder="ระบุวิถีการแก้ไขปัญหา หรือขั้นตอนรีโมทช่วยเซ็ตระบบ..."
                      rows={3}
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1">หมายเหตุ</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="พิมพ์รายละเอียดหมายเหตุอื่นๆเพิ่มเติม..."
                    rows={2}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Form Action buttons */}
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
                  className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
