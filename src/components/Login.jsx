import { useState, useEffect } from 'react';
import { Heart, Lock } from 'lucide-react';
import { getUsers } from '../lib/database';

export default function Login({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar usuarios desde la base de datos
  useEffect(() => {
    async function fetchUsers() {
      try {
        const result = await getUsers();
        if (result.success) {
          setUsers(result.data);
        } else {
          setError('Error al cargar usuarios de la base de datos.');
        }
      } catch (err) {
        setError('Error de red al conectar con la base de datos.');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUsers();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const user = users.find(u => u.pin === pin);
    
    if (user) {
      onLogin(user);
      setError('');
    } else {
      setError('PIN incorrecto. Intenta de nuevo.');
      setPin('');
    }
  };

  const handlePinInput = (digit) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-header">
          <Heart className="login-icon" size={64} />
          <h1>Nuestros Momentos</h1>
          <p>Tu app privada de pareja</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="pin-display">
            <Lock size={20} />
            <div className="pin-dots">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`pin-dot ${i < pin.length ? 'filled' : ''}`}
                />
              ))}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="pin-pad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                type="button"
                className="pin-btn"
                onClick={() => handlePinInput(num.toString())}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className="pin-btn clear"
              onClick={handleClear}
            >
              Borrar
            </button>
            <button
              type="button"
              className="pin-btn"
              onClick={() => handlePinInput('0')}
            >
              0
            </button>
            <button
              type="submit"
              className="pin-btn enter"
              disabled={pin.length !== 4}
            >
              OK
            </button>
          </div>
        </form>

        <div className="login-hint">
          <p>💡 Hint: PINs por defecto son 1234 y 5678</p>
          <p className="hint-small">Cámbialos en el código</p>
        </div>
      </div>
    </div>
  );
}
