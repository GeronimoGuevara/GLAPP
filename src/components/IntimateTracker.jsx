import { useState, useEffect } from 'react';
import { Flame, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { addIntimateмомент, getIntimateMoments } from '../lib/database';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function IntimateTracker() {
  const [moments, setMoments] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMoment, setNewMoment] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    notes: ''
  });

  useEffect(() => {
    loadMoments();
  }, []);

  const loadMoments = async () => {
    const result = await getIntimateMoments(50);
    if (result.success) {
      setMoments(result.data);
    }
  };

  const handleAddMoment = async (e) => {
    e.preventDefault();
    const datetime = `${newMoment.date}T${newMoment.time}:00`;
    const result = await addIntimateмомент(datetime, newMoment.notes);
    
    if (result.success) {
      loadMoments();
      setNewMoment({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        notes: ''
      });
      setShowAddForm(false);
    }
  };

  // Calcular estadísticas
  const calculateStats = () => {
    if (moments.length === 0) return null;

    const now = new Date();
    const lastMoment = parseISO(moments[0].moment_date);
    const daysSinceLast = differenceInDays(now, lastMoment);

    // Momentos este mes
    const thisMonth = moments.filter(m => {
      const date = parseISO(m.moment_date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    // Promedio por mes (últimos 3 meses)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentMoments = moments.filter(m => {
      const date = parseISO(m.moment_date);
      return date >= threeMonthsAgo;
    });
    const avgPerMonth = Math.round(recentMoments.length / 3);

    return {
      total: moments.length,
      daysSinceLast,
      thisMonth,
      avgPerMonth
    };
  };

  const stats = calculateStats();

  // Agrupar por mes
  const groupByMonth = () => {
    const grouped = {};
    
    moments.forEach(moment => {
      const date = parseISO(moment.moment_date);
      const monthKey = format(date, 'MMMM yyyy', { locale: es });
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(moment);
    });

    return grouped;
  };

  const groupedMoments = groupByMonth();

  return (
    <div className="intimate-tracker-view">
      <div className="view-header">
        <h2>Momentos Íntimos</h2>
        <button className="add-btn" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={20} />
          Agregar
        </button>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="stats-cards">
          <div className="stat-card-large intimate-stat">
            <Flame className="stat-icon" />
            <div className="stat-content">
              <span className="stat-label">Último momento</span>
              <span className="stat-value-large">
                {stats.daysSinceLast === 0 
                  ? 'Hoy' 
                  : stats.daysSinceLast === 1 
                    ? 'Ayer' 
                    : `Hace ${stats.daysSinceLast} días`}
              </span>
            </div>
          </div>

          <div className="stat-card-large">
            <CalendarIcon className="stat-icon" />
            <div className="stat-content">
              <span className="stat-label">Este mes</span>
              <span className="stat-value-large">{stats.thisMonth}</span>
              <span className="stat-detail">Promedio: {stats.avgPerMonth}/mes</span>
            </div>
          </div>

          <div className="stat-card-large">
            <div className="stat-content">
              <span className="stat-label">Total registrado</span>
              <span className="stat-value-large">{stats.total}</span>
            </div>
          </div>
        </div>
      )}

      {/* Formulario para agregar momento */}
      {showAddForm && (
        <div className="add-form-card">
          <h3>Registrar Momento</h3>
          <form onSubmit={handleAddMoment}>
            <div className="form-row">
              <div className="form-group">
                <label>Fecha</label>
                <input
                  type="date"
                  value={newMoment.date}
                  onChange={(e) => setNewMoment({...newMoment, date: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Hora (opcional)</label>
                <input
                  type="time"
                  value={newMoment.time}
                  onChange={(e) => setNewMoment({...newMoment, time: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notas privadas (opcional)</label>
              <textarea
                value={newMoment.notes}
                onChange={(e) => setNewMoment({...newMoment, notes: e.target.value})}
                placeholder="Detalles que quieran recordar..."
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historial agrupado por mes */}
      <div className="moments-history">
        <h3>Historial</h3>
        {moments.length === 0 ? (
          <div className="empty-state">
            <Flame size={48} />
            <p>Aún no hay momentos registrados</p>
            <p className="empty-hint">Este es un espacio privado solo para ustedes dos</p>
          </div>
        ) : (
          Object.entries(groupedMoments).map(([month, monthMoments]) => (
            <div key={month} className="month-group">
              <h4 className="month-header">{month}</h4>
              <div className="moments-list">
                {monthMoments.map(moment => {
                  const datetime = parseISO(moment.moment_date);
                  
                  return (
                    <div key={moment.id} className="moment-item">
                      <div className="moment-icon">
                        <Flame size={20} />
                      </div>
                      <div className="moment-info">
                        <span className="moment-date">
                          {format(datetime, "EEEE d 'de' MMMM", { locale: es })}
                        </span>
                        <span className="moment-time">
                          {format(datetime, 'HH:mm', { locale: es })}
                        </span>
                        {moment.notes && (
                          <p className="moment-notes">{moment.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
