import React, { useState } from 'react';
import { Distributor, DistributorContact } from '../types';
import { Search, Plus, Trash2, Edit3, Briefcase, Phone, MapPin, Building2, User, CheckCircle2 } from 'lucide-react';

interface DistributorDatabaseProps {
  distributors: Distributor[];
  onAddDistributor: (dist: Distributor) => Promise<any>;
  onUpdateDistributor: (id: string, dist: Distributor) => Promise<any>;
  onDeleteDistributor: (id: string) => Promise<any>;
  onImportDistributors: (distributors: Distributor[]) => Promise<any>;
}

export default function DistributorDatabase({
  distributors,
  onAddDistributor,
  onUpdateDistributor,
  onDeleteDistributor,
  onImportDistributors
}: DistributorDatabaseProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [claimAddress, setClaimAddress] = useState('');
  const [contacts, setContacts] = useState<DistributorContact[]>([
    { name: '', department: '', phones: [''] }
  ]);
  const [claimContacts, setClaimContacts] = useState<DistributorContact[]>([
    { name: '', department: '', phones: [''] }
  ]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter Distributors
  const filteredDistributors = distributors.filter(d => 
    d.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.address.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.companyName.localeCompare(b.companyName));

  const handleAddContact = () => {
    setContacts([...contacts, { name: '', department: '', phones: [''] }]);
  };

  const handleRemoveContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleContactChange = (index: number, field: keyof DistributorContact, value: string) => {
    const newContacts = [...contacts];
    if (field !== 'phones') {
      newContacts[index] = { ...newContacts[index], [field]: value };
      setContacts(newContacts);
    }
  };

  const handleAddPhone = (contactIndex: number) => {
    const newContacts = [...contacts];
    newContacts[contactIndex].phones.push('');
    setContacts(newContacts);
  };

  const handleRemovePhone = (contactIndex: number, phoneIndex: number) => {
    const newContacts = [...contacts];
    newContacts[contactIndex].phones = newContacts[contactIndex].phones.filter((_, i) => i !== phoneIndex);
    setContacts(newContacts);
  };

  const handlePhoneChange = (contactIndex: number, phoneIndex: number, value: string) => {
    const newContacts = [...contacts];
    newContacts[contactIndex].phones[phoneIndex] = value;
    setContacts(newContacts);
  };

  // Claim Contacts Handlers
  const handleAddClaimContact = () => {
    setClaimContacts([...claimContacts, { name: '', department: '', phones: [''] }]);
  };

  const handleRemoveClaimContact = (index: number) => {
    setClaimContacts(claimContacts.filter((_, i) => i !== index));
  };

  const handleClaimContactChange = (index: number, field: keyof DistributorContact, value: string) => {
    const newContacts = [...claimContacts];
    if (field !== 'phones') {
      newContacts[index] = { ...newContacts[index], [field]: value };
      setClaimContacts(newContacts);
    }
  };

  const handleAddClaimPhone = (contactIndex: number) => {
    const newContacts = [...claimContacts];
    newContacts[contactIndex].phones.push('');
    setClaimContacts(newContacts);
  };

  const handleRemoveClaimPhone = (contactIndex: number, phoneIndex: number) => {
    const newContacts = [...claimContacts];
    newContacts[contactIndex].phones = newContacts[contactIndex].phones.filter((_, i) => i !== phoneIndex);
    setClaimContacts(newContacts);
  };

  const handleClaimPhoneChange = (contactIndex: number, phoneIndex: number, value: string) => {
    const newContacts = [...claimContacts];
    newContacts[contactIndex].phones[phoneIndex] = value;
    setClaimContacts(newContacts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setIsSubmitting(true);
    try {
      const distData: Distributor = {
        companyName,
        address,
        claimAddress,
        contacts: contacts.map(c => ({
          ...c,
          phones: c.phones.filter(p => p.trim() !== '')
        })),
        claimContacts: claimContacts.map(c => ({
          ...c,
          phones: c.phones.filter(p => p.trim() !== '')
        }))
      };

      if (editingId) {
        await onUpdateDistributor(editingId, distData);
      } else {
        await onAddDistributor(distData);
      }

      closeForm();
    } catch (err: any) {
      alert('Error saving distributor: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setCompanyName('');
    setAddress('');
    setClaimAddress('');
    setContacts([{ name: '', department: '', phones: [''] }]);
    setClaimContacts([{ name: '', department: '', phones: [''] }]);
  };

  const handleEdit = (dist: Distributor) => {
    setEditingId(dist.id || null);
    setCompanyName(dist.companyName);
    setAddress(dist.address);
    setClaimAddress(dist.claimAddress);
    setContacts(dist.contacts?.length > 0 ? [...dist.contacts] : [{ name: '', department: '', phones: [''] }]);
    setClaimContacts(dist.claimContacts?.length > 0 ? [...dist.claimContacts] : [{ name: '', department: '', phones: [''] }]);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`คุณต้องการลบข้อมูลตัวแทนจำหน่าย "${name}" ใช่หรือไม่?`)) {
      try {
        await onDeleteDistributor(id);
      } catch (err: any) {
        alert('Error deleting: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 text-slate-800">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Briefcase className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold">ฐานข้อมูลตัวแทนจำหน่าย</h2>
            <p className="text-xs text-slate-500">จัดการข้อมูลบริษัทตัวแทนจำหน่ายทั้งหมด ({distributors.length} รายการ)</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="ค้นหาชื่อบริษัท..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
          </div>
          
          <button
            onClick={() => { closeForm(); setIsFormOpen(true); }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มตัวแทนจำหน่าย</span>
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredDistributors.map((dist) => (
          <div key={dist.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:border-blue-300 transition-colors">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-start">
              <div className="flex-1 pr-4">
                <h3 className="font-bold text-slate-900 text-base">{dist.companyName}</h3>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleEdit(dist)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="แก้ไขข้อมูล"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => dist.id && handleDelete(dist.id, dist.companyName)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="ลบข้อมูล"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="p-4 flex-1 flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="text-sm text-slate-600">
                  <span className="font-medium text-slate-700 block">ที่อยู่:</span>
                  {dist.address || '-'}
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="text-sm text-slate-600">
                  <span className="font-medium text-slate-700 block">สถานที่ส่งเคลมสินค้า:</span>
                  {dist.claimAddress || '-'}
                </div>
              </div>

              {dist.contacts && dist.contacts.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 space-y-3">
                  <span className="font-medium text-slate-700 text-sm block">ผู้ติดต่อ:</span>
                  {dist.contacts.map((contact, idx) => (
                    <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-semibold text-slate-800">{contact.name || '-'}</span>
                        {contact.department && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                            {contact.department}
                          </span>
                        )}
                      </div>
                      {contact.phones && contact.phones.length > 0 && (
                        <div className="flex items-start gap-2 mt-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {contact.phones.map((p, i) => (
                              <span key={i} className="text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {dist.claimContacts && dist.claimContacts.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 space-y-3">
                  <span className="font-medium text-slate-700 text-sm block">ผู้ติดต่อสำหรับการเคลม:</span>
                  {dist.claimContacts.map((contact, idx) => (
                    <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-semibold text-slate-800">{contact.name || '-'}</span>
                        {contact.department && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                            {contact.department}
                          </span>
                        )}
                      </div>
                      {contact.phones && contact.phones.length > 0 && (
                        <div className="flex items-start gap-2 mt-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {contact.phones.map((p, i) => (
                              <span key={i} className="text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {filteredDistributors.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
            ไม่พบข้อมูลตัวแทนจำหน่าย
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">
                {editingId ? 'แก้ไขข้อมูลตัวแทนจำหน่าย' : 'เพิ่มตัวแทนจำหน่ายใหม่'}
              </h3>
              <button 
                onClick={closeForm}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-full transition-colors"
              >
                <Trash2 className="w-5 h-5 hidden" />
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="space-y-5">
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    ชื่อบริษัทตัวแทนจำหน่าย <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="ระบุชื่อบริษัทตัวแทนจำหน่าย..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    ที่อยู่
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    placeholder="ระบุที่อยู่..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    สถานที่ส่งเคลมสินค้า
                  </label>
                  <textarea
                    rows={2}
                    value={claimAddress}
                    onChange={(e) => setClaimAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    placeholder="ระบุที่อยู่สำหรับส่งเคลมสินค้า..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-slate-700">ผู้ติดต่อ</label>
                    <button
                      type="button"
                      onClick={handleAddContact}
                      className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มผู้ติดต่อ
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {contacts.map((contact, contactIndex) => (
                      <div key={contactIndex} className="p-3 bg-slate-50 border border-slate-200 rounded-lg relative">
                        {contacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveContact(contactIndex)}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อผู้ติดต่อ</label>
                            <input
                              type="text"
                              value={contact.name}
                              onChange={(e) => handleContactChange(contactIndex, 'name', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="ชื่อ..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">แผนก</label>
                            <input
                              type="text"
                              value={contact.department}
                              onChange={(e) => handleContactChange(contactIndex, 'department', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="แผนก..."
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-semibold text-slate-600">เบอร์โทรศัพท์</label>
                            <button
                              type="button"
                              onClick={() => handleAddPhone(contactIndex)}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                            >
                              <Plus className="w-3 h-3" /> เพิ่มเบอร์
                            </button>
                          </div>
                          <div className="space-y-2">
                            {contact.phones.map((phone, phoneIndex) => (
                              <div key={phoneIndex} className="flex gap-2">
                                <input
                                  type="text"
                                  value={phone}
                                  onChange={(e) => handlePhoneChange(contactIndex, phoneIndex, e.target.value)}
                                  className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                  placeholder="เบอร์โทร..."
                                />
                                {contact.phones.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhone(contactIndex, phoneIndex)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded border border-transparent"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-slate-700">ผู้ติดต่อสำหรับการเคลม</label>
                    <button
                      type="button"
                      onClick={handleAddClaimContact}
                      className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มผู้ติดต่อ
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {claimContacts.map((contact, contactIndex) => (
                      <div key={contactIndex} className="p-3 bg-slate-50 border border-slate-200 rounded-lg relative">
                        {claimContacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveClaimContact(contactIndex)}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อผู้ติดต่อ</label>
                            <input
                              type="text"
                              value={contact.name}
                              onChange={(e) => handleClaimContactChange(contactIndex, 'name', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                              placeholder="ชื่อ..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">แผนก</label>
                            <input
                              type="text"
                              value={contact.department}
                              onChange={(e) => handleClaimContactChange(contactIndex, 'department', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                              placeholder="แผนก..."
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-semibold text-slate-600">เบอร์โทรศัพท์</label>
                            <button
                              type="button"
                              onClick={() => handleAddClaimPhone(contactIndex)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                            >
                              <Plus className="w-3 h-3" /> เพิ่มเบอร์
                            </button>
                          </div>
                          <div className="space-y-2">
                            {contact.phones.map((phone, phoneIndex) => (
                              <div key={phoneIndex} className="flex gap-2">
                                <input
                                  type="text"
                                  value={phone}
                                  onChange={(e) => handleClaimPhoneChange(contactIndex, phoneIndex, e.target.value)}
                                  className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                  placeholder="เบอร์โทร..."
                                />
                                {contact.phones.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveClaimPhone(contactIndex, phoneIndex)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded border border-transparent"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </form>

            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-medium rounded-lg text-sm transition-colors"
                disabled={isSubmitting}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !companyName.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <CheckCircle2 className="w-4 h-4 hidden" />
                )}
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
