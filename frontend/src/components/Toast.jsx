import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const icons = {
        success: <CheckCircle className="text-green-500" size={18} />,
        error: <AlertCircle className="text-red-500" size={18} />,
        info: <Info className="text-blue-500" size={18} />,
    };

    const bgColors = {
        success: 'rgba(76, 175, 80, 0.1)',
        error: 'rgba(244, 67, 54, 0.1)',
        info: 'rgba(33, 150, 243, 0.1)',
    };

    const borderColors = {
        success: 'rgba(76, 175, 80, 0.2)',
        error: 'rgba(244, 67, 54, 0.2)',
        info: 'rgba(33, 150, 243, 0.2)',
    };

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                padding: '0.75rem 1.25rem',
                background: 'var(--secondary-bg)',
                border: `1px solid ${borderColors[type]}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                zIndex: 20000,
                animation: 'slideIn 0.3s ease-out forwards',
                backdropFilter: 'blur(10px)',
            }}
        >
            <div style={{
                padding: '0.5rem',
                borderRadius: '8px',
                background: bgColors[type],
            }}>
                {icons[type]}
            </div>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                {message}
            </span>
            <button
                onClick={onClose}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    marginLeft: '0.5rem',
                    opacity: 0.6,
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '0.6'}
            >
                <X size={16} />
            </button>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes slideIn {
          from { transform: translateX(100%) opacity: 0; }
          to { transform: translateX(0) opacity: 1; }
        }
      `}} />
        </div>
    );
};

export default Toast;
