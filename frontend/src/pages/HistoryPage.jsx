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
        <div className="app-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <header style={{ textAlign: 'center', padding: '1rem 0 2rem 0', flexShrink: 0 }}>
                <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontSize: '2rem' }}>
                    <History size={36} style={{ color: 'var(--accent)' }} />
                    Historial de Prompts
                </h1>
                <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 500 }}>
                    UBICACIÓN: <span style={{ opacity: 0.8 }}>{locationId}</span>
                </div>
            </header>

            <main className="card" style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(300px, 350px) 1fr',
                gap: '0',
                alignItems: 'stretch',
                padding: '0',
                overflow: 'hidden',
                flex: 1, // Take remaining height
                width: '80%',
                maxHeight: 'calc(100vh - 180px)',
                marginBottom: '1rem'
            }}>
                {/* Sidebar: Lista de prompts */}
                <aside style={{
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255, 255, 255, 0.01)',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Guardados <span style={{ background: 'var(--accent)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{prompts.length}</span>
                        </h3>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }} className="custom-scroll">
                        {loading && <p className="text-dim" style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</p>}

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
                                <p className="text-dim" style={{ fontSize: '0.85rem' }}>Sin historial.</p>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {prompts.map((prompt) => (
                                <div
                                    key={prompt.id}
                                    onClick={() => setSelectedPrompt(prompt)}
                                    style={{
                                        padding: '1rem',
                                        background: selectedPrompt?.id === prompt.id ? 'rgba(142, 36, 170, 0.12)' : 'transparent',
                                        border: `1px solid ${selectedPrompt?.id === prompt.id ? 'var(--accent)' : 'transparent'}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        position: 'relative'
                                    }}
                                    className="history-item"
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div style={{ flex: 1, pr: '1.5rem', overflow: 'hidden' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {prompt.assistant_role}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
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
                                                padding: '0.3rem',
                                                borderRadius: '6px',
                                                opacity: 0.4,
                                                flexShrink: 0
                                            }}
                                            className="delete-btn"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.6rem' }}>
                                        <Calendar size={11} />
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
                <section style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(0,0,0,0.15)',
                    overflow: 'hidden'
                }}>
                    {selectedPrompt ? (
                        <>
                            {/* Sticky Header inside the column */}
                            <div style={{
                                padding: '1.5rem 2.5rem',
                                borderBottom: '1px solid var(--border)',
                                background: 'rgba(30, 27, 46, 0.95)', // Matches secondary-bg
                                backdropFilter: 'blur(10px)',
                                zIndex: 10,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexShrink: 0
                            }}>
                                <div>
                                    <h2 style={{ color: 'var(--text-main)', fontSize: '1.4rem', marginBottom: '0.2rem' }}>{selectedPrompt.assistant_role}</h2>
                                    <p style={{ color: 'var(--accent)', fontWeight: 500, fontSize: '0.9rem' }}>{selectedPrompt.agency_name}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.6rem' }}>
                                    <button
                                        className="button secondary"
                                        onClick={() => downloadPrompt(selectedPrompt)}
                                        style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem', border: '1px solid var(--border)', background: 'transparent' }}
                                    >
                                        <Download size={14} /> .txt
                                    </button>
                                    <button
                                        className="button"
                                        onClick={() => copyToClipboard(selectedPrompt.generated_prompt)}
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        {copySuccess ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                        {copySuccess ? 'Copiado' : 'Copiar Prompt'}
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Content inside the column */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem' }} className="custom-scroll">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                                    {selectedPrompt.parameters?.tasks && selectedPrompt.parameters.tasks.length > 0 && (
                                        <div>
                                            <h3 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.8rem' }}>Tareas</h3>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                {selectedPrompt.parameters.tasks.map((task, i) => (
                                                    <span key={i} style={{
                                                        background: 'rgba(255, 255, 255, 0.04)',
                                                        border: '1px solid var(--border)',
                                                        padding: '0.25rem 0.6rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem',
                                                        color: 'rgba(255,255,255,0.8)'
                                                    }}>
                                                        {task}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedPrompt.parameters?.few_shot && selectedPrompt.parameters.few_shot.length > 0 && (
                                        <div>
                                            <h3 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.8rem' }}>Ejemplos</h3>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                {selectedPrompt.parameters.few_shot.map((ex, i) => (
                                                    <span key={i} style={{
                                                        background: 'rgba(142, 36, 170, 0.05)',
                                                        border: '1px solid rgba(142, 36, 170, 0.15)',
                                                        padding: '0.25rem 0.6rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem',
                                                        color: 'rgba(255,255,255,0.7)'
                                                    }}>
                                                        {ex}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Prompt Maestro</h3>
                                    <div style={{
                                        background: 'rgba(0, 0, 0, 0.35)',
                                        padding: '1.75rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        whiteSpace: 'pre-wrap',
                                        fontSize: '0.95rem',
                                        fontFamily: '"JetBrains Mono", monospace',
                                        lineHeight: '1.6',
                                        color: '#d1d1d1',
                                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.15)'
                                    }}>
                                        {selectedPrompt.generated_prompt}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-dim)',
                            opacity: 0.4
                        }}>
                            <FileText size={50} style={{ marginBottom: '1rem' }} />
                            <p style={{ fontSize: '1rem' }}>Selecciona un prompt para visualizar los detalles</p>
                        </div>
                    )}
                </section>
            </main>

            <footer style={{ padding: '0.8rem', flexShrink: 0, textAlign: 'center', opacity: 0.6 }}>
                <p style={{ fontSize: '0.75rem' }}>
                    &copy; 2026 Prompt Builder Agent. Infragrowth AI
                </p>
            </footer>

            <style dangerouslySetInnerHTML={{
                __html: `
                .history-item:hover {
                    background: rgba(255,255,255,0.04) !important;
                }
                .history-item:hover .delete-btn {
                    opacity: 1 !important;
                }
                .custom-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 3px;
                }
                .custom-scroll::-webkit-scrollbar-thumb:hover {
                    background: var(--accent);
                }
            `}} />
        </div>
    );
};

export default HistoryPage;
