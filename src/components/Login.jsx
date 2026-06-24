import { useState, useEffect } from 'react';
import { Heart, Lock, UserPlus, Users, Link as LinkIcon, Copy, CheckCircle, ArrowRight } from 'lucide-react';
import { getUserById, registerUser, createCouple, updateUserCouple, getCoupleByInviteCode, loginUser } from '../lib/database';
import toast from 'react-hot-toast';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('loading'); // loading, unlock, register, couple_setup, create_couple, join_couple, code_display
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState(null);
  const [unlockUser, setUnlockUser] = useState(null);
  
  // States for registration
  const [name, setName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [gender, setGender] = useState('mujer');
  const [newUserId, setNewUserId] = useState(null);
  
  // States for couple
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [partnerName, setPartnerName] = useState('');
  
  useEffect(() => {
    async function checkExistingSession() {
      const savedId = localStorage.getItem('registeredUserId');
      if (savedId) {
        try {
          const result = await getUserById(savedId);
          if (result.success) {
            setRegisteredUserId(savedId);
            setUnlockUser(result.data);
            setMode('unlock');
          } else {
            // Usuario ya no existe o db error, ir a registro
            localStorage.removeItem('registeredUserId');
            setMode('register');
          }
        } catch (e) {
          setMode('register');
        }
      } else {
        setMode('register');
      }
    }
    checkExistingSession();
  }, []);

  

  

  const handleUnlock = (e) => {
    e.preventDefault();
    if (unlockUser.pin === pin) {
      onLogin(unlockUser);
    } else {
      setError('PIN incorrecto. Intenta de nuevo.');
      setPassword('');
    }
  };

  const handleLogoutDevice = () => {
    localStorage.removeItem('registeredUserId');
    localStorage.removeItem('glapp_token');
    setRegisteredUserId(null);
    setUnlockUser(null);
    setPassword('');
    setError('');
    setMode('register');
  };

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6 || !name || !userEmail) {
      setError('Completa tu nombre, email y una contraseña (mín 6 caracteres)');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    const res = await registerUser(name, userEmail, password, gender);
    setIsLoading(false);
    
    if (res.success) {
      setNewUserId(res.data.id);
      localStorage.setItem('registeredUserId', res.data.id); // Guardar para futura sesión
      setUnlockUser(res.data);
      setMode('couple_setup');
      setPassword('');
    } else {
      setError(res.error || 'Error al crear usuario');
    }
  };

  const handleLoginExisting = async (e) => {
    e.preventDefault();
    if (!password || !userEmail) {
      setError('Completa tu email y contraseña');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    const res = await loginUser(userEmail, password);
    setIsLoading(false);
    
    if (res.success) {
      // Guardar para futura sesión en este dispositivo
      localStorage.setItem('registeredUserId', res.data.id);
      
      if (res.data.couple_id) {
        // Ya tiene pareja, entramos directo
        onLogin(res.data);
      } else {
        // No tiene pareja, mandamos a configurarla
        setNewUserId(res.data.id);
        setUnlockUser(res.data);
        setMode('couple_setup');
      }
      setPassword('');
    } else {
      setError(res.error || 'Credenciales incorrectas');
      setPassword('');
    }
  };

  const handleCreateCouple = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const coupleRes = await createCouple(email);
    
    if (coupleRes.success) {
      const cId = coupleRes.data.id;
      const iCode = coupleRes.data.invite_code;
      
      const updateRes = await updateUserCouple(newUserId, cId);
      setIsLoading(false);
      
      if (updateRes.success) {
        setInviteCode(iCode);
        setMode('code_display');
        setUnlockUser(updateRes.data);
      } else {
        setError(updateRes.error || 'Error vinculando pareja');
      }
    } else {
      setIsLoading(false);
      setError(coupleRes.error || 'Error creando pareja');
    }
  };

  const handleJoinCouple = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const res = await getCoupleByInviteCode(inviteCode);
    
    if (res.success) {
      const cId = res.data.coupleId;
      setPartnerName(res.data.partnerName);
      
      const updateRes = await updateUserCouple(newUserId, cId);
      setIsLoading(false);
      
      if (updateRes.success) {
        setUnlockUser(updateRes.data);
        toast.success(`¡Te uniste a la pareja de ${res.data.partnerName}!`);
        onLogin(updateRes.data);
      } else {
        setError(updateRes.error || 'Error al vincularte a la pareja');
      }
    } else {
      setIsLoading(false);
      setError(res.error || 'Código incorrecto');
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success('¡Código copiado!');
  };

  
  
  if (mode === 'loading') {
    return (
      <div className="login-screen">
        <div className="login-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        
        {/* MODO DESBLOQUEO (PIN) */}
        {mode === 'unlock' && (
          <>
            <div className="login-header">
              {unlockUser?.avatar ? (
                <img src={unlockUser.avatar} alt="Avatar" className="login-avatar-preview" style={{width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1rem'}} />
              ) : (
                <Heart className="login-icon" size={64} />
              )}
              <h1>Hola, {unlockUser?.name}</h1>
              <p>Ingresa tu contraseña para entrar</p>
            </div>
            <form onSubmit={handleUnlock} className="login-form">
              <div className="form-group" style={{ marginBottom: '1rem' }}><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tu Contraseña" required style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '1rem' }} /></div>
              {error && <div className="error-message">{error}</div>}
              <button type="submit" className="pin-btn enter" disabled={isLoading} style={{ width: '100%', marginTop: '1rem' }}>Entrar</button>
              <button 
                type="button" 
                onClick={handleLogoutDevice}
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: 'none', background: 'transparent', color: 'var(--text-light)', marginTop: '1rem', cursor: 'pointer' }}
              >
                Cerrar sesión en este dispositivo
              </button>
            </form>
          </>
        )}

        {/* MODO REGISTRO (Nuevo Dispositivo) */}
        {mode === 'register' && (
          <>
            <div className="login-header">
              <UserPlus className="login-icon" size={48} />
              <h1>Crea tu cuenta</h1>
              <p>Solo tomará un minuto</p>
            </div>
            <form onSubmit={handleRegisterUser} className="login-form">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', textAlign: 'left', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: '500' }}>Tu Nombre</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Ej: Juan" 
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '1rem' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', textAlign: 'left', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: '500' }}>Tu Correo Electrónico</label>
                <input 
                  type="email" 
                  value={userEmail} 
                  onChange={(e) => setUserEmail(e.target.value)} 
                  placeholder="ejemplo@correo.com" 
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '1rem' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', textAlign: 'left', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: '500' }}>Género</label>
                <select 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '1rem' }}
                >
                  <option value="mujer">Mujer</option>
                  <option value="hombre">Hombre</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', textAlign: 'left', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: '500' }}>Crea una Contraseña (mín. 6 caracteres)</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ingresa tu contraseña" required style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '1rem' }} />
              </div>
              
              {error && <div className="error-message">{error}</div>}
              <button type="submit" className="pin-btn enter" disabled={isLoading} style={{ width: '100%', marginTop: '1rem' }}>Registrarme</button>
              
              <button 
                type="button" 
                onClick={() => {
                  setMode('login_existing');
                  setPassword('');
                  setError('');
                }}
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: 'none', background: 'transparent', color: 'var(--text)', marginTop: '1rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ¿Ya tienes una cuenta? Entrar
              </button>
            </form>
          </>
        )}

        {/* MODO INGRESAR EXISTENTE */}
        {mode === 'login_existing' && (
          <>
            <div className="login-header">
              <UserPlus className="login-icon" size={48} />
              <h1>Entrar</h1>
              <p>Busca tu cuenta existente</p>
            </div>
            <form onSubmit={handleLoginExisting} className="login-form">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', textAlign: 'left', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: '500' }}>Tu Correo Electrónico</label>
                <input 
                  type="email" 
                  value={userEmail} 
                  onChange={(e) => setUserEmail(e.target.value)} 
                  placeholder="ejemplo@correo.com" 
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '1rem' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', textAlign: 'left', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: '500' }}>Tu Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ingresa tu contraseña" required style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '1rem' }} />
              </div>
              
              {error && <div className="error-message">{error}</div>}
              <button type="submit" className="pin-btn enter" disabled={isLoading} style={{ width: '100%', marginTop: '1rem' }}>Entrar</button>

              <button 
                type="button" 
                onClick={() => {
                  setMode('register');
                  setPassword('');
                  setError('');
                }}
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: 'none', background: 'transparent', color: 'var(--text-light)', marginTop: '1rem', cursor: 'pointer' }}
              >
                Volver a Registro
              </button>
            </form>
          </>
        )}

        {/* MODO SELECCION PAREJA */}
        {mode === 'couple_setup' && (
          <>
            <div className="login-header">
              <Users className="login-icon" size={48} />
              <h1>¡Cuenta Creada!</h1>
              <p>Ahora, vincúlate con tu pareja</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
              <button 
                onClick={() => setMode('create_couple')}
                style={{ padding: '1rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Heart size={20} />
                Crear Nueva Pareja
              </button>
              <button 
                onClick={() => setMode('join_couple')}
                style={{ padding: '1rem', borderRadius: '12px', border: '2px solid var(--primary)', background: 'transparent', color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <LinkIcon size={20} />
                Unirme a una Pareja
              </button>
            </div>
          </>
        )}

        {/* MODO CREAR PAREJA */}
        {mode === 'create_couple' && (
          <>
            <div className="login-header">
              <Heart className="login-icon" size={48} />
              <h1>Crear Pareja</h1>
              <p>Asocia un correo (opcional) para notificaciones futuras</p>
            </div>
            <form onSubmit={handleCreateCouple} className="login-form">
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="ejemplo@correo.com" 
                  style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '1.1rem', textAlign: 'center' }}
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              
              <button 
                type="submit" 
                disabled={isLoading}
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                {isLoading ? 'Generando código...' : 'Generar Código'}
              </button>
              
              <button 
                type="button" 
                onClick={() => setMode('couple_setup')}
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: 'none', background: 'transparent', color: 'var(--text-light)', marginTop: '1rem', cursor: 'pointer' }}
              >
                Volver
              </button>
            </form>
          </>
        )}

        {/* MODO UNIRSE A PAREJA */}
        {mode === 'join_couple' && (
          <>
            <div className="login-header">
              <LinkIcon className="login-icon" size={48} />
              <h1>Unirse a Pareja</h1>
              <p>Ingresa el código que te compartió tu pareja</p>
            </div>
            <form onSubmit={handleJoinCouple} className="login-form">
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <input 
                  type="text" 
                  value={inviteCode} 
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())} 
                  placeholder="X Y Z 1 2 3" 
                  maxLength={6}
                  required
                  style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '2px dashed var(--primary)', background: 'var(--background)', color: 'var(--text)', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.5rem', textTransform: 'uppercase' }}
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              
              <button 
                type="submit" 
                disabled={isLoading || inviteCode.length < 6}
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                {isLoading ? 'Verificando...' : 'Unirme'}
              </button>
              
              <button 
                type="button" 
                onClick={() => setMode('couple_setup')}
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: 'none', background: 'transparent', color: 'var(--text-light)', marginTop: '1rem', cursor: 'pointer' }}
              >
                Volver
              </button>
            </form>
          </>
        )}

        {/* MODO MOSTRAR CODIGO CREADO */}
        {mode === 'code_display' && (
          <>
            <div className="login-header">
              <CheckCircle className="login-icon" size={48} style={{ color: '#4ade80' }} />
              <h1>¡Pareja Creada!</h1>
              <p>Comparte este código con tu pareja para que se una</p>
            </div>
            <div className="code-display" style={{ background: 'var(--background)', padding: '2rem', borderRadius: '12px', margin: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 'bold', letterSpacing: '0.5rem', color: 'var(--text)' }}>
                {inviteCode}
              </span>
              <button 
                onClick={copyInviteCode}
                style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <Copy size={16} /> Copiar
              </button>
            </div>
            
            <button 
              onClick={() => onLogin(unlockUser)}
              style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              Entrar a la App <ArrowRight size={20} />
            </button>
          </>
        )}

      </div>
    </div>
  );
}
