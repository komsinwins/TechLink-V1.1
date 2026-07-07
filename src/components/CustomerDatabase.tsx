import React, { useState } from 'react';
import { Customer, OnsiteService, OnCallService, ProductClaim } from '../types';
import { Search, Plus, Trash2, Edit3, ArrowUpRight, FileSpreadsheet, Download, Upload, Eye, History, Briefcase, Phone, Mail, MapPin, Users } from 'lucide-react';
import { exportToCSV, parseCSV } from '../utils';
import { exportDataToGoogleSheets } from '../sheets';

interface CustomerDatabaseProps {
  customers: Customer[];
  onsiteJobs: OnsiteService[];
  oncallJobs: OnCallService[];
  claims: ProductClaim[];
  salesRepOptions: string[];
  onAddCustomer: (customer: Customer) => Promise<any>;
  onUpdateCustomer: (id: string, customer: Customer) => Promise<any>;
  onDeleteCustomer: (id: string) => Promise<any>;
  onImportCustomers: (customers: Customer[]) => Promise<any>;
  onAddSalesRep: (name: string) => void;
  onDeleteSalesRep: (name: string) => void;
  onViewOnsiteJob?: (job: OnsiteService) => void;
  onViewOncallJob?: (job: OnCallService) => void;
  onViewClaim?: (claim: ProductClaim) => void;
}

export default function CustomerDatabase({
  customers,
  onsiteJobs,
  oncallJobs,
  claims,
  salesRepOptions,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onImportCustomers,
  onAddSalesRep,
  onDeleteSalesRep,
  onViewOnsiteJob,
  onViewOncallJob,
  onViewClaim
}: CustomerDatabaseProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [contacts, setContacts] = useState([{ name: '', detail: '', phone: '', email: '' }]);
  const [partnerCompany, setPartnerCompany] = useState('');
  const [salesRep, setSalesRep] = useState('');

  // Selected customer for history view modal
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<Customer | null>(null);

  const resetForm = () => {
    setCompanyName('');
    setAddress('');
    setContacts([{ name: '', detail: '', phone: '', email: '' }]);
    setPartnerCompany('');
    setSalesRep('');
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id || null);
    setCompanyName(customer.companyName || '');
    setAddress(customer.address || '');
    
    if (customer.contacts && customer.contacts.length > 0) {
      setContacts(customer.contacts);
    } else {
      setContacts([{
        name: customer.contactName || '',
        detail: customer.contactDetail || '',
        phone: customer.contactPhone || '',
        email: customer.contactEmail || ''
      }]);
    }
    
    setPartnerCompany(customer.partnerCompany || '');
    setSalesRep(customer.salesRep || salesRepOptions[0] || '');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      alert('กรุณากรอกชื่อบริษัทลูกค้า');
      return;
    }

    const payload: Customer = {
      companyName,
      address,
      contacts,
      // Legacy fields mappings for backwards compatibility
      contactName: contacts[0]?.name || '',
      contactDetail: contacts[0]?.detail || '',
      contactPhone: contacts[0]?.phone || '',
      contactEmail: contacts[0]?.email || '',
      partnerCompany,
      salesRep
    };

    try {
      if (editingId) {
        await onUpdateCustomer(editingId, payload);
      } else {
        await onAddCustomer(payload);
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCSV(text);
      
      const mapped: Customer[] = parsed.map(item => ({
        companyName: item['ชื่อบริษัท'] || item['companyName'] || '',
        address: item['ที่อยู่บริษัท'] || item['address'] || '',
        contactName: item['ชื่อผู้ติดต่อ'] || item['contactName'] || '',
        contactDetail: item['รายละเอียดผู้ติดต่อ'] || item['contactDetail'] || '',
        contactPhone: item['เบอร์โทรผู้ติดต่อ'] || item['contactPhone'] || '',
        contactEmail: item['อีเมลติดต่อ'] || item['contactEmail'] || '',
        partnerCompany: item['บริษัทคู่ค้า'] || item['partnerCompany'] || '',
        salesRep: item['พนักงานขาย'] || item['salesRep'] || ''
      })).filter(c => c.companyName);

      if (mapped.length > 0) {
        await onImportCustomers(mapped);
        alert(`นำเข้าสำเร็จ ${mapped.length} รายการ`);
      } else {
        alert('ไม่พบข้อมูลลูกค้าที่ถูกต้องในไฟล์ CSV');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = ''; // clear input
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportSheets = async () => {
    setIsExporting(true);
    try {
      const headers = ['ชื่อบริษัท', 'ที่อยู่บริษัท', 'ชื่อผู้ติดต่อ', 'รายละเอียดผู้ติดต่อ', 'เบอร์โทรผู้ติดต่อ', 'อีเมลติดต่อ', 'บริษัทคู่ค้า', 'พนักงานขาย'];
      const dataRows = customers.map(c => [
        c.companyName,
        c.address,
        c.contactName,
        c.contactDetail,
        c.contactPhone,
        c.contactEmail,
        c.partnerCompany,
        c.salesRep
      ]);
      const url = await exportDataToGoogleSheets('TechLink_Customer_Database', headers, dataRows);
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
    const headers = ['ชื่อบริษัท', 'ที่อยู่บริษัท', 'ชื่อผู้ติดต่อ', 'รายละเอียดผู้ติดต่อ', 'เบอร์โทรผู้ติดต่อ', 'อีเมลติดต่อ', 'บริษัทคู่ค้า', 'พนักงานขาย'];
    const data = customers.map(c => ({
      'ชื่อบริษัท': c.companyName,
      'ที่อยู่บริษัท': c.address,
      'ชื่อผู้ติดต่อ': c.contactName,
      'รายละเอียดผู้ติดต่อ': c.contactDetail,
      'เบอร์โทรผู้ติดต่อ': c.contactPhone,
      'อีเมลติดต่อ': c.contactEmail,
      'บริษัทคู่ค้า': c.partnerCompany,
      'พนักงานขาย': c.salesRep
    }));
    exportToCSV(data, headers, 'Customer_Database');
  };

  const filteredCustomers = customers.filter(c => {
    const search = searchTerm.toLowerCase();
    return (
      c.companyName?.toLowerCase().includes(search) ||
      c.contactName?.toLowerCase().includes(search) ||
      c.contactPhone?.toLowerCase().includes(search) ||
      c.contactEmail?.toLowerCase().includes(search) ||
      c.partnerCompany?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-3" id="customers-tab">
      {/* Header and Quick Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5">
            <Users className="text-blue-600 w-4 h-4" />
            ฐานข้อมูลลูกค้า และ ประวัติการบริการ
          </h2>
          <p className="text-[10px] text-slate-500">บันทึกข้อมูลหลักลูกค้า พร้อมติดตามประวัติ Onsite, OnCall, และการเคลมสินค้าแบบอัตโนมัติ</p>
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
            เพิ่มรายชื่อลูกค้า
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white px-3 py-1.5 rounded-lg shadow-xs border border-slate-200 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="ค้นหาตามชื่อบริษัท, ชื่อผู้ติดต่อ, เบอร์โทร, อีเมล, หรือบริษัทคู่ค้า..."
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

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50/70">
              <tr className="text-left text-slate-500 font-black text-[10px] uppercase tracking-wider">
                <th className="py-2 px-3">ชื่อบริษัทลูกค้า</th>
                <th className="py-2 px-3">ชื่อผู้ติดต่อ / รายละเอียด</th>
                <th className="py-2 px-3">เบอร์โทร / อีเมล</th>
                <th className="py-2 px-3">คู่ค้าหลัก / พนักงานขาย</th>
                <th className="py-2 px-3 text-center">ประวัติ</th>
                <th className="py-2 px-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500 text-sm">
                    ไม่พบข้อมูลลูกค้าในระบบ
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => {
                  // Count total related records
                  const onsites = onsiteJobs.filter(j => j.customerCompany === customer.companyName);
                  const oncalls = oncallJobs.filter(j => j.customerCompany === customer.companyName);
                  const relatedClaims = claims.filter(c => c.customerCompany === customer.companyName);
                  const totalLogs = onsites.length + oncalls.length + relatedClaims.length;

                  return (
                    <tr key={customer.id} className="hover:bg-blue-50/20 transition-colors text-xs">
                      {/* Company Name & Address */}
                      <td className="py-1.5 px-3">
                        <div className="font-bold text-slate-900 text-xs">{customer.companyName}</div>
                        <div className="text-[10px] text-slate-500 max-w-xs truncate mt-0.2">{customer.address || '-'}</div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-1.5 px-3">
                        <div className="font-semibold text-slate-800">{customer.contactName || '-'}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">{customer.contactDetail || '-'}</div>
                      </td>

                      {/* Phone & Email */}
                      <td className="py-1.5 px-3">
                        <div className="font-bold text-slate-700">{customer.contactPhone || '-'}</div>
                        <div className="text-[10px] text-slate-500">{customer.contactEmail || '-'}</div>
                      </td>

                      {/* Partner & Sales */}
                      <td className="py-1.5 px-3">
                        <div className="font-bold text-blue-700">{customer.partnerCompany || '-'}</div>
                        <div className="text-[10px] text-slate-500">ดูแล: {customer.salesRep || '-'}</div>
                      </td>

                      {/* History Count Trigger */}
                      <td className="py-1.5 px-3 text-center">
                        <button
                          onClick={() => setSelectedCustomerHistory(customer)}
                          className="inline-flex items-center gap-1 bg-blue-50/50 hover:bg-blue-100/70 text-blue-700 px-2 py-0.5 rounded border border-blue-150 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          <History className="w-3 h-3" />
                          <span>{totalLogs} รายการ</span>
                        </button>
                      </td>

                      {/* Action buttons */}
                      <td className="py-1.5 px-3 text-right">
                        <div className="flex justify-end gap-0.5">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 cursor-pointer"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`ยืนยันการลบลูกค้า "${customer.companyName}"? การลบนี้ไม่ส่งผลเสียต่อประวัติในตารางงานอื่น แต่อะไหล่/ชื่อจะหายไป`)) {
                                onDeleteCustomer(customer.id!);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-red-600 rounded hover:bg-slate-100 cursor-pointer"
                            title="ลบลูกค้า"
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

      {/* Add/Edit Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white py-2.5 px-4 font-black flex justify-between items-center shrink-0">
              <span className="text-xs">{editingId ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มรายชื่อลูกค้าใหม่'}</span>
              <button onClick={resetForm} className="text-white/80 hover:text-white font-bold text-base">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-1 gap-3">
                {/* Company Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อบริษัทลูกค้า <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="บจก. เอ็กซ์วายแซด ซิสเต็มส์"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800"
                  />
                </div>

                {/* Company Address */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ที่อยู่บริษัทลูกค้า</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="99/9 อาคารเอ ชั้น 10 ถนนวิภาวดีรังสิต แขวงจตุจักร เขตจตุจักร กรุงเทพฯ"
                    rows={2}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800"
                  />
                </div>

                {/* Contacts List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-1">
                    <span className="text-xs font-bold text-gray-700">รายชื่อผู้ติดต่อ</span>
                    <button
                      type="button"
                      onClick={() => setContacts([...contacts, { name: '', detail: '', phone: '', email: '' }])}
                      className="flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:bg-blue-50 px-2 py-1 rounded cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> เพิ่มผู้ติดต่อ
                    </button>
                  </div>
                  
                  {contacts.map((contact, index) => (
                    <div key={index} className="bg-slate-50 border border-slate-200 p-3 rounded-lg relative">
                      {contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newContacts = [...contacts];
                            newContacts.splice(index, 1);
                            setContacts(newContacts);
                          }}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500 cursor-pointer"
                          title="ลบผู้ติดต่อนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      
                      <div className="space-y-2">
                        {/* Contact Name */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 mb-0.5">ชื่อผู้ติดต่อ</label>
                          <input
                            type="text"
                            value={contact.name}
                            onChange={(e) => {
                              const newContacts = [...contacts];
                              newContacts[index].name = e.target.value;
                              setContacts(newContacts);
                            }}
                            placeholder="คุณสมชาย เก่งกาจ"
                            className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-gray-800"
                          />
                        </div>

                        {/* Contact Details */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 mb-0.5">รายละเอียด</label>
                          <input
                            type="text"
                            value={contact.detail}
                            onChange={(e) => {
                              const newContacts = [...contacts];
                              newContacts[index].detail = e.target.value;
                              setContacts(newContacts);
                            }}
                            placeholder="ตำแหน่ง หรือเวลาที่สะดวกติดต่อ"
                            className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-gray-800"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Phone */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-700 mb-0.5">เบอร์โทร</label>
                            <input
                              type="text"
                              value={contact.phone}
                              onChange={(e) => {
                                const newContacts = [...contacts];
                                newContacts[index].phone = e.target.value;
                                setContacts(newContacts);
                              }}
                              placeholder="081-234-5678"
                              className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-gray-800"
                            />
                          </div>
                          {/* Email */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-700 mb-0.5">อีเมล</label>
                            <input
                              type="email"
                              value={contact.email}
                              onChange={(e) => {
                                const newContacts = [...contacts];
                                newContacts[index].email = e.target.value;
                                setContacts(newContacts);
                              }}
                              placeholder="somchai@company.com"
                              className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-gray-800"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Partner Company */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">บริษัทคู่ค้า (ถ้ามี)</label>
                  <input
                    type="text"
                    value={partnerCompany}
                    onChange={(e) => setPartnerCompany(e.target.value)}
                    placeholder="บริษัทคู่ร่วมบริการร่วม"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800"
                  />
                </div>

                {/* Sales Representative Option Creator */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อพนักงานขาย</label>
                  <select
                    value={salesRep}
                    onChange={(e) => setSalesRep(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-800"
                  >
                    <option value="">-- เลือกพนักงานขาย --</option>
                    {salesRepOptions.map(rep => (
                      <option key={rep} value={rep}>{rep}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History modal */}
      {selectedCustomerHistory && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white py-2.5 px-4 font-black flex justify-between items-center shrink-0">
              <div className="flex items-center gap-1.5 text-xs">
                <History className="w-4 h-4" />
                <span>ประวัติบริการของ: {selectedCustomerHistory.companyName}</span>
              </div>
              <button onClick={() => setSelectedCustomerHistory(null)} className="text-white/85 hover:text-white text-base font-bold">
                &times;
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {/* Customer Profile Quick Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                <div className="space-y-1">
                  <div className="font-bold text-gray-500 uppercase">ที่อยู่บริษัท</div>
                  <div className="font-semibold text-gray-900 flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>{selectedCustomerHistory.address || 'ไม่มีข้อมูล'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-gray-500 uppercase">ข้อมูลผู้ติดต่อ</div>
                  <div className="font-semibold text-gray-900">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      <span>{selectedCustomerHistory.contactName || '-'}</span>
                    </div>
                    {selectedCustomerHistory.contactPhone && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        <span>{selectedCustomerHistory.contactPhone}</span>
                      </div>
                    )}
                    {selectedCustomerHistory.contactEmail && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <span>{selectedCustomerHistory.contactEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-gray-500 uppercase">คู่ค้า & เซลส์ผู้รับผิดชอบ</div>
                  <div className="font-semibold text-gray-900">
                    <div>คู่ค้าหลัก: <span className="text-blue-700">{selectedCustomerHistory.partnerCompany || 'ไม่มี'}</span></div>
                    <div className="mt-1">เซลส์ดูแล: <span className="text-blue-700">{selectedCustomerHistory.salesRep || 'ไม่มี'}</span></div>
                  </div>
                </div>
              </div>

              {/* 1. Onsite Service History list */}
              <div>
                <h4 className="font-black text-xs text-slate-900 border-b border-slate-100 pb-1.5 mb-2 flex items-center gap-1 text-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  ประวัติงาน Onsite Service ({onsiteJobs.filter(j => j.customerCompany === selectedCustomerHistory.companyName).length} รายการ)
                </h4>
                {onsiteJobs.filter(j => j.customerCompany === selectedCustomerHistory.companyName).length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1">ไม่มีประวัติงาน Onsite</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded">
                    <table className="min-w-full divide-y divide-slate-150 text-[10px] text-left">
                      <thead className="bg-slate-50">
                        <tr className="text-slate-500 font-black uppercase tracking-wider text-[9px]">
                          <th className="py-1.5 px-2">เลขที่ใบงาน</th>
                          <th className="py-1.5 px-2">ประเภทบริการ</th>
                          <th className="py-1.5 px-2">ผู้ปฏิบัติงาน</th>
                          <th className="py-1.5 px-2">วันที่รับแจ้ง</th>
                          <th className="py-1.5 px-2">อาการรับแจ้ง</th>
                          <th className="py-1.5 px-2">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {onsiteJobs
                          .filter(j => j.customerCompany === selectedCustomerHistory.companyName)
                          .map(job => (
                            <tr 
                              key={job.id} 
                              className="hover:bg-slate-50/50 cursor-pointer"
                              onClick={() => onViewOnsiteJob?.(job)}
                            >
                              <td className="py-1.5 px-2 font-mono font-bold text-blue-600">{job.jobNo}</td>
                              <td className="py-1.5 px-2">{job.serviceType}</td>
                              <td className="py-1.5 px-2">{[job.operator1, job.operator2].filter(Boolean).join(', ') || '-'}</td>
                              <td className="py-1.5 px-2">{job.receivedDate}</td>
                              <td className="py-1.5 px-2 truncate max-w-xs">{job.symptoms}</td>
                              <td className="py-1.5 px-2">
                                <span className={`px-1 py-0.2 rounded text-[9px] font-black uppercase ${
                                  job.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {job.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. OnCall Service History list */}
              <div>
                <h4 className="font-black text-xs text-slate-900 border-b border-slate-100 pb-1.5 mb-2 flex items-center gap-1 text-indigo-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                  ประวัติงาน OnCall Service ({oncallJobs.filter(j => j.customerCompany === selectedCustomerHistory.companyName).length} รายการ)
                </h4>
                {oncallJobs.filter(j => j.customerCompany === selectedCustomerHistory.companyName).length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1">ไม่มีประวัติงาน OnCall</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded">
                    <table className="min-w-full divide-y divide-slate-150 text-[10px] text-left">
                      <thead className="bg-slate-50">
                        <tr className="text-slate-500 font-black uppercase tracking-wider text-[9px]">
                          <th className="py-1.5 px-2">วันที่รับแจ้ง</th>
                          <th className="py-1.5 px-2">สินค้า</th>
                          <th className="py-1.5 px-2">อาการที่รับแจ้ง</th>
                          <th className="py-1.5 px-2">ผู้ปฏิบัติงาน</th>
                          <th className="py-1.5 px-2">สรุปการแก้ไข</th>
                          <th className="py-1.5 px-2">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {oncallJobs
                          .filter(j => j.customerCompany === selectedCustomerHistory.companyName)
                          .map(job => (
                            <tr 
                              key={job.id} 
                              className="hover:bg-slate-50/50 cursor-pointer"
                              onClick={() => onViewOncallJob?.(job)}
                            >
                              <td className="py-1.5 px-2">{job.receivedDate}</td>
                              <td className="py-1.5 px-2">{job.productType}</td>
                              <td className="py-1.5 px-2 truncate max-w-xs">{job.symptoms}</td>
                              <td className="py-1.5 px-2">{job.operator || '-'}</td>
                              <td className="py-1.5 px-2 truncate max-w-xs">{job.actionTaken}</td>
                              <td className="py-1.5 px-2">
                                <span className={`px-1 py-0.2 rounded text-[9px] font-black uppercase ${
                                  job.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}>
                                  {job.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 3. Claims History list */}
              <div>
                <h4 className="font-black text-xs text-slate-900 border-b border-slate-100 pb-1.5 mb-2 flex items-center gap-1 text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  ประวัติการเคลมสินค้า ({claims.filter(c => c.customerCompany === selectedCustomerHistory.companyName).length} รายการ)
                </h4>
                {claims.filter(c => c.customerCompany === selectedCustomerHistory.companyName).length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1">ไม่มีประวัติการเคลมสินค้า</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded">
                    <table className="min-w-full divide-y divide-slate-150 text-[10px] text-left">
                      <thead className="bg-slate-50">
                        <tr className="text-slate-500 font-black uppercase tracking-wider text-[9px]">
                          <th className="py-1.5 px-2">วันที่รับเคลม</th>
                          <th className="py-1.5 px-2">สินค้า / รุ่น</th>
                          <th className="py-1.5 px-2">ซีเรียลนัมเบอร์</th>
                          <th className="py-1.5 px-2">ประกันคงเหลือ</th>
                          <th className="py-1.5 px-2">สถานที่ส่งเคลม</th>
                          <th className="py-1.5 px-2">สถานะเคลม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {claims
                          .filter(c => c.customerCompany === selectedCustomerHistory.companyName)
                          .map(claim => (
                            <tr 
                              key={claim.id} 
                              className="hover:bg-slate-50/50 cursor-pointer"
                              onClick={() => onViewClaim?.(claim)}
                            >
                              <td className="py-1.5 px-2">{claim.claimReceivedDate}</td>
                              <td className="py-1.5 px-2 font-semibold">{claim.brand} - {claim.model}</td>
                              <td className="py-1.5 px-2 font-mono">{claim.serialNumber}</td>
                              <td className="py-1.5 px-2">{claim.purchaseDate ? 'บันทึกแล้ว' : 'ไม่มีข้อมูล'}</td>
                              <td className="py-1.5 px-2">{claim.claimDestination}</td>
                              <td className="py-1.5 px-2">
                                <span className={`px-1 py-0.2 rounded text-[9px] font-black uppercase ${
                                  claim.claimStatus === 'Returned' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {claim.claimStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 py-2.5 px-4 border-t border-slate-200 text-right shrink-0">
              <button
                onClick={() => setSelectedCustomerHistory(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
