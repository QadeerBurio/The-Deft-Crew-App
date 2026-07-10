// services/resumeTemplateService.js

export const renderResumeHTML = (resume, templateId, customStyles = {}, isPrinting = false) => {
  const templates = {
    modern_ats: renderModernATSTemplate,
    stanford: renderStanfordTemplate,
    faang: renderFAANGTemplate,
    jakes: renderJakesTemplate,
    rezi: renderReziTemplate,
    flowcv: renderFlowCVTemplate,
    reactive: renderReactiveTemplate,
    canva: renderCanvaTemplate,
    // Fallback mappings
    modern: renderModernATSTemplate,
    classic: renderStanfordTemplate,
    creative: renderCanvaTemplate,
    minimal: renderReziTemplate,
    professional: renderFAANGTemplate
  };

  const renderer = templates[templateId] || renderModernATSTemplate;
  const innerHTML = renderer(resume, customStyles);

  // Auto-wrap body in a container if no matching container class is found in the output HTML
  let processedHTML = innerHTML;
  if (!processedHTML.includes('class="container"') && 
      !processedHTML.includes("class='container'") && 
      !processedHTML.includes('class="resume-container"') &&
      !processedHTML.includes('class="resume-page"') &&
      !processedHTML.includes('class="wrapper"')) {
    processedHTML = processedHTML
      .replace('<body>', '<body><div class="container">')
      .replace('</body>', '</div></body>');
  }

  // Inject CSS override based on printing context
  const overrideCSS = isPrinting ? `
    <style id="pdf-print-override">
      @page {
        size: A4;
        margin: 0;
      }
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        min-height: auto !important;
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .container, .resume-container, .resume-page, [class*="container"] {
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        min-height: auto !important;
        margin: 0 !important;
        padding: 40px !important;
        box-shadow: none !important;
        background: #ffffff !important;
        box-sizing: border-box !important;
        border-radius: 0 !important;
        border: none !important;
        overflow: visible !important;
      }
      /* Professional page-breaking controls */
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .section, section, tr, li, p, .work-item, .education-item, .project-item, .skills-section, .certification-item, [class*="item"] {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    </style>
  ` : `
    <style id="pdf-viewer-override">
      html, body {
        background: #525659 !important;
        margin: 0 !important;
        padding: 20px !important;
        min-height: 100vh !important;
        box-sizing: border-box !important;
      }
      /* A4 paper: 794px wide, natural scroll height */
      .container, .resume-container, .resume-page, [class*="container"] {
        width: 794px !important;
        min-width: 794px !important;
        max-width: 794px !important;
        margin: 0 auto !important;
        background: #ffffff !important;
        box-shadow: 0 8px 40px rgba(0,0,0,0.55) !important;
        border-radius: 0 !important;
        overflow: visible !important;
        padding: 40px !important;
        box-sizing: border-box !important;
      }
    </style>
  `;

  // Insert the override CSS just before </head>
  let finalHTML = processedHTML.replace('</head>', overrideCSS + '</head>');
  // Force viewport to exact layout width of A4 (794px) to disable mobile viewport auto-scaling
  finalHTML = finalHTML.replace(/<meta name="viewport"[^>]*>/g, '<meta name="viewport" content="width=794">');
  return finalHTML;
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

// ==================== 1. MODERN ATS RESUME TEMPLATE ====================
const renderModernATSTemplate = (resume, styles = {}) => {
  const { personalInfo, professionalSummary, education, workExperience, skills, certifications, projects, languages, targetJob } = resume;
  
  const font = styles.font || 'Inter';
  const accent = styles.accentColor || '#1E3A8A';
  const heading = styles.headingColor || '#0F172A';
  const text = styles.textColor || '#334155';
  const bg = styles.bgColor || '#FFFFFF';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&family=Open+Sans:wght@300;400;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: '${font}', 'Inter', sans-serif; background: ${bg}; color: ${text}; padding: 30px; line-height: 1.5; font-size: 13px; }
        .header { margin-bottom: 20px; border-bottom: 2px solid ${accent}; padding-bottom: 12px; }
        .name { font-size: 26px; font-weight: 800; color: ${heading}; letter-spacing: -0.5px; }
        .title { font-size: 14px; font-weight: 600; color: ${accent}; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
        .contact { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: ${text}; opacity: 0.85; margin-top: 8px; }
        .contact span, .contact a { display: inline-flex; align-items: center; color: inherit; text-decoration: none; }
        .contact a:hover { text-decoration: underline; color: ${accent}; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 14px; font-weight: 700; color: ${accent}; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 12px; letter-spacing: 0.5px; }
        .item { margin-bottom: 14px; }
        .item-header { display: flex; justify-content: space-between; align-items: baseline; font-weight: 700; color: ${heading}; font-size: 13.5px; }
        .item-subheader { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; color: ${text}; opacity: 0.85; margin: 2px 0 6px 0; }
        .item-desc { font-size: 12.5px; color: ${text}; line-height: 1.55; white-space: pre-wrap; margin-top: 4px; padding-left: 10px; border-left: 2px solid #E2E8F0; }
        .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; }
        .skill-badge { background: #F1F5F9; color: ${heading}; padding: 4px 10px; border-radius: 4px; font-size: 11.5px; font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="name">${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</div>
        <div class="title">${personalInfo?.title || targetJob?.jobTitle || ''}</div>
        <div class="contact">
          ${personalInfo?.email ? `<a href="mailto:${personalInfo.email}">✉ ${personalInfo.email}</a>` : ''}
          ${personalInfo?.phone ? `<a href="tel:${personalInfo.phone}">📞 ${personalInfo.phone}</a>` : ''}
          ${personalInfo?.location ? `<span>📍 ${personalInfo.location}</span>` : ''}
          ${personalInfo?.linkedin ? `<a href="https://linkedin.com/in/${personalInfo.linkedin.replace('https://', '').replace('linkedin.com/in/', '')}" target="_blank">in/ ${personalInfo.linkedin.replace('https://', '').replace('linkedin.com/in/', '')}</a>` : ''}
          ${personalInfo?.github ? `<a href="https://github.com/${personalInfo.github.replace('https://', '').replace('github.com/', '')}" target="_blank">github/ ${personalInfo.github.replace('https://', '').replace('github.com/', '')}</a>` : ''}
        </div>
      </div>

      ${professionalSummary?.summary ? `
      <div class="section">
        <div class="section-title">Professional Summary</div>
        <p style="text-align: justify; line-height: 1.6; font-size: 12.5px;">${professionalSummary.summary}</p>
      </div>` : ''}

      ${workExperience && workExperience.length > 0 ? `
      <div class="section">
        <div class="section-title">Experience</div>
        ${workExperience.map(work => `
          <div class="item">
            <div class="item-header">
              <span>${work.position}</span>
              <span style="font-weight: 500; font-size: 12px; color: ${text};">${formatDateRange(work.startDate, work.endDate, work.current)}</span>
            </div>
            <div class="item-subheader">
              <span>${work.company}</span>
              <span style="font-style: italic;">${work.location || ''}</span>
            </div>
            <div class="item-desc">${work.description || ''}</div>
          </div>
        `).join('')}
      </div>` : ''}

      ${education && education.length > 0 ? `
      <div class="section">
        <div class="section-title">Education</div>
        ${education.map(edu => `
          <div class="item">
            <div class="item-header">
              <span>${edu.degree} in ${edu.fieldOfStudy}</span>
              <span style="font-weight: 500; font-size: 12px; color: ${text};">${formatDateRange(edu.startDate, edu.endDate, edu.current)}</span>
            </div>
            <div class="item-subheader">
              <span>${edu.institution}</span>
              <span>GPA: ${edu.gpa || 'N/A'}</span>
            </div>
          </div>
        `).join('')}
      </div>` : ''}

      ${projects && projects.length > 0 ? `
      <div class="section">
        <div class="section-title">Projects</div>
        ${projects.map(proj => `
          <div class="item">
            <div class="item-header">
              <span>${proj.name}</span>
              <span style="font-weight: 500; font-size: 11.5px; color: ${accent};">${Array.isArray(proj.technologies) ? proj.technologies.slice(0, 5).join(', ') : (proj.technologies || '')}</span>
            </div>
            ${proj.url ? `<div class="item-subheader"><span>Link: ${proj.url}</span></div>` : ''}
            <div class="item-desc">${proj.description || ''}</div>
          </div>
        `).join('')}
      </div>` : ''}

      ${skills && skills.length > 0 ? `
      <div class="section">
        <div class="section-title">Skills</div>
        <div class="skills-grid">
          ${skills.map(s => `<span class="skill-badge">${s.name}</span>`).join('')}
        </div>
      </div>` : ''}
    </body>
    </html>
  `;
};

// ==================== 2. STANFORD RESUME TEMPLATE ====================
const renderStanfordTemplate = (resume, styles = {}) => {
  const { personalInfo, professionalSummary, education, workExperience, skills, certifications, projects } = resume;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Resume</title>
      <style>
        body { font-family: "Times New Roman", Times, serif; background: #fff; color: #000; margin: 30px; line-height: 1.4; font-size: 12px; }
        .name { text-align: center; font-size: 22px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
        .contact { text-align: center; font-size: 11px; margin-bottom: 15px; border-bottom: 1.5px double #000; padding-bottom: 8px; }
        .section { margin-bottom: 14px; }
        .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 6px; letter-spacing: 0.5px; }
        .item { margin-bottom: 10px; }
        .item-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; }
        .item-subrow { display: flex; justify-content: space-between; font-size: 11.5px; font-style: italic; margin-top: 1px; }
        .item-desc { font-size: 11.5px; text-align: justify; margin-top: 4px; padding-left: 8px; }
      </style>
    </head>
    <body>
      <div class="name">${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</div>
      <div class="contact">
        ${personalInfo?.email || ''} | ${personalInfo?.phone || ''} | ${personalInfo?.location || ''}
        ${personalInfo?.linkedin ? ` | in: ${personalInfo.linkedin}` : ''}
      </div>
      ${professionalSummary?.summary ? `
      <div class="section">
        <div class="section-title">Professional Summary</div>
        <p style="text-align: justify; font-size: 11.5px;">${professionalSummary.summary}</p>
      </div>` : ''}
      ${education && education.length > 0 ? `
      <div class="section">
        <div class="section-title">Education</div>
        ${education.map(edu => `
          <div class="item">
            <div class="item-row">
              <span>${edu.institution}</span>
              <span>${formatDateRange(edu.startDate, edu.endDate, edu.current)}</span>
            </div>
            <div class="item-subrow">
              <span>${edu.degree} in ${edu.fieldOfStudy}</span>
              <span>GPA: ${edu.gpa || 'N/A'}</span>
            </div>
          </div>
        `).join('')}
      </div>` : ''}
      ${workExperience && workExperience.length > 0 ? `
      <div class="section">
        <div class="section-title">Experience</div>
        ${workExperience.map(work => `
          <div class="item">
            <div class="item-row">
              <span>${work.company}</span>
              <span>${formatDateRange(work.startDate, work.endDate, work.current)}</span>
            </div>
            <div class="item-subrow">
              <span>${work.position}</span>
              <span>${work.location || ''}</span>
            </div>
            <div class="item-desc">${work.description || ''}</div>
          </div>
        `).join('')}
      </div>` : ''}
      ${skills && skills.length > 0 ? `
      <div class="section">
        <div class="section-title">Skills & Competencies</div>
        <div style="font-size: 11.5px;">
          <strong>Skills:</strong> ${skills.map(s => s.name).join(', ')}
        </div>
      </div>` : ''}
    </body>
    </html>
  `;
};

// ==================== 3. FAANG RESUME TEMPLATE ====================
const renderFAANGTemplate = (resume, styles = {}) => {
  const { personalInfo, professionalSummary, education, workExperience, skills, projects } = resume;
  const font = styles.font || 'Helvetica';
  const text = styles.textColor || '#111827';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: '${font}', Helvetica, Arial, sans-serif; margin: 24px; line-height: 1.45; color: ${text}; font-size: 12.5px; }
        .header { text-align: center; margin-bottom: 16px; }
        .name { font-size: 22px; font-weight: bold; color: #111; margin-bottom: 2px; }
        .contact { font-size: 11.5px; color: #4B5563; }
        .section { margin-bottom: 14px; }
        .section-title { font-size: 12px; font-weight: bold; border-bottom: 1.5px solid #111; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .item { margin-bottom: 8px; }
        .item-header { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #111; }
        .item-desc { font-size: 11.5px; margin-top: 2px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="name">${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</div>
        <div class="contact">
          ${personalInfo?.email || ''} | ${personalInfo?.phone || ''} | ${personalInfo?.location || ''}
          ${personalInfo?.linkedin ? ` | linkedin: ${personalInfo.linkedin}` : ''}
          ${personalInfo?.github ? ` | github: ${personalInfo.github}` : ''}
        </div>
      </div>
      ${skills && skills.length > 0 ? `
      <div class="section">
        <div class="section-title">Technical Skills</div>
        <div style="font-size: 12px;"><strong>Languages & Tech:</strong> ${skills.map(s => s.name).join(', ')}</div>
      </div>` : ''}
      ${workExperience && workExperience.length > 0 ? `
      <div class="section">
        <div class="section-title">Experience</div>
        ${workExperience.map(work => `
          <div class="item">
            <div class="item-header">
              <span>${work.position} @ ${work.company}</span>
              <span>${formatDateRange(work.startDate, work.endDate, work.current)}</span>
            </div>
            <div class="item-desc">${work.description || ''}</div>
          </div>
        `).join('')}
      </div>` : ''}
      ${projects && projects.length > 0 ? `
      <div class="section">
        <div class="section-title">Projects</div>
        ${projects.map(proj => `
          <div class="item">
            <div class="item-header">
              <span>${proj.name}</span>
              <span style="font-weight: 500;">${Array.isArray(proj.technologies) ? proj.technologies.join(', ') : (proj.technologies || '')}</span>
            </div>
            <div class="item-desc">${proj.description || ''}</div>
          </div>
        `).join('')}
      </div>` : ''}
    </body>
    </html>
  `;
};

// ==================== 4. JAKE'S RESUME TEMPLATE ====================
const renderJakesTemplate = (resume, styles = {}) => {
  const { personalInfo, education, workExperience, skills, projects } = resume;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Garamond, Georgia, serif; margin: 25px; line-height: 1.4; color: #000; font-size: 12px; }
        .header { text-align: center; margin-bottom: 12px; }
        .name { font-size: 24px; font-weight: bold; margin-bottom: 2px; }
        .contact { font-size: 11px; }
        .section { margin-bottom: 12px; }
        .section-title { font-size: 12.5px; font-weight: bold; border-bottom: 1px solid #000; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; }
        .item { margin-bottom: 8px; }
        .item-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; }
        .item-subrow { display: flex; justify-content: space-between; font-size: 11px; font-style: italic; }
        .item-desc { font-size: 11.5px; text-align: justify; margin-top: 2px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="name">${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</div>
        <div class="contact">
          ${personalInfo?.phone || ''} | ${personalInfo?.email || ''} | ${personalInfo?.linkedin || ''} | ${personalInfo?.github || ''}
        </div>
      </div>
      ${education && education.length > 0 ? `
      <div class="section">
        <div class="section-title">Education</div>
        ${education.map(edu => `
          <div class="item">
            <div class="item-row">
              <span>${edu.institution}</span>
              <span>${formatDateRange(edu.startDate, edu.endDate, edu.current)}</span>
            </div>
            <div class="item-subrow">
              <span>${edu.degree} in ${edu.fieldOfStudy}</span>
              <span>GPA: ${edu.gpa || 'N/A'}</span>
            </div>
          </div>
        `).join('')}
      </div>` : ''}
      ${workExperience && workExperience.length > 0 ? `
      <div class="section">
        <div class="section-title">Experience</div>
        ${workExperience.map(work => `
          <div class="item">
            <div class="item-row">
              <span>${work.position}</span>
              <span>${formatDateRange(work.startDate, work.endDate, work.current)}</span>
            </div>
            <div class="item-subrow">
              <span>${work.company}</span>
              <span>${work.location || ''}</span>
            </div>
            <div class="item-desc">${work.description || ''}</div>
          </div>
        `).join('')}
      </div>` : ''}
    </body>
    </html>
  `;
};

// ==================== 5. REZI RESUME TEMPLATE ====================
const renderReziTemplate = (resume, styles = {}) => {
  const { personalInfo, education, workExperience, skills } = resume;
  const font = styles.font || 'Roboto';
  const accent = styles.accentColor || '#111827';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: '${font}', Roboto, sans-serif; background: #fff; margin: 30px; color: #1f2937; font-size: 12.5px; line-height: 1.5; }
        .header { text-align: left; margin-bottom: 20px; border-left: 4px solid ${accent}; padding-left: 12px; }
        .name { font-size: 24px; font-weight: bold; text-transform: uppercase; color: #111; letter-spacing: -0.5px; }
        .contact { font-size: 11.5px; color: #4B5563; margin-top: 4px; }
        .section { margin-bottom: 18px; }
        .section-title { font-size: 13.5px; font-weight: bold; border-bottom: 2px solid #111; padding-bottom: 2px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
        .item { margin-bottom: 10px; }
        .item-header { display: flex; justify-content: space-between; font-weight: bold; color: #111; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="name">${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</div>
        <div class="contact">${personalInfo?.email || ''} | ${personalInfo?.phone || ''} | ${personalInfo?.location || ''}</div>
      </div>
      ${workExperience && workExperience.length > 0 ? `
      <div class="section">
        <div class="section-title">Work Experience</div>
        ${workExperience.map(w => `
          <div class="item">
            <div class="item-header">
              <span>${w.position} @ ${w.company}</span>
              <span>${w.startDate} - ${w.current ? 'Present' : w.endDate}</span>
            </div>
            <div style="margin-top: 2px; font-size: 12px;">${w.description}</div>
          </div>
        `).join('')}
      </div>` : ''}
    </body>
    </html>
  `;
};

// ==================== 6. FLOWCV RESUME TEMPLATE ====================
const renderFlowCVTemplate = (resume, styles = {}) => {
  const { personalInfo, professionalSummary, education, workExperience, skills } = resume;
  const font = styles.font || 'Outfit';
  const accent = styles.accentColor || '#3B82F6';
  const bg = styles.bgColor || '#fcfcfc';
  const text = styles.textColor || '#2D3748';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: '${font}', 'Outfit', sans-serif; background: ${bg}; padding: 30px; color: ${text}; font-size: 13px; line-height: 1.6; }
        .card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); border: 1px solid #E2E8F0; }
        .name { font-size: 26px; font-weight: bold; color: ${accent}; }
        .section-title { font-size: 14.5px; font-weight: bold; text-transform: uppercase; color: ${accent}; border-bottom: 2px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 12px; letter-spacing: 0.5px; }
        .item-desc { font-size: 12px; color: #4A5568; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="name">${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</div>
        <div style="font-size: 13px; margin-bottom: 16px; opacity: 0.85;">${personalInfo?.email} | ${personalInfo?.phone}</div>
        ${workExperience && workExperience.length > 0 ? `
        <div class="section">
          <div class="section-title">Career Path</div>
          ${workExperience.map(w => `
            <div style="margin-bottom: 14px;">
              <strong>${w.position}</strong> - ${w.company}
              <div class="item-desc">${w.description}</div>
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    </body>
    </html>
  `;
};

// ==================== 7. REACTIVE RESUME TEMPLATE ====================
const renderReactiveTemplate = (resume, styles = {}) => {
  const { personalInfo, education, workExperience, skills } = resume;
  const font = styles.font || 'Open Sans';
  const heading = styles.headingColor || '#334155';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: '${font}', 'Open Sans', sans-serif; background: #fff; padding: 20px; color: #333; font-size: 12.5px; }
        .banner { background: ${heading}; color: #fff; padding: 24px; border-radius: 8px; margin-bottom: 20px; }
        .name { font-size: 24px; font-weight: bold; }
        .section-title { font-size: 13.5px; font-weight: bold; color: ${heading}; border-left: 4px solid ${heading}; padding-left: 8px; margin-bottom: 12px; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="banner">
        <div class="name">${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</div>
        <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">${personalInfo?.email} | ${personalInfo?.phone}</div>
      </div>
    </body>
    </html>
  `;
};

// ==================== 8. CANVA PROFESSIONAL RESUME TEMPLATE ====================
const renderCanvaTemplate = (resume, styles = {}) => {
  const { personalInfo, professionalSummary, education, workExperience, skills } = resume;
  const font = styles.font || 'Arial';
  const accent = styles.accentColor || '#2D3748';
  const text = styles.textColor || '#333';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: '${font}', Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 0; display: flex; min-height: 100vh; font-size: 12.5px; }
        .sidebar { width: 30%; background: ${accent}; color: #fff; padding: 20px; }
        .main-body { width: 70%; background: #fff; padding: 20px; color: ${text}; }
        .sidebar h2 { font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase; }
        .main-body h2 { font-size: 17px; border-bottom: 2px solid ${accent}; padding-bottom: 6px; color: ${accent}; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="sidebar">
        <h2>CONTACT</h2>
        <p style="font-size: 11.5px; line-height: 1.6;">${personalInfo?.email || ''}<br>${personalInfo?.phone || ''}<br>${personalInfo?.location || ''}</p>
        <h2 style="margin-top: 20px;">SKILLS</h2>
        ${skills?.map(s => `<p style="font-size: 11.5px; margin: 4px 0;">• ${s.name}</p>`).join('') || ''}
      </div>
      <div class="main-body">
        <h2 style="border:none; padding: 0; margin-bottom: 2px;">${personalInfo?.firstName || ''} ${personalInfo?.lastName || ''}</h2>
        <div style="font-size: 13px; font-weight: bold; margin-bottom: 12px; color: ${accent};">${personalInfo?.title || ''}</div>
        <p style="font-size: 12px; line-height: 1.6; text-align: justify;">${professionalSummary?.summary || ''}</p>
      </div>
    </body>
    </html>
  `;
};

export default function DummyTemplateServiceComponent() { return null; }