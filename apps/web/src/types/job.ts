import type { BpoProcessType } from './candidate';

/** Display-only shape until the Job API contract is finalized. */
export interface Job {
  id: string;
  title: string;
  companyName: string;
  location: string;
  remote: boolean;
  processType: BpoProcessType;
  requiredLanguages: string[];
  shift: string;
  timezone: string;
  employmentType: 'full-time' | 'part-time' | 'contract';
  salaryLabel?: string;
  postedAtLabel?: string;
  description?: string;
}
