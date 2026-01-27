import React, { useState, useEffect } from 'react';
import { History, Trash2, FileText, Calendar, AlertCircle, Copy, Download, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const HistoryPage = () => {
    const [locationId, setLocationId] = useState('default');
    const [prompts, setPrompts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedPrompt, setSelectedPrompt] = useState(null);
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const locId = params.get('location_id') || 'default';
        setLocationId(locId);
        fetchHistory(locId);
    }, []);

    const fetchHistory = async (locId) => {
        setLoading(true);
        setError(null);
        try {
            // Use relative path to leverage Vite proxy or Dokploy routing
            const response = await axios.get(`/api/prompts/${locId}`);
            setPrompts(response.data || []);
        } catch (err) {
            console.error(err);
            setError('Error al cargar el historial. Verifica la conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este prompt?')) return;

        try {
            await axios.delete(`/api/prompts/${id}`);
            setPrompts(prompts.filter(p => p.id !== id));
            if (selectedPrompt?.id === id) setSelectedPrompt(null);
        } catch (err) {
            console.error(err);
            alert('Error al eliminar el prompt');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const downloadPrompt = (prompt) => {
        const element = document.createElement("a");
        const file = new Blob([prompt.generated_prompt], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `prompt_${prompt.assistant_role.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div className="app-container">
            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <History size={40} style={{ color: 'var(--accent)' }} />
                    Historial de Prompts
                </h1>
                <p className="text-dim">Gestiona y recupera tus prompts generados anteriormente.</p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 500 }}>
                    ID: <span style={{ opacity: 0.8 }}>{locationId}</span>
                </div>
            </header>

            <main className="card" style={{
                display: 'grid',
                gridTemplateColumns: '380px 1fr',
                gap: '0',
                alignItems: 'stretch',
                padding: '0',
                overflow: 'hidden',
                minHeight: '70vh'
            }}>
                {/* Sidebar: Lista de prompts */}
                <aside style={{
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255, 255, 255, 0.01)'
                }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                            Guardados <span>{prompts.length}</span>
                        </h3>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                        {loading && <p className="text-dim" style={{ textAlign: 'center', padding: '2rem' }}>Cargando historial...</p>}

                        {error && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'rgba(255, 77, 77, 0.05)',
                                color: 'var(--danger)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 77, 77, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontSize: '0.85rem'
                            }}>
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        {!loading && !error && prompts.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                <FileText size={40} style={{ marginBottom: '1rem', opacity: 0.1 }} />
                                <p className="text-dim" style={{ fontSize: '0.9rem' }}>No hay prompts para esta ubicación.</p>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {prompts.map((prompt) => (
                                <div
                                    key={prompt.id}
                                    onClick={() => setSelectedPrompt(prompt)}
                                    style={{
                                        padding: '1.25rem',
                                        background: selectedPrompt?.id === prompt.id ? 'rgba(142, 36, 170, 0.15)' : 'transparent',
                                        border: `1px solid ${selectedPrompt?.id === prompt.id ? 'var(--accent)' : 'transparent'}`,
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        position: 'relative'
                                    }}
                                    className="history-item"
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                        <div style={{ flex: 1, pr: '1.5rem' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                                                {prompt.assistant_role}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
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
                                                padding: '0.4rem',
                                                borderRadius: '6px',
                                                opacity: 0.5,
                                                transition: 'opacity 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                            onMouseOut={(e) => e.currentTarget.style.opacity = '0.5'}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Calendar size={12} />
                                        {new Date(prompt.created_at).toLocaleDateString('es-MX', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main: Detalle del prompt seleccionado */}
                <section style={{ padding: '2.5rem', background: 'rgba(0,0,0,0.1)', overflowY: 'auto', maxHeight: '80vh' }}>
                    {selectedPrompt ? (
                        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '2.5rem',
                                borderBottom: '1px solid var(--border)',
                                paddingBottom: '1.5rem'
                            }}>
                                <div>
                                    <h2 style={{ color: 'var(--text-main)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>{selectedPrompt.assistant_role}</h2>
                                    <p style={{ color: 'var(--accent)', fontWeight: 500 }}>{selectedPrompt.agency_name}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        className="button secondary"
                                        onClick={() => downloadPrompt(selectedPrompt)}
                                        style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
                                    >
                                        <Download size={16} /> .txt
                                    </button>
                                    <button
                                        className="button"
                                        onClick={() => copyToClipboard(selectedPrompt.generated_prompt)}
                                        style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
                                    >
                                        {copySuccess ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                        {copySuccess ? 'Copiado' : 'Copiar Prompt'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                                {selectedPrompt.parameters?.tasks && selectedPrompt.parameters.tasks.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Tareas</h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {selectedPrompt.parameters.tasks.map((task, i) => (
                                                <span key={i} style={{
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid var(--border)',
                                                    padding: '0.3rem 0.8rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    color: 'var(--text-main)'
                                                }}>
                                                    {task}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedPrompt.parameters?.few_shot && selectedPrompt.parameters.few_shot.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Ejemplos</h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {selectedPrompt.parameters.few_shot.map((ex, i) => (
                                                <span key={i} style={{
                                                    background: 'rgba(142, 36, 170, 0.05)',
                                                    border: '1px solid rgba(142, 36, 170, 0.2)',
                                                    padding: '0.3rem 0.8rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    color: 'rgba(255,255,255,0.8)'
                                                }}>
                                                    {ex}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Prompt Maestro</h3>
                                <div style={{
                                    background: 'rgba(0, 0, 0, 0.4)',
                                    padding: '2rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    whiteSpace: 'pre-wrap',
                                    fontSize: '1rem',
                                    fontFamily: '"JetBrains Mono", monospace',
                                    lineHeight: '1.7',
                                    color: '#e0e0e0',
                                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
                                }}>
                                    {selectedPrompt.generated_prompt}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-dim)',
                            opacity: 0.5
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.03)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem'
                            }}>
                                <FileText size={40} />
                            </div>
                            <p style={{ fontSize: '1.1rem' }}>Selecciona un prompt para visualizar los detalles</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Los prompts generados se guardan automáticamente por ubicación.</p>
                        </div>
                    )}
                </section>
            </main>

            <footer style={{ marginTop: '4rem', padding: '2rem', borderTop: '1px solid var(--border)', width: '100%', textAlign: 'center' }}>
                <p className="text-dim" style={{ fontSize: '0.875rem' }}>
                    &copy; 2026 Prompt Builder Agent. Infragrowth AI
                </p>
            </footer>

            <style dangerouslySetInnerHTML={{
                __html: `
                .history-item:hover {
                    background: rgba(255,255,255,0.05) !important;
                    transform: translateX(4px);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />
        </div>
    );
};

export default HistoryPage;
