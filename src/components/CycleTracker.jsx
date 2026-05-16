import { useState, useEffect } from 'react';
import { Calendar, Plus, Settings, Heart, Edit2, Trash2, X, Droplets, Activity, StickyNote, Flame } from 'lucide-react';
import { addCycle, getCycles, updateCycle, deleteCycle, getCycleSettings, saveCycleSettings, addCycleNote, getCycleNotes, deleteCycleNote, updateCycleNote, getIntimateMoments, deleteIntimateMoment, updateIntimateMoment } from '../lib/database';
import { format, addDays, differenceInDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, getDay, isValid, isWithinInterval, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function CycleTracker({ user }) {
  const [cycles, setCycles] = useState([]);
  const [cycleNotes, setCycleNotes] = useState([]);
  const [intimateMoments, setIntimateMoments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showConfig, setShowConfig] = useState(false);
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingCycle, setEditingCycle] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [editingIntimate, setEditingIntimate] = useState(null);
  const [showEditIntimateForm, setShowEditIntimateForm] = useState(false);
  const [editIntimateForm, setEditIntimateForm] = useState({ date: '', time: '', notes: '', protection: 'none' });
  
  // Estado para Menú de Día
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayMenu, setShowDayMenu] = useState(false);
  const [dayRegistrationType, setDayRegistrationType] = useState('');
  const [dayFormDetails, setDayFormDetails] = useState('');
  const [dayFormProtection, setDayFormProtection] = useState('none');
  const [dayFormNotes, setDayFormNotes] = useState('');

  
  // Configuración inicial
  const [configForm, setConfigForm] = useState({
    lastPeriodStart: '',
    lastPeriodEnd: '',
    periodDuration: 5,
    cycleDuration: 28
  });
  
  // Formulario de período
  const [periodForm, setPeriodForm] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    notes: ''
  });
  
  // Formulario de nota/evento
  const [noteForm, setNoteForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    noteType: 'note',
    note: '',
    protection: 'none'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar ciclos
      const cyclesResult = await getCycles(user.couple_id, 50);
      if (cyclesResult.success && Array.isArray(cyclesResult.data)) {
        setCycles(cyclesResult.data);
      }
      
      // Cargar configuración
      const settingsResult = await getCycleSettings(user.couple_id);
      if (settingsResult.success && settingsResult.data) {
        setSettings(settingsResult.data);
        // Si hay configuración, precargar el formulario
        setConfigForm({
          periodDuration: settingsResult.data.period_duration || 5,
          cycleDuration: settingsResult.data.cycle_duration || 28,
          lastPeriodStart: settingsResult.data.last_period_start || '',
          lastPeriodEnd: ''
        });
      } else {
        // Si no hay configuración, pedir que la complete
        setShowConfig(true);
      }
      
      // Cargar notas del mes actual
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const notesResult = await getCycleNotes(user.couple_id, monthStart, monthEnd);
      if (notesResult.success && Array.isArray(notesResult.data)) {
        setCycleNotes(notesResult.data);
      }
      
      // Cargar momentos íntimos
      const intimateResult = await getIntimateMoments(user.couple_id, 100);
      if (intimateResult.success && Array.isArray(intimateResult.data)) {
        setIntimateMoments(intimateResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      // Guardar la fecha del último período junto con la configuración
      const result = await saveCycleSettings(user.couple_id, user.id, configForm.periodDuration, configForm.cycleDuration, configForm.lastPeriodStart || null);
      if (result.success) {
        setSettings({ 
          period_duration: configForm.periodDuration, 
          cycle_duration: configForm.cycleDuration,
          last_period_start: configForm.lastPeriodStart
        });
        setShowConfig(false);
        loadData();
        toast.success('Configuración guardada');
      }
    } catch (error) {
      toast.error('Error al guardar configuración');
    }
  };

  const handleSavePeriod = async (e) => {
    e.preventDefault();
    try {
      if (editingCycle) {
        const result = await updateCycle(editingCycle.id, periodForm.startDate, periodForm.endDate || null, periodForm.notes);
        if (result.success) {
          toast.success('Período actualizado');
        }
      } else {
        const result = await addCycle(user.id, periodForm.startDate, periodForm.endDate || null, periodForm.notes);
        if (result.success) {
          toast.success('Período registrado');
        }
      }
      setShowAddPeriod(false);
      setEditingCycle(null);
      loadData();
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  const handleDeleteCycle = async (cycleId) => {
    if (!confirm('¿Estás seguro de eliminar este período?')) return;
    try {
      const result = await deleteCycle(cycleId);
      if (result.success) {
        toast.success('Período eliminado');
        loadData();
      }
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    try {
      let result;
      // Tratar de encontrar a qué ciclo pertenece esta nota si es de tipo flow
      let relatedCycleId = null;
      if (noteForm.noteType === 'flow') {
        const noteDate = safeParseDate(noteForm.date);
        const relatedCycle = cycles.find(c => {
          const start = safeParseDate(c.start_date);
          const end = c.end_date ? safeParseDate(c.end_date) : new Date(2100, 0, 1); // Si está activo, cubre cualquier fecha futura
          return noteDate && start && noteDate >= start && noteDate <= end;
        });
        relatedCycleId = relatedCycle ? relatedCycle.id : null;
      }

      if (editingNote) {
        // Editar nota existente
        result = await updateCycleNote(editingNote.id, noteForm.date, noteForm.noteType, noteForm.note, noteForm.noteType === 'intimate' ? noteForm.protection : null, relatedCycleId);
        if (result.success) {
          toast.success('Nota actualizada');
        }
      } else {
        // Crear nueva nota
        result = await addCycleNote(userId, noteForm.date, noteForm.noteType, noteForm.note, noteForm.noteType === 'intimate' ? noteForm.protection : null, relatedCycleId);
        if (result.success) {
          toast.success('Nota guardada');
        }
      }
      if (result.success) {
        setShowAddNote(false);
        setEditingNote(null);
        setNoteForm({
          date: format(new Date(), 'yyyy-MM-dd'),
          noteType: 'note',
          note: '',
          protection: 'none'
        });
        loadData();
      }
    } catch (error) {
      toast.error('Error al guardar nota');
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteForm({
      date: note.note_date,
      noteType: note.note_type,
      note: note.note || '',
      protection: note.protection || 'none'
    });
    setShowAddNote(true);
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('¿Eliminar esta nota?')) return;
    try {
      await deleteCycleNote(noteId);
      loadData();
      toast.success('Nota eliminada');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  // Handlers para momentos íntimos
  const handleEditIntimate = (moment) => {
    const date = safeParseDate(moment.moment_date);
    if (!date) return;
    setEditingIntimate(moment);
    setEditIntimateForm({
      date: format(date, 'yyyy-MM-dd'),
      time: format(date, 'HH:mm'),
      notes: moment.notes || '',
      protection: moment.protection || 'none'
    });
    setShowEditIntimateForm(true);
  };

  const handleSaveEditIntimate = async (e) => {
    e.preventDefault();
    if (!editingIntimate) return;
    
    const datetime = `${editIntimateForm.date}T${editIntimateForm.time}:00`;
    const protection = editIntimateForm.protection === 'none' ? null : editIntimateForm.protection;
    const result = await updateIntimateMoment(editingIntimate.id, datetime, editIntimateForm.notes, protection);
    
    if (result.success) {
      loadData();
      setEditingIntimate(null);
      setShowEditIntimateForm(false);
      setEditIntimateForm({ date: '', time: '', notes: '', protection: 'none' });
      toast.success('Momento actualizado ❤️');
    }
  };

  const handleDeleteIntimate = async (momentId) => {
    if (!confirm('¿Eliminar este momento íntimo?')) return;
    try {
      await deleteIntimateMoment(momentId);
      loadData();
      toast.success('Momento eliminado');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  // Handlers para menú de día unificado
  const handleDayClick = (day) => {
    setSelectedDay(day);
    setDayRegistrationType('');
    setDayFormDetails('');
    setDayFormProtection('none');
    setDayFormNotes('');
    setShowDayMenu(true);
  };

  const handleDayPeriodSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedDate = format(selectedDay, 'yyyy-MM-dd');
      const hasActiveCycle = cycles.length > 0 && !cycles[0].end_date;
      let activeCycleId = hasActiveCycle ? cycles[0].id : null;

      if (!hasActiveCycle) {
        // Iniciar nuevo ciclo (sin fin)
        const cycleResult = await addCycle(user.id, formattedDate, null, dayFormNotes);
        if(!cycleResult.success) {
          toast.error('Error al iniciar ciclo');
          return;
        }
        activeCycleId = cycleResult.data[0].id;
      }

      // Siempre registrar el flujo como nota con el ID del ciclo (nuevo o activo)
      const noteResult = await addCycleNote(user.id, formattedDate, 'flow', dayFormDetails, null, activeCycleId);
      if (noteResult.success) {
        toast.success(hasActiveCycle ? 'Flujo registrado' : 'Ciclo iniciado con flujo del día');
        setShowDayMenu(false);
        loadData();
      }
    } catch (error) {
      toast.error('Error al guardar registro');
    }
  };

  const handleDayPeriodEndSubmit = async (e) => {
    e.preventDefault();
    if (cycles.length === 0) {
      toast.error('No hay un ciclo activo para finalizar');
      return;
    }
    
    const lastCycle = cycles[0]; // El ciclo más reciente
    const formattedDate = format(selectedDay, 'yyyy-MM-dd');
    
    // Validar que la fecha de fin no sea el mismo día o anterior si se puede evitar, 
    // pero permitiremos el mismo día si duró 1 día.
    if (formattedDate < lastCycle.start_date) {
      toast.error('La fecha de fin no puede ser anterior al inicio');
      return;
    }

    try {
      const result = await updateCycle(lastCycle.id, lastCycle.start_date, formattedDate, lastCycle.notes || '');
      if (result.success) {
        toast.success('Fin de período registrado');
        setShowDayMenu(false);
        loadData();
      }
    } catch (error) {
      toast.error('Error al guardar el fin de ciclo');
    }
  };

  const handleDayNoteSubmit = async (e, type) => {
    e.preventDefault();
    try {
      const formattedDate = format(selectedDay, 'yyyy-MM-dd');
      const protection = type === 'intimate' ? dayFormProtection : null;
      const result = await addCycleNote(user.id, formattedDate, type, dayFormDetails, protection);
      if (result.success) {
        toast.success('Registro guardado');
        setShowDayMenu(false);
        loadData();
      }
    } catch (error) {
      toast.error('Error al guardar registro');
    }
  };

  // Funciones auxiliares
  const safeParseDate = (dateValue) => {
    if (!dateValue) return null;
    try {
      if (typeof dateValue === 'string') {
        const parsed = parseISO(dateValue);
        if (isValid(parsed)) return parsed;
      }
      if (dateValue instanceof Date && isValid(dateValue)) return dateValue;
      return null;
    } catch (e) {
      return null;
    }
  };

  // Calcular duración promedio del ciclo
  const getAverageCycleLength = () => {
    if (settings?.cycle_duration) return settings.cycle_duration;
    if (cycles.length < 2) return 28;
    
    let total = 0;
    let count = 0;
    for (let i = 0; i < cycles.length - 1; i++) {
      const curr = safeParseDate(cycles[i]?.start_date);
      const next = safeParseDate(cycles[i + 1]?.start_date);
      if (curr && next) {
        const diff = differenceInDays(curr, next);
        if (diff > 20 && diff < 40) {
          total += diff;
          count++;
        }
      }
    }
    return count > 0 ? Math.round(total / count) : 28;
  };

  // Calcular duración promedio del período
  const getAveragePeriodLength = () => {
    if (settings?.period_duration) return settings.period_duration;
    let total = 0;
    let count = 0;
    for (const cycle of cycles) {
      const start = safeParseDate(cycle?.start_date);
      const end = safeParseDate(cycle?.end_date);
      if (start && end) {
        total += differenceInDays(end, start) + 1;
        count++;
      }
    }
    return count > 0 ? Math.round(total / count) : 5;
  };

  // Obtener fecha del último período (de ciclos o de configuración)
  const getLastPeriodStart = () => {
    // Si hay ciclos registrados, usar el más reciente
    if (cycles.length > 0) {
      const lastCycle = safeParseDate(cycles[0]?.start_date);
      if (lastCycle) return lastCycle;
    }
    // Si no hay ciclos, usar last_period_start de la configuración
    if (settings?.last_period_start) {
      return safeParseDate(settings.last_period_start);
    }
    return null;
  };

  // Obtener fecha del próximo período
  const getNextPeriod = () => {
    const lastPeriod = getLastPeriodStart();
    if (!lastPeriod) return null;
    const cycleLength = getAverageCycleLength();
    return addDays(lastPeriod, cycleLength);
  };

  // Obtener días de período previsto
  const getPredictedPeriodDays = () => {
    const nextPeriod = getNextPeriod();
    if (!nextPeriod) return [];
    const periodLength = getAveragePeriodLength();
    return Array.from({ length: periodLength }, (_, i) => addDays(nextPeriod, i));
  };

  // Obtener días de ovulación previstos
  const getPredictedOvulationDays = () => {
    const nextPeriod = getNextPeriod();
    if (!nextPeriod) return [];
    const cycleLength = getAverageCycleLength();
    // Ovulación suele ser 14 días antes del próximo período
    const ovulationDay = subDays(nextPeriod, cycleLength - 14);
    return [ovulationDay]; // Un solo día
  };

  // Obtener días fértiles previstos
  const getPredictedFertileDays = () => {
    const nextPeriod = getNextPeriod();
    if (!nextPeriod) return [];
    const cycleLength = getAverageCycleLength();
    const fertileStart = subDays(nextPeriod, cycleLength - 5);
    const fertileEnd = subDays(nextPeriod, cycleLength - 9);
    return eachDayOfInterval({ start: fertileEnd, end: fertileStart });
  };

  // Obtener días de sangrado de cada ciclo
  const getBleedingDays = (cycle) => {
    const start = safeParseDate(cycle?.start_date);
    if (!start) return [];
    if (!cycle?.end_date) {
      // Para el ciclo activo (sin fin), no autocompletar días sugeridos en rojo.
      // Se pintarán solo los días que tengan notas de flujo explícitas (isFlowNote).
      return [];
    }
    const end = safeParseDate(cycle.end_date);
    if (!end) return [];
    return eachDayOfInterval({ start, end });
  };

  const allBleedingDays = cycles.flatMap(c => getBleedingDays(c));
  const predictedBleedingDays = getPredictedPeriodDays();
  const predictedOvulationDays = getPredictedOvulationDays();
  const predictedFertileDays = getPredictedFertileDays();

  // Días del mes
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  // Información del ciclo actual
  const lastCycleStart = getLastPeriodStart();
  const daysSinceStart = lastCycleStart ? differenceInDays(new Date(), lastCycleStart) : null;
  const nextPeriod = getNextPeriod();
  const daysToNext = nextPeriod ? differenceInDays(nextPeriod, new Date()) : null;

  const isInPeriod = daysSinceStart !== null && daysSinceStart >= 0 && daysSinceStart < getAveragePeriodLength();
  const cyclePhase = daysSinceStart !== null ? 
    (daysSinceStart < getAveragePeriodLength() ? 'menstruation' :
     daysSinceStart < getAverageCycleLength() - 14 ? 'follicular' :
     daysSinceStart < getAverageCycleLength() - 10 ? 'fertile' :
     daysSinceStart < getAverageCycleLength() ? 'luteal' : 'menstruation') 
    : null;

  if (loading) {
    return <div className="loading-state"><p>Cargando...</p></div>;
  }

  return (
    <div className="cycle-tracker-view">
      {/* Header */}
      <div className="view-header">
        <h2>Mi Ciclo</h2>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setShowAddNote(true)} title="Agregar nota">
            <StickyNote size={20} />
          </button>
          <button className="icon-btn" onClick={() => setShowAddPeriod(true)} title="Registrar período">
            <Plus size={20} />
          </button>
          <button className="icon-btn" onClick={() => setShowConfig(true)} title="Configuración">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Resumen del ciclo */}
      {(cycles.length > 0 || settings?.last_period_start) && (
        <div className="cycle-summary">
          <div className="summary-card">
            <Droplets className="summary-icon" style={{ color: '#ff6b9d' }} />
            <div className="summary-content">
              <span className="summary-label">Día del ciclo</span>
              <span className="summary-value">{daysSinceStart !== null ? daysSinceStart + 1 : '-'}</span>
            </div>
          </div>
          <div className="summary-card">
            <Calendar className="summary-icon" style={{ color: '#60a5fa' }} />
            <div className="summary-content">
              <span className="summary-label">Próximo período</span>
              <span className="summary-value">
                {daysToNext !== null ? 
                  (daysToNext > 0 ? `${daysToNext} días` : 'Hoy') 
                  : '-'}
              </span>
            </div>
          </div>
          <div className="summary-card">
            <Activity className="summary-icon" style={{ color: '#a78bfa' }} />
            <div className="summary-content">
              <span className="summary-label">Fase</span>
              <span className="summary-value">
                {cyclePhase === 'menstruation' ? 'Menstruación' :
                 cyclePhase === 'follicular' ? 'Fase folicular' :
                 cyclePhase === 'fertile' ? 'Fase fértil' :
                 cyclePhase === 'luteal' ? 'Fase lútea' : '-'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot bleeding"></span>
          <span>Período</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot predicted"></span>
          <span>Próximo período</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot fertile"></span>
          <span>Días fértiles</span>
        </div>
        <div className="legend-item">
          <Heart size={12} className="legend-icon" style={{ color: '#fbbf24' }} />
          <span>Ovulación</span>
        </div>
      </div>

      {/* Calendario */}
      <div className="calendar-container">
        <div className="calendar-header">
          <button className="calendar-nav" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>←</button>
          <h3>{format(currentMonth, 'MMMM yyyy', { locale: es })}</h3>
          <button className="calendar-nav" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>→</button>
        </div>

        <div className="calendar-weekdays">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="weekday">{day}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty"></div>
          ))}
          
          {daysInMonth.map(day => {
            const isToday = isSameDay(day, new Date());
            const isBleeding = allBleedingDays.some(d => isSameDay(d, day));
            const isPredictedBleeding = predictedBleedingDays.some(d => isSameDay(d, day));
            const isFertile = predictedFertileDays.some(d => isSameDay(d, day));
            const isOvulation = predictedOvulationDays.some(d => isSameDay(d, day));
            
            // Notas del día
            const dayNotes = cycleNotes.filter(n => isSameDay(safeParseDate(n.note_date), day));
            const isFlowNote = dayNotes.some(n => n.note_type === 'flow');
            // Momentos íntimos del día
            const dayIntimates = intimateMoments.filter(m => {
              const mDate = safeParseDate(m.moment_date);
              return mDate && isSameDay(mDate, day);
            });
            
            return (
              <div 
                key={day.toString()} 
                className={`calendar-day ${isToday ? 'today' : ''} ${isBleeding || isFlowNote ? 'bleeding' : ''} ${isPredictedBleeding && !isBleeding ? 'predicted' : ''} ${isFertile && !isBleeding ? 'fertile' : ''} ${isOvulation && !isBleeding ? 'ovulation' : ''}`}
                onClick={() => handleDayClick(day)}
                style={{ cursor: 'pointer' }}
              >
                <span className="day-number">{format(day, 'd')}</span>
                {isOvulation && !isBleeding && <span className="ovulation-dot"></span>}
                {dayNotes.length > 0 && (
                  <div className="day-notes">
                    {dayNotes.map(n => (
                      <span key={n.id} className={`note-dot ${n.note_type}`}></span>
                    ))}
                  </div>
                )}
                {dayIntimates.length > 0 && (
                  <div className="day-notes">
                    {dayIntimates.map(m => (
                      <span 
                        key={m.id} 
                        className="note-dot intimate-moment"
                        title={format(safeParseDate(m.moment_date), 'HH:mm')}
                      >
                        <Flame size={10} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Períodos recientes */}
      <div className="cycles-history">
        <h3>Historial de Períodos</h3>
        {cycles.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <p>No hay períodos registrados</p>
            <button className="btn-primary" onClick={() => setShowAddPeriod(true)}>
              Registrar mi primer período
            </button>
          </div>
        ) : (
          <div className="cycles-list">
            {cycles.slice(0, 6).map(cycle => {
              const start = safeParseDate(cycle.start_date);
              const end = safeParseDate(cycle.end_date);
              if (!start) return null;
              
              const duration = end ? differenceInDays(end, start) + 1 : getAveragePeriodLength();
              
              return (
                <div key={cycle.id} className="cycle-item">
                  <div className="cycle-date">
                    <span className="cycle-month">{format(start, 'MMM', { locale: es }).toUpperCase()}</span>
                    <span className="cycle-day">{format(start, 'd')}</span>
                  </div>
                  <div className="cycle-info">
                    <span className="cycle-range">
                      {format(start, "d 'de' MMMM", { locale: es })}
                      {end && ` - ${format(end, "d 'de' MMMM", { locale: es })}`}
                    </span>
                    <span className="cycle-duration">{duration} días</span>
                  </div>
                  <div className="cycle-actions">
                    <button className="icon-btn-sm" onClick={() => {
                      setEditingCycle(cycle);
                      setPeriodForm({
                        startDate: cycle.start_date,
                        endDate: cycle.end_date || '',
                        notes: cycle.notes || ''
                      });
                      setShowAddPeriod(true);
                    }}>
                      <Edit2 size={14} />
                    </button>
                    <button className="icon-btn-sm danger" onClick={() => handleDeleteCycle(cycle.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notas del ciclo */}
      <div className="cycles-history">
        <h3>Notas y Actividad</h3>
        {cycleNotes.length === 0 ? (
          <div className="empty-state">
            <StickyNote size={48} />
            <p>No hay notas registradas</p>
          </div>
        ) : (
          <div className="cycles-list">
            {cycleNotes.slice(0, 10).map(note => (
              <div key={note.id} className="cycle-item">
                <div className="cycle-date">
                  <span className="cycle-month">{format(safeParseDate(note.note_date), 'MMM', { locale: es }).toUpperCase()}</span>
                  <span className="cycle-day">{format(safeParseDate(note.note_date), 'd')}</span>
                </div>
                <div className="cycle-info">
                  <span className="cycle-range">
                    {note.note_type === 'note' && '📝 Nota'}
                    {note.note_type === 'symptom' && '🤒 Síntoma'}
                    {note.note_type === 'flow' && '🩸 Flujo Menstrual'}
                    {note.note_type === 'intimate' && (note.protection === 'with' ? '💚 Con protección' : note.protection === 'without' ? '❤️ Sin protección' : '❤️ Actividad sexual')}
                    {note.note_type === 'mood' && '😊 Estado de ánimo'}
                  </span>
                  {note.note && <span className="cycle-duration">{note.note}</span>}
                </div>
                <div className="cycle-actions">
                  <button className="icon-btn-sm" onClick={() => handleEditNote(note)}>
                    <Edit2 size={14} />
                  </button>
                  <button className="icon-btn-sm danger" onClick={() => handleDeleteNote(note.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Momentos íntimos */}
      {intimateMoments.length > 0 && (
        <div className="cycles-history">
          <h3>Momentos Íntimos</h3>
          <div className="cycles-list">
            {intimateMoments.slice(0, 10).map(moment => {
              const date = safeParseDate(moment.moment_date);
              if (!date) return null;
              return (
                <div key={moment.id} className="cycle-item">
                  <div className="cycle-date">
                    <span className="cycle-month">{format(date, 'MMM', { locale: es }).toUpperCase()}</span>
                    <span className="cycle-day">{format(date, 'd')}</span>
                  </div>
                  <div className="cycle-info">
                    <span className="cycle-range">
                      <Flame size={14} style={{ color: '#ff6b9d' }} />
                      {format(date, 'HH:mm')} - 
                      {moment.protection === 'with' ? '💚 Con protección' : moment.protection === 'without' ? '❤️ Sin protección' : 'Momento íntimo'}
                    </span>
                    {moment.notes && <span className="cycle-duration">{moment.notes}</span>}
                  </div>
                  <div className="cycle-actions">
                    <button className="icon-btn-sm" onClick={() => handleEditIntimate(moment)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="icon-btn-sm danger" onClick={() => handleDeleteIntimate(moment.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Configuración */}
      {showConfig && (
        <div className="modal-overlay" onClick={() => setShowConfig(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Configuración del Ciclo</h3>
              <button className="icon-btn" onClick={() => setShowConfig(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveConfig}>
              <div className="form-group">
                <label>¿Cuándo empezó tu último período?</label>
                <input
                  type="date"
                  value={configForm.lastPeriodStart}
                  onChange={e => setConfigForm({...configForm, lastPeriodStart: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>¿Cuándo terminó? (opcional)</label>
                <input
                  type="date"
                  value={configForm.lastPeriodEnd}
                  onChange={e => setConfigForm({...configForm, lastPeriodEnd: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>¿Cuántos días dura tu período?</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={configForm.periodDuration}
                  onChange={e => setConfigForm({...configForm, periodDuration: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>¿Cuántos días tiene tu ciclo?</label>
                <input
                  type="number"
                  min="20"
                  max="40"
                  value={configForm.cycleDuration}
                  onChange={e => setConfigForm({...configForm, cycleDuration: parseInt(e.target.value)})}
                />
              </div>
              <button type="submit" className="btn-primary">Guardar</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Agregar Período */}
      {showAddPeriod && (
        <div className="modal-overlay" onClick={() => { setShowAddPeriod(false); setEditingCycle(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCycle ? 'Editar Período' : 'Registrar Período'}</h3>
              <button className="icon-btn" onClick={() => { setShowAddPeriod(false); setEditingCycle(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePeriod}>
              <div className="form-group">
                <label>Fecha de inicio</label>
                <input
                  type="date"
                  value={periodForm.startDate}
                  onChange={e => setPeriodForm({...periodForm, startDate: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Fecha de fin (opcional)</label>
                <input
                  type="date"
                  value={periodForm.endDate}
                  onChange={e => setPeriodForm({...periodForm, endDate: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Notas (opcional)</label>
                <textarea
                  value={periodForm.notes}
                  onChange={e => setPeriodForm({...periodForm, notes: e.target.value})}
                  placeholder="Cómo te sentiste..."
                  rows={3}
                />
              </div>
              <button type="submit" className="btn-primary">
                {editingCycle ? 'Actualizar' : 'Guardar Período'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Menú de Día (Unificado) */}
      {showDayMenu && selectedDay && (
        <div className="modal-overlay" onClick={() => setShowDayMenu(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}</h3>
              <button className="icon-btn" onClick={() => setShowDayMenu(false)}><X size={20} /></button>
            </div>
            
            <div className="form-group" style={{ marginTop: '10px' }}>
              <label>¿Qué deseas registrar este día?</label>
              <select value={dayRegistrationType} onChange={e => {
                setDayRegistrationType(e.target.value);
                setDayFormDetails('');
                setDayFormProtection('none');
                setDayFormNotes('');
              }}>
                <option value="">Seleccionar...</option>
                <option value="period_day">🩸 Día de Período (Sangrado/Flujo)</option>
                {(cycles.length > 0 && !cycles[0].end_date) && (
                  <option value="period_end">🩸 Fin del período actual</option>
                )}
                <option value="symptom">🤒 Síntoma</option>
                <option value="mood">😊 Estado de ánimo</option>
                <option value="note">📝 Nota general</option>
                <option value="intimate">❤️ Actividad sexual</option>
              </select>
            </div>

            {dayRegistrationType === 'period_day' && (
              <form onSubmit={handleDayPeriodSubmit}>
                <p style={{marginBottom: '15px', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                  {!cycles.length || cycles[0].end_date ? 
                    'Al no tener un período activo, esto marcará hoy como tu inicio de ciclo y guardará la cantidad de flujo.' : 
                    'Esto registrará tu nivel de sangrado para llevar el control día a día del ciclo actual.'}
                </p>
                <div className="form-group">
                  <label>Cantidad de flujo</label>
                  <select value={dayFormDetails} onChange={e => setDayFormDetails(e.target.value)} required>
                    <option value="">Seleccionar...</option>
                    <option value="Manchado (Spotting)">Manchado (Spotting)</option>
                    <option value="Ligero">Ligero</option>
                    <option value="Medio">Medio</option>
                    <option value="Abundante">Abundante</option>
                  </select>
                </div>
                {(!cycles.length || cycles[0].end_date) && (
                  <div className="form-group">
                    <label>Notas del inicio de ciclo (opcional)</label>
                    <textarea 
                      value={dayFormNotes} 
                      onChange={e => setDayFormNotes(e.target.value)} 
                      rows={2} 
                      placeholder="Detalles sobre tu ciclo..."
                    />
                  </div>
                )}
                <button type="submit" className="btn-primary">
                  {!cycles.length || cycles[0].end_date ? 'Iniciar Ciclo y Guardar Flujo' : 'Guardar Flujo'}
                </button>
              </form>
            )}

            {dayRegistrationType === 'period_end' && (
              <form onSubmit={handleDayPeriodEndSubmit}>
                <p style={{marginBottom: '15px', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                  Esto cerrará el período menstrual actual, marcando este día como el último día de sangrado.
                </p>
                <button type="submit" className="btn-primary">Finalizar Período</button>
              </form>
            )}

            {(dayRegistrationType === 'symptom' || dayRegistrationType === 'mood' || dayRegistrationType === 'note') && (
              <form onSubmit={e => handleDayNoteSubmit(e, dayRegistrationType)}>
                <div className="form-group">
                  <label>Detalle</label>
                  <textarea 
                    value={dayFormDetails} 
                    onChange={e => setDayFormDetails(e.target.value)} 
                    required 
                    rows={3} 
                    placeholder="¿Qué sentiste o pasó?" 
                  />
                </div>
                <button type="submit" className="btn-primary">Guardar Registro</button>
              </form>
            )}

            {dayRegistrationType === 'intimate' && (
              <form onSubmit={e => handleDayNoteSubmit(e, 'intimate')}>
                <div className="form-group">
                  <label>Protección</label>
                  <select value={dayFormProtection} onChange={e => setDayFormProtection(e.target.value)}>
                    <option value="none">Seleccionar...</option>
                    <option value="with">💚 Con protección</option>
                    <option value="without">❤️ Sin protección</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Notas Privadas (opcional)</label>
                  <textarea 
                    value={dayFormDetails} 
                    onChange={e => setDayFormDetails(e.target.value)} 
                    rows={2} 
                    placeholder="Un detalle especial..."
                  />
                </div>
                <button type="submit" className="btn-primary">Guardar Momento</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Agregar/Editar Nota */}
      {showAddNote && (
        <div className="modal-overlay" onClick={() => { setShowAddNote(false); setEditingNote(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingNote ? 'Editar Nota' : 'Agregar Nota'}</h3>
              <button className="icon-btn" onClick={() => { setShowAddNote(false); setEditingNote(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveNote}>
              <div className="form-group">
                <label>Fecha</label>
                <input
                  type="date"
                  value={noteForm.date}
                  onChange={e => setNoteForm({...noteForm, date: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select
                  value={noteForm.noteType}
                  onChange={e => setNoteForm({...noteForm, noteType: e.target.value})}
                >
                  <option value="note">Nota</option>
                  <option value="symptom">Síntoma</option>
                  <option value="flow">Flujo Menstrual</option>
                  <option value="intimate">Actividad sexual</option>
                  <option value="mood">Estado de ánimo</option>
                </select>
              </div>
              {noteForm.noteType === 'flow' && (
                <div className="form-group">
                  <label>Cantidad de flujo</label>
                  <select
                    value={noteForm.note}
                    onChange={e => setNoteForm({...noteForm, note: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Manchado (Spotting)">Manchado (Spotting)</option>
                    <option value="Ligero">Ligero</option>
                    <option value="Medio">Medio</option>
                    <option value="Abundante">Abundante</option>
                  </select>
                </div>
              )}
              {noteForm.noteType === 'intimate' && (
                <div className="form-group">
                  <label>Protección</label>
                  <select
                    value={noteForm.protection}
                    onChange={e => setNoteForm({...noteForm, protection: e.target.value})}
                  >
                    <option value="none">Seleccionar...</option>
                    <option value="with">Con protección</option>
                    <option value="without">Sin protección</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={noteForm.note}
                  onChange={e => setNoteForm({...noteForm, note: e.target.value})}
                  placeholder="Detalles..."
                  rows={3}
                />
              </div>
              <button type="submit" className="btn-primary">{editingNote ? 'Actualizar' : 'Guardar Nota'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Editar Momento Íntimo */}
      {showEditIntimateForm && (
        <div className="modal-overlay" onClick={() => { setShowEditIntimateForm(false); setEditingIntimate(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Momento Íntimo</h3>
              <button className="icon-btn" onClick={() => { setShowEditIntimateForm(false); setEditingIntimate(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEditIntimate}>
              <div className="form-row">
                <div className="form-group">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={editIntimateForm.date}
                    onChange={e => setEditIntimateForm({...editIntimateForm, date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Hora</label>
                  <input
                    type="time"
                    value={editIntimateForm.time}
                    onChange={e => setEditIntimateForm({...editIntimateForm, time: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Protección</label>
                <select
                  value={editIntimateForm.protection}
                  onChange={e => setEditIntimateForm({...editIntimateForm, protection: e.target.value})}
                >
                  <option value="none">Seleccionar...</option>
                  <option value="with">💚 Con protección</option>
                  <option value="without">❤️ Sin protección</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notas</label>
                <textarea
                  value={editIntimateForm.notes}
                  onChange={e => setEditIntimateForm({...editIntimateForm, notes: e.target.value})}
                  placeholder="Detalles..."
                  rows={3}
                />
              </div>
              <button type="submit" className="btn-primary">Actualizar Momento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
