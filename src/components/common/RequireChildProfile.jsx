import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getChildProfile } from '../../core/storage/index.js';

export default function RequireChildProfile() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    getChildProfile().then((profile) => {
      setStatus(profile ? 'present' : 'missing');
    });
  }, []);

  if (status === 'checking') return null;
  if (status === 'missing') return <Navigate to="/child-profile" replace />;
  return <Outlet />;
}
