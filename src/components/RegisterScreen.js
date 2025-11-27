
import React from 'react';
import UserRegisterForm from './UserRegisterForm';
import { useNavigate } from 'react-router-dom';

export default function RegisterScreen() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdfa 0%, #a7f3d0 100%)',
      padding: 0
    }}>
      <div style={{
        background: 'white',
        borderRadius: 18,
        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
        padding: '32px 28px',
        maxWidth: 480,
        width: '100%',
        border: '1px solid #d1fae5',
        margin: 16
      }}>
        <h2 style={{
          fontSize: 28,
          fontWeight: 800,
          color: '#047857',
          marginBottom: 8,
          textAlign: 'center',
          letterSpacing: '-1px'
        }}>
          Solicitud de alta
        </h2>
        <p style={{
          color: '#374151',
          fontSize: 15,
          marginBottom: 18,
          textAlign: 'center'
        }}>
          Completá el formulario para solicitar acceso a la plataforma. Nos contactaremos a la brevedad.
        </p>
        <UserRegisterForm isDios={false} isAdmin={false} defaultRole="Test" hideModules={true} />
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 24,
            width: '100%',
            background: 'linear-gradient(90deg, #16a34a 0%, #22d3ee 100%)',
            color: 'white',
            fontWeight: 700,
            fontSize: 16,
            border: 'none',
            borderRadius: 10,
            padding: '12px 0',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(16,185,129,0.10)'
          }}
        >
          Volver al login
        </button>
      </div>
    </div>
  );
}
