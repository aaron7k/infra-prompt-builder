import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Send, Plus, X, Upload, FileText, AlertCircle, CheckCircle2, Copy, Download, XCircle, Trash2 } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

const PromptForm = ({ locationId }) => {
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('promptBuilder_formData');
    return saved ? JSON.parse(saved) : {
      assistantRole: '',
      agencyName: '',
      tasks: [],
      context: '',
      fewShot: [],
      formatRestrictions: '',
      toolLogic: ''
    };
  });

  const [generatedPrompt, setGeneratedPrompt] = useState(() => {
    const saved = localStorage.getItem('promptBuilder_generatedPrompt');
    return (saved && saved !== 'undefined') ? saved : '';
  });

  const [currentTask, setCurrentTask] = useState('');
  const [currentFewShot, setCurrentFewShot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [contextMode, setContextMode] = useState('text');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const fileInputRef = useRef(null);

  // Sync state between tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'promptBuilder_formData' && e.newValue) {
        setFormData(JSON.parse(e.newValue));
      }
      if (e.key === 'promptBuilder_generatedPrompt' && e.newValue) {
        setGeneratedPrompt(e.newValue === 'undefined' ? '' : e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('promptBuilder_formData', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    localStorage.setItem('promptBuilder_generatedPrompt', generatedPrompt);
  }, [generatedPrompt]);

  const handleAddTask = () => {
    if (currentTask.trim()) {
      setFormData(prev => ({
        ...prev,
        tasks: [...prev.tasks, currentTask.trim()]
      }));
      setCurrentTask('');
    }
  };

  const removeTask = (index) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }));
  };

  const handleAddFewShot = () => {
    if (currentFewShot.trim()) {
      setFormData(prev => ({
        ...prev,
        fewShot: [...prev.fewShot, currentFewShot.trim()]
      }));
      setCurrentFewShot('');
    }
  };

  const removeFewShot = (index) => {
    setFormData(prev => ({
      ...prev,
      fewShot: prev.fewShot.filter((_, i) => i !== index)
    }));
  };

  const handleClearAll = () => {
    setShowConfirmClear(true);
  };

  const confirmClear = () => {
    setFormData({
      assistantRole: '',
      agencyName: '',
      tasks: [],
      context: '',
      fewShot: [],
      formatRestrictions: '',
      toolLogic: ''
    });
    setGeneratedPrompt('');
    localStorage.removeItem('promptBuilder_formData');
    localStorage.removeItem('promptBuilder_generatedPrompt');
    setToast({ message: 'Formulario limpiado', type: 'info' });
    setShowConfirmClear(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        context: event.target.result
      }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    };
    reader.onerror = () => {
      setError('Error al leer el archivo');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('assistant_role', formData.assistantRole);
      formDataToSend.append('agency_name', formData.agencyName);
      formDataToSend.append('tasks', formData.tasks.join(','));
      formDataToSend.append('context', formData.context);
      formDataToSend.append('few_shot', formData.fewShot.join(','));
      formDataToSend.append('format_restrictions', formData.formatRestrictions);
      formDataToSend.append('location_id', locationId || 'default');
      if (formData.toolLogic) {
        formDataToSend.append('tool_logic', formData.toolLogic);
      }

      const response = await axios.post('/api/generate-prompt', formDataToSend);

      const result = response.data.generated_prompt || response.data.prompt || '';

      if (!result) {
        throw new Error("El backend no devolvió contenido para el prompt.");
      }

      setGeneratedPrompt(result);
      setShowModal(true);

      if (locationId) {
        try {
          await axios.post('/api/prompts', {
            location_id: locationId,
            assistant_role: formData.assistantRole,
            agency_name: formData.agencyName,
            parameters: {
              tasks: formData.tasks,
              context: formData.context,
              few_shot: formData.fewShot,
              format_restrictions: formData.formatRestrictions,
              tool_logic: formData.toolLogic
            },
            generated_prompt: result
          });
        } catch (dbErr) {
          console.warn("DB Save Error:", dbErr);
        }
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al generar el prompt.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const text = generatedPrompt;
    if (!text) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setSuccess(true);
          setToast({ message: 'Prompt copiado!', type: 'success' });
          setTimeout(() => setSuccess(false), 2000);
        })
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
      setSuccess(true);
      setToast({ message: 'Prompt copiado!', type: 'success' });
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setToast({ message: 'Error al copiar', type: 'error' });
    }
    document.body.removeChild(textArea);
  };

  const downloadPrompt = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedPrompt], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "prompt_generado.txt";
    document.body.appendChild(element);
    element.click();
    setToast({ message: 'Descargado correctamente', type: 'success' });
  };

  // Rendering the Modal via Portal for body-level overlay
  const renderModal = () => {
    if (!showModal) return null;

    return createPortal(
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 style={{ color: 'var(--accent)', margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
              🚀 Prompt Generado
            </h2>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <XCircle size={28} />
            </button>
          </div>

          <div className="modal-body custom-scroll" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="prompt-output-container" style={{ padding: '2rem' }}>
              <ReactMarkdown>{generatedPrompt}</ReactMarkdown>
            </div>
          </div>

          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={downloadPrompt}
            >
              <Download size={18} /> Descargar .txt
            </button>
            <button className="button" onClick={copyToClipboard}>
              {success ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              {success ? '¡Copiado!' : 'Copiar al Portapapeles'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 className="text-dim">Configuración del Agente</h3>
        <button
          type="button"
          className="button danger"
          onClick={handleClearAll}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
        >
          <Trash2 size={14} /> Borrar Todo
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="input-group">
            <label className="label">Rol del Asistente *</label>
            <input
              type="text"
              className="input"
              placeholder="Ej: experto en Real Estate..."
              value={formData.assistantRole}
              onChange={(e) => setFormData({ ...formData, assistantRole: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label className="label">Nombre de la Agencia/Negocio *</label>
            <input
              type="text"
              className="input"
              placeholder="Ej: InmoFlow Pro..."
              value={formData.agencyName}
              onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label className="label">Tareas (¿Qué hará el asistente?) *</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                className="input"
                placeholder="Añade una tarea y presiona +"
                value={currentTask}
                onChange={(e) => setCurrentTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
              />
              <button type="button" className="button" onClick={handleAddTask} style={{ padding: '0.75rem' }}>
                <Plus size={20} />
              </button>
            </div>

            <div className="tag-list">
              {formData.tasks.map((task, index) => (
                <span key={index} className="tag">
                  {task}
                  <span className="tag-remove" onClick={() => removeTask(index)}>
                    <X size={14} />
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="label">Ejemplos (Few Shot)</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                className="input"
                placeholder="Añade un ejemplo y presiona +"
                value={currentFewShot}
                onChange={(e) => setCurrentFewShot(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFewShot())}
              />
              <button type="button" className="button" onClick={handleAddFewShot} style={{ padding: '0.75rem' }}>
                <Plus size={20} />
              </button>
            </div>

            <div className="tag-list">
              {formData.fewShot.map((example, index) => (
                <span key={index} className="tag">
                  {example}
                  <span className="tag-remove" onClick={() => removeFewShot(index)}>
                    <X size={14} />
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label className="label">Restricciones de Formato</label>
            <textarea
              className="textarea"
              placeholder="Ej: Máximo 500 palabras, no usar jerga técnica..."
              value={formData.formatRestrictions}
              onChange={(e) => setFormData({ ...formData, formatRestrictions: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="label">Lógica de Herramientas</label>
            <textarea
              className="textarea"
              placeholder="Ej: Consultar base de datos de propiedades, enviar emails..."
              value={formData.toolLogic}
              onChange={(e) => setFormData({ ...formData, toolLogic: e.target.value })}
            />
          </div>
        </div>

        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="label" style={{ marginBottom: 0 }}>Contexto del Negocio *</label>
            <div className="toggle-group" style={{ display: 'flex', gap: '0.4rem', background: 'rgba(0,0,0,0.2)', padding: '0.2rem', borderRadius: '8px' }}>
              <button
                type="button"
                className={`toggle-btn ${contextMode === 'text' ? 'active' : ''}`}
                onClick={() => setContextMode('text')}
                style={{
                  background: contextMode === 'text' ? 'var(--accent)' : 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <FileText size={12} /> Texto
              </button>
              <button
                type="button"
                className={`toggle-btn ${contextMode === 'file' ? 'active' : ''}`}
                onClick={() => setContextMode('file')}
                style={{
                  background: contextMode === 'file' ? 'var(--accent)' : 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <Upload size={12} /> Archivo
              </button>
            </div>
          </div>

          {contextMode === 'text' ? (
            <textarea
              className="textarea"
              placeholder="Describe detalles específicos del negocio, servicios, tono de voz..."
              value={formData.context}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              required={contextMode === 'text'}
              style={{ minHeight: '120px' }}
            />
          ) : (
            <div
              className="file-upload-zone"
              style={{
                border: '2px dashed var(--border)',
                borderRadius: '8px',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.02)'
              }}
              onClick={() => fileInputRef.current.click()}
            >
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept=".txt,.md" />
              <Upload size={24} style={{ color: 'var(--text-dim)', marginBottom: '0.5rem' }} />
              <p className="text-dim" style={{ fontSize: '0.8rem' }}>Sube un archivo .txt o .md</p>
              {formData.context && contextMode === 'file' && (
                <div style={{ marginTop: '0.5rem', color: 'var(--success)', fontSize: '0.8rem' }}>✓ Archivo listo</div>
              )}
            </div>
          )}
        </div>

        <button type="submit" className="button" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }} disabled={loading}>
          {loading ? 'Generando...' : (
            <>
              <Send size={20} />
              Generar Prompt
            </>
          )}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(255, 77, 77, 0.1)', color: 'var(--danger)', borderRadius: '8px', border: '1px solid var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Button to reopen modal if hidden */}
      {generatedPrompt && !showModal && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            className="button"
            onClick={() => setShowModal(true)}
            style={{
              background: 'transparent',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              fontSize: '0.8rem'
            }}
          >
            Ver Último Prompt Generado
          </button>
        </div>
      )}

      {/* Modal is rendered via Portal below */}
      {renderModal()}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmDialog
        isOpen={showConfirmClear}
        title="Limpiar Formulario"
        message="¿Estás seguro de que quieres borrar todos los datos? Esto no se puede deshacer."
        onConfirm={confirmClear}
        onCancel={() => setShowConfirmClear(false)}
      />
    </div>
  );
};

export default PromptForm;
