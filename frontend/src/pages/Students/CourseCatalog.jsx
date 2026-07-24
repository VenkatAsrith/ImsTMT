import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { Plus, Sparkles, Trash2 } from 'lucide-react';

const CourseCatalog = () => {
  const { user, apiFetch } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Development');
  const [prereqInput, setPrereqInput] = useState('');
  const [sectionsInput, setSectionsInput] = useState('');
  const [stackInput, setStackInput] = useState('');
  const [submitError, setSubmitError] = useState('');

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/courses');
      setCourses(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      const prerequisites = prereqInput ? prereqInput.split(',').map(s => s.trim()) : [];
      const sections = sectionsInput ? sectionsInput.split(',').map(s => s.trim()) : [];
      const stack = stackInput ? stackInput.split(',').map(s => s.trim()) : [];

      const res = await apiFetch('/api/courses', {
        method: 'POST',
        body: JSON.stringify({ title, description, category, prerequisites, sections, stack }),
      });
      if (res && res.data) {
        setIsModalOpen(false);
        setTitle('');
        setDescription('');
        setPrereqInput('');
        setSectionsInput('');
        setStackInput('');
        fetchCourses();
      }
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  const isTeacherOrAdmin = ['Super Admin', 'Teacher'].includes(user?.role);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={headerStyles}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Course Catalog</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Browse academic programs, modules, categories, and manage syllabus mappings.</p>
        </div>
        {isTeacherOrAdmin && (
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Create Course</span>
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading course catalog...</div>
      ) : (
        <div style={catalogGridStyles}>
          {courses.map((course) => (
            <div key={course._id} className="glass-card animate-fade-in" style={courseCardStyles}>
              <div style={cardHeaderStyles}>
                <span className="badge badge-info">{course.category}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                  {isTeacherOrAdmin && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete course "${course.title}" from catalog?`)) {
                          try {
                            await apiFetch(`/api/courses/${course._id}`, { method: 'DELETE' });
                            fetchCourses();
                          } catch (err) {
                            alert(`Failed to delete course: ${err.message}`);
                          }
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      title="Delete Course"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
              <h3 style={{ fontSize: '1.1rem', marginTop: '10px', marginBottom: '4px' }}>{course.title}</h3>
              
              {/* Highlighted Stack Badges */}
              {course.stack && course.stack.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px', marginBottom: '8px' }}>
                  {course.stack.map((tech, idx) => (
                    <span 
                      key={idx} 
                      style={{ 
                        backgroundColor: 'rgba(225, 29, 72, 0.12)', 
                        border: '1px solid rgba(225, 29, 72, 0.4)', 
                        color: '#e11d48', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '10px', 
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              <p style={descStyles}>{course.description}</p>
              
              {course.prerequisites?.length > 0 && (
                <div style={prereqContainerStyles}>
                  <span style={prereqLabelStyles}>Prerequisites:</span>
                  <div style={prereqBadgesStyles}>
                    {course.prerequisites.map((p, idx) => (
                      <span key={idx} style={prereqBadgeStyles}>{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Syllabus chapters accordion */}
              {(isTeacherOrAdmin || (course.sections && course.sections.length > 0)) && (
                <details style={{ marginTop: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
                  <summary style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none', listStyle: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Syllabus Chapters ({course.sections?.length || 0})</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>▶ toggle</span>
                    </div>
                  </summary>
                  <ul style={{ paddingLeft: '0', listStyleType: 'none', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {course.sections?.map((sec, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sec}</span>
                        {isTeacherOrAdmin && (
                          <button 
                            onClick={async (e) => {
                              e.preventDefault();
                              if (window.confirm(`Remove section "${sec}" from course?`)) {
                                try {
                                  await apiFetch(`/api/courses/${course._id}/sections`, {
                                    method: 'DELETE',
                                    body: JSON.stringify({ sectionName: sec })
                                  });
                                  fetchCourses();
                                } catch (err) {
                                  alert(err.message);
                                }
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px', padding: '0 4px', fontWeight: 'bold' }}
                            title="Delete Section"
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                    {(!course.sections || course.sections.length === 0) && (
                      <li style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No syllabus sections added yet.</li>
                    )}
                  </ul>
                  {isTeacherOrAdmin && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <input 
                        type="text" 
                        id={`new-section-${course._id}`}
                        placeholder="Add chapter name..." 
                        className="form-control"
                        style={{ padding: '4px 8px', fontSize: '11px', height: 'auto', flexGrow: 1 }}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.target.value.trim();
                            if (!val) return;
                            try {
                              await apiFetch(`/api/courses/${course._id}/sections`, {
                                    method: 'POST',
                                    body: JSON.stringify({ sectionName: val })
                              });
                              e.target.value = '';
                              fetchCourses();
                            } catch (err) {
                              alert(err.message);
                            }
                          }
                        }}
                      />
                      <button 
                        onClick={async (e) => {
                          e.preventDefault();
                          const inputEl = document.getElementById(`new-section-${course._id}`);
                          const val = inputEl?.value.trim();
                          if (!val) return;
                          try {
                            await apiFetch(`/api/courses/${course._id}/sections`, {
                                  method: 'POST',
                                  body: JSON.stringify({ sectionName: val })
                            });
                            if (inputEl) inputEl.value = '';
                            fetchCourses();
                          } catch (err) {
                            alert(err.message);
                          }
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px', height: 'auto' }}
                      >
                        Add
                      </button>
                    </div>
                  )}
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Course Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Course Program">
        <form onSubmit={handleSubmit} style={formStyles}>
          {submitError && (
            <div style={errorBannerStyles}>{submitError}</div>
          )}

          <div className="form-group">
            <label>Course Title</label>
            <input
              type="text"
              className="form-control"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Algorithms & Data Structures"
            />
          </div>

          <div className="form-group">
            <label>Category Space</label>
            <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Development">Development (Coding)</option>
              <option value="Design">Design (UI/UX)</option>
              <option value="Marketing">Marketing (Growth)</option>
              <option value="Business">Business (Sales)</option>
              <option value="Operations">Operations (Management)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Course Description</label>
            <textarea
              className="form-control"
              rows="3"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed summary of course milestones and learning objectives..."
            />
          </div>

          <div className="form-group">
            <label>Prerequisites (Comma-separated list, e.g. HTML, CSS, JavaScript)</label>
            <input
              type="text"
              className="form-control"
              value={prereqInput}
              onChange={(e) => setPrereqInput(e.target.value)}
              placeholder="e.g. Python, SQL"
            />
          </div>

          <div className="form-group">
            <label>Tech Stack / Highlights (Comma-separated list)</label>
            <input
              type="text"
              className="form-control"
              value={stackInput}
              onChange={(e) => setStackInput(e.target.value)}
              placeholder="e.g. React, Node.js, TailwindCSS"
            />
          </div>

          <div className="form-group">
            <label>Syllabus Sections / Chapters (Comma-separated list)</label>
            <input
              type="text"
              className="form-control"
              value={sectionsInput}
              onChange={(e) => setSectionsInput(e.target.value)}
              placeholder="e.g. Introduction, Intermediate Concepts, Final Project"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '10px' }}>
            <Plus size={16} />
            <span>Create Course Program</span>
          </button>
        </form>
      </Modal>
    </div>
  );
};

// --- Styles objects ---
const headerStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '10px',
  flexWrap: 'wrap',
  gap: '16px',
};

const catalogGridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '20px',
};

const courseCardStyles = {
  display: 'flex',
  flexDirection: 'column',
  padding: '20px',
  minHeight: '220px',
};

const cardHeaderStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const descStyles = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
  lineHeight: '1.5',
  flexGrow: 1,
};

const prereqContainerStyles = {
  borderTop: '1px solid var(--glass-border)',
  paddingTop: '12px',
  marginTop: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const prereqLabelStyles = {
  fontSize: '11px',
  fontWeight: '600',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
};

const prereqBadgesStyles = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
};

const prereqBadgeStyles = {
  backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--glass-border)',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '10px',
  color: 'var(--text-secondary)',
};

const formStyles = {
  display: 'flex',
  flexDirection: 'column',
};

const errorBannerStyles = {
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  color: 'var(--danger)',
  padding: '10px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  marginBottom: '20px',
  fontWeight: '500',
  textAlign: 'center',
};

export default CourseCatalog;
