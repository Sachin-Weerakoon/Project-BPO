/** Candidate-facing data contract proposal; align with Sathsarani before API integration. */
export type Proficiency = 'basic' | 'intermediate' | 'advanced' | 'native';
export type BpoProcessType = 'voice' | 'non-voice' | 'technical-support' | 'data-entry' | 'content-moderation' | 'healthcare-bpo' | 'finance-bpo' | 'other';
export type ShiftPreference = 'day' | 'night' | 'rotational' | 'weekend' | 'flexible';
export interface CandidateLanguage { name: string; proficiency: Proficiency; }
export interface RemoteWorkspace {
  quietSpace: boolean;
  internetSpeedMbps?: number;
  headset: boolean;
  webcam: boolean;
  powerBackup: boolean;
}
export interface CandidateProfile {
  fullName: string;
  headline?: string;
  location: string;
  timezone: string;
  languages: CandidateLanguage[];
  skills: string[];
  tools: string[];
  processExperience: BpoProcessType[];
  experienceYears?: number;
  education?: string;
  preferredShifts: ShiftPreference[];
  remoteWorkspace: RemoteWorkspace;
  // Actual resume upload/storage belongs to later backend integration.
  resumeFileName?: string;
}
