import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Award, ShieldAlert, Sparkles } from 'lucide-react';

const DocumentGenerator = ({ intern }) => {
  const [activeDoc, setActiveDoc] = useState('certificate');
  
  // Dynamic fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [duration, setDuration] = useState('3 Months');
  const [stipend, setStipend] = useState('₹10,000/month');
  const [ctc, setCtc] = useState('UNPAID');
  const [certId, setCertId] = useState('');
  const [bootcamp, setBootcamp] = useState('Python + Generative AI Bootcam');
  const [eventDate, setEventDate] = useState('31st May 2026');
  const [reason, setReason] = useState('Outstanding performance in the execution of technical milestones');
  const [relievingDate, setRelievingDate] = useState('');

  const previewRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  // Pre-populate fields based on active intern
  useEffect(() => {
    if (intern) {
      setName(intern.name || '');
      setRole(intern.role || '');
      setDepartment(intern.department || '');
      
      const formattedJoin = intern.joinDate 
        ? new Date(intern.joinDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : '15th June 2026';
      setJoinDate(formattedJoin);

      // Estimate relieving date (e.g. 3 months after join date)
      if (intern.joinDate) {
        const d = new Date(intern.joinDate);
        d.setMonth(d.getMonth() + 3);
        setRelievingDate(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));
      } else {
        setRelievingDate('15th September 2026');
      }

      // Compute simple Certificate/Ref ID
      const initials = (intern.name || 'TMT').split(' ').map(n => n[0]).join('').toUpperCase();
      setCertId(`TMT-${initials}-${new Date().getFullYear()}-001`);
    }
  }, [intern]);

  // Dynamic script loader for html2canvas and jspdf
  const loadScript = (url) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.body.appendChild(script);
    });
  };

  const uploadLetter = async (blob, filename, mimeType) => {
    try {
      const formData = new FormData();
      formData.append('document', blob, filename);
      formData.append('title', `${docTypes.find(d => d.id === activeDoc)?.label || 'Document'} - ${name}`);
      
      let letterType = 'Other';
      if (activeDoc === 'certificate') letterType = 'Certificate';
      else if (activeDoc === 'offer') letterType = 'Offer Letter';
      else if (activeDoc === 'experience') letterType = 'Relieving Letter';
      
      formData.append('type', letterType);
      if (intern && intern._id) {
        formData.append('internId', intern._id);
      }

      const token = localStorage.getItem('token');
      const response = await fetch('/api/documents/upload-letter', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const resJson = await response.json();
      if (!response.ok) {
        console.error('Failed to auto-upload generated document to repository:', resJson.error);
      } else {
        console.log('Successfully archived generated document in database:', resJson.data);
      }
    } catch (err) {
      console.error('Error auto-uploading letter:', err);
    }
  };

  const handleDownload = async (format, elementId, baseFilename, orientation = 'portrait') => {
    setExporting(true);
    try {
      // Load dependencies dynamically
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

      const el = document.getElementById(elementId);
      if (!el) {
        alert('Preview element not found.');
        return;
      }

      // Temporarily clear zoom to capture full natural sizing
      const originalZoom = el.style.zoom;
      el.style.zoom = '1';

      // Wait for DOM redraw
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await window.html2canvas(el, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Restore original zoom style
      el.style.zoom = originalZoom;

      const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${baseFilename}_${sanitizedName}`;

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();

        canvas.toBlob(async (blob) => {
          if (blob) {
            await uploadLetter(blob, `${filename}.png`, 'image/png');
          }
        }, 'image/png');
      } else if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: orientation,
          unit: 'mm',
          format: 'a4'
        });
        
        const w = pdf.internal.pageSize.getWidth();
        const h = pdf.internal.pageSize.getHeight();
        
        const canvasAR = canvas.width / canvas.height;
        const pageAR = w / h;
        let imgW = w;
        let imgH = h;
        
        if (canvasAR > pageAR) {
          imgH = w / canvasAR;
        } else {
          imgW = h * canvasAR;
        }
        
        const x = (w - imgW) / 2;
        const y = (h - imgH) / 2;
        
        pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', x, y, imgW, imgH);
        pdf.save(`${filename}.pdf`);

        const pdfBlob = pdf.output('blob');
        await uploadLetter(pdfBlob, `${filename}.pdf`, 'application/pdf');
      }
    } catch (err) {
      console.error('Document export error:', err);
      alert('Failed to generate document: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const docTypes = [
    { id: 'certificate', label: 'Certificate' },
    { id: 'offer', label: 'Offer Letter' },
    { id: 'completion', label: 'Completion Letter' },
    { id: 'internship', label: 'Internship Letter' },
    { id: 'appreciation', label: 'Appreciation Letter' },
    { id: 'experience', label: 'Relieving / Experience' }
  ];

  return (
    <div className="generator-container">
      {/* Selection Left Sidebar */}
      <div className="generator-sidebar glass-card">
        <h4 style={panelTitleStyles}>Document Type</h4>
        <div style={docTypeGridStyles}>
          {docTypes.map(d => (
            <button 
              key={d.id}
              onClick={() => setActiveDoc(d.id)}
              className="btn btn-secondary"
              style={{
                ...docTypeBtnStyles,
                borderColor: activeDoc === d.id ? 'var(--primary)' : 'var(--glass-border)',
                backgroundColor: activeDoc === d.id ? 'var(--primary-glow)' : 'var(--bg-tertiary)',
                color: activeDoc === d.id ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}
            >
              <FileText size={15} />
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Preview Workspace */}
      <div className="generator-workspace">
        {/* Left Form Controls */}
        <div className="generator-form glass-card">
          <h4 style={panelTitleStyles}>Form Parameters</h4>
          
          <div className="form-group">
            <label>Name</label>
            <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} />
          </div>

          {(activeDoc === 'offer' || activeDoc === 'completion' || activeDoc === 'internship' || activeDoc === 'experience') && (
            <div className="form-group">
              <label>Position / Role</label>
              <input type="text" className="form-control" value={role} onChange={e => setRole(e.target.value)} />
            </div>
          )}

          {(activeDoc === 'offer' || activeDoc === 'internship' || activeDoc === 'experience') && (
            <div className="form-group">
              <label>Department</label>
              <input type="text" className="form-control" value={department} onChange={e => setDepartment(e.target.value)} />
            </div>
          )}

          {activeDoc === 'certificate' && (
            <>
              <div className="form-group">
                <label>Certificate ID / Ref No.</label>
                <input type="text" className="form-control" value={certId} onChange={e => setCertId(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Internship Role / Position</label>
                <input type="text" className="form-control" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Full Stack Web Development Intern" />
              </div>
              <div style={rowStyles}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Start Date</label>
                  <input type="text" className="form-control" value={joinDate} onChange={e => setJoinDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>End Date</label>
                  <input type="text" className="form-control" value={relievingDate} onChange={e => setRelievingDate(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {activeDoc === 'offer' && (
            <>
              <div style={rowStyles}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Joining Date</label>
                  <input type="text" className="form-control" value={joinDate} onChange={e => setJoinDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>End Date</label>
                  <input type="text" className="form-control" value={relievingDate} onChange={e => setRelievingDate(e.target.value)} />
                </div>
              </div>
            </>
          )}


          {activeDoc === 'completion' && (
            <>
              <div className="form-group">
                <label>Program Name</label>
                <input type="text" className="form-control" value={bootcamp} onChange={e => setBootcamp(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Duration</label>
                <input type="text" className="form-control" value={duration} onChange={e => setDuration(e.target.value)} />
              </div>
              <div style={rowStyles}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Start Date</label>
                  <input type="text" className="form-control" value={joinDate} onChange={e => setJoinDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>End Date</label>
                  <input type="text" className="form-control" value={relievingDate} onChange={e => setRelievingDate(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {activeDoc === 'internship' && (
            <>
              <div style={rowStyles}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Start Date</label>
                  <input type="text" className="form-control" value={joinDate} onChange={e => setJoinDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>End Date</label>
                  <input type="text" className="form-control" value={relievingDate} onChange={e => setRelievingDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Stipend Rate</label>
                <input type="text" className="form-control" value={stipend} onChange={e => setStipend(e.target.value)} />
              </div>
            </>
          )}

          {activeDoc === 'appreciation' && (
            <>
              <div className="form-group">
                <label>Role</label>
                <input type="text" className="form-control" value={role} onChange={e => setRole(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Appreciation Reason</label>
                <textarea className="form-control" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
              </div>
            </>
          )}

          {activeDoc === 'experience' && (
            <>
              <div style={rowStyles}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Date of Joining</label>
                  <input type="text" className="form-control" value={joinDate} onChange={e => setJoinDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Last Working Day</label>
                  <input type="text" className="form-control" value={relievingDate} onChange={e => setRelievingDate(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div style={downloadPanelStyles}>
            <button 
              onClick={() => handleDownload('png', `${activeDoc}PreviewElement`, `TMT_${activeDoc}`, activeDoc === 'certificate' ? 'landscape' : 'portrait')}
              disabled={exporting}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              <Download size={14} />
              <span>PNG Image</span>
            </button>
            
            <button 
              onClick={() => handleDownload('pdf', `${activeDoc}PreviewElement`, `TMT_${activeDoc}`, activeDoc === 'certificate' ? 'landscape' : 'portrait')}
              disabled={exporting}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              <Award size={14} />
              <span>PDF Document</span>
            </button>
          </div>
          
          {exporting && (
            <div style={statusTextStyles}>
              <Sparkles size={14} className="animate-spin" />
              <span>Compiling high-resolution graphic...</span>
            </div>
          )}
        </div>

        {/* Right Preview Box */}
        <div className="generator-preview glass-card">
          <h4 style={panelTitleStyles}>Document Live Preview</h4>
          
          <div style={previewWrapperStyles}>
            
            {/* 1. Certificate Layout — Replica of Internship Completion Template */}
            {activeDoc === 'certificate' && (
              <div className="cert-preview" id="certificatePreviewElement" style={{ zoom: 0.7 }}>
                <div className="cert-watermark-bg">TMT</div>
                <div className="cert-body">
                  <div className="cert-header-row">
                    <div>
                      <h1 className="cert-main-title">CERTIFICATE</h1>
                      <p className="cert-subtitle">OF INTERNSHIP COMPLETION</p>
                    </div>
                  </div>
                  <p className="cert-intro-text">
                    <strong>TechMecha Torque Pvt.</strong> Ltd. to formally recognize the successful completion of an internship by
                  </p>
                  <div className="cert-name-section">
                    <div className="cert-name">{name || '{NAME}'}</div>
                    <div className="cert-dashed-line"></div>
                  </div>
                  <p className="cert-during-text">
                    For outstanding dedication and professional excellence demonstrated during their tenure from <strong>{joinDate || '{START DATE}'}</strong> to <strong>{relievingDate || '{END DATE}'}</strong>
                  </p>
                  <p className="cert-body-para">
                    Serving as our <strong>{role || '{ROLE}'}</strong> , they have shown a remarkable passion for innovation, continuous learning, and future-ready technological development.
                  </p>
                  <div className="cert-footer-content">
                    <div className="cert-sig-block">
                      <img src="/signature.png" alt="Signature" className="cert-sig-img" />
                      <div className="cert-sig-name">Jaya Chandra Reddy</div>
                      <div className="cert-sig-role">Founder &amp;CEO</div>
                    </div>
                    <div className="cert-badges-block">
                      <img src="/dpiit-logo.png" alt="DPIIT Startup India" className="cert-badge" style={{ height: '44px' }} />
                      <img src="/msme-logo.png" alt="MSME" className="cert-badge" style={{ height: '38px' }} />
                    </div>
                  </div>
                </div>
                <div className="cert-right-decor">
                  <div className="cert-right-top-bar"></div>
                  <div className="cert-dots-block">
                    <div className="cert-dots"></div>
                  </div>
                  <div className="cert-right-bottom-bar"></div>
                </div>
                <div className="cert-bottom-bar">
                  <span className="cert-footer-left">
                    <span className="tmt-red">TECHMECHA TORQUE</span> <span className="cert-footer-pvt">PVT. LTD.</span>
                  </span>
                  <span className="cert-footer-right" style={{ color: '#e11d48' }}>team@techmechatorque.com</span>
                </div>
              </div>
            )}

            {/* 2. Offer Letter Layout */}
            {activeDoc === 'offer' && (
              <div className="letter-preview portrait" id="offerPreviewElement" style={{ zoom: 0.85 }}>
                <div className="letter-header-portrait">
                  <div className="letter-logo-row">
                    <img src="/tmt-logo.png" alt="TMT" className="letter-tmt-logo" />
                    <div className="letter-contact-info">
                      <div className="lci-company">TechMecha Torque Pvt. Ltd.</div>
                      <div className="lci-detail">careers@techmechatorque.com</div>
                      <div className="lci-detail">+91 7993442607</div>
                    </div>
                  </div>
                  <div className="letter-header-divider"></div>
                  <div className="letter-ref-row">
                    <span className="letter-ref">Ref: TMT/OL/{new Date().getFullYear()}/001</span>
                    <span className="letter-date">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
                <h2 className="letter-doc-title">OFFER LETTER</h2>
                <div className="letter-body-portrait">
                  <p><strong>Subject: Offer of Internship</strong></p>
                  <p>Dear <strong>{name || '[Student Name]'}</strong>,</p>
                  <p>We are pleased to offer you an internship opportunity. This internship has been designed to provide you with practical exposure to real-world projects, professional development, and hands-on experience in an industry-oriented environment.</p>
                  <p>During your internship, you will have the opportunity to collaborate with experienced professionals, contribute to ongoing projects, enhance your technical and professional skills, and gain valuable insights into modern industry practices.</p>
                  <p>Your internship will commence on <strong>{joinDate || '[Start Date]'}</strong> and conclude on <strong>{relievingDate || '[End Date]'}</strong>. You will be assigned a mentor who will guide you throughout the internship and evaluate your progress based on your learning, participation, commitment, and overall performance.</p>
                  <p>We expect you to maintain professionalism, integrity, confidentiality, and discipline throughout the internship period.</p>
                  <p>We are delighted to welcome you and wish you a productive, enriching, and successful internship journey.</p>
                  <p>We look forward to your valuable contributions and wish you every success in your professional growth.</p>
                  <p>Warm Regards,</p>
                </div>
                <div className="letter-sig-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <img src="/signature.png" alt="Signature" className="letter-sig-img" />
                    <div className="letter-sig-name">Jaya Chandra Reddy Chilakamarry</div>
                    <div className="letter-sig-designation">Founder &amp; CEO</div>
                    <div className="letter-sig-company">TechMecha Torque Pvt. Ltd.</div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginBottom: '5px' }}>
                    <img src="/DPIITTMT.png" alt="DPIIT" style={{ height: '40px', objectFit: 'contain' }} />
                    <img src="/msmetmt01.png" alt="MSME" style={{ height: '36px', objectFit: 'contain' }} />
                  </div>
                </div>
                <div className="letter-footer-bar">
                  <span><strong>TECHMECHA TORQUE</strong> <span style={{ fontWeight: 300, fontSize: '10px' }}>PVT. LTD.</span></span>
                  <span style={{ fontSize: '11px', opacity: 0.75 }}>team@techmechatorque.com &nbsp;|&nbsp; +91 7993442607</span>
                </div>
              </div>
            )}

            {/* 3. Completion Letter Layout */}
            {activeDoc === 'completion' && (
              <div className="letter-preview portrait" id="completionPreviewElement" style={{ zoom: 0.85 }}>
                <div className="letter-header-portrait">
                  <div className="letter-logo-row">
                    <img src="/tmt-logo.png" alt="TMT" className="letter-tmt-logo" />
                    <div className="letter-contact-info">
                      <div className="lci-company">TechMecha Torque Pvt. Ltd.</div>
                      <div className="lci-detail">careers@techmechatorque.com</div>
                      <div className="lci-detail">+91 7993442607</div>
                    </div>
                  </div>
                  <div className="letter-header-divider"></div>
                  <div className="letter-ref-row">
                    <span className="letter-ref">Ref: TMT/CL/{new Date().getFullYear()}/001</span>
                    <span className="letter-date">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
                <h2 className="letter-doc-title">COMPLETION LETTER</h2>
                <div className="letter-body-portrait">
                  <p><strong>Subject: Internship Completion Letter</strong></p>
                  <p>Dear <strong>{name || '[Student Name]'}</strong>,</p>
                  <p>This is to certify that you have successfully completed your internship during the period from <strong>{joinDate || '[Start Date]'}</strong> to <strong>{relievingDate || '[End Date]'}</strong>.</p>
                  <p>Throughout the internship, you demonstrated dedication, professionalism, and a strong willingness to learn. You actively participated in assigned activities, completed the designated learning objectives, and successfully fulfilled the responsibilities entrusted to you during the internship.</p>
                  <p>Your commitment towards continuous learning, adaptability, teamwork, and professional conduct is sincerely appreciated. The knowledge and practical experience gained during this internship will serve as a valuable foundation for your future academic and professional endeavors.</p>
                  <p>We congratulate you on successfully completing your internship and extend our best wishes for continued success in all your future pursuits.</p>
                  <p>Warm Regards,</p>
                </div>
                <div className="letter-sig-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <img src="/signature.png" alt="Signature" className="letter-sig-img" />
                    <div className="letter-sig-name">Jaya Chandra Reddy Chilakamarry</div>
                    <div className="letter-sig-designation">Founder &amp; CEO</div>
                    <div className="letter-sig-company">TechMecha Torque Pvt. Ltd.</div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginBottom: '5px' }}>
                    <img src="/DPIITTMT.png" alt="DPIIT" style={{ height: '40px', objectFit: 'contain' }} />
                    <img src="/msmetmt01.png" alt="MSME" style={{ height: '36px', objectFit: 'contain' }} />
                  </div>
                </div>
                <div className="letter-footer-bar">
                  <span><strong>TECHMECHA TORQUE</strong> <span style={{ fontWeight: 300, fontSize: '10px' }}>PVT. LTD.</span></span>
                  <span style={{ fontSize: '11px', opacity: 0.75 }}>team@techmechatorque.com &nbsp;|&nbsp; +91 7993442607</span>
                </div>
              </div>
            )}

            {/* 4. Internship Letter Layout */}
            {activeDoc === 'internship' && (
              <div className="letter-preview portrait" id="internshipPreviewElement" style={{ zoom: 0.85 }}>
                <div className="letter-header-portrait">
                  <div className="letter-logo-row">
                    <img src="/tmt-logo.png" alt="TMT" className="letter-tmt-logo" />
                    <div className="letter-contact-info">
                      <div className="lci-company">TechMecha Torque Pvt. Ltd.</div>
                      <div className="lci-detail">careers@techmechatorque.com</div>
                      <div className="lci-detail">+91 7993442607</div>
                    </div>
                  </div>
                  <div className="letter-header-divider"></div>
                  <div className="letter-ref-row">
                    <span className="letter-ref">Ref: TMT/IL/{new Date().getFullYear()}/001</span>
                    <span className="letter-date">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
                <h2 className="letter-doc-title">INTERNSHIP LETTER</h2>
                <div className="letter-body-portrait">
                  <p><strong>Subject: Internship Confirmation</strong></p>
                  <p>Dear <strong>{name || '[Student Name]'}</strong>,</p>
                  <p>This letter serves as confirmation that you have been enrolled as an <strong>Intern</strong>.</p>
                  <p>As an intern, you will participate in structured learning activities, practical assignments, project-based work, and collaborative tasks designed to enhance your technical knowledge, professional skills, and industry readiness.</p>
                  <p>Your internship will be conducted from <strong>{joinDate || '[Start Date]'}</strong> to <strong>{relievingDate || '[End Date]'}</strong>, during which you are expected to actively engage in the assigned projects, maintain regular communication with your mentor, complete assigned deliverables, and uphold the standards and values of the organization.</p>
                  <p>This internship provides an opportunity to gain practical exposure to real-world workflows while developing problem-solving, teamwork, communication, and technical competencies in a professional environment.</p>
                  <p>We are pleased to have you with us and wish you a meaningful and successful internship experience.</p>
                  <p>Warm Regards,</p>
                </div>
                <div className="letter-sig-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <img src="/signature.png" alt="Signature" className="letter-sig-img" />
                    <div className="letter-sig-name">Jaya Chandra Reddy Chilakamarry</div>
                    <div className="letter-sig-designation">Founder &amp; CEO</div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginBottom: '5px' }}>
                    <img src="/DPIITTMT.png" alt="DPIIT" style={{ height: '40px', objectFit: 'contain' }} />
                    <img src="/msmetmt01.png" alt="MSME" style={{ height: '36px', objectFit: 'contain' }} />
                  </div>
                </div>
                <div className="letter-footer-bar">
                  <span><strong>TECHMECHA TORQUE</strong></span>
                  <span style={{ fontSize: '11px', opacity: 0.75 }}>+91 7993442607</span>
                </div>
              </div>
            )}

            {/* 5. Appreciation Letter Layout */}
            {activeDoc === 'appreciation' && (
              <div className="letter-preview portrait" id="appreciationPreviewElement" style={{ zoom: 0.85 }}>
                <div className="letter-header-portrait">
                  <div className="letter-logo-row">
                    <img src="/tmt-logo.png" alt="TMT" className="letter-tmt-logo" />
                    <div className="letter-contact-info">
                      <div className="lci-company">TechMecha Torque Pvt. Ltd.</div>
                      <div className="lci-detail">careers@techmechatorque.com</div>
                      <div className="lci-detail">+91 7993442607</div>
                    </div>
                  </div>
                  <div className="letter-header-divider"></div>
                  <div className="letter-ref-row">
                    <span className="letter-ref">Ref: TMT/AL/{new Date().getFullYear()}/001</span>
                    <span className="letter-date">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
                <h2 className="letter-doc-title">APPRECIATION LETTER</h2>
                <div className="letter-body-portrait">
                  <p><strong>Subject: Letter of Appreciation</strong></p>
                  <p>Dear <strong>{name || '[Student Name]'}</strong>,</p>
                  <p>It is with great pleasure that we express our sincere appreciation for your dedication, commitment, and valuable contribution during your internship. In particular, we commend you for <strong>{reason || 'your outstanding performance'}</strong>.</p>
                  <p>Throughout your internship, you consistently demonstrated professionalism, enthusiasm, responsibility, and a willingness to learn. Your positive attitude, collaborative approach, and commitment to delivering quality work have been highly appreciated by the organization.</p>
                  <p>Your contributions have reflected your eagerness to grow, accept new challenges, and continuously improve your skills. We recognize your efforts and commend the sincerity with which you fulfilled your responsibilities.</p>
                  <p>As a token of our appreciation, we present this letter in recognition of your valuable contribution and wish you continued success in your academic and professional journey.</p>
                  <p>We look forward to witnessing your future achievements and hope that the experience gained during your association with us contributes positively to your career.</p>
                  <p>With Best Wishes,</p>
                </div>
                <div className="letter-sig-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <img src="/signature.png" alt="Signature" className="letter-sig-img" />
                    <div className="letter-sig-name">Jaya Chandra Reddy Chilakamarry</div>
                    <div className="letter-sig-designation">Founder &amp; CEO</div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginBottom: '5px' }}>
                    <img src="/DPIITTMT.png" alt="DPIIT" style={{ height: '40px', objectFit: 'contain' }} />
                    <img src="/msmetmt01.png" alt="MSME" style={{ height: '36px', objectFit: 'contain' }} />
                  </div>
                </div>
                <div className="letter-footer-bar">
                  <span><strong>TECHMECHA TORQUE</strong></span>
                  <span style={{ fontSize: '11px', opacity: 0.75 }}>+91 7993442607</span>
                </div>
              </div>
            )}

            {/* 6. Relieving / Experience Letter Layout */}
            {activeDoc === 'experience' && (
              <div className="letter-preview portrait" id="experiencePreviewElement" style={{ zoom: 0.85 }}>
                <div className="letter-header-portrait">
                  <div className="letter-logo-row">
                    <img src="/tmt-logo.png" alt="TMT" className="letter-tmt-logo" />
                    <div className="letter-contact-info">
                      <div className="lci-company">TechMecha Torque Pvt. Ltd.</div>
                      <div className="lci-detail">careers@techmechatorque.com</div>
                      <div className="lci-detail">+91 7993442607</div>
                    </div>
                  </div>
                  <div className="letter-header-divider"></div>
                  <div className="letter-ref-row">
                    <span className="letter-ref">Ref: TMT/EL/{new Date().getFullYear()}/001</span>
                    <span className="letter-date">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
                <h2 className="letter-doc-title">EXPERIENCE LETTER</h2>
                <div className="letter-body-portrait">
                  <p><strong>Subject: Experience & Relieving Letter</strong></p>
                  <p>Dear <strong>{name || '[Student Name]'}</strong>,</p>
                  <p>This is to certify that <strong>{name || '[Student Name]'}</strong> was associated with our organization as an <strong>Intern</strong> from <strong>{joinDate || '[Start Date]'}</strong> to <strong>{relievingDate || '[End Date]'}</strong>.</p>
                  <p>During this period, the intern actively participated in assigned projects, learning programs, and organizational activities. The responsibilities undertaken were completed with sincerity, professionalism, and a positive attitude toward learning and collaboration.</p>
                  <p>Throughout the internship, the intern demonstrated commitment, adaptability, effective communication, and the ability to work both independently and as part of a team. The experience gained has contributed to the development of practical knowledge and professional competencies relevant to industry practices.</p>
                  <p>Upon successful completion of the internship, the individual has been formally relieved from the responsibilities assigned during the internship period. We confirm that all assigned activities and obligations have been satisfactorily completed to the best of our knowledge.</p>
                  <p>We sincerely appreciate the contributions made during the tenure with us and extend our best wishes for continued success and growth in all future academic and professional endeavors.</p>
                  <p>Warm Regards,</p>
                </div>
                <div className="letter-sig-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <img src="/signature.png" alt="Signature" className="letter-sig-img" />
                    <div className="letter-sig-name">Jaya Chandra Reddy Chilakamarry</div>
                    <div className="letter-sig-designation">Founder &amp; CEO</div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginBottom: '5px' }}>
                    <img src="/DPIITTMT.png" alt="DPIIT" style={{ height: '40px', objectFit: 'contain' }} />
                    <img src="/msmetmt01.png" alt="MSME" style={{ height: '36px', objectFit: 'contain' }} />
                  </div>
                </div>
                <div className="letter-footer-bar">
                  <span><strong>TECHMECHA TORQUE</strong></span>
                  <span style={{ fontSize: '11px', opacity: 0.75 }}>+91 7993442607</span>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

// --- Styles objects ---
const docTypeGridStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const docTypeBtnStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: '10px',
  padding: '12px 14px',
  fontSize: '13px',
  borderRadius: '8px',
  textAlign: 'left',
  width: '100%'
};

const rowStyles = {
  display: 'flex',
  gap: '10px'
};

const downloadPanelStyles = {
  display: 'flex',
  gap: '10px',
  marginTop: '10px',
  borderTop: '1px solid var(--glass-border)',
  paddingTop: '16px'
};

const previewWrapperStyles = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  flexGrow: 1,
  backgroundColor: 'rgba(0,0,0,0.2)',
  borderRadius: '8px',
  border: '1px solid var(--glass-border)',
  padding: '24px',
  overflow: 'auto',
  maxHeight: '700px'
};

const statusTextStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '11px',
  color: 'var(--text-secondary)',
  marginTop: '4px',
  justifyContent: 'center'
};

const panelTitleStyles = {
  fontSize: '15px',
  fontWeight: '600',
  color: 'var(--text-primary)',
  marginBottom: '16px',
  paddingBottom: '8px',
  borderBottom: '1px solid var(--glass-border)',
};

export default DocumentGenerator;
