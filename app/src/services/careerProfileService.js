// services/careerProfileService.js (Frontend)
// ============================================================
// Career Intelligence API client for the TDC app.
// All functions work with the backend /api/resume endpoints.
// ============================================================

import api from '../api/api';

/**
 * Get the user's primary resume (isPrimary=true, else most recent).
 * Used on the home screen and job feed to personalise recommendations.
 * @returns {Object} resume document
 */
export const getPrimaryResume = async () => {
  const response = await api.get('/resume/primary');
  return response.data;
};

/**
 * Get the AI-generated career profile for a specific resume.
 * Returns 202 with isEnriched=false if still processing.
 * @param {string} resumeId
 * @returns {{ isEnriched: boolean, data: CareerProfile | null }}
 */
export const getCareerProfile = async (resumeId) => {
  const response = await api.get(`/resume/${resumeId}/career-profile`);
  return response.data;
};

/**
 * Manually trigger AI re-enrichment for a resume.
 * The backend responds immediately (202) and runs the pipeline async.
 * Poll getCareerProfile() to check when isEnriched flips back to true.
 * @param {string} resumeId
 */
export const refreshCareerProfile = async (resumeId) => {
  const response = await api.post(`/resume/${resumeId}/career-profile/refresh`);
  return response.data;
};

/**
 * Update the version tag, notes, or primary status of a resume.
 * Tags: General | Backend | Frontend | AI/ML | Data Science |
 *       DevOps | Mobile | Cybersecurity | Design | Management
 * @param {string} resumeId
 * @param {{ versionTag?, versionNotes?, isPrimary? }} updates
 */
export const updateVersionTag = async (resumeId, updates) => {
  const response = await api.patch(`/resume/${resumeId}/version-tag`, updates);
  return response.data;
};

/**
 * Poll until the career profile is enriched (isEnriched === true).
 * Stops after maxAttempts to avoid infinite loops.
 * @param {string} resumeId
 * @param {number} intervalMs  - How often to poll (default: 3 seconds)
 * @param {number} maxAttempts - Stop after this many polls (default: 10)
 * @returns {Object|null} careerProfile data, or null if timeout
 */
export const waitForCareerProfile = async (resumeId, intervalMs = 3000, maxAttempts = 10) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await getCareerProfile(resumeId);
      if (result.isEnriched && result.data) {
        return result.data;
      }
    } catch (_) {
      // Continue polling on transient errors
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return null; // Timed out — profile not ready yet
};

/**
 * Get a summary card for the user's career profile.
 * Convenience wrapper that resolves primary resume then fetches profile.
 * @returns {{ resume, careerProfile } | null}
 */
export const getCareerSummaryCard = async () => {
  try {
    const primaryRes = await getPrimaryResume();
    if (!primaryRes.success || !primaryRes.data) return null;

    const resume = primaryRes.data;
    const profileRes = await getCareerProfile(resume._id);

    return {
      resume: {
        id: resume._id,
        versionTag: resume.versionTag || 'General',
        isPrimary: resume.isPrimary,
        completionPercentage: resume.completionPercentage,
        name: `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim()
      },
      careerProfile: profileRes.isEnriched ? profileRes.data : null,
      isEnriched: profileRes.isEnriched
    };
  } catch (err) {
    console.warn('[CareerProfile] getCareerSummaryCard error:', err.message);
    return null;
  }
};

export const CAREER_VERSION_TAGS = [
  'General', 'Backend', 'Frontend', 'AI/ML', 'Data Science',
  'DevOps', 'Mobile', 'Cybersecurity', 'Design', 'Management'
];

/**
 * Tailor a resume to a target job description or jobId.
 * Creates a new Resume draft version on success.
 * @param {string} resumeId
 * @param {{ jobId?, jobDescription? }} payload
 */
export const tailorResume = async (resumeId, payload) => {
  const response = await api.post(`/resume/${resumeId}/tailor`, payload, { timeout: 60000 });
  return response.data;
};

/**
 * Get/Download PDF representation of a resume.
 * Returns an ArrayBuffer containing the PDF bytes.
 * @param {string} resumeId
 */
export const downloadResumePDF = async (resumeId) => {
  const response = await api.get(`/resume/${resumeId}/pdf`, {
    responseType: 'arraybuffer'
  });
  return response.data;
};

export default function DummyCareerProfileService() { return null; }

