// app/src/services/templates/library.js
// P3c template studio: the library templates (config in the shared renderer) with the app-only approval gate, the
// ATS result of the five older templates and the collection names.

// P3d: the templates themselves (looks, collections, badges) are in ../../utils/resumeRender.js, shared with the server.
// approved: the owner's design sign-off (P3c): only approved templates show in the app's gallery. App only.
import { LIBRARY as SHARED } from '../../utils/resumeRender';

const APPROVED = { campus: false, first_step: false, fresh_start: false, society_leader: false, project_first: false, internship_ready: false, scholar: false, harvard: false, clean_line: false, two_tone: false };
export const LIBRARY = SHARED.map((t) => ({ ...t, approved: APPROVED[t.id] === true }));

// the five older templates' ATS result (tests/app/resume-ats.test.js; Minimal since its headings went 0.08em -> 0.05em)
export const OLD_BADGES = Object.freeze({ modern_ats: 'safe', stanford: 'safe', jakes: 'safe', faang: 'safe', rezi: 'safe' });
export const approvedLibrary = () => LIBRARY.filter((t) => t.approved === true);

export const COLLECTIONS = Object.freeze({ fresher: 'Fresher & Student', ats: 'ATS Pro' });
