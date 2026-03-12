import { useState, useEffect } from 'react';
import { Calendar, Plus, TrendingUp } from 'lucide-react';
import { addCycle, getCycles } from '../lib/database';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CycleTracker({ userId }) {
  const [cycles, setCycles] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCycle, setNewCycle] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    notes: ''
  });

  useEffect(() => {
    loadCycles();
  }, []);

  const loadCycles = async () => {
    const result = await getCycles(userId, 12);
    if (result.success) {
      setCycles(result.data);
    }
  };

  const handleAddCycle = async (e) => {
    e.preventDefault();
    const result = await addCycle(
      userId,
      newCycle.startDate,
      newCycle.endDate || null,
      newCycle.notes
    );
    
    if (result.success) {
      loadCycles();
      setNewCycle({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: '',
        notes: ''
      });
      setShowAddForm(false);
    }
  };

  // Calcular estadísticas
  const calculateStats = () => {
    if (cycles.length < 2) return null;

    // Calcular ciclo promedio
    let totalDays = 0;
    let cycleCount = 0;

    for (let i = 0; i < cycles.length - 1; i++) {
      const current = parseISO(cycles[i].start_date);
      const next = parseISO(cycles[i + 1].start_date);
      const diff = differenceInDays(current, next);
      if (diff > 0 && diff < 50) { // Filtrar valores anómalos
        totalDays += diff;
        cycleCount++;
      }
    }

    const averageCycle = cycleCount > 0 ? Math.round(totalDays / cycleCount) : 28;

    // Predecir próximo ciclo
    const lastCycle = parseISO(cycles[0].start_date);
    const nextPredicted = addDays(lastCycle, averageCycle);
    const daysUntilNext = differenceInDays(nextPredicted, new Date());

    return {
      averageCycle,
      nextPredicted,
      daysUntilNext
    };
  };

  const stats = calculateStats();

  // Determinar fase actual del ciclo
  const getCurrentPhase = () => {
    if (!cycles.length) return null;
    
    const lastCycle = parseISO(cycles[0].start_date);
    const daysSinceLast = differenceInDays(new Date(), lastCycle);
    
    if (daysSinceLast < 0) return null;
    if (daysSinceLast <= 5) return { name: 'Menstruación', color: '#ff6b9d', emoji: '🩸' };
    if (daysSinceLast <= 13) return { name: 'Folicular', color: '#a78bfa', emoji: '🌱' };
    if (daysSinceLast <= 16) return { name: 'Ovulación', color: '#fbbf24', emoji: '✨' };
    if (daysSinceLast <= 28) return { name: 'Lútea', color: '#60a5fa', emoji: '🌙' };
    
    return { name: 'Posible retraso', color: '#ef4444', emoji: '⚠️' };
  };

  const currentPhase = getCurrentPhase();

  return (
    <div className="cycle-tracker-view">
      <div className="view-header">
        <h2>Seguimiento de Ciclo</h2>
        <button className="add-btn" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={20} />
          Registrar
        </button>
      </div>

      {/* Estadísticas y predicción */}
      {stats && (
        <div className="stats-cards">
          <div className="stat-card-large">
            <Calendar className="stat-icon" />
            <div className="stat-content">
              <span className="stat-label">Próximo ciclo estimado</span>
              <span className="stat-value-large">
                {stats.daysUntilNext > 0 
                  ? `En ${stats.daysUntilNext} días` 
                  : `Hace ${Math.abs(stats.daysUntilNext)} días`}
              </span>
              <span className="stat-detail">
                {format(stats.nextPredicted, "d 'de' MMMM", { locale: es })}
              </span>
            </div>
          </div>

          <div className="stat-card-large">
            <TrendingUp className="stat-icon" />
            <div className="stat-content">
              <span className="stat-label">Ciclo promedio</span>
              <span className="stat-value-large">{stats.averageCycle} días</span>
            </div>
          </div>

          {currentPhase && (
            <div className="stat-card-large phase-card" style={{ borderColor: currentPhase.color }}>
              <span className="phase-emoji">{currentPhase.emoji}</span>
              <div className="stat-content">
                <span className="stat-label">Fase actual</span>
                <span className="stat-value-large" style={{ color: currentPhase.color }}>
                  {currentPhase.name}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formulario para agregar ciclo */}
      {showAddForm && (
        <div className="add-form-card">
          <h3>Registrar Nuevo Ciclo</h3>
          <form onSubmit={handleAddCycle}>
            <div className="form-group">
              <label>Fecha de inicio</label>
              <input
                type="date"
                value={newCycle.startDate}
                onChange={(e) => setNewCycle({...newCycle, startDate: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Fecha de fin (opcional)</label>
              <input
                type="date"
                value={newCycle.endDate}
                onChange={(e) => setNewCycle({...newCycle, endDate: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Notas (opcional)</label>
              <textarea
                value={newCycle.notes}
                onChange={(e) => setNewCycle({...newCycle, notes: e.target.value})}
                placeholder="Síntomas, estado de ánimo, etc."
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Guardar Ciclo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historial de ciclos */}
      <div className="cycles-history">
        <h3>Historial</h3>
        {cycles.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <p>Aún no hay ciclos registrados</p>
            <p className="empty-hint">Agrega el primer registro para comenzar el seguimiento</p>
          </div>
        ) : (
          <div className="cycles-list">
            {cycles.map(cycle => {
              const startDate = parseISO(cycle.start_date);
              const endDate = cycle.end_date ? parseISO(cycle.end_date) : null;
              const duration = endDate ? differenceInDays(endDate, startDate) : null;

              return (
                <div key={cycle.id} className="cycle-item">
                  <div className="cycle-date">
                    <span className="cycle-month">
                      {format(startDate, 'MMM', { locale: es }).toUpperCase()}
                    </span>
                    <span className="cycle-day">{format(startDate, 'd')}</span>
                  </div>
                  <div className="cycle-info">
                    <span className="cycle-range">
                      {format(startDate, "d 'de' MMMM, yyyy", { locale: es })}
                      {endDate && ` - ${format(endDate, "d 'de' MMMM", { locale: es })}`}
                    </span>
                    {duration && <span className="cycle-duration">{duration} días de duración</span>}
                    {cycle.notes && <p className="cycle-notes">{cycle.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
