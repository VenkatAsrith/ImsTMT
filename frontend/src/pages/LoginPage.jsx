import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, KeyRound, Lock, UserCheck, Delete } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [shake, setShake] = useState(false);

  const handleKeyPress = (num) => {
    setErrorMsg('');
    if (passcode.length < 4) {
      const nextPass = passcode + num;
      setPasscode(nextPass);
      if (nextPass.length === 4) {
        handlePINVerification(nextPass);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    setPasscode(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMsg('');
    setPasscode('');
  };

  const handlePINVerification = async (pin) => {
    if (pin === '2288') {
      setLoading(true);
      setErrorMsg('');
      try {
        await login('jaychandra@techmechatorque.com', '2288');
        navigate('/dashboard');
      } catch (err) {
        setErrorMsg(err.message || 'Authentication bypass failed');
        setPasscode('');
      } finally {
        setLoading(false);
      }
    } else {
      setShake(true);
      setErrorMsg('Access Denied: Invalid Passcode');
      setPasscode('');
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div style={containerStyles}>
      <div 
        style={loginCardStyles} 
        className={`glass-card animate-fade-in ${shake ? 'shake-element' : ''}`}
      >
        <div style={headerStyles}>
          <img src="/logo.png" style={logoStyles} alt="TMT Logo" />
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>TMT Operations Portal</h2>
          <p style={subtitleStyles}>Techmecha Torque Internal Platform</p>
        </div>

        {errorMsg && (
          <div style={errorBannerStyles}>
            <span>{errorMsg}</span>
          </div>
        )}

        {!showPasscode ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Authorized Administrative Profile:
              </p>
              <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', marginBottom: '6px' }}>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                  Jaychandra Chilakamarry
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Super Admin Access Level
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowPasscode(true)} 
              disabled={loading} 
              className="btn btn-primary" 
              style={{ ...submitBtnStyles, padding: '14px 20px', fontSize: '15px' }}
            >
              <LogIn size={18} />
              <span>Authorize & Enter Platform</span>
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Admin Profile Security Gate
              </p>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                Enter Passcode for Jay Chandra
              </p>
            </div>

            {/* Passcode dots display */}
            <div style={dotsContainerStyles}>
              {[0, 1, 2, 3].map((idx) => (
                <div 
                  key={idx} 
                  style={{
                    ...pinDotStyles,
                    backgroundColor: passcode.length > idx ? 'var(--primary)' : 'transparent',
                    borderColor: passcode.length > idx ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: passcode.length > idx ? '0 0 10px var(--primary-glow)' : 'none',
                  }}
                />
              ))}
            </div>

            {/* Custom PIN pad keyboard */}
            <div style={pinGridStyles}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num.toString())}
                  disabled={loading}
                  style={pinKeyStyles}
                  className="pin-key-btn"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                style={{ ...pinKeyStyles, fontSize: '12px', color: 'var(--text-muted)' }}
                className="pin-key-btn"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                disabled={loading}
                style={pinKeyStyles}
                className="pin-key-btn"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                disabled={loading}
                style={{ ...pinKeyStyles, color: 'var(--text-muted)' }}
                className="pin-key-btn"
              >
                <Delete size={18} />
              </button>
            </div>

            <button
              onClick={() => {
                setShowPasscode(false);
                setPasscode('');
                setErrorMsg('');
              }}
              disabled={loading}
              className="btn btn-secondary"
              style={{ marginTop: '20px', width: '100%', padding: '10px 14px', fontSize: '13px' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Styles objects ---
const containerStyles = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  width: '100vw',
  backgroundColor: 'var(--bg-primary)',
  padding: '16px',
};

const loginCardStyles = {
  width: '100%',
  maxWidth: '440px',
  padding: '40px 32px',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyles = {
  textAlign: 'center',
  marginBottom: '30px',
};

const logoStyles = {
  height: '64px',
  width: 'auto',
  margin: '0 auto 16px auto',
  display: 'block',
};

const subtitleStyles = {
  color: 'var(--text-secondary)',
  fontSize: '13px',
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

const formStyles = {
  display: 'flex',
  flexDirection: 'column',
};

const submitBtnStyles = {
  width: '100%',
  padding: '12px',
  marginTop: '8px',
};

const dotsContainerStyles = {
  display: 'flex',
  gap: '16px',
  margin: '16px 0 24px 0',
  justifyContent: 'center',
};

const pinDotStyles = {
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  border: '2px solid',
  transition: 'all 0.15s ease',
};

const pinGridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '12px',
  width: '240px',
  margin: '0 auto',
};

const pinKeyStyles = {
  width: '72px',
  height: '52px',
  borderRadius: '12px',
  border: '1px solid var(--glass-border)',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  color: 'var(--text-primary)',
  fontSize: '18px',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  outline: 'none',
};

export default LoginPage;
