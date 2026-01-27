import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, X, Upload, FileText, AlertCircle, CheckCircle2, Copy, Download, XCircle } from 'lucide-react';
import axios from 'axios';

const PromptForm = ({ locationId }) => {
  // Initialize state directly from localStorage to avoid persistence race conditions
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
    // Ensure we don't load the string "undefined"
    return (saved && saved !== 'undefined') ? saved : '';
  });

  const [currentTask, setCurrentTask] = useState('');
  const [currentFewShot, setCurrentFewShot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [contextMode, setContextMode] = useState('text'); // 'text' or 'file'
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef(null);

  // Still save to localStorage on change
  useEffect(() => {
    if (formData) {
      localStorage.setItem('promptBuilder_formData', JSON.stringify(formData));
    }
  }, [formData]);

  useEffect(() => {
    if (generatedPrompt !== undefined) {
      localStorage.setItem('promptBuilder_generatedPrompt', generatedPrompt);
    }
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

      // FIX: Use generated_prompt instead of prompt
      const result = response.data.generated_prompt;
      if (!result) {
        console.error("Backend response missing generated_prompt:", response.data);
        throw new Error("El backend no devolvió el prompt esperado.");
      }

      setGeneratedPrompt(result);
      setShowModal(true); // Open modal on success

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
          console.warn("Could not save to Supabase history, but prompt was generated:", dbErr);
        }
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al generar el prompt. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    // Use a toast instead of alert for better UX if possible, but keeping it simple for now
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const downloadPrompt = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedPrompt], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "prompt_maestro.txt";
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        {/* Row 1: Rol y Agencia */}
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

        {/* Row 2: Tareas y Few Shot */}
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

        {/* Row 3: Restricciones y Lógica de Herramientas */}
        <div className="form-grid">
          <div className="input-group">
            <label className="label">Restricciones de Formato</label>
            <textarea
              className="textarea"
              placeholder="Ej: Máximo 500 palabras, no usar jerga técnica..."
              value={formData.formatRestrictions}
              onChange={(e) => setFormData({ ...formData, formatRestrictions: e.target.value })}
              style={{ minHeight: '100px' }}
            />
          </div>

          <div className="input-group">
            <label className="label">Lógica de Herramientas</label>
            <textarea
              className="textarea"
              placeholder="Ej: Consultar base de datos de propiedades, enviar emails..."
              value={formData.toolLogic}
              onChange={(e) => setFormData({ ...formData, toolLogic: e.target.value })}
              style={{ minHeight: '100px' }}
            />
          </div>
        </div>

        {/* Contexto */}
        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="label" style={{ marginBottom: 0 }}>Contexto del Negocio *</label>
            <div className="toggle-group" style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '8px' }}>
              <button
                type="button"
                className={`toggle-btn ${contextMode === 'text' ? 'active' : ''}`}
                onClick={() => setContextMode('text')}
                style={{
                  background: contextMode === 'text' ? 'var(--accent)' : 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <FileText size={14} /> Texto
              </button>
              <button
                type="button"
                className={`toggle-btn ${contextMode === 'file' ? 'active' : ''}`}
                onClick={() => setContextMode('file')}
                style={{
                  background: contextMode === 'file' ? 'var(--accent)' : 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Upload size={14} /> Archivo
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
              style={{ minHeight: '150px' }}
            />
          ) : (
            <div
              className="file-upload-zone"
              style={{
                border: '2px dashed var(--border)',
                borderRadius: '8px',
                padding: '2rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'var(--transition)',
                background: 'rgba(255,255,255,0.02)'
              }}
              onClick={() => fileInputRef.current.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                accept=".txt,.md"
              />
              <Upload size={32} style={{ color: 'var(--text-dim)', marginBottom: '1rem' }} />
              <p className="text-dim">Haz clic para subir un archivo o arrástralo aquí</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                Formatos: .txt, .md
              </p>
              {formData.context && contextMode === 'file' && (
                <div style={{ marginTop: '1rem', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} /> Archivo cargado correctamente
                </div>
              )}
            </div>
          )}
        </div>

        <button type="submit" className="button" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
          {loading ? 'Generando...' : (
            <>
              <Send size={20} />
              Generar Prompt Maestro
            </>
          )}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(255, 77, 77, 0.1)', color: 'var(--danger)', borderRadius: '8px', border: '1px solid var(--danger)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Modal for Results */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ color: 'var(--accent)', margin: 0 }}>Prompt Maestro Generado</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <XCircle size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="prompt-output-container">
                {generatedPrompt}
              </div>
            </div>

            <div className="modal-footer">
              <button className="button" style={{ background: 'var(--secondary-bg)', border: '1px solid var(--border)' }} onClick={downloadPrompt}>
                <Download size={18} /> Descargar .txt
              </button>
              <button className="button" onClick={copyToClipboard}>
                {success ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                {success ? '¡Copiado!' : 'Copiar al Portapapeles'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legacy result box for persistence visibility, hidden but present */}
      {generatedPrompt && !showModal && (
        <div style={{ marginTop: '2rem', opacity: 0.6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 className="text-dim">Último resultado guardado:</h4>
            <button className="button" onClick={() => setShowModal(true)} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
              Ver de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptForm;
