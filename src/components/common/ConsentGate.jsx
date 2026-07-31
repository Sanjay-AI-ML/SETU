import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getConsent } from '../../core/storage/index.js';

export default function ConsentGate() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    getConsent().then((acknowledged) => {
      setStatus(acknowledged ? 'acknowledged' : 'unacknowledged');
    });
  }, []);

  if (status === 'checking') return null;
  if (status === 'unacknowledged') return <Navigate to="/consent" replace />;
  return <Outlet />;
}
