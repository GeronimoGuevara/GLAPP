import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pill, Clock, Bell, BellOff, Trash2, Edit2, Check, X } from 'lucide-react';
import { 
  getMedications, 
  addMedication, 
  updateMedication, 
  deleteMedication,
  getMedicationHistory,
  addMedicationLog
} from '../lib/database';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { checkNotificationPermission, testRealPushNotification } from '../lib/notifications';

export default function MedicationTracker({ userId, userName }) {
  const [medications, setMedications] = useState([]);
  const [history, setHistory] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    times: ['09:00'],
    notes: '',
    color: '#ff6b9d',
    icon: '💊'
  });

  useEffect(() => {
    loadMedications();
    loadHistory();
    checkNotificationPermission().then(enabled => {
      setNotificationsEnabled(enabled);
    });
  }, []);

  const loadMedications = async () => {
    const result = await getMedications(userId);
    if (result.success) {
      const parsed = result.data.map(med => ({
        ...med,
        times: JSON.parse(med.times)
      }));
      setMedications(parsed);
    }
  };

  const loadHistory = async () => {
    const result = await getMedicationHistory(userId, 30);
    if (result.success) {
      setHistory(result.data);
    }
  };

  const handleAddTime = () => {
    setNewMed({
      ...newMed,
      times: [...newMed.times, '09:00']
    });
  };

  const handleRemoveTime = (index) => {
    setNewMed({
      ...newMed,
      times: newMed.times.filter((_, i) => i !== index)
    });
  };

  const handleTimeChange = (index, value) => {
    const updated = [...newMed.times];
    updated[index] = value;
    setNewMed({ ...newMed, times: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const medData = {
      ...newMed,
      userId,
      isActive: true
    };

    let result;
    if (editingId) {
      result = await updateMedication(editingId, medData);
    } else {
      result = await addMedication(userId, medData);
    }

    if (result.success) {
      // Intentar suscribir el celular silenciosamente si ya hay permiso (Push en Background)
      if (notificationsEnabled) {
         checkNotificationPermission(false, userId);
      }

      loadMedications();
      resetForm();
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Segura que quieres eliminar este medicamento?')) {
      const result = await deleteMedication(id);
      if (result.success) {
        loadMedications();
      }
    }
  };

  const handleEdit = (med) => {
    setNewMed({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      times: med.times,
      notes: med.notes || '',
      color: med.color,
      icon: med.icon
    });
    setEditingId(med.id);
    setShowAddForm(true);
  };

  const handleToggleActive = async (med) => {
    const updated = { ...med, isActive: !med.isActive };
    const result = await updateMedication(med.id, updated);
    
    if (result.success) {
      loadMedications();
      
      if (updated.isActive) {
        // Intentar Push Background
        if (notificationsEnabled) {
          checkNotificationPermission(false, userId);
        }
      }
    }
  };

  const handleMarkTaken = async (medId, medName) => {
    const result = await addMedicationLog(userId, medId, new Date().toISOString());
    if (result.success) {
      loadHistory();
      // Mostrar feedback visual
      toast.success(`✅ ${medName} marcada como tomada`);
    }
  };

  const resetForm = () => {
    setNewMed({
      name: '',
      dosage: '',
      frequency: 'daily',
      times: ['09:00'],
      notes: '',
      color: '#ff6b9d',
      icon: '💊'
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const requestNotificationPermission = async () => {
    // Check if it's iOS without PushManager (e.g. running in normal Safari tab instead of PWA)
    if (!('PushManager' in window)) {
      toast.error('Para recibir notificaciones en segundo plano en iPhone, primero debes presionar "Compartir" y luego "Agregar a Inicio". Luego abre la app desde tu pantalla de inicio.', { duration: 8000 });
      return;
    }

    const enabled = await checkNotificationPermission(true, userId);
    setNotificationsEnabled(enabled);
    if (enabled) {
      toast.success('Notificaciones en segundo plano activadas');
    } else {
      toast.error('Permiso de notificaciones denegado.');
    }
  };

  // Agrupar historial por día
  const groupHistoryByDay = () => {
    const grouped = {};
    history.forEach(log => {
      const date = format(parseISO(log.taken_at), 'yyyy-MM-dd');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(log);
    });
    return grouped;
  };

  const groupedHistory = groupHistoryByDay();

  // Obtener medicamentos para hoy
  const getTodaysMedications = () => {
    const now = new Date();
    const currentHour = format(now, 'HH:mm');
    
    return medications
      .filter(med => med.is_active)
      .map(med => {
        const todayTaken = history.filter(h => {
          const logDate = format(parseISO(h.taken_at), 'yyyy-MM-dd');
          const today = format(now, 'yyyy-MM-dd');
          return logDate === today && h.medication_id === med.id;
        });

        return {
          ...med,
          todayTaken: todayTaken.length,
          totalToday: med.times.length,
          nextTime: med.times.find(t => t > currentHour) || med.times[0],
          allTakenToday: todayTaken.length >= med.times.length
        };
      });
  };

  const todaysMeds = getTodaysMedications();

  return (
    <div className="medication-tracker-view">
      <div className="view-header">
        <h2>Mis Pastillas</h2>
        <button className="add-btn" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={20} />
          Agregar
        </button>
      </div>

      {/* Notificaciones Toggle */}
      {!notificationsEnabled ? (
        <div className="notification-banner">
          <div className="notification-content">
            <div className="notification-icon">
              <BellOff size={24} />
            </div>
            <div className="notification-text">
              <strong>Recordatorios de Pastillas</strong>
              <p>Activa las notificaciones para que la app te avise cuándo tomar tus medicamentos</p>
            </div>
          </div>
          <button className="btn-primary btn-sm" onClick={requestNotificationPermission}>
            Activar
          </button>
        </div>
      ) : (
        <div className="notification-banner" style={{ backgroundColor: '#fdf0f5', borderColor: '#ffb3c6' }}>
          <div className="notification-content">
            <div className="notification-icon" style={{ color: '#ff6b9d' }}>
              <Bell size={24} />
            </div>
            <div className="notification-text">
              <strong>Conectado a Netlify Push</strong>
              <p>Mantenemos tu dispositivo conectado en segundo plano.</p>
            </div>
          </div>
          <button className="btn-secondary btn-sm" onClick={() => testRealPushNotification(userId)}>
            Probar Push
          </button>
        </div>
      )}

      {/* Formulario Agregar/Editar */}
      {showAddForm && (
        <div className="add-form-card">
          <h3>{editingId ? 'Editar Medicamento' : 'Nuevo Medicamento'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group" style={{ flex: '0 0 80px' }}>
                <label>Icono</label>
                <input
                  type="text"
                  value={newMed.icon}
                  onChange={(e) => setNewMed({...newMed, icon: e.target.value})}
                  maxLength={2}
                  className="icon-input"
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Nombre del medicamento</label>
                <input
                  type="text"
                  value={newMed.name}
                  onChange={(e) => setNewMed({...newMed, name: e.target.value})}
                  placeholder="Ej: Anticonceptivo, Vitamina D..."
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Dosis</label>
                <input
                  type="text"
                  value={newMed.dosage}
                  onChange={(e) => setNewMed({...newMed, dosage: e.target.value})}
                  placeholder="Ej: 1 tableta, 5mg..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Frecuencia</label>
                <select
                  value={newMed.frequency}
                  onChange={(e) => setNewMed({...newMed, frequency: e.target.value})}
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="as-needed">Según necesidad</option>
                </select>
              </div>

              <div className="form-group">
                <label>Color</label>
                <input
                  type="color"
                  value={newMed.color}
                  onChange={(e) => setNewMed({...newMed, color: e.target.value})}
                  className="color-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Horarios</label>
              <div className="times-list">
                {newMed.times.map((time, idx) => (
                  <div key={idx} className="time-input-row">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => handleTimeChange(idx, e.target.value)}
                      required
                    />
                    {newMed.times.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTime(idx)}
                        className="btn-icon-danger"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleAddTime} className="btn-secondary btn-sm">
                <Plus size={16} /> Agregar otro horario
              </button>
            </div>

            <div className="form-group">
              <label>Notas (opcional)</label>
              <textarea
                value={newMed.notes}
                onChange={(e) => setNewMed({...newMed, notes: e.target.value})}
                placeholder="Ej: Tomar con comida, después de cenar..."
                rows={2}
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vista de Hoy */}
      <div className="today-section">
        <h3>Hoy · {format(new Date(), "d 'de' MMMM", { locale: es })}</h3>
        
        {todaysMeds.length === 0 ? (
          <div className="empty-state-small">
            <Pill size={32} />
            <p>No hay medicamentos programados</p>
          </div>
        ) : (
          <div className="medications-today">
            {todaysMeds.map(med => (
              <div 
                key={med.id} 
                className={`medication-card ${med.allTakenToday ? 'completed' : ''}`}
                style={{ borderLeftColor: med.color }}
              >
                <div className="med-header">
                  <div className="med-title">
                    <span className="med-icon">{med.icon}</span>
                    <div>
                      <h4>{med.name}</h4>
                      <span className="med-dosage">{med.dosage}</span>
                    </div>
                  </div>
                  <div className="med-actions">
                    <button 
                      className="btn-icon"
                      onClick={() => handleEdit(med)}
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="btn-icon"
                      onClick={() => handleDelete(med.id)}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="med-progress">
                  <div className="progress-bar-med">
                    <div 
                      className="progress-fill-med"
                      style={{ 
                        width: `${(med.todayTaken / med.totalToday) * 100}%`,
                        backgroundColor: med.color
                      }}
                    />
                  </div>
                  <span className="progress-text">
                    {med.todayTaken} de {med.totalToday} tomadas
                  </span>
                </div>

                <div className="med-times">
                  {med.times.map((time, idx) => {
                    const taken = history.some(h => {
                      const logDate = format(parseISO(h.taken_at), 'yyyy-MM-dd HH:mm');
                      const today = format(new Date(), 'yyyy-MM-dd');
                      return h.medication_id === med.id && 
                             logDate.startsWith(today) &&
                             format(parseISO(h.taken_at), 'HH:mm') === time;
                    });

                    return (
                      <div key={idx} className={`time-slot ${taken ? 'taken' : ''}`}>
                        <Clock size={14} />
                        <span>{time}</span>
                        {taken ? (
                          <Check size={16} className="check-icon" />
                        ) : (
                          <button
                            className="btn-take"
                            onClick={() => handleMarkTaken(med.id, med.name)}
                          >
                            Tomar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {med.notes && (
                  <div className="med-notes">
                    💡 {med.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="history-section">
        <h3>Historial</h3>
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="empty-state-small">
            <p>No hay historial aún</p>
          </div>
        ) : (
          <div className="history-list">
            {Object.entries(groupedHistory)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 7)
              .map(([date, logs]) => (
                <div key={date} className="history-day">
                  <div className="history-date">
                    {format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}
                  </div>
                  <div className="history-items">
                    {logs.map(log => {
                      const med = medications.find(m => m.id === log.medication_id);
                      return (
                        <div key={log.id} className="history-item">
                          <span className="history-icon">{med?.icon || '💊'}</span>
                          <span className="history-name">{log.medication_name}</span>
                          <span className="history-time">
                            {format(parseISO(log.taken_at), 'HH:mm')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
