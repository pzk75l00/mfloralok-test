import React from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthProvider';
import LoginScreen from '../components/Auth/LoginScreen';

export default function AuthGate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando…</div>;
  if (!user) return <LoginScreen />;
  return children;
}

AuthGate.propTypes = {
  children: PropTypes.node,
};
