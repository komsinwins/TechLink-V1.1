export interface CustomerContact {
  name: string;
  detail: string;
  phone: string;
  email: string;
}

export interface Customer {
  id?: string;
  companyName: string;
  address: string;
  contactName: string; // legacy primary
  contactDetail: string; // legacy primary
  contactPhone: string; // legacy primary
  contactEmail: string; // legacy primary
  contacts?: CustomerContact[];
  partnerCompany: string;
  salesRep: string;
  createdAt?: number;
}

export interface ServicePhoto {
  url: string; // Base64 format
  caption: string;
  timestamp: number; // For the 30-day auto-deletion logic
}

export interface OnsiteService {
  id?: string;
  jobNo: string; // e.g. WSS_Service001/26
  customerCompany: string;
  customerAddress: string;
  contactName: string;
  contactDetail: string;
  contactPhone: string;
  contactEmail: string;
  partnerCompany: string;
  referenceDocument?: string;
  serviceType: string;
  serviceLocation: string;
  operator1: string;
  operator2: string;
  salesRep: string;
  receivedDate: string; // YYYY-MM-DD
  startServiceDate: string; // YYYY-MM-DD
  resolutionDate: string; // YYYY-MM-DD
  symptoms: string;
  diagnosis: string;
  cause?: string;
  actionTaken: string;
  remarks: string;
  status: 'Open' | 'In Progress' | 'Pending' | 'Resolved';
  productType?: string; // Product type added in work assignment
  warrantyExpiryDate?: string; // YYYY-MM-DD
  photos: ServicePhoto[]; // Max 4 photos
  signedReportUrl: string; // Base64 file string for customer-signed PDF/report
  signedReportName: string; // Name of the uploaded file
  signedReportFileId?: string; // Google Drive file ID
  operatorSignature?: string; // Base64 drawing
  customerSignature?: string; // Base64 drawing
  jobSheetUrl?: string; // URL for the uploaded job sheet file
  jobSheetName?: string; // Name of the uploaded job sheet file
  jobSheetFileId?: string; // Google Drive file ID for the job sheet
  createdAt?: number;
}

export interface OnCallService {
  id?: string;
  jobNo?: string;
  customerCompany: string;
  contactName: string;
  contactDetail: string;
  contactPhone: string;
  contactEmail: string;
  partnerCompany: string;
  productType: string; // Service product type (customizable dropdown)
  salesRep: string;
  receivedDate: string; // YYYY-MM-DD
  resolutionDate: string; // YYYY-MM-DD
  reportedCategory: string; // Reported product category
  operator: string;
  symptoms: string;
  actionTaken: string;
  remarks: string;
  status: 'Open' | 'In Progress' | 'Pending' | 'Resolved';
  createdAt?: number;
}

export interface ProductClaim {
  id?: string;
  claimNo?: string;
  customerCompany: string;
  customerAddress: string;
  contactName: string;
  contactDetail: string;
  contactPhone: string;
  contactEmail: string;
  partnerCompany: string;
  productType: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string; // YYYY-MM-DD
  warrantyDuration: number; // In months
  claimDestination: string;
  claimBuilding: string;
  claimReceivedDate: string; // YYYY-MM-DD
  claimSentDate: string; // YYYY-MM-DD
  inspector: string;
  claimStatus: 'Claiming' | 'Replaced' | 'Repaired' | 'Returned';
  receivedPhoto: string; // Base64 or Drive URL
  returnedPhoto: string; // Base64 or Drive URL
  claimReportUrl?: string; // Drive URL
  claimReportName?: string;
  inspectorSignature?: string; // Base64 drawing
  customerSignature?: string; // Base64 drawing
  remarks: string;
  createdAt?: number;
}

export interface DropdownOptions {
  id?: string;
  serviceTypes: string[];
  operators: string[];
  salesReps: string[];
  productTypes: string[];
  reportedCategories: string[];
}
