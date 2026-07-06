import React from 'react';
import { OnsiteService, OnCallService, ProductClaim, Customer } from '../types';
import { AlertCircle, Calendar, PhoneCall, PackageOpen, Users, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface DashboardProps {
  onsiteJobs: OnsiteService[];
  oncallJobs: OnCallService[];
  claims: ProductClaim[];
  customers: Customer[];
  setActiveTab: (tab: string) => void;
  setSelectedOnsiteForView?: (job: OnsiteService) => void;
  setSelectedClaimForView?: (claim: ProductClaim) => void;
}

export default function Dashboard({
  onsiteJobs,
  oncallJobs,
  claims,
  customers,
  setActiveTab,
  setSelectedOnsiteForView,
  setSelectedClaimForView
}: DashboardProps) {

  // Calculate stats
  const totalOnsite = onsiteJobs.length;
  const totalOncall = oncallJobs.length;
  const totalClaims = claims.length;
  const totalCustomers = customers.length;

  const activeOnsite = onsiteJobs.filter(j => j.status !== 'Resolved').length;
  const activeOncall = oncallJobs.filter(j => j.status !== 'Resolved').length;
  const activeClaims = claims.filter(c => c.claimStatus !== 'Returned').length;

  // Alerts logic
  const now = new Date();

  // Onsite Overdue > 15 days
  const overdueOnsiteJobs = onsiteJobs.filter(job => {
    if (job.status === 'Resolved' || !job.receivedDate) return false;
    const recDate = new Date(job.receivedDate);
    const diffTime = now.getTime() - recDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 15;
  });

  // OnCall Overdue > 7 days
  const overdueOncallJobs = oncallJobs.filter(job => {
    if (job.status === 'Resolved' || !job.receivedDate) return false;
    const recDate = new Date(job.receivedDate);
    const diffTime = now.getTime() - recDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  });

  // Claims Overdue > 30 days
  const overdueClaims = claims.filter(claim => {
    if (claim.claimStatus === 'Returned' || !claim.claimReceivedDate) return false;
    const recDate = new Date(claim.claimReceivedDate);
    const diffTime = now.getTime() - recDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  });

  const totalAlertsCount = overdueOnsiteJobs.length + overdueOncallJobs.length + overdueClaims.length;

  return (
    <div className="space-y-3" id="dashboard-tab">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white rounded-lg p-4 shadow-sm border border-blue-600/30">
        <h2 className="text-lg font-black font-sans tracking-tight">ยินดีต้อนรับสู่ระบบ WSS_TechLink V.1.1</h2>
        <p className="text-blue-100 mt-1 text-xs max-w-3xl font-sans leading-relaxed">
          ศูนย์กลางการจัดการงานสนับสนุนทางเทคนิค แผนก Technical Support สำหรับติดตามงาน Onsite Service, OnCall Service, และสถานะการเคลมสินค้า เชื่อมต่อฐานข้อมูลจริงแบบ Real-time
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Onsite Service */}
        <div 
          onClick={() => setActiveTab('onsite')} 
          className="bg-white p-3.5 rounded-lg shadow-xs border border-slate-200 hover:border-blue-500 cursor-pointer transition-all duration-150"
          id="kpi-onsite"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">Onsite Service</p>
              <h3 className="text-2xl font-black mt-0.5 text-slate-900">{totalOnsite} <span className="text-xs font-medium text-slate-500">งาน</span></h3>
              <p className="text-[10px] text-blue-600 mt-1 font-bold">กำลังดำเนินการ: {activeOnsite} งาน</p>
            </div>
            <div className="bg-blue-50 p-2 rounded text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* OnCall Service */}
        <div 
          onClick={() => setActiveTab('oncall')} 
          className="bg-white p-3.5 rounded-lg shadow-xs border border-slate-200 hover:border-blue-500 cursor-pointer transition-all duration-150"
          id="kpi-oncall"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">OnCall Service</p>
              <h3 className="text-2xl font-black mt-0.5 text-slate-900">{totalOncall} <span className="text-xs font-medium text-slate-500">งาน</span></h3>
              <p className="text-[10px] text-indigo-600 mt-1 font-bold">กำลังดำเนินการ: {activeOncall} งาน</p>
            </div>
            <div className="bg-indigo-50 p-2 rounded text-indigo-600">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Product Claim */}
        <div 
          onClick={() => setActiveTab('claims')} 
          className="bg-white p-3.5 rounded-lg shadow-xs border border-slate-200 hover:border-blue-500 cursor-pointer transition-all duration-150"
          id="kpi-claims"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">เคลมสินค้า</p>
              <h3 className="text-2xl font-black mt-0.5 text-slate-900">{totalClaims} <span className="text-xs font-medium text-slate-500">รายการ</span></h3>
              <p className="text-[10px] text-amber-600 mt-1 font-bold">อยู่ระหว่างเคลม: {activeClaims} รายการ</p>
            </div>
            <div className="bg-amber-50 p-2 rounded text-amber-600">
              <PackageOpen className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Customers */}
        <div 
          onClick={() => setActiveTab('customers')} 
          className="bg-white p-3.5 rounded-lg shadow-xs border border-slate-200 hover:border-blue-500 cursor-pointer transition-all duration-150"
          id="kpi-customers"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">ฐานข้อมูลลูกค้า</p>
              <h3 className="text-2xl font-black mt-0.5 text-slate-900">{totalCustomers} <span className="text-xs font-medium text-slate-500">บริษัท</span></h3>
              <p className="text-[10px] text-emerald-600 mt-1 font-bold">ประวัติบันทึกสมบูรณ์</p>
            </div>
            <div className="bg-emerald-50 p-2 rounded text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Critical Exceeded Deadlines Alerts Dashboard Section */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-black text-slate-900">
              แจ้งเตือนรายการงานที่เกินกำหนดเวลา ({totalAlertsCount} รายการ)
            </h3>
          </div>
          {totalAlertsCount > 0 && (
            <span className="bg-red-50 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-red-200 animate-pulse">
              ต้องตรวจสอบด่วน
            </span>
          )}
        </div>

        {totalAlertsCount === 0 ? (
          <div className="py-6 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
            <p className="text-xs">ยอดเยี่ยม! ไม่มีงานหรือการเคลมใดที่เกินกำหนดเวลา</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {/* Onsite Overdue (>15 days) */}
            {overdueOnsiteJobs.length > 0 && (
              <div className="border border-red-100 bg-red-50/20 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span>งาน Onsite Service ที่ยังไม่ปิด เกิน 15 วัน ({overdueOnsiteJobs.length} งาน)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-red-100 text-[11px]">
                    <thead>
                      <tr className="text-left text-red-800">
                        <th className="py-1 px-1.5 font-bold">เลขที่ใบงาน</th>
                        <th className="py-1 px-1.5 font-bold">ชื่อลูกค้า</th>
                        <th className="py-1 px-1.5 font-bold">วันที่รับแจ้ง</th>
                        <th className="py-1 px-1.5 font-bold">พนักงานขาย</th>
                        <th className="py-1 px-1.5 font-bold">จำนวนวันเลยกำหนด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50">
                      {overdueOnsiteJobs.map(job => {
                        const recDate = new Date(job.receivedDate);
                        const diffDays = Math.floor((now.getTime() - recDate.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={job.id} className="hover:bg-red-50/40">
                            <td className="py-1 px-1.5 font-mono font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => { setSelectedOnsiteForView?.(job); setActiveTab('onsite'); }}>{job.jobNo}</td>
                            <td className="py-1 px-1.5 text-slate-700 font-medium">{job.customerCompany}</td>
                            <td className="py-1 px-1.5 text-slate-600">{job.receivedDate}</td>
                            <td className="py-1 px-1.5 text-slate-600">{job.salesRep}</td>
                            <td className="py-1 px-1.5 text-red-600 font-black">{diffDays} วัน</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* OnCall Overdue (>7 days) */}
            {overdueOncallJobs.length > 0 && (
              <div className="border border-amber-100 bg-amber-50/20 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>งาน OnCall Service ที่ยังไม่ปิด เกิน 7 วัน ({overdueOncallJobs.length} งาน)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-100 text-[11px]">
                    <thead>
                      <tr className="text-left text-amber-800">
                        <th className="py-1 px-1.5 font-bold">ลูกค้า</th>
                        <th className="py-1 px-1.5 font-bold">ผู้ติดต่อ</th>
                        <th className="py-1 px-1.5 font-bold">วันที่รับแจ้ง</th>
                        <th className="py-1 px-1.5 font-bold">อาการ</th>
                        <th className="py-1 px-1.5 font-bold">จำนวนวันเลยกำหนด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-50">
                      {overdueOncallJobs.map(job => {
                        const recDate = new Date(job.receivedDate);
                        const diffDays = Math.floor((now.getTime() - recDate.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={job.id} className="hover:bg-amber-50/40">
                            <td className="py-1 px-1.5 text-slate-700 font-medium">{job.customerCompany}</td>
                            <td className="py-1 px-1.5 text-slate-600">{job.contactName}</td>
                            <td className="py-1 px-1.5 text-slate-600">{job.receivedDate}</td>
                            <td className="py-1 px-1.5 text-slate-500 truncate max-w-xs">{job.symptoms}</td>
                            <td className="py-1 px-1.5 text-amber-700 font-black">{diffDays} วัน</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Claims Overdue (>30 days) */}
            {overdueClaims.length > 0 && (
              <div className="border border-purple-100 bg-purple-50/20 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-purple-800 font-bold text-xs mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-purple-500" />
                  <span>สินค้าเคลมค้างส่งมอบ เกิน 30 วัน ({overdueClaims.length} รายการ)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-purple-100 text-[11px]">
                    <thead>
                      <tr className="text-left text-purple-800">
                        <th className="py-1 px-1.5 font-bold">บริษัทลูกค้า</th>
                        <th className="py-1 px-1.5 font-bold">สินค้า / รุ่น</th>
                        <th className="py-1 px-1.5 font-bold">วันที่รับเคลม</th>
                        <th className="py-1 px-1.5 font-bold">สถานที่เคลม</th>
                        <th className="py-1 px-1.5 font-bold">จำนวนวันเลยกำหนด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50">
                      {overdueClaims.map(claim => {
                        const recDate = new Date(claim.claimReceivedDate);
                        const diffDays = Math.floor((now.getTime() - recDate.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={claim.id} className="hover:bg-purple-50/40">
                            <td className="py-1 px-1.5 text-slate-700 font-medium cursor-pointer hover:underline" onClick={() => { setSelectedClaimForView?.(claim); setActiveTab('claims'); }}>{claim.customerCompany}</td>
                            <td className="py-1 px-1.5 text-slate-600">{claim.brand} - {claim.model} ({claim.serialNumber})</td>
                            <td className="py-1 px-1.5 text-slate-600">{claim.claimReceivedDate}</td>
                            <td className="py-1 px-1.5 text-slate-500">{claim.claimDestination}</td>
                            <td className="py-1 px-1.5 text-purple-700 font-black">{diffDays} วัน</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tech Support Operating Hours and Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h4 className="font-black text-slate-900 border-b border-slate-100 pb-2 mb-2 flex items-center gap-2 text-xs">
            <Clock className="w-4 h-4 text-blue-600" />
            ข้อมูลการซ่อมบำรุงและเครือข่าย
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-600">
            <li className="flex justify-between items-center">
              <span>อีเมลหลักของฝ่ายบริการ:</span>
              <span className="font-bold text-blue-600">wssservice.wins@gmail.com</span>
            </li>
            <li className="flex justify-between items-center">
              <span>เบอร์โทรติดต่อด่วน:</span>
              <span className="font-bold text-blue-600">085-502-9624</span>
            </li>
            <li className="flex justify-between items-center">
              <span>มาตรฐานการให้บริการ (SLA):</span>
              <span className="text-slate-950 font-medium">Onsite (15 วัน) / OnCall (7 วัน) / เคลม (30 วัน)</span>
            </li>
          </ul>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex flex-col justify-between">
          <div>
            <h4 className="font-black text-slate-900 border-b border-slate-100 pb-2 mb-2 text-xs">
              ระบบตรวจสอบประวัติแบบเชื่อมโยง
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              WSS_TechLink เชื่อมประสานประวัติงานซ่อมและสินค้าเคลมทั้งหมดเข้ากับฐานข้อมูลลูกค้าโดยอัตโนมัติ คุณสามารถดูประวัติการเคลมและประวัติงานของลูกค้ารายนั้น ๆ ได้อย่างรวดเร็วในหน้า "ฐานข้อมูลลูกค้า"
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('customers')} 
            className="mt-3 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors self-start cursor-pointer"
          >
            ดูข้อมูลบริษัทลูกค้าทั้งหมด &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
