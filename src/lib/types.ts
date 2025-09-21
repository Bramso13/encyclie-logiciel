export interface CompanyData {
    siret: string;
    address: string;
    legalForm: string;
    companyName: string;
    creationDate: string;
    directorName: string;
  }
  // Interface simplifiée pour éviter les conflits de types
export type CalculationResult = any;
  
  export interface ActivityShare {
    code: string;
    caSharePercent: number;
  }
  
  export interface FormData {
    VILLE: string;
    CODE_POSTAL: string;
    directorName: string;
    siret: string;
    address: string;
    includePJ: boolean;
    legalForm: string;
    territory: string;
    activities: ActivityShare[];
    companyName: string;
    periodicity: string;
    nombreSalaries: string;
    tradingPercent: string;
    chiffreAffaires: string;
    experienceMetier: string;
    hasQualification: boolean;
    previousRcdStatus: string;
    dateDeffet: string;
    companyCreationDate: string;
    subContractingPercent: string;
    previousResiliationDate?: string;
    lossHistory?: Array<{ year: number; numClaims: number; totalCost: number }>;
  }

  
  
  export interface Quote {
    id: string;
    reference: string;
    status: string;
    companyData: CompanyData;
    formData: FormData;
    product: {
      name: string;
      code: string;
      stepConfig?: any;
      formFields?: any;
    };
    broker?: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
    createdAt: string;
    updatedAt: string;
  }