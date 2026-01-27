import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, X, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const PromptForm = ({ locationId }) => {
  const [formData, setFormData] = useState({
    assistantRole: '',
    agencyName: '',
    tasks: [],
    context: '',
    fewShot: [],
    formatRestrictions: '',
    toolLogic: ''
  });
  const [currentTask, setCurrentTask] = useState('');
  const [currentFewShot, setCurrentFewShot] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [contextMode, setContextMode] = useState('text'); // 'text' or 'file'
  const fileInputRef = useRef(null);

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
      const response = await axios.post('http://localhost:8000/generate-prompt', {
        assistant_role: formData.assistantRole,
        agency_name: formData.agencyName,
        tasks: formData.tasks,
        context: formData.context,
        few_shot: formData.fewShot,
        format_restrictions: formData.formatRestrictions,
        tool_logic: formData.toolLogic
      });

      const result = response.data.prompt;
      setGeneratedPrompt(result);

      if (locationId) {
        await axios.post('http://localhost:8000/prompts', {
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
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError('Error al generar el prompt. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    alert('Prompt copiado al portapapeles');
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

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {formData.tasks.map((task, index) => (
                <span key={index} style={{
                  background: 'rgba(142, 36, 170, 0.1)',
                  border: '1px solid var(--accent)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {task}
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeTask(index)} />
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

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {formData.fewShot.map((example, index) => (
                <span key={index} style={{
                  background: 'rgba(142, 36, 170, 0.1)',
                  border: '1px solid var(--accent)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {example}
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeFewShot(index)} />
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
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
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

      {generatedPrompt && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--accent)' }}>Resultado:</h3>
            <button className="button" onClick={copyToClipboard} style={{ fontSize: '0.875rem' }}>
              Copiar al Portapapeles
            </button>
          </div>
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            whiteSpace: 'pre-wrap',
            fontSize: '0.9rem',
            fontFamily: 'monospace',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {generatedPrompt}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptForm;
