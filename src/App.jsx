import { useState, useEffect } from 'react';
import { Heart, Calendar, Flame, Utensils, Lightbulb, Gamepad2, Pill } from 'lucide-react';
import Login from './components/Login';
import MonthlySummaryModal from './components/MonthlySummaryModal';
import { Suspense, lazy } from 'react';
import './styles/App.css';

const CycleTracker = lazy(() => import('./components/CycleTracker'));
const IntimateTracker = lazy(() => import('./components/IntimateTracker'));
const DateIdeas = lazy(() => import('./components/DateIdeas'));
const MealIdeas = lazy(() => import('./components/MealIdeas'));
const Games = lazy(() => import('./components/Games'));
const MedicationTracker = lazy(() => import('./components/MedicationTracker'));
import { Toaster } from 'react-hot-toast';
import { getDashboardData, getMonthlySummary } from './lib/database';
import ProfileModal from './components/ProfileModal';


function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      const token = localStorage.getItem('glapp_token');
      
      // Si hay usuario pero no hay token, forzamos cierre de sesión para migrar a JWT
      if (savedUser && savedUser !== 'undefined' && !token) {
        console.warn("Usuario encontrado pero sin token de seguridad. Forzando cierre de sesión.");
        localStorage.removeItem('currentUser');
        return null;
      }

      return savedUser && savedUser !== 'undefined' ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Error parsing currentUser from localStorage", e);
      localStorage.removeItem('currentUser');
      return null;
    }
  });
  const [activeView, setActiveView] = useState('home');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);
  const [summaryDate, setSummaryDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });

  // Verificar si hay usuario guardado en localStorage
  useEffect(() => {

    // Check for monthly summary
    const checkSummary = async () => {
      if (currentUser && currentUser.couple_id) {
        const today = new Date();
        const currentMonthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
        const lastSeenSummary = localStorage.getItem(`lastSeenSummary_${currentUser.couple_id}`);

        if (lastSeenSummary !== currentMonthStr) {
          let prevMonth = today.getMonth();
          let prevYear = today.getFullYear();
          if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
          }
          
          try {
            const res = await getMonthlySummary(currentUser.couple_id, prevYear, prevMonth);
            let hasData = false;
            
            if (res.success && res.data) {
              const hasIntimate = Number(res.data.intimateCount) > 0;
              const hasGame = res.data.memoryGame && res.data.memoryGame.length > 0;
              const hasLeagueData = res.data.leagues && res.data.leagues.some(l => l.myBest !== null || l.opponentBest !== null);
              hasData = hasIntimate || hasGame || hasLeagueData;
            }

            if (!hasData) {
              localStorage.setItem(`lastSeenSummary_${currentUser.couple_id}`, currentMonthStr);
            } else {
              setSummaryDate({ year: prevYear, month: prevMonth });
              setShowMonthlySummary(true);
            }
          } catch (e) {
            console.error("Error al revisar el resumen mensual:", e);
          }
        }
      }
    };

    const summaryTimer = setTimeout(checkSummary, 1500);
    return () => clearTimeout(summaryTimer);
  }, [currentUser]);

  const handleCloseMonthlySummary = () => {
    if (currentUser && currentUser.couple_id) {
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
      localStorage.setItem(`lastSeenSummary_${currentUser.couple_id}`, currentMonthStr);
    }
    setShowMonthlySummary(false);
  };

  const handleShowPreviousMonthSummary = () => {
    const today = new Date();
    let prevMonth = today.getMonth();
    let prevYear = today.getFullYear();
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    setSummaryDate({ year: prevYear, month: prevMonth });
    setShowMonthlySummary(true);
    setIsProfileOpen(false); // Cerramos el perfil para que no tape
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('glapp_token');
    setActiveView('home');
    setIsProfileOpen(false);
  };

  const handleUserUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

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
        
        {currentUser && (
          <div className="header-user-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              className="avatar-container" 
              onClick={() => setIsProfileOpen(true)}
              style={{ cursor: 'pointer' }}
            >
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', border: '2px solid white' }}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {isProfileOpen && currentUser && (
        <ProfileModal 
          user={currentUser} 
          onClose={() => setIsProfileOpen(false)} 
          onLogout={handleLogout}
          onUserUpdate={handleUserUpdate}
          onShowSummary={handleShowPreviousMonthSummary}
        />
      )}

      {showMonthlySummary && (
        <MonthlySummaryModal
          user={currentUser}
          year={summaryDate.year}
          month={summaryDate.month}
          onClose={handleCloseMonthlySummary}
        />
      )}

      <main className="app-main">
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--primary)' }}>
            <Heart size={32} className="spinner" />
          </div>
        }>
          {renderView()}
        </Suspense>
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

function Home({ user, setActiveView }) {
  const dashboardCacheKey = user?.couple_id ? `dashboard_${user.couple_id}` : null;
  const getCachedDashboard = () => {
    if (!dashboardCacheKey) return null;
    try {
      const cached = localStorage.getItem(dashboardCacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      localStorage.removeItem(dashboardCacheKey);
      return null;
    }
  };

  const cachedDashboard = getCachedDashboard();
  const [nextCycleDays, setNextCycleDays] = useState(() => cachedDashboard?.nextCycleDays ?? null);
  const [lastMomentDays, setLastMomentDays] = useState(() => cachedDashboard?.lastMomentDays ?? null);
  const [isLoading, setIsLoading] = useState(() => !cachedDashboard);

  useEffect(() => {
    async function loadDashboardData() {
      const cached = getCachedDashboard();
      if (cached) {
        setNextCycleDays(cached.nextCycleDays ?? 'No hay registro');
        setLastMomentDays(cached.lastMomentDays ?? 'No hay registro');
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      try {
        const result = await getDashboardData(user.couple_id, user.id);
        if (!result.success) {
          throw new Error(result.error);
        }

        const freshDashboard = {
          nextCycleDays: result.data.nextCycleDays ?? 'No hay registro',
          lastMomentDays: result.data.lastMomentDays ?? 'No hay registro',
          savedAt: Date.now()
        };

        localStorage.setItem(dashboardCacheKey, JSON.stringify(freshDashboard));
        setNextCycleDays(freshDashboard.nextCycleDays);
        setLastMomentDays(freshDashboard.lastMomentDays);
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
        if (!cached) {
          setNextCycleDays('No hay registro');
          setLastMomentDays('No hay registro');
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    if (user && user.id && user.couple_id) {
      loadDashboardData();
    }
  }, [user, dashboardCacheKey]);

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


