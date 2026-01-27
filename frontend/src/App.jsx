import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import PromptForm from './components/PromptForm'
import HistoryPage from './pages/HistoryPage'
import { Wand2, History } from 'lucide-react'

function Navigation() {
  const location = useLocation();
  const [locationId, setLocationId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const locId = params.get('location_id');
    if (locId) {
      setLocationId(locId);
    }
  }, []);

  const navStyle = {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    justifyContent: 'center'
  };

  const linkStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    textDecoration: 'none',
    color: 'var(--text-main)',
    background: isActive ? 'rgba(142, 36, 170, 0.2)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
    transition: 'var(--transition)',
    fontSize: '0.875rem',
    fontWeight: 500
  });

  return (
    <nav style={navStyle}>
      <Link
        to={`/${locationId ? `?location_id=${locationId}` : ''}`}
        style={linkStyle(location.pathname === '/')}
      >
        <Wand2 size={18} />
        Generar Prompt
      </Link>
      <Link
        to={`/history${locationId ? `?location_id=${locationId}` : ''}`}
        style={linkStyle(location.pathname === '/history')}
      >
        <History size={18} />
        Historial
      </Link>
    </nav>
  );
}

function FormPage() {
  const [locationId, setLocationId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const locId = params.get('location_id');
    if (locId) {
      setLocationId(locId);
    }
  }, []);

  return (
    <>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <Wand2 size={40} style={{ color: 'var(--accent)' }} />
          Prompt Builder AI
        </h1>
        <p className="text-dim">Diseña prompts expertos para tus asistentes de LangChain en segundos.</p>
        {locationId && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent)', opacity: 0.7 }}>
            ID de Ubicación: {locationId}
          </div>
        )}
      </header>

      <main className="w-full">
        <PromptForm locationId={locationId} />
      </main>

      <footer style={{ marginTop: '4rem', padding: '2rem', borderTop: '1px solid var(--border)', width: '100%', textAlign: 'center' }}>
        <p className="text-dim" style={{ fontSize: '0.875rem' }}>
          &copy; 2026 Prompt Builder Agent. Built with FastAPI, LangGraph, Supabase & Langfuse.
        </p>
      </footer>
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navigation />
        <Routes>
          <Route path="/" element={<FormPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
