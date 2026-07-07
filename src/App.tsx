import React, { useState, useEffect } from 'react';
import { 
  collection, doc, onSnapshot, setDoc, getDoc, addDoc, updateDoc, deleteDoc, writeBatch 
} from 'firebase/firestore';
import { db, initAuth, googleSignIn, logout, getAccessToken } from './firebase';
import { OnsiteService, OnCallService, ProductClaim, Customer, DropdownOptions } from './types';
import { User } from 'firebase/auth';

// Import components
import Dashboard from './components/Dashboard';
import OnsiteServiceTab from './components/OnsiteService';
import OnCallServiceTab from './components/OnCallService';
import ProductClaimsTab from './components/ProductClaims';
import CustomerDatabase from './components/CustomerDatabase';
import Settings from './components/Settings';

// Icons
import { 
  Calendar, PhoneCall, PackageOpen, Users, Settings as SettingsIcon, 
  LayoutDashboard, Menu, X, ShieldAlert, CheckCircle2, LogIn, LogOut
} from 'lucide-react';

// Default Dropdown selections
const DEFAULT_OPTIONS: DropdownOptions = {
  serviceTypes: ['Maintenance', 'Installation', 'Troubleshooting', 'Consultation', 'Network Setup', 'Hardware Repair'],
  operators: ['ช่างอนันต์ รักดี', 'ช่างสมชาย ใจบุญ', 'ช่างวีระ ศรีสุข', 'ช่างมนัส แสงทอง'],
  salesReps: ['เซลส์พัชราภรณ์', 'เซลส์ธนพล', 'เซลส์วิชัย', 'เซลส์สุภาวรรณ'],
  productTypes: ['Router/Switch', 'Access Point', 'Firewall', 'CCTV Camera', 'IP Phone', 'Server/Storage', 'UPS'],
  reportedCategories: ['อินเทอร์เน็ตใช้งานไม่ได้', 'อุปกรณ์เปิดไม่ติด', 'สัญญาณ Wi-Fi อ่อน', 'ตั้งค่าอุปกรณ์ใหม่', 'สายแลน/ออปติกชำรุด', 'ระบบล่ม']
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core App states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [onsiteJobs, setOnsiteJobs] = useState<OnsiteService[]>([]);
  const [oncallJobs, setOnCallJobs] = useState<OnCallService[]>([]);
  const [claims, setClaims] = useState<ProductClaim[]>([]);
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOptions>(DEFAULT_OPTIONS);

  // Auth state
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Loader state
  const [isLoading, setIsLoading] = useState(true);
  const [showCleanupToast, setShowCleanupToast] = useState(false);
  const [cleanedPhotosCount, setCleanedPhotosCount] = useState(0);

  // Selected details passing for navigation triggers
  const [selectedOnsiteForView, setSelectedOnsiteForView] = useState<OnsiteService | null>(null);
  const [selectedClaimForView, setSelectedClaimForView] = useState<ProductClaim | null>(null);
  const [selectedOncallForView, setSelectedOncallForView] = useState<OnCallService | null>(null);

  // 1. Setup Firebase Real-time listeners
  useEffect(() => {
    setIsLoading(true);

    const unsubAuth = initAuth(
      (user, token) => {
        setUser(user);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );

    // Customers Listener
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const data: Customer[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Customer);
      });
      setCustomers(data);
    });

    // Onsite Service Jobs Listener
    const unsubOnsite = onSnapshot(collection(db, 'onsiteJobs'), (snapshot) => {
      const data: OnsiteService[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as OnsiteService);
      });
      setOnsiteJobs(data);
    });

    // OnCall Service Jobs Listener
    const unsubOnCall = onSnapshot(collection(db, 'oncallJobs'), (snapshot) => {
      const data: OnCallService[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as OnCallService);
      });
      setOnCallJobs(data);
    });

    // Product Claims Listener
    const unsubClaims = onSnapshot(collection(db, 'claims'), (snapshot) => {
      const data: ProductClaim[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as ProductClaim);
      });
      setClaims(data);
    });

    // System Dropdown settings Listener
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global_options'), (docSnap) => {
      if (docSnap.exists()) {
        setDropdownOptions(docSnap.data() as DropdownOptions);
      } else {
        // Seed default options if settings not created yet
        setDoc(doc(db, 'settings', 'global_options'), DEFAULT_OPTIONS);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Settings load error, using default", err);
      setIsLoading(false);
    });

    return () => {
      unsubAuth();
      unsubCustomers();
      unsubOnsite();
      unsubOnCall();
      unsubClaims();
      unsubSettings();
    };
  }, []);

  // 2. Scan and Auto-purge photos older than 30 days
  useEffect(() => {
    if (onsiteJobs.length > 0) {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      let totalPurged = 0;

      const triggerCleanup = async () => {
        for (const job of onsiteJobs) {
          if (!job.id || !job.photos || job.photos.length === 0) continue;
          
          let jobModified = false;
          const remainingPhotos = job.photos.filter(photo => {
            const age = now - photo.timestamp;
            const isExpired = age > thirtyDaysMs;
            if (isExpired) {
              totalPurged++;
              jobModified = true;
            }
            return !isExpired;
          });

          if (jobModified) {
            const docRef = doc(db, 'onsiteJobs', job.id);
            await updateDoc(docRef, { photos: remainingPhotos });
          }
        }

        if (totalPurged > 0) {
          setCleanedPhotosCount(totalPurged);
          setShowCleanupToast(true);
          setTimeout(() => setShowCleanupToast(false), 8000);
        }
      };

      triggerCleanup();
    }
  }, [onsiteJobs.length]);

  // Firebase Mutator Actions
  // -- Customers --
  const handleAddCustomer = async (cust: Customer) => {
    return await addDoc(collection(db, 'customers'), { ...cust, createdAt: Date.now() });
  };
  const handleUpdateCustomer = async (id: string, cust: Customer) => {
    return await updateDoc(doc(db, 'customers', id), { ...cust });
  };
  const handleDeleteCustomer = async (id: string) => {
    return await deleteDoc(doc(db, 'customers', id));
  };
  const handleImportCustomers = async (customersList: Customer[]) => {
    const batch = writeBatch(db);
    customersList.forEach((cust) => {
      const newRef = doc(collection(db, 'customers'));
      batch.set(newRef, { ...cust, createdAt: Date.now() });
    });
    return await batch.commit();
  };

  // Quick add sales rep custom from Customer inline view
  const handleAddSalesRep = async (name: string) => {
    const updated = { ...dropdownOptions, salesReps: [...dropdownOptions.salesReps, name] };
    return await setDoc(doc(db, 'settings', 'global_options'), updated);
  };
  const handleDeleteSalesRep = async (name: string) => {
    const updated = { ...dropdownOptions, salesReps: dropdownOptions.salesReps.filter(s => s !== name) };
    return await setDoc(doc(db, 'settings', 'global_options'), updated);
  };

  // -- Onsite Service --
  const handleAddOnsite = async (job: OnsiteService) => {
    return await addDoc(collection(db, 'onsiteJobs'), { ...job, createdAt: Date.now() });
  };
  const handleUpdateOnsite = async (id: string, job: OnsiteService) => {
    return await updateDoc(doc(db, 'onsiteJobs', id), { ...job });
  };
  const handleDeleteOnsite = async (id: string) => {
    return await deleteDoc(doc(db, 'onsiteJobs', id));
  };
  const handleImportOnsite = async (jobsList: OnsiteService[]) => {
    const batch = writeBatch(db);
    jobsList.forEach((job) => {
      const newRef = doc(collection(db, 'onsiteJobs'));
      batch.set(newRef, { ...job, createdAt: Date.now() });
    });
    return await batch.commit();
  };

  // -- OnCall Service --
  const handleAddOnCall = async (job: OnCallService) => {
    return await addDoc(collection(db, 'oncallJobs'), { ...job, createdAt: Date.now() });
  };
  const handleUpdateOnCall = async (id: string, job: OnCallService) => {
    return await updateDoc(doc(db, 'oncallJobs', id), { ...job });
  };
  const handleDeleteOnCall = async (id: string) => {
    return await deleteDoc(doc(db, 'oncallJobs', id));
  };
  const handleImportOnCall = async (jobsList: OnCallService[]) => {
    const batch = writeBatch(db);
    jobsList.forEach((job) => {
      const newRef = doc(collection(db, 'oncallJobs'));
      batch.set(newRef, { ...job, createdAt: Date.now() });
    });
    return await batch.commit();
  };

  // -- Product Claims --
  const handleAddClaim = async (claim: ProductClaim) => {
    return await addDoc(collection(db, 'claims'), { ...claim, createdAt: Date.now() });
  };
  const handleUpdateClaim = async (id: string, claim: ProductClaim) => {
    return await updateDoc(doc(db, 'claims', id), { ...claim });
  };
  const handleDeleteClaim = async (id: string) => {
    return await deleteDoc(doc(db, 'claims', id));
  };
  const handleImportClaims = async (claimsList: ProductClaim[]) => {
    const batch = writeBatch(db);
    claimsList.forEach((claim) => {
      const newRef = doc(collection(db, 'claims'));
      batch.set(newRef, { ...claim, createdAt: Date.now() });
    });
    return await batch.commit();
  };

  // -- Settings Options save --
  const handleSaveDropdownOptions = async (updatedOpts: DropdownOptions) => {
    return await setDoc(doc(db, 'settings', 'global_options'), updatedOpts);
  };

  const handleAddDropdownOption = async (key: keyof DropdownOptions, value: string) => {
    if (!value.trim()) return;
    const trimmed = value.trim();
    if (dropdownOptions[key]?.includes(trimmed)) return;
    const currentList = dropdownOptions[key] || [];
    const updated = {
      ...dropdownOptions,
      [key]: [...currentList, trimmed]
    };
    setDropdownOptions(updated);
    await setDoc(doc(db, 'settings', 'global_options'), updated);
  };

  const handleDeleteDropdownOption = async (key: keyof DropdownOptions, value: string) => {
    if (!value) return;
    const currentList = dropdownOptions[key] || [];
    const updated = {
      ...dropdownOptions,
      [key]: currentList.filter(item => item !== value)
    };
    setDropdownOptions(updated);
    await setDoc(doc(db, 'settings', 'global_options'), updated);
  };

  // Auth handlers
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // SLA Warnings calculators for badge counts
  const now = new Date();
  const overdueOnsiteCount = onsiteJobs.filter(job => {
    if (job.status === 'Resolved' || !job.receivedDate) return false;
    const diff = now.getTime() - new Date(job.receivedDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) > 15;
  }).length;

  const overdueOncallCount = oncallJobs.filter(job => {
    if (job.status === 'Resolved' || !job.receivedDate) return false;
    const diff = now.getTime() - new Date(job.receivedDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) > 7;
  }).length;

  const overdueClaimsCount = claims.filter(c => {
    if (c.claimStatus === 'Returned' || !c.claimReceivedDate) return false;
    const diff = now.getTime() - new Date(c.claimReceivedDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) > 30;
  }).length;

  const totalSlaWarningsCount = overdueOnsiteCount + overdueOncallCount + overdueClaimsCount;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-blue-800 font-bold tracking-tight">กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-root">
      {/* 30-day Image Cleanup Success Toast notification */}
      {showCleanupToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white p-4 rounded-xl shadow-lg border border-emerald-500 max-w-sm animate-bounce flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="text-xs">
            <div className="font-bold">สแกนฐานข้อมูลเสร็จสมบูรณ์!</div>
            <div className="mt-1">ลบรูปถ่ายที่หมดอายุ (อายุเกิน 30 วัน) สำเร็จจำนวน <strong>{cleanedPhotosCount} รูปภาพ</strong> เพื่อประหยัดพื้นที่ฐานข้อมูลแล้ว</div>
          </div>
        </div>
      )}

      {/* Main Top Navbar (Bright High Density Blue Theme) */}
      <header className="bg-blue-700 text-white shadow-sm sticky top-0 z-40 border-b border-blue-800">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white text-blue-700 px-1.5 py-0.5 rounded font-black text-xs shadow-xs flex items-center justify-center">
              WSS
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                TechLink V1.1
              </h1>
              <p className="text-[9px] text-blue-100 font-medium">Technical Support Department Tracker</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-blue-800 text-white shadow-inner border border-blue-900/40' : 'hover:bg-blue-600/60 text-blue-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>หน้าหลัก</span>
              {totalSlaWarningsCount > 0 && (
                <span className="bg-red-500 text-white text-[8px] px-1 py-0.2 rounded-full font-black animate-pulse">
                  {totalSlaWarningsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('onsite')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'onsite' ? 'bg-blue-800 text-white shadow-inner border border-blue-900/40' : 'hover:bg-blue-600/60 text-blue-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Onsite Service</span>
              {overdueOnsiteCount > 0 && (
                <span className="bg-red-500 text-white text-[8px] px-1 py-0.2 rounded-full font-black">
                  {overdueOnsiteCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('oncall')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'oncall' ? 'bg-blue-800 text-white shadow-inner border border-blue-900/40' : 'hover:bg-blue-600/60 text-blue-100'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>OnCall Service</span>
              {overdueOncallCount > 0 && (
                <span className="bg-amber-500 text-slate-900 text-[8px] px-1 py-0.2 rounded-full font-black">
                  {overdueOncallCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('claims')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'claims' ? 'bg-blue-800 text-white shadow-inner border border-blue-900/40' : 'hover:bg-blue-600/60 text-blue-100'
              }`}
            >
              <PackageOpen className="w-3.5 h-3.5" />
              <span>เคลมสินค้า</span>
              {overdueClaimsCount > 0 && (
                <span className="bg-purple-500 text-white text-[8px] px-1 py-0.2 rounded-full font-black">
                  {overdueClaimsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'customers' ? 'bg-blue-800 text-white shadow-inner border border-blue-900/40' : 'hover:bg-blue-600/60 text-blue-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>ฐานลูกค้า</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'settings' ? 'bg-blue-800 text-white shadow-inner border border-blue-900/40' : 'hover:bg-blue-600/60 text-blue-100'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>ตั้งค่าตัวเลือก</span>
            </button>

            {user ? (
              <button
                onClick={handleLogout}
                className="px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer hover:bg-blue-600/60 text-blue-100 ml-4 border-l border-blue-600 pl-4"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer hover:bg-blue-600/60 text-blue-100 ml-4 border-l border-blue-600 pl-4"
                title="เข้าสู่ระบบ"
                disabled={isLoggingIn}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isLoggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Google'}</span>
              </button>
            )}
          </nav>

          {/* Mobile Navigation Trigger */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 text-blue-100 hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-blue-800 text-white border-t border-blue-700 shadow-xl py-4 px-2 space-y-1">
          <button
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-bold text-xs flex items-center justify-between ${
              activeTab === 'dashboard' ? 'bg-blue-900' : 'hover:bg-blue-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span>หน้าหลัก</span>
            </div>
            {totalSlaWarningsCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {totalSlaWarningsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('onsite'); setIsMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-bold text-xs flex items-center justify-between ${
              activeTab === 'onsite' ? 'bg-blue-900' : 'hover:bg-blue-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Onsite Service</span>
            </div>
            {overdueOnsiteCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {overdueOnsiteCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('oncall'); setIsMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-bold text-xs flex items-center justify-between ${
              activeTab === 'oncall' ? 'bg-blue-900' : 'hover:bg-blue-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4" />
              <span>OnCall Service</span>
            </div>
            {overdueOncallCount > 0 && (
              <span className="bg-amber-500 text-slate-900 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {overdueOncallCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('claims'); setIsMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-bold text-xs flex items-center justify-between ${
              activeTab === 'claims' ? 'bg-blue-900' : 'hover:bg-blue-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <PackageOpen className="w-4 h-4" />
              <span>เคลมสินค้า</span>
            </div>
            {overdueClaimsCount > 0 && (
              <span className="bg-purple-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {overdueClaimsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('customers'); setIsMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 ${
              activeTab === 'customers' ? 'bg-blue-900' : 'hover:bg-blue-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ฐานลูกค้า</span>
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 ${
              activeTab === 'settings' ? 'bg-blue-900' : 'hover:bg-blue-700'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>ตั้งค่าตัวเลือก</span>
          </button>

          <div className="border-t border-blue-700 my-1 pt-1 mt-2">
            {user ? (
              <button
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 text-blue-200 hover:text-white hover:bg-blue-700"
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากระบบ</span>
              </button>
            ) : (
              <button
                onClick={() => { handleLogin(); setIsMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 text-blue-200 hover:text-white hover:bg-blue-700"
                disabled={isLoggingIn}
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Google'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main body content section with loader container (High Density Width & Padding) */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-2 sm:p-3 lg:p-4">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-gray-500">กำลังเชื่อมต่อฐานข้อมูล Real-time ของ Firebase...</p>
          </div>
        ) : (
          <div className="transition-all duration-300">
            {activeTab === 'dashboard' && (
              <Dashboard 
                onsiteJobs={onsiteJobs}
                oncallJobs={oncallJobs}
                claims={claims}
                customers={customers}
                setActiveTab={setActiveTab}
                setSelectedOnsiteForView={setSelectedOnsiteForView}
                setSelectedClaimForView={setSelectedClaimForView}
              />
            )}

            {activeTab === 'onsite' && (
              <OnsiteServiceTab
                onsiteJobs={onsiteJobs}
                customers={customers}
                serviceTypes={dropdownOptions.serviceTypes}
                operators={dropdownOptions.operators}
                salesReps={dropdownOptions.salesReps}
                productTypes={dropdownOptions.productTypes}
                onAddJob={handleAddOnsite}
                onUpdateJob={handleUpdateOnsite}
                onDeleteJob={handleDeleteOnsite}
                onImportJobs={handleImportOnsite}
                selectedOnsiteForView={selectedOnsiteForView}
                setSelectedOnsiteForView={setSelectedOnsiteForView}
                onAddDropdownOption={handleAddDropdownOption}
                onDeleteDropdownOption={handleDeleteDropdownOption}
              />
            )}

            {activeTab === 'oncall' && (
              <OnCallServiceTab
                oncallJobs={oncallJobs}
                customers={customers}
                productTypes={dropdownOptions.productTypes}
                salesReps={dropdownOptions.salesReps}
                reportedCategories={dropdownOptions.reportedCategories}
                operators={dropdownOptions.operators}
                onAddJob={handleAddOnCall}
                onUpdateJob={handleUpdateOnCall}
                onDeleteJob={handleDeleteOnCall}
                onImportJobs={handleImportOnCall}
                selectedOncallForView={selectedOncallForView}
                setSelectedOncallForView={setSelectedOncallForView}
                onAddDropdownOption={handleAddDropdownOption}
                onDeleteDropdownOption={handleDeleteDropdownOption}
              />
            )}

            {activeTab === 'claims' && (
              <ProductClaimsTab
                claims={claims}
                customers={customers}
                productTypes={dropdownOptions.productTypes}
                operators={dropdownOptions.operators}
                onAddClaim={handleAddClaim}
                onUpdateClaim={handleUpdateClaim}
                onDeleteClaim={handleDeleteClaim}
                onImportClaims={handleImportClaims}
                selectedClaimForView={selectedClaimForView}
                setSelectedClaimForView={setSelectedClaimForView}
                onAddDropdownOption={handleAddDropdownOption}
                onDeleteDropdownOption={handleDeleteDropdownOption}
              />
            )}

            {activeTab === 'customers' && (
              <CustomerDatabase
                customers={customers}
                onsiteJobs={onsiteJobs}
                oncallJobs={oncallJobs}
                claims={claims}
                salesRepOptions={dropdownOptions.salesReps}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onImportCustomers={handleImportCustomers}
                onAddSalesRep={handleAddSalesRep}
                onDeleteSalesRep={handleDeleteSalesRep}
                onViewOnsiteJob={(job) => { setSelectedOnsiteForView(job); setActiveTab('onsite'); }}
                onViewOncallJob={(job) => { setSelectedOncallForView(job); setActiveTab('oncall'); }}
                onViewClaim={(claim) => { setSelectedClaimForView(claim); setActiveTab('claims'); }}
              />
            )}

            {activeTab === 'settings' && (
              <Settings 
                dropdownOptions={dropdownOptions}
                onSaveOptions={handleSaveDropdownOptions}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} WSS_TechLink V.1.1. All Rights Reserved. Technical Support Department.</p>
      </footer>
    </div>
  );
}
