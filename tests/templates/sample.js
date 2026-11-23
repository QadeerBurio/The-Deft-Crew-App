// tests/templates/sample.js — the SAMPLE fresher resume for template previews and tests. A made-up person: the name,
// e-mail, phone, links and "Sample University / Sample College" are clearly sample data, not anyone real.
const D = (y, m = 1) => `${y}-${String(m).padStart(2, "0")}-15T00:00:00.000Z`;

const FRESHER_SAMPLE = {
  settings: { track: "fresher" },
  personalInfo: {
    firstName: "Sara", lastName: "Example", title: "Computer Science student",
    email: "sara.example@example.com", phone: "+92 300 0000000", city: "Karachi",
    linkedin: "linkedin.com/in/sara-example", github: "github.com/sara-example",
  },
  professionalSummary: { summary: "Final-year computer science student who builds mobile apps and runs the robotics club's events. Looking for a software engineering internship." },
  education: [
    { institution: "Sample University", degree: "BS", fieldOfStudy: "Computer Science", startDate: D(2022, 9), endDate: D(2026, 6), grade: "CGPA 3.4/4" },
    { institution: "Sample College", degree: "FSc", fieldOfStudy: "Pre-Engineering", startDate: D(2020, 9), endDate: D(2022, 6), grade: "A grade" },
  ],
  coursework: ["Data Structures", "Databases", "Mobile App Development", "Human-Computer Interaction"],
  projects: [
    { name: "Campus Ride (final-year project)", technologies: ["React Native", "Firebase"], startDate: D(2025, 9), description: "- Built the ride-matching screen and the sign-in\n- Tested it with 40 classmates over two weeks" },
    { name: "Library Seat Finder", technologies: ["Python", "Flask"], startDate: D(2024, 3), description: "- Shows free library seats from a shared sheet, updated every 10 minutes" },
  ],
  activities: [
    { organisation: "Robotics Club", role: "General Secretary", startDate: D(2023, 9), current: true, bullets: ["Organised a two-day robotics workshop for first-year students", "Managed the club's Instagram and event posters"] },
    { organisation: "BSCS 2022 batch", role: "Class Representative", startDate: D(2022, 9), endDate: D(2024, 6), bullets: ["Shared updates with 45 classmates and coordinated with teachers"] },
  ],
  volunteering: [{ organisation: "Campus blood drive", role: "Volunteer", startDate: D(2024, 3), bullets: ["Registered donors and guided them through the drive"] }],
  skills: ["Python", "JavaScript", "React Native", "SQL", "Git", "Figma", "Teamwork", "Public speaking"].map((name) => ({ name })),
  awards: [{ title: "Runner-up, Sample University Hackathon", issuer: "Sample University", date: D(2025, 2), note: "Team of three; built a campus lost-and-found app" }],
  certifications: [{ name: "Google Data Analytics", organization: "Coursera", issueDate: D(2024, 8) }],
  languages: [{ name: "English", proficiency: "Fluent" }, { name: "Urdu", proficiency: "Native" }],
  workExperience: [],
};

module.exports = { FRESHER_SAMPLE };
