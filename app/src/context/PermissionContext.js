import React, { createContext, useState, useContext, useEffect } from 'react';
import { checkAllPermissions, requestAllPermissions } from '../utils/PermissionUtils';

const PermissionContext = createContext();

export const PermissionProvider = ({ children }) => {
  const [permissions, setPermissions] = useState({
    location: false,
    mediaLibrary: false,
    microphone: false,
  });
  const [allGranted, setAllGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPermissions = async () => {
    setLoading(true);
    const status = await checkAllPermissions();
    setPermissions(status);
    const allGranted = status.location && status.mediaLibrary && status.microphone;
    setAllGranted(allGranted);
    setLoading(false);
    return allGranted;
  };

  const requestPermissions = async () => {
    setLoading(true);
    const results = await requestAllPermissions();
    setPermissions(results);
    const allGranted = results.location && results.mediaLibrary && results.microphone;
    setAllGranted(allGranted);
    setLoading(false);
    return allGranted;
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        allGranted,
        loading,
        checkPermissions,
        requestPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};