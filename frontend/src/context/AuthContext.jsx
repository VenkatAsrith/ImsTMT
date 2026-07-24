import { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

// Default Super Admin user — login is bypassed entirely
const DEFAULT_USER = {
  _id: 'default-admin',
  name: 'Admin',
  email: 'admin@tmt.com',
  role: 'Super Admin',
};

export const AuthProvider = ({ children }) => {
  const [user] = useState(DEFAULT_USER);
  const [loading] = useState(false);
  const [error] = useState(null);

  // No-op login kept for compatibility if any page still calls it
  const login = async () => DEFAULT_USER;

  // No-op logout — no session to clear
  const logout = () => {};

  // Safe wrapper for fetches with JWT token authentication
  const apiFetch = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions = {
      ...options,
      headers,
    };

    try {
      let response = await fetch(url, fetchOptions);
      
      // If 401 occurs (e.g. stale/expired token in localStorage), clear expired token & retry
      if (response.status === 401 && token) {
        localStorage.removeItem('token');
        delete fetchOptions.headers['Authorization'];
        response = await fetch(url, fetchOptions);
      }

      if (response.status === 401) {
        throw new Error('Unauthorized. Check backend auth middleware.');
      }

      // Handle empty responses (e.g., 204 No Content) gracefully
      const contentType = response.headers.get('content-type');
      let resJson;
      
      if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
        // No JSON body — return a synthetic success envelope for DELETE etc.
        if (response.ok) {
          return { data: { message: 'Operation completed successfully' }, error: null };
        }
        throw new Error(`Request failed with status ${response.status}`);
      }

      try {
        resJson = await response.json();
      } catch {
        // JSON parsing failed but response was OK — treat as success
        if (response.ok) {
          return { data: { message: 'Operation completed successfully' }, error: null };
        }
        throw new Error('Server returned an invalid response');
      }
      
      if (!response.ok) {
        throw new Error(resJson.error || 'API Request failed');
      }

      return resJson; // Returns standard MERN envelope: { data: ..., error: ... }
    } catch (err) {
      console.error(`Fetch error for url ${url}:`, err.message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
