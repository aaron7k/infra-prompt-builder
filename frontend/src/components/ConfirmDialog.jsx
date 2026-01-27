import React from 'react';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30000,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="card" style={{
                width: '400px',
                padding: '2rem',
                textAlign: 'center',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                border: '1px solid var(--border)'
            }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.25rem' }}>{title}</h3>
                <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', fontSize: '0.95rem' }}>{message}</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                        className="button secondary"
                        onClick={onCancel}
                        style={{ padding: '0.75rem 1.5rem', flex: 1 }}
                    >
                        Cancelar
                    </button>
                    <button
                        className="button"
                        onClick={onConfirm}
                        style={{ padding: '0.75rem 1.5rem', flex: 1, backgroundColor: 'var(--danger)' }}
                    >
                        Eliminar
                    </button>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
        </div>
    );
};

export default ConfirmDialog;
