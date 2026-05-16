import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Dices, Heart, Trophy, Users, Copy, CheckCircle } from 'lucide-react';
import { saveGameScore, createCompetition, joinCompetition, getCompetitions } from '../lib/database';

export default function Games({ user }) {
  const [activeGame, setActiveGame] = useState(null);

  return (
    <div className="games-view">
      <div className="view-header">
        <h2>Juegos para Pareja</h2>
      </div>

      {!activeGame ? (
        <div className="games-menu">
          <div className="game-card" onClick={() => setActiveGame('trivia')}>
            <Heart size={48} />
            <h3>Trivia de Pareja</h3>
            <p>Preguntas sobre ustedes para conocerse mejor</p>
          </div>

          <div className="game-card" onClick={() => setActiveGame('dice')}>
            <Dices size={48} />
            <h3>Dados del Amor</h3>
            <p>Retos y actividades románticas aleatorias</p>
          </div>

          <div className="game-card" onClick={() => setActiveGame('memory')}>
            <Trophy size={48} />
            <h3>Memoria de Momentos</h3>
            <p>Juego de memoria con emojis de pareja</p>
          </div>

          <div className="game-card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', color: 'white' }} onClick={() => setActiveGame('leagues')}>
            <Users size={48} />
            <h3>Competir con Amigos</h3>
            <p>Crea o únete a ligas contra otras parejas</p>
          </div>
        </div>
      ) : (
        <div className="game-container">
          <button className="back-btn" onClick={() => setActiveGame(null)}>
            ← Volver
          </button>
          
          {activeGame === 'trivia' && <CoupleTrivia userName={user.name} />}
          {activeGame === 'dice' && <LoveDice />}
          {activeGame === 'memory' && <MemoryGame user={user} />}
          {activeGame === 'leagues' && <CoupleCompetitions user={user} />}
        </div>
      )}
    </div>
  );
}

// Juego 1: Trivia de Pareja
function CoupleTrivia({ userName }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);

  const questions = [
    { q: '¿Cuál es mi comida favorita?', type: 'text' },
    { q: '¿Qué me hace más feliz?', type: 'text' },
    { q: '¿Cuál es mi mayor sueño?', type: 'text' },
    { q: '¿Qué canción me recuerda a ti?', type: 'text' },
    { q: '¿Cuál fue nuestro primer beso?', type: 'text' },
    { q: '¿Qué es lo que más amo de ti?', type: 'text' },
    { q: '¿Cuál es mi película favorita?', type: 'text' },
    { q: '¿Qué destino quiero visitar contigo?', type: 'text' }
  ];

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      toast.success(`¡Juego terminado! Ahora comparen sus respuestas 💕`);
    }
  };

  return (
    <div className="trivia-game">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
        />
      </div>
      
      <div className="question-card">
        <span className="question-number">Pregunta {currentQuestion + 1} de {questions.length}</span>
        <h2>{questions[currentQuestion].q}</h2>
        
        <textarea
          placeholder="Escribe tu respuesta aquí..."
          className="answer-input"
          rows={4}
        />
        
        <button className="btn-primary" onClick={handleNext}>
          {currentQuestion < questions.length - 1 ? 'Siguiente →' : 'Terminar'}
        </button>
        
        <p className="trivia-hint">
          💡 Guarden turnos para responder y luego comparen
        </p>
      </div>
    </div>
  );
}

// Juego 2: Dados del Amor
function LoveDice() {
  const [result, setResult] = useState(null);
  const [isRolling, setIsRolling] = useState(false);

  const challenges = [
    { emoji: '💋', text: 'Beso de 10 segundos' },
    { emoji: '🤗', text: 'Abrazo apretado por 30 segundos' },
    { emoji: '💌', text: 'Di 3 cosas que amas de tu pareja' },
    { emoji: '🎵', text: 'Canten una canción romántica juntos' },
    { emoji: '📸', text: 'Selfie tonta y creativa' },
    { emoji: '✍️', text: 'Escriban una nota de amor corta' },
    { emoji: '🍫', text: 'Compartan un postre' },
    { emoji: '💆', text: 'Masaje de 5 minutos' },
    { emoji: '🎭', text: 'Imiten su primera cita' },
    { emoji: '🌟', text: 'Compartan su recuerdo favorito juntos' },
    { emoji: '🎨', text: 'Dibujen algo juntos' },
    { emoji: '🎬', text: 'Recreen una escena de su película favorita' },
    { emoji: '🤸‍♂️', text: 'El que pierda a piedra, papel o tijera hace 10 sentadillas' },
    { emoji: '😈', text: 'El ganador elige dónde le da un beso el perdedor (con ojos vendados)' },
    { emoji: '👔', text: 'El que pierde se tiene que sacar una prenda (y el ganador elige cuál)' },
    { emoji: '💦', text: 'Masajear una parte del cuerpo elegida por el otro' },
    { emoji: '🔞', text: 'Mandar un mensaje súper sarpado por WhatsApp estando sentados al lado' },
    { emoji: '📸', text: 'Permitirle al otro sacar una foto "atrevida" (y decidir juntos si se borra)' },
    { emoji: '💋', text: 'Beso con mordida de labio incluida, mínimo 15 segundos' },
    { emoji: '🧊', text: 'El perdedor se banca un hielo por la espalda' },
    { emoji: '💄', text: 'El perdedor deja que el ganador le pinte los labios con los ojos cerrados' },
    { emoji: '🤼', text: 'Jueguen una pulseada (y el que pierde invita algo rico)' },
    { emoji: '🧸', text: 'Abrazo de koala obligatorio por 2 minutos sin soltarse' },
    { emoji: '💬', text: 'Confiesa en voz alta algo que pensaste la primera vez que se vieron' },
    { emoji: '🤤', text: 'Decile a tu pareja qué es lo que más te calienta de él/ella' },
    { emoji: '🤫', text: 'El perdedor tiene que cumplir un capricho del ganador (dentro de lo razonable)' },
    { emoji: '🥺', text: 'Intercambien celulares y cambien el apodo del contacto por uno lindo' },
    { emoji: '✍️', text: 'Escribí algo lindo en la espalda de tu pareja con el dedo para que adivine' },
    { emoji: '🛋️', text: 'Acurrucarse en el sillón a hacer "cucharita" por 10 minutos' }
  ];

  const rollDice = () => {
    setIsRolling(true);
    setTimeout(() => {
      const random = challenges[Math.floor(Math.random() * challenges.length)];
      setResult(random);
      setIsRolling(false);
    }, 1000);
  };

  return (
    <div className="dice-game">
      <div className="dice-container">
        {!result ? (
          <div className="dice-welcome">
            <Dices size={80} className={isRolling ? 'rolling' : ''} />
            <h2>Dados del Amor</h2>
            <p>Tiren el dado y hagan el reto que salga</p>
          </div>
        ) : (
          <div className="dice-result">
            <span className="result-emoji">{result.emoji}</span>
            <h2>{result.text}</h2>
          </div>
        )}
        
        <button 
          className="btn-primary dice-btn" 
          onClick={rollDice}
          disabled={isRolling}
        >
          {isRolling ? 'Tirando...' : result ? 'Tirar de nuevo' : 'Tirar dado'}
        </button>
      </div>
    </div>
  );
}

// Juego 3: Memoria
function MemoryGame({ user }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);

  const emojis = ['💕', '💖', '💗', '💓', '💝', '💘', '❤️', '🧡'];

  const initGame = () => {
    const shuffled = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({ id: index, emoji }));
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setScoreSaved(false);
  };

  useState(() => {
    initGame();
  }, []);

  const handleClick = (index) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) {
      return;
    }

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(moves + 1);
      const [first, second] = newFlipped;
      
      if (cards[first].emoji === cards[second].emoji) {
        setMatched([...matched, first, second]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  const isWon = matched.length === cards.length && cards.length > 0;

  useEffect(() => {
    if (isWon && !scoreSaved && user?.couple_id) {
      setScoreSaved(true);
      saveGameScore(user.couple_id, 'Memoria Emoji', user.name, moves).then(res => {
        if (res.success) {
          toast.success(`Puntaje de ${moves} movimientos guardado!`);
        }
      });
    }
  }, [isWon, scoreSaved, user, moves]);

  return (
    <div className="memory-game">
      <div className="memory-header">
        <span>Movimientos: {moves}</span>
        <button className="btn-secondary" onClick={initGame}>Reiniciar</button>
      </div>

      {isWon && (
        <div className="win-message">
          <Trophy size={48} />
          <h2>¡Ganaron! 🎉</h2>
          <p>Completado en {moves} movimientos</p>
        </div>
      )}

      <div className="memory-grid">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className={`memory-card ${
              flipped.includes(index) || matched.includes(index) ? 'flipped' : ''
            }`}
            onClick={() => handleClick(index)}
          >
            <div className="card-front">?</div>
            <div className="card-back">{card.emoji}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente: Ligas de Parejas
function CoupleCompetitions({ user }) {
  const [competitions, setCompetitions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  const loadCompetitions = async () => {
    if (!user?.couple_id) return;
    setIsLoading(true);
    const res = await getCompetitions(user.couple_id);
    if (res.success) {
      setCompetitions(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCompetitions();
  }, [user]);

  const handleCreate = async () => {
    const res = await createCompetition(user.couple_id);
    if (res.success) {
      toast.success('¡Liga creada! Comparte el código con otra pareja.');
      loadCompetitions();
    } else {
      toast.error(res.error || 'Error al crear la liga');
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode) return;
    const res = await joinCompetition(user.couple_id, inviteCode);
    if (res.success) {
      toast.success('¡Te has unido a la liga!');
      setInviteCode('');
      loadCompetitions();
    } else {
      toast.error(res.error || 'Error al unirse');
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success('Código copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="spinner" style={{ margin: '2rem auto' }}></div>;
  }

  return (
    <div className="competitions-view" style={{ textAlign: 'left', padding: '1rem' }}>
      <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}><Users size={20} /> Unirse a una Liga</h3>
        <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            placeholder="Código de 6 letras" 
            value={inviteCode} 
            onChange={e => setInviteCode(e.target.value)}
            style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', textTransform: 'uppercase' }}
            maxLength={6}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0.8rem 1.5rem', margin: 0 }}>Unirse</button>
        </form>
        
        <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ height: '1px', background: 'var(--border)', flex: 1 }}></div>
          <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>O crea la tuya</span>
          <div style={{ height: '1px', background: 'var(--border)', flex: 1 }}></div>
        </div>
        
        <button onClick={handleCreate} className="btn-secondary" style={{ width: '100%', margin: 0 }}>Crear Nueva Liga</button>
      </div>

      <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>Tus Ligas Activas</h3>
      {competitions.length === 0 ? (
        <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '2rem 0' }}>Aún no compites contra nadie. ¡Crea una liga o únete a una!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {competitions.map(comp => (
            <div key={comp.id} style={{ background: 'var(--background)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <span style={{ display: 'inline-block', background: 'var(--surface)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                    CREADA EL {new Date(comp.created_at).toLocaleDateString()}
                  </span>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                    <strong>Tu pareja:</strong> {comp.couple_a_id === user.couple_id ? comp.couple_a_names?.join(' & ') : comp.couple_b_names?.join(' & ')}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)', marginTop: '0.25rem' }}>
                    <strong>Rivales:</strong> {comp.couple_b_id ? (comp.couple_a_id !== user.couple_id ? comp.couple_a_names?.join(' & ') : comp.couple_b_names?.join(' & ')) : <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Esperando rival...</span>}
                  </div>
                </div>
                
                <div 
                  onClick={() => handleCopyCode(comp.invite_code)}
                  style={{ background: 'var(--surface)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px dashed var(--primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--primary)' }}>{comp.invite_code}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    {copied === comp.invite_code ? <CheckCircle size={12} color="var(--success)" /> : <Copy size={12} />}
                    {copied === comp.invite_code ? 'Copiado' : 'Copiar'}
                  </span>
                </div>
              </div>

              {comp.couple_b_id && (
                <div style={{ background: 'rgba(255,107,157,0.1)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--primary)' }}>
                  <Trophy size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                  Las estadísticas comparativas se mostrarán en tu resumen mensual.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
