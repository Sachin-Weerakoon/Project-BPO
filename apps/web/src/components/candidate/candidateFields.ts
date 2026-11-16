/** Candidate fields proposed from SRS FR-020, FR-021 and FR-022. */
export const candidateFieldGroups = [
  { section: 'Personal & location', fields: ['fullName', 'headline', 'location', 'timezone'] },
  { section: 'Languages', fields: ['languages[].name', 'languages[].proficiency'] },
  { section: 'BPO experience', fields: ['skills[]', 'tools[]', 'processExperience[]', 'experienceYears', 'education'] },
  { section: 'Availability', fields: ['preferredShifts[]'] },
  { section: 'Remote workspace checklist', fields: ['remoteWorkspace.quietSpace', 'remoteWorkspace.internetSpeedMbps', 'remoteWorkspace.headset', 'remoteWorkspace.webcam', 'remoteWorkspace.powerBackup'] },
  { section: 'Resume', fields: ['resumeFileName'] },
] as const;
