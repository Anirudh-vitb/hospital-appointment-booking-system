import { useContext } from 'react';
import { AuthContext } from '../context/authContextObject.js';

export default function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

export const HOME_FOR_ROLE = { patient: '/patient', doctor: '/doctor', admin: '/admin' };
