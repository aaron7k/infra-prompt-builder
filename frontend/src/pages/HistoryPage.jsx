import React, { useState, useEffect } from 'react';
import { History, Trash2, FileText, Calendar, AlertCircle, Copy, Download, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const HistoryPage = () => {
    const [locationId, setLocationId] = useState('default');
    const [prompts, setPrompts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedPrompt, setSelectedPrompt] = useState(null);

    // UI State
    const [toast, setToast] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const locId = params.get('location_id') || 'default';
        setLocationId(locId);
        fetchHistory(locId);
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const fetchHistory = async (locId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`/api/prompts/${locId}`);
            setPrompts(response.data || []);
        } catch (err) {
            console.error(err);
            setError('Error al cargar el historial.');
        } finally {
            setLoading(false);
        }
    };

    const confirmDeletePrompt = (id) => {
        setConfirmDelete(id);
    };

    const handleDelete = async () => {
        const id = confirmDelete;
        if (!id) return;

        try {
            await axios.delete(`/api/prompts/${id}`);
            setPrompts(prompts.filter(p => p.id !== id));
            if (selectedPrompt?.id === id) setSelectedPrompt(null);
            showToast('Prompt eliminado correctamente', 'success');
        } catch (err) {
            console.error(err);
            showToast('Error al eliminar el prompt', 'error');
        } finally {
            setConfirmDelete(null);
        }
    };

    const copyToClipboard = (text) => {
        if (!text) return;

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => showToast('Prompt copiado al portapapeles'))
                .catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    };

    const fallbackCopy = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Prompt copiado al portapapeles');
        } catch (err) {
            showToast('Error al copiar', 'error');
        }
        document.body.removeChild(textArea);
    };

    const downloadPrompt = (prompt) => {
        const element = document.createElement("a");
        const file = new Blob([prompt.generated_prompt], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `prompt_${prompt.assistant_role.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        showToast('Archivo descargado');
    };

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            width: '100%',
            maxWidth: '100%',
            paddingBottom: '2rem'
        }}>

            <main className="card" style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(300px, 350px) 1fr',
                gap: '0',
                alignItems: 'stretch',
                padding: '0',
                overflow: 'hidden',
                flex: 1,
                width: '80%',
                maxHeight: '100%',
                marginBottom: '0',
                border: '1px solid var(--border)'
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <History size={16} className="text-accent" />
                                Historial
                            </div>
                            <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>{prompts.length}</span>
                        </h3>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }} className="custom-scroll">
                        {loading && <p className="text-dim" style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</p>}

                        {error && (
                            <div style={{ padding: '1rem', color: 'var(--danger)', fontSize: '0.85rem' }}>
                                {error}
                            </div>
                        )}

                        {!loading && !error && prompts.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                <FileText size={40} style={{ marginBottom: '1rem', opacity: 0.1 }} />
                                <p className="text-dim" style={{ fontSize: '0.85rem' }}>Vacío.</p>
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
                                    }}
                                    className="history-item"
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
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
                                                confirmDeletePrompt(prompt.id);
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--danger)',
                                                cursor: 'pointer',
                                                padding: '0.3rem',
                                                borderRadius: '6px',
                                                opacity: 0.4
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
                    background: 'rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                }}>
                    {selectedPrompt ? (
                        <>
                            {/* Persistent Header */}
                            <div style={{
                                padding: '1.25rem 2.5rem',
                                borderBottom: '1px solid var(--border)',
                                background: 'var(--secondary-bg)',
                                zIndex: 10,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexShrink: 0
                            }}>
                                <div>
                                    <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem' }}>{selectedPrompt.assistant_role}</h2>
                                    <p style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>{selectedPrompt.agency_name}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.6rem' }}>
                                    <button
                                        className="button secondary"
                                        onClick={() => downloadPrompt(selectedPrompt)}
                                        style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}
                                    >
                                        <Download size={14} /> .txt
                                    </button>
                                    <button
                                        className="button"
                                        onClick={() => copyToClipboard(selectedPrompt.generated_prompt)}
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'var(--accent)', color: 'white' }}
                                    >
                                        <Copy size={14} style={{ marginRight: '0.4rem' }} />
                                        Copiar Prompt
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Markdown Content */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem' }} className="custom-scroll">
                                <h3 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>Prompt</h3>

                                <div className="markdown-body" style={{
                                    fontSize: '0.95rem',
                                    lineHeight: '1.6',
                                    color: '#d1d1d1',
                                    fontFamily: 'Inter, sans-serif'
                                }}>
                                    <ReactMarkdown>{selectedPrompt.generated_prompt}</ReactMarkdown>
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
                            <p style={{ fontSize: '1rem' }}>Selecciona un registro</p>
                        </div>
                    )}
                </section>
            </main>

            {/* Global UI Components */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <ConfirmDialog
                isOpen={!!confirmDelete}
                title="Eliminar Prompt"
                message="¿Estás seguro de que quieres borrar este prompt para siempre?"
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(null)}
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                .history-item:hover { background: rgba(255,255,255,0.04) !important; }
                .history-item:hover .delete-btn { opacity: 1 !important; }
                .markdown-body h1, .markdown-body h2, .markdown-body h3 { 
                    color: var(--text-main); 
                    margin-top: 1.5rem; 
                    margin-bottom: 0.75rem;
                }
                .markdown-body p { margin-bottom: 1rem; }
                .markdown-body ul, .markdown-body ol { margin-bottom: 1rem; padding-left: 1.25rem; }
                .markdown-body li { margin-bottom: 0.5rem; }
                .markdown-body code { 
                    max-width: 100%;
                    overflow-x: auto;
                    background: rgba(0,0,0,0.3);
                    padding: 0.2rem 0.4rem;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 0.85em;
                }
            `}} />
        </div>
    );
};

export default HistoryPage;
