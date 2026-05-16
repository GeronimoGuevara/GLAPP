import { useState, useEffect } from 'react';
import { Heart, Calendar, Flame, Utensils, Lightbulb, Gamepad2, Pill } from 'lucide-react';
import Login from './components/Login';
import CycleTracker from './components/CycleTracker';
import IntimateTracker from './components/IntimateTracker';
import DateIdeas from './components/DateIdeas';
import MealIdeas from './components/MealIdeas';
import Games from './components/Games';
import MedicationTracker from './components/MedicationTracker';
import './styles/App.css';
import { Toaster } from 'react-hot-toast';
import { initializeTables, getCycles, getIntimateMoments, getCycleSettings } from './lib/database';


function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState('home');

  // Verificar si hay usuario guardado en localStorage
    useEffect(() => {
    // Esto se ejecuta una sola vez cuando la app carga por primera vez
    const initDb = async () => {
      try {
        console.log("Iniciando creación de tablas...");
        const result = await initializeTables();
        if (result.success) {
          console.log("¡Tablas inicializadas OK!");
        } else {
          console.error("Fallo al crear las tablas:", result.error);
        }
      } catch (err) {
        console.error("Error inesperado al crear tablas:", err);
      }
    };

    initDb();
  }, []); // Los corchetes vacíos aseguran que solo se ejecute 1 vez


  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setActiveView('home');
  };

  // Si no está logueado, mostrar pantalla de login
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Renderizar la vista activa
  const renderView = () => {
    switch (activeView) {
      case 'cycle':
        return <CycleTracker user={currentUser} />;
      case 'intimate':
        return <IntimateTracker user={currentUser} />;
      case 'dates':
        return <DateIdeas user={currentUser} />;
      case 'meals':
        return <MealIdeas user={currentUser} />;
      case 'games':
        return <Games user={currentUser} />;
      case 'medications':
        return <MedicationTracker user={currentUser} />;
      default:
        return <Home user={currentUser} setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="app">
      <Toaster position="top-center" reverseOrder={false} />
      <header className="app-header">
        <div className="header-content">
          <Heart className="header-icon" />
          <h1>Nuestros Momentos</h1>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Salir
        </button>
      </header>

      <main className="app-main">
        {renderView()}
      </main>

      <nav className="app-nav">
        <button
          className={`nav-btn ${activeView === 'home' ? 'active' : ''}`}
          onClick={() => setActiveView('home')}
        >
          <Heart size={24} />
          <span>Inicio</span>
        </button>
        <button
          className={`nav-btn ${activeView === 'cycle' ? 'active' : ''}`}
          onClick={() => setActiveView('cycle')}
        >
          <Calendar size={24} />
          <span>Ciclo</span>
        </button>
        <button
          className={`nav-btn ${activeView === 'medications' ? 'active' : ''}`}
          onClick={() => setActiveView('medications')}
        >
          <Pill size={24} />
          <span>Pastillas</span>
        </button>
        <button
          className={`nav-btn ${activeView === 'intimate' ? 'active' : ''}`}
          onClick={() => setActiveView('intimate')}
        >
          <Flame size={24} />
          <span>Momentos</span>
        </button>
        <button
          className={`nav-btn ${activeView === 'dates' ? 'active' : ''}`}
          onClick={() => setActiveView('dates')}
        >
          <Lightbulb size={24} />
          <span>Citas</span>
        </button>
        <button
          className={`nav-btn ${activeView === 'meals' ? 'active' : ''}`}
          onClick={() => setActiveView('meals')}
        >
          <Utensils size={24} />
          <span>Comidas</span>
        </button>
        <button
          className={`nav-btn ${activeView === 'games' ? 'active' : ''}`}
          onClick={() => setActiveView('games')}
        >
          <Gamepad2 size={24} />
          <span>Juegos</span>
        </button>
      </nav>
    </div>
  );
}

// Componente de Home/Dashboard
function Home({ user, setActiveView }) {
  const [nextCycleDays, setNextCycleDays] = useState(null);
  const [lastMomentDays, setLastMomentDays] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true);
        // Cargar últimos ciclos
        const cyclesRes = await getCycles(user.couple_id, 1);
        const settingsRes = await getCycleSettings(user.couple_id);
        
        if (cyclesRes.success && cyclesRes.data.length > 0) {
          const lastCycle = cyclesRes.data[0];
          // Usar cycle_duration de la configuración global, o 28 por defecto
          const cycleLength = (settingsRes.success && settingsRes.data?.cycle_duration) ? settingsRes.data.cycle_duration : 28;
          const startDate = new Date(lastCycle.start_date);
          const nextCycleDate = new Date(startDate);
          nextCycleDate.setDate(startDate.getDate() + cycleLength);
          
          const today = new Date();
          const diffTime = nextCycleDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          setNextCycleDays(diffDays);
        } else {
          setNextCycleDays('No hay registro');
        }

        // Cargar últimos momentos íntimos
        const momentsRes = await getIntimateMoments(user.couple_id, 1);
        if (momentsRes.success && momentsRes.data.length > 0) {
          const lastMoment = momentsRes.data[0];
          const momentDate = new Date(lastMoment.moment_date);
          const today = new Date();
          const diffTime = today - momentDate;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          setLastMomentDays(diffDays);
        } else {
          setLastMomentDays('No hay registro');
        }

      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
        setNextCycleDays('No hay registro');
        setLastMomentDays('No hay registro');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (user && user.id) {
      loadDashboardData();
    }
  }, [user]);

  const renderCycleInfo = () => {
    if (isLoading) return "Cargando...";
    if (nextCycleDays === 'No hay registro') return nextCycleDays;
    
    if (nextCycleDays < 0) {
      return `Con retraso (${Math.abs(nextCycleDays)} días)`;
    } else if (nextCycleDays === 0) {
      return "¡Es hoy!";
    } else {
      return `En ${nextCycleDays} días`;
    }
  };

  const renderMomentInfo = () => {
    if (isLoading) return "Cargando...";
    if (lastMomentDays === 'No hay registro') return lastMomentDays;
    
    if (lastMomentDays === 0) {
      return "¡Hoy!";
    } else if (lastMomentDays === 1) {
      return "Ayer";
    } else {
      return `Hace ${lastMomentDays} días`;
    }
  };

  return (
    <div className="home-view">
      <div className="welcome-card">
        <h2>¡Hola {user.name}! 💕</h2>
        <p className="welcome-subtitle">
          Bienvenid{user.gender === 'hombre' ? 'o' : 'a'} a nuestra app privada
        </p>
      </div>

      <div className="quick-stats">
        <div 
          className="stat-card clickable" 
          onClick={() => setActiveView('cycle')}
          style={{ cursor: 'pointer' }}
        >
          <Calendar className="stat-icon" />
          <div className="stat-info">
            <span className="stat-label">Próximo ciclo</span>
            <span className="stat-value">{renderCycleInfo()}</span>
          </div>
        </div>

        <div 
          className="stat-card clickable" 
          onClick={() => setActiveView('intimate')}
          style={{ cursor: 'pointer' }}
        >
          <Flame className="stat-icon" />
          <div className="stat-info">
            <span className="stat-label">Último momento</span>
            <span className="stat-value">{renderMomentInfo()}</span>
          </div>
        </div>
      </div>

      <div className="feature-cards">
        <div 
          className="feature-card clickable" 
          onClick={() => setActiveView('dates')}
          style={{ cursor: 'pointer' }}
        >
          <Lightbulb size={32} />
          <h3>Ideas de Citas</h3>
          <p>Descubre nuevas actividades para hacer juntos</p>
        </div>

        <div 
          className="feature-card clickable" 
          onClick={() => setActiveView('meals')}
          style={{ cursor: 'pointer' }}
        >
          <Utensils size={32} />
          <h3>Recetas</h3>
          <p>Encuentra inspiración para cocinar juntos</p>
        </div>

        <div 
          className="feature-card clickable" 
          onClick={() => setActiveView('games')}
          style={{ cursor: 'pointer' }}
        >
          <Gamepad2 size={32} />
          <h3>Juegos</h3>
          <p>Diviértanse con juegos casuales</p>
        </div>
        
        <div 
          className="feature-card clickable" 
          onClick={() => setActiveView('medications')}
          style={{ cursor: 'pointer' }}
        >
          <Pill size={32} />
          <h3>Pastillas</h3>
          <p>Administra y toma tus pastillas</p>
        </div>
      </div>
    </div>
  );
}

export default App;
