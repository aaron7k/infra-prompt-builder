import React, { useState, useEffect } from 'react';
import { History, Trash2, FileText, Calendar, AlertCircle } from 'lucide-react';
import axios from 'axios';

const HistoryPage = () => {
    const [locationId, setLocationId] = useState(null);
    const [prompts, setPrompts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedPrompt, setSelectedPrompt] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const locId = params.get('location_id');
        if (locId) {
            setLocationId(locId);
            fetchHistory(locId);
        }
    }, []);

    const fetchHistory = async (locId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`http://localhost:8000/prompts/${locId}`);
            setPrompts(response.data);
        } catch (err) {
            console.error(err);
            setError('Error al cargar el historial');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este prompt?')) return;

        try {
            await axios.delete(`http://localhost:8000/prompts/${id}`);
            setPrompts(prompts.filter(p => p.id !== id));
            if (selectedPrompt?.id === id) setSelectedPrompt(null);
        } catch (err) {
            console.error(err);
            alert('Error al eliminar el prompt');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Prompt copiado al portapapeles');
    };

    return (
        <div className="app-container">
            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <History size={40} style={{ color: 'var(--accent)' }} />
                    Historial de Prompts
                </h1>
                <p className="text-dim">Revisa y gestiona tus prompts generados previamente.</p>
                {locationId && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent)', opacity: 0.7 }}>
                        ID de Ubicación: {locationId}
                    </div>
                )}
            </header>

            <main className="w-full max-w-6xl" style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* Sidebar: Lista de prompts */}
                <aside className="card" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>
                        Prompts Guardados ({prompts.length})
                    </h3>

                    {loading && <p className="text-dim">Cargando...</p>}

                    {error && (
                        <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 77, 77, 0.1)', color: 'var(--danger)', borderRadius: '8px', border: '1px solid var(--danger)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    {!loading && prompts.length === 0 && (
                        <p className="text-dim">No hay prompts generados para esta ubicación.</p>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {prompts.map((prompt) => (
                            <div
                                key={prompt.id}
                                onClick={() => setSelectedPrompt(prompt)}
                                style={{
                                    padding: '1rem',
                                    background: selectedPrompt?.id === prompt.id ? 'rgba(142, 36, 170, 0.2)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${selectedPrompt?.id === prompt.id ? 'var(--accent)' : 'var(--border)'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'var(--transition)'
                                }}
                                onMouseOver={(e) => {
                                    if (selectedPrompt?.id !== prompt.id) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (selectedPrompt?.id !== prompt.id) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                            {prompt.assistant_role}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                            {prompt.agency_name}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(prompt.id);
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--danger)',
                                            cursor: 'pointer',
                                            padding: '0.25rem'
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Calendar size={12} />
                                    {new Date(prompt.created_at).toLocaleDateString('es-MX', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main: Detalle del prompt seleccionado */}
                <section className="card">
                    {selectedPrompt ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ color: 'var(--accent)' }}>{selectedPrompt.assistant_role}</h2>
                                <button
                                    className="button"
                                    onClick={() => copyToClipboard(selectedPrompt.generated_prompt)}
                                    style={{ fontSize: '0.875rem' }}
                                >
                                    Copiar Prompt
                                </button>
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>AGENCIA</h3>
                                <p>{selectedPrompt.agency_name}</p>
                            </div>

                            {selectedPrompt.parameters?.tasks && selectedPrompt.parameters.tasks.length > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>TAREAS</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {selectedPrompt.parameters.tasks.map((task, i) => (
                                            <span key={i} style={{
                                                background: 'rgba(142, 36, 170, 0.1)',
                                                border: '1px solid var(--accent)',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '20px',
                                                fontSize: '0.875rem'
                                            }}>
                                                {task}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>PROMPT GENERADO</h3>
                                <div style={{
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    padding: '1.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    whiteSpace: 'pre-wrap',
                                    fontSize: '0.9rem',
                                    fontFamily: 'monospace',
                                    maxHeight: '500px',
                                    overflowY: 'auto'
                                }}>
                                    {selectedPrompt.generated_prompt}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                            <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                            <p>Selecciona un prompt del historial para ver los detalles.</p>
                        </div>
                    )}
                </section>
            </main>

            <footer style={{ marginTop: '4rem', padding: '2rem', borderTop: '1px solid var(--border)', width: '100%', textAlign: 'center' }}>
                <p className="text-dim" style={{ fontSize: '0.875rem' }}>
                    &copy; 2026 Prompt Builder Agent
                </p>
            </footer>
        </div>
    );
};

export default HistoryPage;
