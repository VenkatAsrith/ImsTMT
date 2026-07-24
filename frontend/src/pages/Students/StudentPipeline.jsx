import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import KanbanBoard from '../../components/KanbanBoard';

const StudentPipeline = () => {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      const res = await apiFetch('/api/students');
      if (res && res.data) {
        setStudents(res.data.students || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleStudentMove = async (studentId, nextStage) => {
    try {
      // Execute PUT stage change in backend
      await apiFetch(`/api/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify({ onboardingStage: nextStage }),
      });
      fetchStudents();
    } catch (err) {
      alert(err.message);
    }
  };

  // Define Kanban columns for student onboarding
  const columns = [
    { id: 'Inquiry Received', title: 'Inquiry Received', color: '#0ea5e9', wipLimit: 10 },
    { id: 'Registered', title: 'Registered', color: '#64748b', wipLimit: 8 },
    { id: 'Fee Pending', title: 'Fee Pending', color: '#f59e0b', wipLimit: 8 },
    { id: 'Partially Paid', title: 'Partially Paid', color: '#3b82f6', wipLimit: 6 },
    { id: 'Paid', title: 'Paid', color: '#10b981', wipLimit: 6 },
    { id: 'Enrolled', title: 'Enrolled', color: '#6366f1' },
    { id: 'Completed', title: 'Completed', color: '#a855f7' },
  ];

  // Map backend student properties to Kanban card format
  const kanbanCards = students.map((s) => {
    // Determine primary course text
    let courseText = 'General Programs';
    if (s.coursesTaken && s.coursesTaken.length > 0) {
      courseText = s.coursesTaken.map((c) => c.courseId?.title).join(', ');
    }

    const balance = s.financialAccount?.balanceAmount || 0;
    const isOverdue = balance > 0 && s.financialAccount?.nextDueDate && new Date(s.financialAccount.nextDueDate) < new Date();

    return {
      ...s,
      stage: s.onboardingStage, // Map key stage parameter
      plannedCourse: courseText,
      amount: balance,
      dueDate: s.financialAccount?.nextDueDate,
      status: isOverdue ? 'Overdue' : 'Due'
    };
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Admissions Pipeline</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Drag and drop student cards to update enrollment stages. Overdue fee profiles flag in red borders.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>Loading admissions board...</div>
      ) : (
        <KanbanBoard
          columns={columns}
          cards={kanbanCards}
          onCardMove={handleStudentMove}
          onCardClick={(card) => navigate(`/learning/students/${card._id}`)}
        />
      )}
    </div>
  );
};

export default StudentPipeline;
