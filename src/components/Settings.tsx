import React, { useState } from 'react';
import { Plus, Trash2, Settings as SettingsIcon, Save, Info } from 'lucide-react';

interface SettingsProps {
  dropdownOptions: {
    id?: string;
    serviceTypes: string[];
    operators: string[];
    salesReps: string[];
    productTypes: string[];
    reportedCategories: string[];
  };
  onSaveOptions: (updatedOptions: any) => Promise<any>;
}

export default function Settings({ dropdownOptions, onSaveOptions }: SettingsProps) {
  const [localOptions, setLocalOptions] = useState({ ...dropdownOptions });
  const [newInputs, setNewInputs] = useState({
    serviceType: '',
    operator: '',
    salesRep: '',
    productType: '',
    reportedCategory: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setLocalOptions({ ...dropdownOptions });
  }, [dropdownOptions]);

  const handleAddOption = (field: keyof typeof dropdownOptions, inputKey: keyof typeof newInputs) => {
    const val = newInputs[inputKey].trim();
    if (!val) return;
    
    // Check duplicates
    if ((localOptions[field] as string[]).includes(val)) {
      alert('มีตัวเลือกนี้ในระบบอยู่แล้ว');
      return;
    }

    const updatedList = [...(localOptions[field] as string[]), val];
    const newOpts = { ...localOptions, [field]: updatedList };
    setLocalOptions(newOpts);
    setNewInputs({ ...newInputs, [inputKey]: '' });
  };

  const handleDeleteOption = (field: keyof typeof dropdownOptions, itemToDelete: string) => {
    if (confirm(`คุณต้องการลบ "${itemToDelete}" ออกจากระบบ? ตัวเลือกนี้จะไม่แสดงในการเพิ่มงานใหม่`)) {
      const updatedList = (localOptions[field] as string[]).filter(item => item !== itemToDelete);
      const newOpts = { ...localOptions, [field]: updatedList };
      setLocalOptions(newOpts);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveOptions(localOptions);
      alert('บันทึกการตั้งค่าตัวเลือกสำเร็จ!');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกตัวเลือก');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3" id="settings-tab">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5">
            <SettingsIcon className="text-blue-600 w-4 h-4" />
            ตั้งค่าตัวเลือกของระบบ (Dropdown Configurations)
          </h2>
          <p className="text-[10px] text-slate-500">จัดการข้อมูลและตัวเลือกที่จะนำไปใช้เป็นทางเลือกในตาราง Onsite, OnCall, การเคลมสินค้า และฐานข้อมูลลูกค้า</p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าทั้งหมด'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex gap-2 text-[11px] text-blue-800 leading-relaxed font-bold">
        <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
        <p>
          คำแนะนำ: การเพิ่มหรือลบตัวเลือกด้านล่าง จะเปลี่ยนข้อมูลตัวเลือกที่แสดงเวลาสร้างหรือแก้ไขฟอร์มเท่านั้น และจะไม่มีผลกระทบต่อรายการเก่าที่เคยบันทึกไปแล้ว หลังจากแก้ไขตัวเลือกเสร็จกรุณากดปุ่ม "บันทึกการตั้งค่าทั้งหมด" เพื่อยืนยันลงฐานข้อมูล Firebase
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        
        {/* 1. Service Types */}
        <div className="bg-white rounded-lg shadow-xs border border-slate-200 p-4 space-y-3">
          <h3 className="font-black text-slate-800 border-b border-slate-150 pb-1.5 text-xs">ประเภทบริการ (Onsite)</h3>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="เพิ่มประเภทบริการใหม่..."
              value={newInputs.serviceType}
              onChange={(e) => setNewInputs({ ...newInputs, serviceType: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleAddOption('serviceTypes', 'serviceType')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2 rounded cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {localOptions.serviceTypes?.map(item => (
              <div key={item} className="flex justify-between items-center bg-slate-50 px-2.5 py-1 rounded border border-slate-100 text-xs">
                <span className="text-slate-700 font-semibold text-[11px]">{item}</span>
                <button onClick={() => handleDeleteOption('serviceTypes', item)} className="text-slate-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Operators */}
        <div className="bg-white rounded-lg shadow-xs border border-slate-200 p-4 space-y-3">
          <h3 className="font-black text-slate-800 border-b border-slate-150 pb-1.5 text-xs">รายชื่อผู้ปฏิบัติงาน / ช่างเทคนิค</h3>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="เพิ่มผู้ปฏิบัติงานใหม่..."
              value={newInputs.operator}
              onChange={(e) => setNewInputs({ ...newInputs, operator: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleAddOption('operators', 'operator')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2 rounded cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {localOptions.operators?.map(item => (
              <div key={item} className="flex justify-between items-center bg-slate-50 px-2.5 py-1 rounded border border-slate-100 text-xs">
                <span className="text-slate-700 font-semibold text-[11px]">{item}</span>
                <button onClick={() => handleDeleteOption('operators', item)} className="text-slate-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Sales Representatives */}
        <div className="bg-white rounded-lg shadow-xs border border-slate-200 p-4 space-y-3">
          <h3 className="font-black text-slate-800 border-b border-slate-150 pb-1.5 text-xs">รายชื่อพนักงานขาย (Sales)</h3>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="เพิ่มพนักงานขายใหม่..."
              value={newInputs.salesRep}
              onChange={(e) => setNewInputs({ ...newInputs, salesRep: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleAddOption('salesReps', 'salesRep')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2 rounded cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {localOptions.salesReps?.map(item => (
              <div key={item} className="flex justify-between items-center bg-slate-50 px-2.5 py-1 rounded border border-slate-100 text-xs">
                <span className="text-slate-700 font-semibold text-[11px]">{item}</span>
                <button onClick={() => handleDeleteOption('salesReps', item)} className="text-slate-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Product Types */}
        <div className="bg-white rounded-lg shadow-xs border border-slate-200 p-4 space-y-3">
          <h3 className="font-black text-slate-800 border-b border-slate-150 pb-1.5 text-xs">บริการ/ประเภทบริการที่เลือก & ประเภทสินค้า</h3>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="เพิ่มบริการหรือประเภทสินค้าใหม่..."
              value={newInputs.productType}
              onChange={(e) => setNewInputs({ ...newInputs, productType: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleAddOption('productTypes', 'productType')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2 rounded cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {localOptions.productTypes?.map(item => (
              <div key={item} className="flex justify-between items-center bg-slate-50 px-2.5 py-1 rounded border border-slate-100 text-xs">
                <span className="text-slate-700 font-semibold text-[11px]">{item}</span>
                <button onClick={() => handleDeleteOption('productTypes', item)} className="text-slate-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Reported Categories */}
        <div className="bg-white rounded-lg shadow-xs border border-slate-200 p-4 space-y-3">
          <h3 className="font-black text-slate-800 border-b border-slate-150 pb-1.5 text-xs">ประเภทสินค้าที่รับแจ้ง (อาการ/ปัญหา)</h3>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="เพิ่มประเภทสินค้าที่รับแจ้งใหม่..."
              value={newInputs.reportedCategory}
              onChange={(e) => setNewInputs({ ...newInputs, reportedCategory: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleAddOption('reportedCategories', 'reportedCategory')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2 rounded cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {localOptions.reportedCategories?.map(item => (
              <div key={item} className="flex justify-between items-center bg-slate-50 px-2.5 py-1 rounded border border-slate-100 text-xs">
                <span className="text-slate-700 font-semibold text-[11px]">{item}</span>
                <button onClick={() => handleDeleteOption('reportedCategories', item)} className="text-slate-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
