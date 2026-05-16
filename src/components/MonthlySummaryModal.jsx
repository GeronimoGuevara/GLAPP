import React, { useEffect, useState } from 'react';
import { Trophy, Heart, Flame, X, Users, Award } from 'lucide-react';
import { getMonthlySummary } from '../lib/database';

export default function MonthlySummaryModal({ user, year, month, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const prevMonthName = monthNames[month - 1]; // month comes as 1-12

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      const res = await getMonthlySummary(user.couple_id, year, month);
      if (res.success) {
        setSummary(res.data);
      }
      setLoading(false);
    };

    if (user?.couple_id) {
      fetchSummary();
    }
  }, [user, year, month]);

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  // Lógica de quién ganó la memoria
  let memoryWinner = "Empate";
  let memoryText = "No hay récords este mes.";
  
  if (summary?.memoryGame && summary.memoryGame.length > 0) {
    if (summary.memoryGame.length === 1) {
      memoryWinner = summary.memoryGame[0].player_name;
      memoryText = `¡Único participante con ${summary.memoryGame[0].best_score} movimientos!`;
    } else {
      const p1 = summary.memoryGame[0];
      const p2 = summary.memoryGame[1];
      if (p1.best_score === p2.best_score) {
        memoryWinner = "Empate";
        memoryText = `Ambos lograron ${p1.best_score} movimientos.`;
      } else {
        // Ordenado ASC, así que p1 es el menor (mejor)
        memoryWinner = p1.player_name;
        memoryText = `¡Ganó con ${p1.best_score} movimientos contra los ${p2.best_score} de ${p2.player_name}!`;
      }
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, animation: 'fadeIn 0.3s' }}>
      <div className="modal-content" style={{ maxWidth: '350px', width: '95%', maxHeight: '95vh', overflowY: 'auto', background: 'var(--background)', padding: '1rem' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>
            <Award size={20} /> Resumen de {prevMonthName}
          </h2>
          <button className="icon-btn" onClick={onClose} style={{ color: 'var(--text-light)', padding: '0.25rem' }}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          
          {/* Actividad Íntima */}
          <div style={{ background: 'var(--surface)', padding: '0.5rem', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-10px', opacity: 0.1, color: 'var(--primary)' }}>
              <Flame size={80} />
            </div>
            <h3 style={{ margin: '0', color: 'var(--text)', fontSize: '0.95rem', position: 'relative', zIndex: 1 }}>Pasión del Mes</h3>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', position: 'relative', zIndex: 1 }}>
              <Heart fill="var(--primary)" color="var(--primary)" size={18} />
              <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', lineHeight: 1 }}>{summary?.intimateCount || 0}</span>
            </div>
            <p style={{ margin: '0', color: 'var(--text-light)', fontSize: '0.75rem', position: 'relative', zIndex: 1 }}>momentos íntimos</p>
          </div>

          {/* Campeón Interno */}
          <div style={{ background: 'linear-gradient(135deg, rgba(255,107,157,0.1) 0%, rgba(255,142,155,0.1) 100%)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255,107,157,0.3)' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.95rem' }}>
              <Trophy size={16} /> Campeón: Memoria
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'var(--primary)', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', flexShrink: 0 }}>
                {memoryWinner.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.1rem 0', fontSize: '0.95rem', color: 'var(--text)' }}>{memoryWinner}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)', lineHeight: '1.2' }}>{memoryText}</p>
              </div>
            </div>
          </div>

          {/* Ligas Externas */}
          {summary?.leagues && summary.leagues.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.95rem' }}>
                <Users size={16} /> Ligas
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {summary.leagues.map((league, idx) => {
                  const wePlayed = league.myBest !== null;
                  const theyPlayed = league.opponentBest !== null;
                  
                  let statusStr = "Pendiente";
                  let statusColor = "var(--text-light)";
                  
                  if (wePlayed && theyPlayed) {
                    if (league.myBest < league.opponentBest) {
                      statusStr = "Victoria";
                      statusColor = "var(--success)";
                    } else if (league.myBest > league.opponentBest) {
                      statusStr = "Derrota";
                      statusColor = "var(--danger)";
                    } else {
                      statusStr = "Empate";
                      statusColor = "var(--warning)";
                    }
                  } else if (wePlayed && !theyPlayed) {
                    statusStr = "Sin rival";
                    statusColor = "var(--success)";
                  } else if (!wePlayed && theyPlayed) {
                    statusStr = "Falta jugar";
                    statusColor = "var(--danger)";
                  }

                  return (
                    <div key={idx} style={{ background: 'var(--surface)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text)', fontSize: '0.8rem' }}>vs {league.opponentNames}</span>
                        <span style={{ fontWeight: 'bold', color: statusColor, fontSize: '0.75rem', textTransform: 'uppercase' }}>{statusStr}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-light)' }}>
                        <span>Nosotros: {wePlayed ? league.myBest : '-'}</span>
                        <span>Ellos: {theyPlayed ? league.opponentBest : '-'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        <div style={{ marginTop: '0.5rem' }}>
          <button className="btn-primary" style={{ width: '100%', margin: 0, padding: '0.65rem', fontSize: '0.95rem' }} onClick={onClose}>
            ¡A por un nuevo mes!
          </button>
        </div>
      </div>
    </div>
  );
}
