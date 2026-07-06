// services/resumeTemplateService.js

export const renderResumeHTML = (resume, templateId) => {
  const templates = {
    modern: renderModernTemplate,
    classic: renderClassicTemplate,
    creative: renderCreativeTemplate,
    minimal: renderMinimalTemplate,
    professional: renderProfessionalTemplate
  };

  const renderer = templates[templateId] || renderModernTemplate;
  return renderer(resume);
};

// Format date helper
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Format date range
const formatDateRange = (startDate, endDate, current) => {
  const start = startDate ? formatDate(startDate) : '';
  const end = current ? 'Present' : (endDate ? formatDate(endDate) : '');
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  return '';
};

// ==================== MODERN TEMPLATE ====================
const renderModernTemplate = (resume) => {
  const { personalInfo, professionalSummary, education, workExperience, skills, certifications, projects, languages, targetJobs, targetJob } = resume;
  const jobs = targetJobs && targetJobs.length > 0 ? targetJobs : (targetJob ? [targetJob] : []);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''} - Resume</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f5f7fa;
          padding: 40px 20px;
          color: #2c3e50;
          line-height: 1.6;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 15px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .header {
          background: #2c3e50;
          padding: 35px 45px;
          color: #ffffff;
        }
        .header h1 {
          font-size: 30px;
          font-weight: 700;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .header .title {
          font-size: 17px;
          opacity: 0.9;
          margin-bottom: 10px;
          font-weight: 300;
        }
        .header .contact {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 20px;
          font-size: 13px;
          opacity: 0.92;
        }
        .header .contact a {
          color: #ffffff;
          text-decoration: none;
        }
        .header .contact a:hover {
          text-decoration: underline;
        }
        .header .contact span {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .body {
          padding: 35px 45px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section:last-child {
          margin-bottom: 0;
        }
        .section-title {
          font-size: 17px;
          font-weight: 700;
          color: #2c3e50;
          border-bottom: 2px solid #2c3e50;
          padding-bottom: 6px;
          margin-bottom: 14px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .item {
          margin-bottom: 16px;
        }
        .item:last-child {
          margin-bottom: 0;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .item-title {
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
        }
        .item-subtitle {
          font-size: 14px;
          color: #555;
          margin: 2px 0;
        }
        .item-date {
          font-size: 13px;
          color: #888;
          font-weight: 500;
          white-space: nowrap;
        }
        .item-description {
          font-size: 14px;
          color: #444;
          line-height: 1.7;
          margin-top: 4px;
          white-space: pre-wrap;
        }
        .item-location {
          font-size: 13px;
          color: #888;
          margin-top: 2px;
        }
        .skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .skill-tag {
          background: #f0f2f5;
          padding: 4px 16px;
          border-radius: 4px;
          font-size: 13px;
          color: #2c3e50;
        }
        .skill-tag.expert { background: #2c3e50; color: #fff; }
        .skill-tag.advanced { background: #555; color: #fff; }
        .skill-tag.intermediate { background: #888; color: #fff; }
        .skill-tag.beginner { background: #e8ecf1; color: #2c3e50; }
        .target-job {
          background: #f8f9fa;
          padding: 14px 18px;
          border-radius: 4px;
          border-left: 3px solid #2c3e50;
          margin-bottom: 10px;
        }
        .target-job:last-child { margin-bottom: 0; }
        .target-job-title {
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
        }
        .target-job-detail {
          font-size: 14px;
          color: #555;
          margin-top: 3px;
        }
        .target-job-badge {
          display: inline-block;
          background: #2c3e50;
          color: #fff;
          padding: 2px 12px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: 500;
          margin-top: 4px;
        }
        .language-item {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .language-item:last-child { border-bottom: none; }
        .language-name { font-weight: 500; color: #2c3e50; }
        .language-proficiency { color: #666; }
        .cert-item { margin-bottom: 10px; }
        .cert-item:last-child { margin-bottom: 0; }
        .cert-name { font-weight: 600; color: #2c3e50; }
        .cert-org { color: #555; font-size: 14px; }
        .cert-date { color: #999; font-size: 13px; }
        .project-item { margin-bottom: 14px; }
        .project-item:last-child { margin-bottom: 0; }
        .project-name { font-weight: 600; color: #2c3e50; }
        .project-tech { color: #555; font-size: 13px; }
        .project-desc { font-size: 14px; color: #444; margin-top: 3px; }
        .project-link { color: #2c3e50; text-decoration: none; font-size: 13px; }
        .project-link:hover { text-decoration: underline; }
        @media print {
          body { background: #fff; padding: 0; }
          .container { box-shadow: none; border-radius: 0; }
        }
        @media (max-width: 600px) {
          body { padding: 20px 10px; }
          .header { padding: 25px 20px; }
          .body { padding: 20px; }
          .header h1 { font-size: 24px; }
          .header .contact { gap: 8px 14px; font-size: 12px; }
          .item-header { flex-direction: column; }
          .item-date { margin-top: 2px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</h1>
          ${professionalSummary?.title ? `<div class="title">${professionalSummary.title}</div>` : ''}
          <div class="contact">
            ${personalInfo?.email ? `<a href="mailto:${personalInfo.email}">📧 ${personalInfo.email}</a>` : ''}
            ${personalInfo?.phone ? `<span>📱 ${personalInfo.phone}</span>` : ''}
            ${personalInfo?.linkedin ? `<a href="${personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : 'https://' + personalInfo.linkedin}" target="_blank">🔗 LinkedIn</a>` : ''}
            ${personalInfo?.github ? `<a href="${personalInfo.github.startsWith('http') ? personalInfo.github : 'https://' + personalInfo.github}" target="_blank">🐙 GitHub</a>` : ''}
            ${personalInfo?.portfolio ? `<a href="${personalInfo.portfolio.startsWith('http') ? personalInfo.portfolio : 'https://' + personalInfo.portfolio}" target="_blank">🌐 Portfolio</a>` : ''}
            ${personalInfo?.address ? `<span>📍 ${personalInfo.address}${personalInfo.city ? ', ' + personalInfo.city : ''}${personalInfo.state ? ', ' + personalInfo.state : ''}</span>` : ''}
          </div>
        </div>
        <div class="body">
          ${professionalSummary?.summary ? `
          <div class="section">
            <div class="section-title">Professional Summary</div>
            <div class="section-content">
              <p style="font-size: 14px; line-height: 1.8; color: #444;">${professionalSummary.summary}</p>
              ${professionalSummary.experienceLevel ? `<p style="font-size: 13px; color: #888; margin-top: 4px;"><strong>Experience Level:</strong> ${professionalSummary.experienceLevel}</p>` : ''}
            </div>
          </div>` : ''}

          ${education && education.length > 0 ? `
          <div class="section">
            <div class="section-title">Education</div>
            <div class="section-content">
              ${education.map(edu => `
                <div class="item">
                  <div class="item-header">
                    <div>
                      <div class="item-title">${edu.degree}${edu.fieldOfStudy ? ' in ' + edu.fieldOfStudy : ''}</div>
                      <div class="item-subtitle">${edu.institution}</div>
                    </div>
                    <div class="item-date">${formatDateRange(edu.startDate, edu.endDate, edu.current)}</div>
                  </div>
                  ${edu.gpa ? `<div style="font-size: 13px; color: #888; margin-top: 2px;">GPA: ${edu.gpa}</div>` : ''}
                  ${edu.description ? `<div class="item-description">${edu.description}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>` : ''}

          ${workExperience && workExperience.length > 0 ? `
          <div class="section">
            <div class="section-title">Work Experience</div>
            <div class="section-content">
              ${workExperience.map(work => `
                <div class="item">
                  <div class="item-header">
                    <div>
                      <div class="item-title">${work.position}</div>
                      <div class="item-subtitle">${work.company}</div>
                      ${work.location ? `<div class="item-location">📍 ${work.location}</div>` : ''}
                    </div>
                    <div class="item-date">${formatDateRange(work.startDate, work.endDate, work.current)}</div>
                  </div>
                  ${work.description ? `<div class="item-description">${work.description}</div>` : ''}
                  ${work.achievements && work.achievements.length > 0 ? `
                    <ul style="margin-top: 6px; padding-left: 20px; list-style-type: disc;">
                      ${work.achievements.map(a => `<li style="font-size: 14px; color: #444; line-height: 1.6;">${a}</li>`).join('')}
                    </ul>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>` : ''}

          ${skills && skills.length > 0 ? `
          <div class="section">
            <div class="section-title">Skills</div>
            <div class="section-content">
              <div class="skills-container">
                ${skills.map(skill => `
                  <span class="skill-tag ${skill.level?.toLowerCase() || 'intermediate'}">${skill.name}</span>
                `).join('')}
              </div>
            </div>
          </div>` : ''}

          ${certifications && certifications.length > 0 ? `
          <div class="section">
            <div class="section-title">Certifications</div>
            <div class="section-content">
              ${certifications.map(cert => `
                <div class="cert-item">
                  <div class="cert-name">${cert.name}</div>
                  <div class="cert-org">${cert.organization}</div>
                  <div class="cert-date">${cert.issueDate ? 'Issued: ' + formatDate(cert.issueDate) : ''}${cert.expiryDate ? ' | Expires: ' + formatDate(cert.expiryDate) : ''}</div>
                </div>
              `).join('')}
            </div>
          </div>` : ''}

          ${projects && projects.length > 0 ? `
          <div class="section">
            <div class="section-title">Projects</div>
            <div class="section-content">
              ${projects.map(project => `
                <div class="project-item">
                  <div class="project-name">${project.name}</div>
                  ${project.technologies && project.technologies.length > 0 ? `<div class="project-tech">🛠️ ${project.technologies.join(', ')}</div>` : ''}
                  <div class="item-date">${formatDateRange(project.startDate, project.endDate, false)}</div>
                  ${project.description ? `<div class="project-desc">${project.description}</div>` : ''}
                  ${project.url ? `<a href="${project.url}" target="_blank" class="project-link">🔗 ${project.url}</a>` : ''}
                  ${project.githubUrl ? `<a href="${project.githubUrl}" target="_blank" class="project-link">🐙 ${project.githubUrl}</a>` : ''}
                </div>
              `).join('')}
            </div>
          </div>` : ''}

          ${languages && languages.length > 0 ? `
          <div class="section">
            <div class="section-title">Languages</div>
            <div class="section-content">
              ${languages.map(lang => `
                <div class="language-item">
                  <span class="language-name">${lang.name}</span>
                  <span class="language-proficiency">${lang.proficiency}</span>
                </div>
              `).join('')}
            </div>
          </div>` : ''}

          ${jobs && jobs.length > 0 ? `
          <div class="section">
            <div class="section-title">Target Jobs</div>
            <div class="section-content">
              ${jobs.map(job => `
                <div class="target-job">
                  <div class="target-job-title">${job.jobTitle}</div>
                  ${job.industry ? `<div class="target-job-detail">🏢 ${job.industry}</div>` : ''}
                  ${job.location ? `<div class="target-job-detail">📍 ${job.location}</div>` : ''}
                  ${job.jobType ? `<span class="target-job-badge">${job.jobType}</span>` : ''}
                  ${job.desiredSalary ? `<div class="target-job-detail">💰 ${job.desiredSalary}</div>` : ''}
                  ${job.availability ? `<div class="target-job-detail">📅 ${job.availability}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
};

// ==================== CLASSIC TEMPLATE ====================
const renderClassicTemplate = (resume) => {
  const { personalInfo, professionalSummary, education, workExperience, skills, certifications, projects, languages, targetJobs, targetJob } = resume;
  const jobs = targetJobs && targetJobs.length > 0 ? targetJobs : (targetJob ? [targetJob] : []);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''} - Resume</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Times New Roman', Times, serif;
          background: #f5f5f5;
          padding: 40px 20px;
          color: #2c3e50;
          line-height: 1.6;
        }
        .container {
          max-width: 850px;
          margin: 0 auto;
          background: #ffffff;
          padding: 50px 55px;
          box-shadow: 0 2px 15px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #2c3e50;
          padding-bottom: 16px;
          margin-bottom: 22px;
        }
        .header h1 {
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 2px;
          margin-bottom: 4px;
          color: #2c3e50;
        }
        .header .title {
          font-size: 16px;
          color: #555;
          margin-bottom: 8px;
        }
        .header .contact {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px 18px;
          font-size: 13px;
          color: #666;
        }
        .header .contact a {
          color: #2c3e50;
          text-decoration: none;
        }
        .header .contact a:hover {
          text-decoration: underline;
        }
        .section {
          margin-bottom: 18px;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 4px;
          margin-bottom: 10px;
          color: #2c3e50;
        }
        .item {
          margin-bottom: 12px;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .item-title {
          font-size: 15px;
          font-weight: bold;
          color: #2c3e50;
        }
        .item-subtitle {
          font-size: 14px;
          font-style: italic;
          color: #555;
        }
        .item-date {
          font-size: 13px;
          color: #777;
          white-space: nowrap;
        }
        .item-description {
          font-size: 13px;
          color: #444;
          line-height: 1.6;
          margin-top: 3px;
          white-space: pre-wrap;
        }
        .skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .skill-tag {
          background: #f0f2f5;
          padding: 2px 14px;
          border-radius: 2px;
          font-size: 13px;
          color: #2c3e50;
        }
        .target-job {
          background: #f8f9fa;
          padding: 12px 16px;
          margin-bottom: 8px;
          border-left: 3px solid #2c3e50;
        }
        .target-job:last-child { margin-bottom: 0; }
        .target-job-title { font-weight: bold; font-size: 15px; }
        .language-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .language-item:last-child { border-bottom: none; }
        .project-item { margin-bottom: 10px; }
        .project-name { font-weight: bold; }
        .project-tech { color: #555; font-style: italic; font-size: 13px; }
        .cert-item { margin-bottom: 8px; }
        .cert-name { font-weight: bold; }
        .cert-org { color: #555; }
        @media print { body { background: #fff; padding: 0; } .container { box-shadow: none; } }
        @media (max-width: 600px) { body { padding: 20px 10px; } .container { padding: 30px 20px; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</h1>
          ${professionalSummary?.title ? `<div class="title">${professionalSummary.title}</div>` : ''}
          <div class="contact">
            ${personalInfo?.email ? `<a href="mailto:${personalInfo.email}">${personalInfo.email}</a>` : ''}
            ${personalInfo?.phone ? `<span>${personalInfo.phone}</span>` : ''}
            ${personalInfo?.linkedin ? `<a href="${personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : 'https://' + personalInfo.linkedin}" target="_blank">LinkedIn</a>` : ''}
            ${personalInfo?.github ? `<a href="${personalInfo.github.startsWith('http') ? personalInfo.github : 'https://' + personalInfo.github}" target="_blank">GitHub</a>` : ''}
          </div>
        </div>

        ${professionalSummary?.summary ? `
        <div class="section">
          <div class="section-title">Professional Summary</div>
          <p style="font-size: 13px; line-height: 1.8; color: #444;">${professionalSummary.summary}</p>
        </div>` : ''}

        ${education && education.length > 0 ? `
        <div class="section">
          <div class="section-title">Education</div>
          ${education.map(edu => `
            <div class="item">
              <div class="item-header">
                <span class="item-title">${edu.degree}${edu.fieldOfStudy ? ' in ' + edu.fieldOfStudy : ''}</span>
                <span class="item-date">${formatDateRange(edu.startDate, edu.endDate, edu.current)}</span>
              </div>
              <div class="item-subtitle">${edu.institution}</div>
              ${edu.gpa ? `<div style="font-size: 13px; color: #666;">GPA: ${edu.gpa}</div>` : ''}
              ${edu.description ? `<div class="item-description">${edu.description}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}

        ${workExperience && workExperience.length > 0 ? `
        <div class="section">
          <div class="section-title">Work Experience</div>
          ${workExperience.map(work => `
            <div class="item">
              <div class="item-header">
                <span class="item-title">${work.position}</span>
                <span class="item-date">${formatDateRange(work.startDate, work.endDate, work.current)}</span>
              </div>
              <div class="item-subtitle">${work.company}${work.location ? ', ' + work.location : ''}</div>
              ${work.description ? `<div class="item-description">${work.description}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}

        ${skills && skills.length > 0 ? `
        <div class="section">
          <div class="section-title">Skills</div>
          <div class="skills-container">
            ${skills.map(skill => `<span class="skill-tag">${skill.name}</span>`).join('')}
          </div>
        </div>` : ''}

        ${certifications && certifications.length > 0 ? `
        <div class="section">
          <div class="section-title">Certifications</div>
          ${certifications.map(cert => `
            <div class="cert-item">
              <div class="cert-name">${cert.name}</div>
              <div class="cert-org">${cert.organization}</div>
              <div style="font-size: 12px; color: #999;">${cert.issueDate ? 'Issued: ' + formatDate(cert.issueDate) : ''}</div>
            </div>
          `).join('')}
        </div>` : ''}

        ${projects && projects.length > 0 ? `
        <div class="section">
          <div class="section-title">Projects</div>
          ${projects.map(project => `
            <div class="project-item">
              <div class="project-name">${project.name}</div>
              ${project.technologies && project.technologies.length > 0 ? `<div class="project-tech">Technologies: ${project.technologies.join(', ')}</div>` : ''}
              ${project.description ? `<div class="item-description">${project.description}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}

        ${languages && languages.length > 0 ? `
        <div class="section">
          <div class="section-title">Languages</div>
          ${languages.map(lang => `
            <div class="language-item">
              <span>${lang.name}</span>
              <span>${lang.proficiency}</span>
            </div>
          `).join('')}
        </div>` : ''}

        ${jobs && jobs.length > 0 ? `
        <div class="section">
          <div class="section-title">Target Jobs</div>
          ${jobs.map(job => `
            <div class="target-job">
              <div class="target-job-title">${job.jobTitle}</div>
              <div>${job.industry || ''}${job.jobType ? ' • ' + job.jobType : ''}</div>
              ${job.location ? `<div>📍 ${job.location}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    </body>
    </html>
  `;
};

// ==================== CREATIVE TEMPLATE ====================
const renderCreativeTemplate = (resume) => {
  const { personalInfo, professionalSummary, education, workExperience, skills, certifications, projects, languages, targetJobs, targetJob } = resume;
  const jobs = targetJobs && targetJobs.length > 0 ? targetJobs : (targetJob ? [targetJob] : []);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''} - Resume</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Georgia', 'Times New Roman', serif;
          background: #f8f5f0;
          padding: 40px 20px;
          color: #2c3e50;
          line-height: 1.6;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 30px rgba(0,0,0,0.08);
          overflow: hidden;
          border: 2px solid #2c3e50;
        }
        .header {
          background: #2c3e50;
          padding: 35px 45px;
          color: #ffffff;
          text-align: center;
          border-bottom: 4px solid #555;
        }
        .header h1 {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 3px;
          margin-bottom: 4px;
        }
        .header .title {
          font-size: 18px;
          opacity: 0.9;
          margin-bottom: 10px;
          font-weight: 300;
        }
        .header .contact {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 14px 22px;
          font-size: 14px;
        }
        .header .contact a {
          color: #ffffff;
          text-decoration: none;
        }
        .header .contact a:hover {
          text-decoration: underline;
        }
        .body {
          padding: 35px 45px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #2c3e50;
          border-left: 4px solid #2c3e50;
          padding-left: 12px;
          margin-bottom: 14px;
        }
        .item {
          margin-bottom: 14px;
          padding-left: 16px;
          border-left: 2px solid #eee;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .item-title {
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
        }
        .item-subtitle {
          font-size: 14px;
          color: #555;
        }
        .item-date {
          font-size: 13px;
          color: #888;
        }
        .item-description {
          font-size: 14px;
          color: #444;
          line-height: 1.6;
          margin-top: 4px;
          white-space: pre-wrap;
        }
        .skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .skill-tag {
          background: #f0f2f5;
          padding: 5px 18px;
          border-radius: 4px;
          font-size: 13px;
          color: #2c3e50;
          border: 1px solid #ddd;
        }
        .target-job {
          background: #f8f9fa;
          padding: 14px 18px;
          border-radius: 8px;
          border-left: 4px solid #2c3e50;
          margin-bottom: 10px;
        }
        .target-job:last-child { margin-bottom: 0; }
        .target-job-title { font-size: 16px; font-weight: 600; color: #2c3e50; }
        .language-item {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid #eee;
        }
        .language-item:last-child { border-bottom: none; }
        .project-item { margin-bottom: 12px; padding-left: 16px; border-left: 2px solid #eee; }
        .project-name { font-weight: 600; color: #2c3e50; }
        .project-tech { color: #555; font-size: 13px; }
        .cert-item { margin-bottom: 8px; }
        .cert-name { font-weight: 600; color: #2c3e50; }
        .cert-org { color: #555; }
        @media print { body { background: #fff; padding: 0; } }
        @media (max-width: 600px) { body { padding: 20px 10px; } .header { padding: 25px 20px; } .body { padding: 20px; } .header h1 { font-size: 26px; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</h1>
          ${professionalSummary?.title ? `<div class="title">${professionalSummary.title}</div>` : ''}
          <div class="contact">
            ${personalInfo?.email ? `<a href="mailto:${personalInfo.email}">✉️ ${personalInfo.email}</a>` : ''}
            ${personalInfo?.phone ? `<span>📱 ${personalInfo.phone}</span>` : ''}
            ${personalInfo?.linkedin ? `<a href="${personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : 'https://' + personalInfo.linkedin}" target="_blank">🔗 LinkedIn</a>` : ''}
            ${personalInfo?.github ? `<a href="${personalInfo.github.startsWith('http') ? personalInfo.github : 'https://' + personalInfo.github}" target="_blank">🐙 GitHub</a>` : ''}
          </div>
        </div>
        <div class="body">
          ${professionalSummary?.summary ? `
          <div class="section">
            <div class="section-title">About Me</div>
            <p style="font-size: 14px; line-height: 1.8; color: #444;">${professionalSummary.summary}</p>
          </div>` : ''}

          ${education && education.length > 0 ? `
          <div class="section">
            <div class="section-title">Education</div>
            ${education.map(edu => `
              <div class="item">
                <div class="item-header">
                  <div class="item-title">${edu.degree}${edu.fieldOfStudy ? ' in ' + edu.fieldOfStudy : ''}</div>
                  <div class="item-date">${formatDateRange(edu.startDate, edu.endDate, edu.current)}</div>
                </div>
                <div class="item-subtitle">${edu.institution}</div>
                ${edu.gpa ? `<div style="font-size: 13px; color: #666;">GPA: ${edu.gpa}</div>` : ''}
              </div>
            `).join('')}
          </div>` : ''}

          ${workExperience && workExperience.length > 0 ? `
          <div class="section">
            <div class="section-title">Experience</div>
            ${workExperience.map(work => `
              <div class="item">
                <div class="item-header">
                  <div class="item-title">${work.position}</div>
                  <div class="item-date">${formatDateRange(work.startDate, work.endDate, work.current)}</div>
                </div>
                <div class="item-subtitle">${work.company}${work.location ? ', ' + work.location : ''}</div>
                ${work.description ? `<div class="item-description">${work.description}</div>` : ''}
              </div>
            `).join('')}
          </div>` : ''}

          ${skills && skills.length > 0 ? `
          <div class="section">
            <div class="section-title">Skills & Expertise</div>
            <div class="skills-container">
              ${skills.map(skill => `<span class="skill-tag">${skill.name}</span>`).join('')}
            </div>
          </div>` : ''}

          ${certifications && certifications.length > 0 ? `
          <div class="section">
            <div class="section-title">Certifications</div>
            ${certifications.map(cert => `
              <div class="cert-item">
                <div class="cert-name">${cert.name}</div>
                <div class="cert-org">${cert.organization}</div>
                <div class="item-date">${cert.issueDate ? 'Issued: ' + formatDate(cert.issueDate) : ''}</div>
              </div>
            `).join('')}
          </div>` : ''}

          ${projects && projects.length > 0 ? `
          <div class="section">
            <div class="section-title">Projects</div>
            ${projects.map(project => `
              <div class="project-item">
                <div class="project-name">${project.name}</div>
                ${project.technologies && project.technologies.length > 0 ? `<div class="project-tech">🛠️ ${project.technologies.join(', ')}</div>` : ''}
                ${project.description ? `<div class="item-description">${project.description}</div>` : ''}
              </div>
            `).join('')}
          </div>` : ''}

          ${languages && languages.length > 0 ? `
          <div class="section">
            <div class="section-title">Languages</div>
            ${languages.map(lang => `
              <div class="language-item">
                <span>${lang.name}</span>
                <span>${lang.proficiency}</span>
              </div>
            `).join('')}
          </div>` : ''}

          ${jobs && jobs.length > 0 ? `
          <div class="section">
            <div class="section-title">Career Goals</div>
            ${jobs.map(job => `
              <div class="target-job">
                <div class="target-job-title">${job.jobTitle}</div>
                <div style="font-size: 14px; color: #444; margin-top: 4px;">${job.industry || ''}${job.jobType ? ' • ' + job.jobType : ''}</div>
                ${job.location ? `<div style="font-size: 13px; color: #666;">📍 ${job.location}</div>` : ''}
              </div>
            `).join('')}
          </div>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
};

// ==================== MINIMAL TEMPLATE ====================
const renderMinimalTemplate = (resume) => {
  const { personalInfo, professionalSummary, education, workExperience, skills, certifications, projects, languages, targetJobs, targetJob } = resume;
  const jobs = targetJobs && targetJobs.length > 0 ? targetJobs : (targetJob ? [targetJob] : []);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''} - Resume</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #fafafa;
          padding: 40px 20px;
          color: #2c3e50;
          line-height: 1.6;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: #ffffff;
          padding: 50px 55px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .header {
          margin-bottom: 28px;
          padding-bottom: 18px;
          border-bottom: 1px solid #eee;
        }
        .header h1 {
          font-size: 26px;
          font-weight: 300;
          letter-spacing: 1px;
          margin-bottom: 2px;
          color: #2c3e50;
        }
        .header .title {
          font-size: 15px;
          color: #666;
          margin-bottom: 6px;
        }
        .header .contact {
          font-size: 13px;
          color: #888;
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
        }
        .header .contact a {
          color: #888;
          text-decoration: none;
        }
        .header .contact a:hover {
          color: #2c3e50;
          text-decoration: underline;
        }
        .section {
          margin-bottom: 22px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #999;
          margin-bottom: 10px;
        }
        .item {
          margin-bottom: 12px;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .item-title {
          font-size: 14px;
          font-weight: 500;
          color: #2c3e50;
        }
        .item-subtitle {
          font-size: 13px;
          color: #666;
        }
        .item-date {
          font-size: 12px;
          color: #999;
        }
        .item-description {
          font-size: 13px;
          color: #555;
          line-height: 1.6;
          margin-top: 2px;
          white-space: pre-wrap;
        }
        .skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .skill-tag {
          font-size: 13px;
          color: #555;
          padding: 2px 10px;
          background: #f5f5f5;
          border-radius: 2px;
        }
        .target-job {
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .target-job:last-child { border-bottom: none; }
        .target-job-title { font-weight: 500; }
        .language-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .language-item:last-child { border-bottom: none; }
        .project-item { margin-bottom: 10px; }
        .project-name { font-weight: 500; }
        .project-tech { color: #888; font-size: 13px; }
        .cert-item { margin-bottom: 6px; }
        .cert-name { font-weight: 500; }
        @media print { body { background: #fff; padding: 0; } .container { box-shadow: none; } }
        @media (max-width: 600px) { body { padding: 20px 10px; } .container { padding: 30px 20px; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</h1>
          ${professionalSummary?.title ? `<div class="title">${professionalSummary.title}</div>` : ''}
          <div class="contact">
            ${personalInfo?.email ? `<a href="mailto:${personalInfo.email}">${personalInfo.email}</a>` : ''}
            ${personalInfo?.phone ? `<span>${personalInfo.phone}</span>` : ''}
            ${personalInfo?.linkedin ? `<a href="${personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : 'https://' + personalInfo.linkedin}" target="_blank">LinkedIn</a>` : ''}
            ${personalInfo?.github ? `<a href="${personalInfo.github.startsWith('http') ? personalInfo.github : 'https://' + personalInfo.github}" target="_blank">GitHub</a>` : ''}
          </div>
        </div>

        ${professionalSummary?.summary ? `
        <div class="section">
          <div class="section-title">About</div>
          <p style="font-size: 13px; line-height: 1.8; color: #555;">${professionalSummary.summary}</p>
        </div>` : ''}

        ${education && education.length > 0 ? `
        <div class="section">
          <div class="section-title">Education</div>
          ${education.map(edu => `
            <div class="item">
              <div class="item-header">
                <div class="item-title">${edu.degree}${edu.fieldOfStudy ? ' in ' + edu.fieldOfStudy : ''}</div>
                <div class="item-date">${formatDateRange(edu.startDate, edu.endDate, edu.current)}</div>
              </div>
              <div class="item-subtitle">${edu.institution}</div>
            </div>
          `).join('')}
        </div>` : ''}

        ${workExperience && workExperience.length > 0 ? `
        <div class="section">
          <div class="section-title">Experience</div>
          ${workExperience.map(work => `
            <div class="item">
              <div class="item-header">
                <div class="item-title">${work.position}</div>
                <div class="item-date">${formatDateRange(work.startDate, work.endDate, work.current)}</div>
              </div>
              <div class="item-subtitle">${work.company}${work.location ? ', ' + work.location : ''}</div>
              ${work.description ? `<div class="item-description">${work.description}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}

        ${skills && skills.length > 0 ? `
        <div class="section">
          <div class="section-title">Skills</div>
          <div class="skills-container">
            ${skills.map(skill => `<span class="skill-tag">${skill.name}</span>`).join('')}
          </div>
        </div>` : ''}

        ${certifications && certifications.length > 0 ? `
        <div class="section">
          <div class="section-title">Certifications</div>
          ${certifications.map(cert => `
            <div class="cert-item">
              <div class="cert-name">${cert.name}</div>
              <div class="item-subtitle">${cert.organization}</div>
            </div>
          `).join('')}
        </div>` : ''}

        ${projects && projects.length > 0 ? `
        <div class="section">
          <div class="section-title">Projects</div>
          ${projects.map(project => `
            <div class="project-item">
              <div class="project-name">${project.name}</div>
              ${project.technologies && project.technologies.length > 0 ? `<div class="project-tech">${project.technologies.join(', ')}</div>` : ''}
              ${project.description ? `<div class="item-description">${project.description}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}

        ${languages && languages.length > 0 ? `
        <div class="section">
          <div class="section-title">Languages</div>
          ${languages.map(lang => `
            <div class="language-item">
              <span>${lang.name}</span>
              <span>${lang.proficiency}</span>
            </div>
          `).join('')}
        </div>` : ''}

        ${jobs && jobs.length > 0 ? `
        <div class="section">
          <div class="section-title">Objective</div>
          ${jobs.map(job => `
            <div class="target-job">
              <div class="target-job-title">${job.jobTitle}</div>
              <div style="font-size: 13px; color: #666;">${job.industry || ''}${job.jobType ? ' • ' + job.jobType : ''}</div>
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    </body>
    </html>
  `;
};

// ==================== PROFESSIONAL TEMPLATE ====================
const renderProfessionalTemplate = (resume) => {
  const { personalInfo, professionalSummary, education, workExperience, skills, certifications, projects, languages, targetJobs, targetJob } = resume;
  const jobs = targetJobs && targetJobs.length > 0 ? targetJobs : (targetJob ? [targetJob] : []);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''} - Resume</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Palatino', 'Times New Roman', serif;
          background: #f8f5f0;
          padding: 40px 20px;
          color: #1a1a2e;
          line-height: 1.6;
        }
        .container {
          max-width: 850px;
          margin: 0 auto;
          background: #ffffff;
          padding: 50px 55px;
          box-shadow: 0 4px 30px rgba(0,0,0,0.08);
          border-top: 6px solid #1a1a2e;
          border-bottom: 6px solid #1a1a2e;
        }
        .header {
          text-align: center;
          padding-bottom: 18px;
          margin-bottom: 22px;
          border-bottom: 2px double #1a1a2e;
        }
        .header h1 {
          font-size: 30px;
          font-weight: bold;
          letter-spacing: 4px;
          color: #1a1a2e;
          margin-bottom: 2px;
        }
        .header .title {
          font-size: 17px;
          color: #444;
          margin-bottom: 10px;
        }
        .header .contact {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px 20px;
          font-size: 13px;
          color: #555;
        }
        .header .contact a {
          color: #1a1a2e;
          text-decoration: none;
        }
        .header .contact a:hover {
          text-decoration: underline;
        }
        .section {
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #1a1a2e;
          border-bottom: 2px solid #1a1a2e;
          padding-bottom: 4px;
          margin-bottom: 12px;
        }
        .item {
          margin-bottom: 12px;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .item-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a2e;
        }
        .item-subtitle {
          font-size: 14px;
          color: #444;
        }
        .item-date {
          font-size: 13px;
          color: #666;
          font-style: italic;
        }
        .item-description {
          font-size: 14px;
          color: #444;
          line-height: 1.7;
          margin-top: 3px;
          white-space: pre-wrap;
        }
        .skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .skill-tag {
          background: #e8eaf6;
          padding: 4px 16px;
          border-radius: 2px;
          font-size: 13px;
          color: #1a1a2e;
          border-left: 3px solid #1a1a2e;
        }
        .target-job {
          background: #e8eaf6;
          padding: 14px 18px;
          border-left: 4px solid #1a1a2e;
          margin-bottom: 10px;
        }
        .target-job:last-child { margin-bottom: 0; }
        .target-job-title { font-size: 16px; font-weight: 600; color: #1a1a2e; }
        .language-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid #e8eaf6;
        }
        .language-item:last-child { border-bottom: none; }
        .project-item { margin-bottom: 10px; }
        .project-name { font-weight: 600; color: #1a1a2e; }
        .project-tech { color: #444; font-size: 13px; }
        .cert-item { margin-bottom: 8px; }
        .cert-name { font-weight: 600; color: #1a1a2e; }
        .cert-org { color: #444; }
        @media print { body { background: #fff; padding: 0; } .container { box-shadow: none; } }
        @media (max-width: 600px) { body { padding: 20px 10px; } .container { padding: 30px 20px; } .header h1 { font-size: 24px; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</h1>
          ${professionalSummary?.title ? `<div class="title">${professionalSummary.title}</div>` : ''}
          <div class="contact">
            ${personalInfo?.email ? `<a href="mailto:${personalInfo.email}">✉ ${personalInfo.email}</a>` : ''}
            ${personalInfo?.phone ? `<span>☏ ${personalInfo.phone}</span>` : ''}
            ${personalInfo?.linkedin ? `<a href="${personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : 'https://' + personalInfo.linkedin}" target="_blank">LinkedIn</a>` : ''}
            ${personalInfo?.github ? `<a href="${personalInfo.github.startsWith('http') ? personalInfo.github : 'https://' + personalInfo.github}" target="_blank">GitHub</a>` : ''}
            ${personalInfo?.address ? `<span>⌂ ${personalInfo.address}</span>` : ''}
          </div>
        </div>

        ${professionalSummary?.summary ? `
        <div class="section">
          <div class="section-title">Profile</div>
          <p style="font-size: 14px; line-height: 1.8; color: #444;">${professionalSummary.summary}</p>
        </div>` : ''}

        ${education && education.length > 0 ? `
        <div class="section">
          <div class="section-title">Education</div>
          ${education.map(edu => `
            <div class="item">
              <div class="item-header">
                <div class="item-title">${edu.degree}${edu.fieldOfStudy ? ' in ' + edu.fieldOfStudy : ''}</div>
                <div class="item-date">${formatDateRange(edu.startDate, edu.endDate, edu.current)}</div>
              </div>
              <div class="item-subtitle">${edu.institution}</div>
              ${edu.gpa ? `<div style="font-size: 13px; color: #666;">GPA: ${edu.gpa}</div>` : ''}
              ${edu.description ? `<div class="item-description">${edu.description}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}

        ${workExperience && workExperience.length > 0 ? `
        <div class="section">
          <div class="section-title">Professional Experience</div>
          ${workExperience.map(work => `
            <div class="item">
              <div class="item-header">
                <div class="item-title">${work.position}</div>
                <div class="item-date">${formatDateRange(work.startDate, work.endDate, work.current)}</div>
              </div>
              <div class="item-subtitle">${work.company}${work.location ? ', ' + work.location : ''}</div>
              ${work.description ? `<div class="item-description">${work.description}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}

        ${skills && skills.length > 0 ? `
        <div class="section">
          <div class="section-title">Core Competencies</div>
          <div class="skills-container">
            ${skills.map(skill => `<span class="skill-tag">${skill.name}</span>`).join('')}
          </div>
        </div>` : ''}

        ${certifications && certifications.length > 0 ? `
        <div class="section">
          <div class="section-title">Certifications</div>
          ${certifications.map(cert => `
            <div class="cert-item">
              <div class="cert-name">${cert.name}</div>
              <div class="cert-org">${cert.organization}</div>
              <div class="item-date">${cert.issueDate ? 'Issued: ' + formatDate(cert.issueDate) : ''}</div>
            </div>
          `).join('')}
        </div>` : ''}

        ${projects && projects.length > 0 ? `
        <div class="section">
          <div class="section-title">Projects</div>
          ${projects.map(project => `
            <div class="project-item">
              <div class="project-name">${project.name}</div>
              ${project.technologies && project.technologies.length > 0 ? `<div class="project-tech">🛠️ ${project.technologies.join(', ')}</div>` : ''}
              ${project.description ? `<div class="item-description">${project.description}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}

        ${languages && languages.length > 0 ? `
        <div class="section">
          <div class="section-title">Languages</div>
          ${languages.map(lang => `
            <div class="language-item">
              <span>${lang.name}</span>
              <span>${lang.proficiency}</span>
            </div>
          `).join('')}
        </div>` : ''}

        ${jobs && jobs.length > 0 ? `
        <div class="section">
          <div class="section-title">Career Objectives</div>
          ${jobs.map(job => `
            <div class="target-job">
              <div class="target-job-title">${job.jobTitle}</div>
              <div style="font-size: 14px; color: #444; margin-top: 4px;">${job.industry || ''}${job.industry && job.jobType ? ' • ' : ''}${job.jobType || ''}</div>
              ${job.location ? `<div style="font-size: 13px; color: #666;">📍 ${job.location}</div>` : ''}
              ${job.desiredSalary ? `<div style="font-size: 13px; color: #666;">Target: ${job.desiredSalary}</div>` : ''}
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    </body>
    </html>
  `;
};