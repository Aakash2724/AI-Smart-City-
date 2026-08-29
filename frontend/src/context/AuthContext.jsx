import React, { createContext, useContext, useState, useEffect } from 'react';
import { updateUserProfile, getCurrentUser } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Initialize remainingOpens from localStorage
  const [remainingOpens, setRemainingOpens] = useState(() => {
    const isRemembered = localStorage.getItem('smartgov_remember_me') === 'true';
    if (!isRemembered) return 0;
    const count = parseInt(localStorage.getItem('smartgov_remaining_opens') || '0', 10);
    return count > 0 ? count : 0;
  });

  // Evaluate user session on initial app open
  const [user, setUser] = useState(() => {
    const isRemembered = localStorage.getItem('smartgov_remember_me') === 'true';
    const remOpensRaw = localStorage.getItem('smartgov_remaining_opens');
    const remOpens = remOpensRaw !== null ? parseInt(remOpensRaw, 10) : 0;

    // If remember me is active and opens remain (up to 20 opens)
    if (isRemembered && remOpens > 0) {
      const saved = localStorage.getItem('smartgov_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.email) {
            // Decrement the remaining opens by 1 for this new website open
            const nextOpens = remOpens - 1;
            localStorage.setItem('smartgov_remaining_opens', nextOpens.toString());

            const emailKey = `smartgov_profile_${parsed.email.toLowerCase().trim()}`;
            const savedProfile = localStorage.getItem(emailKey);
            if (savedProfile) {
              return { ...parsed, ...JSON.parse(savedProfile) };
            }
            return parsed;
          }
        } catch (e) {
          // Ignore parse errors and fall through
        }
      }
    }

    // If remember me expired (<= 0 opens) or was not selected, require fresh login (first screen must be sign-in)
    if (isRemembered && remOpens <= 0) {
      localStorage.removeItem('smartgov_remember_me');
      localStorage.removeItem('smartgov_remaining_opens');
      localStorage.removeItem('smartgov_user');
    }

    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (user && user.email) {
      const cleanEmail = user.email.toLowerCase().trim();
      localStorage.setItem('smartgov_user', JSON.stringify(user));
      localStorage.setItem(`smartgov_profile_${cleanEmail}`, JSON.stringify(user));
    }
  }, [user]);

  const login = (userData, options = {}) => {
    const { rememberMe = true } = options;

    if (!userData || !userData.email) {
      setUser(userData);
      setIsAuthModalOpen(false);
      return;
    }

    const cleanEmail = userData.email.toLowerCase().trim();
    const emailKey = `smartgov_profile_${cleanEmail}`;
    
    // Check if we have a locally persisted profile for this email with a real name
    let localProfile = {};
    try {
      const saved = localStorage.getItem(emailKey);
      if (saved) localProfile = JSON.parse(saved);
    } catch (e) {
      localProfile = {};
    }

    // Merge: prioritize existing explicit name if backend returned email capitalization
    const isEmailPrefixName = userData.name && userData.name.toLowerCase() === cleanEmail.split('@')[0].toLowerCase();
    const finalName = (isEmailPrefixName && localProfile.name) ? localProfile.name : (userData.name || localProfile.name || cleanEmail.split('@')[0]);

    const mergedUser = {
      ...localProfile,
      ...userData,
      name: finalName,
      email: cleanEmail,
      registered_location: userData.registered_location || localProfile.registered_location || 'Ward 12 - Jubilee Zone, Hyderabad',
      ward: userData.ward || localProfile.ward || 'Ward 12'
    };

    if (rememberMe) {
      // Set to 20 allowed opens on remember me login
      localStorage.setItem('smartgov_remember_me', 'true');
      localStorage.setItem('smartgov_remaining_opens', '20');
      setRemainingOpens(20);
    } else {
      localStorage.setItem('smartgov_remember_me', 'false');
      localStorage.removeItem('smartgov_remaining_opens');
      setRemainingOpens(0);
    }

    localStorage.setItem('smartgov_user', JSON.stringify(mergedUser));
    localStorage.setItem(emailKey, JSON.stringify(mergedUser));
    setUser(mergedUser);
    setIsAuthModalOpen(false);

    // Sync from backend in background to keep updated
    getCurrentUser(cleanEmail).then(freshData => {
      if (freshData && freshData.name && freshData.name.toLowerCase() !== cleanEmail.split('@')[0].toLowerCase()) {
        setUser(prev => {
          if (!prev || prev.email !== cleanEmail) return prev;
          const updated = { ...prev, ...freshData };
          localStorage.setItem('smartgov_user', JSON.stringify(updated));
          localStorage.setItem(emailKey, JSON.stringify(updated));
          return updated;
        });
      }
    }).catch(() => {});
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('smartgov_user');
    localStorage.removeItem('smartgov_remember_me');
    localStorage.removeItem('smartgov_remaining_opens');
    sessionStorage.removeItem('smartgov_copilot_chat');
    setRemainingOpens(0);
  };

  const updateUser = async (newFields) => {
    if (!user || !user.email) return;
    const cleanEmail = user.email.toLowerCase().trim();
    const emailKey = `smartgov_profile_${cleanEmail}`;

    const updated = { ...user, ...newFields, email: cleanEmail };
    localStorage.setItem('smartgov_user', JSON.stringify(updated));
    localStorage.setItem(emailKey, JSON.stringify(updated));
    setUser(updated);

    // Persist to backend database
    try {
      await updateUserProfile({
        email: cleanEmail,
        name: updated.name,
        phone: updated.phone,
        registered_location: updated.registered_location,
        ward: updated.ward,
        photo_url: updated.photo_url
      });
    } catch (e) {
      console.warn('[AuthContext] Backend profile update notice:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        remainingOpens,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isProfileModalOpen,
        setIsProfileModalOpen
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}


