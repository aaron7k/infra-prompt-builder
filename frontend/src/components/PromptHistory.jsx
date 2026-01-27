import React, { useEffect, useState } from 'react';
import { History, Trash2, ChevronRight, Loader2, Calendar } from 'lucide-react';
import axios from 'axios';

const PromptHistory = ({ locationId, onLoadPrompt, refreshTrigger }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (locationId) {
            fetchHistory();
        }
    }, [locationId, refreshTrigger]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`http://localhost:8000/prompts/${locationId}`);
            setHistory(response.data);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const deletePrompt = async (e, id) => {
        e.stopPropagation();
        if (!confirm('¿Estás seguro de que quieres eliminar este prompt?')) return;

        try {
            await axios.delete(`http://localhost:8000/prompts/${id}`);
            setHistory(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    };

    if (loading && history.length === 0) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-accent" size={32} />
            </div>
        );
    }

    if (!locationId) {
        return (
            <div className="card text-center p-8">
                <p className="text-dim">No se detectó location_id. El historial no está disponible.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <h3 className="flex items-center gap-2 text-main mb-2">
                <History size={20} className="text-accent" />
                Historial de Prompts
            </h3>

            {history.length === 0 ? (
                <p className="text-dim italic">No hay prompts generados aún para esta ubicación.</p>
            ) : (
                <div className="flex flex-col gap-3">
                    {history.map((item) => (
                        <div
                            key={item.id}
                            className="card"
                            style={{
                                padding: '1.25rem',
                                cursor: 'pointer',
                                border: '1px solid var(--border)',
                                transition: 'var(--transition)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                            onClick={() => onLoadPrompt(item)}
                        >
                            <div className="flex flex-col gap-1">
                                <span className="font-semibold text-main">{item.assistant_role}</span>
                                <span className="text-dim text-xs flex items-center gap-1">
                                    <Calendar size={12} /> {new Date(item.created_at).toLocaleDateString()}
                                </span>
                                <span className="text-dim text-sm italic">{item.agency_name}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => deletePrompt(e, item.id)}
                                    className="button"
                                    style={{ backgroundColor: 'transparent', color: 'var(--danger)', padding: '0.5rem' }}
                                >
                                    <Trash2 size={18} />
                                </button>
                                <ChevronRight size={20} className="text-dim" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PromptHistory;
