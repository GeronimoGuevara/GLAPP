import { useState, useEffect } from 'react';
import { Flame, Plus, Calendar as CalendarIcon, Edit2, Trash2, X, Camera, Image as ImageIcon } from 'lucide-react';
import { addIntimateMoment, getIntimateMoments, updateIntimateMoment, deleteIntimateMoment, getPartnerPin } from '../lib/database';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { uploadEncryptedImage } from '../lib/cloudinary';
import EncryptedImage from './EncryptedImage';

export default function IntimateTracker({ user }) {
  const [moments, setMoments] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMoment, setEditingMoment] = useState(null);
  const [newMoment, setNewMoment] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    notes: '',
    protection: 'none',
    photoFile: null
  });
  const [editMoment, setEditMoment] = useState({
    date: '',
    time: '',
    notes: '',
    protection: 'none',
    photoFile: null
  });
  const [selectedMoment, setSelectedMoment] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  useEffect(() => {
    loadMoments();
  }, []);

  const loadMoments = async () => {
    const result = await getIntimateMoments(user.couple_id, 50);
    if (result.success) {
      setMoments(result.data);
    }
  };

  const handleAddMoment = async (e) => {
    e.preventDefault();
    const datetime = `${newMoment.date}T${newMoment.time}:00`;
    const protection = newMoment.protection === 'none' ? null : newMoment.protection;
    
    let imageUrl = null;
    let loadingToast = null;

    try {
      if (newMoment.photoFile) {
        loadingToast = toast.loading('Obteniendo claves y encriptando foto...');
        const partnerPin = await getPartnerPin(user.couple_id, user.id);
        imageUrl = await uploadEncryptedImage(newMoment.photoFile, user.pin, partnerPin);
        toast.dismiss(loadingToast);
      }
      
      const result = await addIntimateMoment(user.couple_id, datetime, newMoment.notes, protection, imageUrl);
      
      if (result.success) {
        loadMoments();
        setNewMoment({
          date: format(new Date(), 'yyyy-MM-dd'),
          time: format(new Date(), 'HH:mm'),
          notes: '',
          protection: 'none',
          photoFile: null
        });
        setShowAddForm(false);
        toast.success('Momento registrado ❤️');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      if (loadingToast) toast.dismiss(loadingToast);
      toast.error('Error: ' + error.message);
    }
  };

  const handleEditMoment = async (e) => {
    e.preventDefault();
    if (!editingMoment) return;
    
    const datetime = `${editMoment.date}T${editMoment.time}:00`;
    const protection = editMoment.protection === 'none' ? null : editMoment.protection;
    
    let imageUrl = editingMoment.image_url;
    let loadingToast = null;

    try {
      if (editMoment.photoFile) {
        loadingToast = toast.loading('Obteniendo claves y encriptando foto...');
        const partnerPin = await getPartnerPin(user.couple_id, user.id);
        imageUrl = await uploadEncryptedImage(editMoment.photoFile, user.pin, partnerPin);
        toast.dismiss(loadingToast);
      }
      
      const result = await updateIntimateMoment(editingMoment.id, datetime, editMoment.notes, protection, imageUrl);
      
      if (result.success) {
        loadMoments();
        setEditingMoment(null);
        setEditMoment({ date: '', time: '', notes: '', protection: 'none', photoFile: null });
        toast.success('Momento actualizado ❤️');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      if (loadingToast) toast.dismiss(loadingToast);
      toast.error('Error: ' + error.message);
    }
  };

  const handleDeleteMoment = async (momentId) => {
    if (!confirm('¿Estás segura de que quieres eliminar este momento?')) return;
    
    const result = await deleteIntimateMoment(momentId);
    if (result.success) {
      loadMoments();
      toast.success('Momento eliminado');
    }
  };

  const startEditing = (moment) => {
    const date = safeParseDate(moment.moment_date);
    if (!date) return;
    setEditingMoment(moment);
    setEditMoment({
      date: format(date, 'yyyy-MM-dd'),
      time: format(date, 'HH:mm'),
      notes: moment.notes || '',
      protection: moment.protection || 'none',
      photoFile: null
    });
  };

  // Función auxiliar para parsear fechas (maneja strings y Date objects)
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

  // Calcular estadísticas
  const calculateStats = () => {
    if (moments.length === 0) return null;

    const now = new Date();
    const lastMoment = safeParseDate(moments[0].moment_date);
    if (!lastMoment) return null;
    const daysSinceLast = differenceInDays(now, lastMoment);

    // Momentos este mes
    const thisMonth = moments.filter(m => {
      const date = safeParseDate(m.moment_date);
      if (!date) return false;
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    // Promedio por mes (últimos 3 meses)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentMoments = moments.filter(m => {
      const date = safeParseDate(m.moment_date);
      if (!date) return false;
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
      const date = safeParseDate(moment.moment_date);
      if (!date) return;
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
              <label>Protección</label>
              <select
                value={newMoment.protection}
                onChange={(e) => setNewMoment({...newMoment, protection: e.target.value})}
              >
                <option value="none">Seleccionar...</option>
                <option value="with">💚 Con protección</option>
                <option value="without">❤️ Sin protección</option>
              </select>
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

            <div className="form-group">
              <label>Foto Secreta (opcional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--background)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                  <Camera size={20} />
                  {newMoment.photoFile ? 'Cambiar foto' : 'Añadir foto E2EE'}
                  <input type="file" accept="image/*" onChange={(e) => setNewMoment({...newMoment, photoFile: e.target.files[0]})} style={{ display: 'none' }} />
                </label>
                {newMoment.photoFile && <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{newMoment.photoFile.name}</span>}
              </div>
              <small style={{ color: 'var(--text-light)', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>La foto se encriptará en tu celular antes de subirse. Solo podrá verse con tu PIN.</small>
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

      {/* Formulario para editar momento */}
      {editingMoment && (
        <div className="add-form-card">
          <h3>Editar Momento</h3>
          <form onSubmit={handleEditMoment}>
            <div className="form-row">
              <div className="form-group">
                <label>Fecha</label>
                <input
                  type="date"
                  value={editMoment.date}
                  onChange={(e) => setEditMoment({...editMoment, date: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Hora (opcional)</label>
                <input
                  type="time"
                  value={editMoment.time}
                  onChange={(e) => setEditMoment({...editMoment, time: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Protección</label>
              <select
                value={editMoment.protection}
                onChange={(e) => setEditMoment({...editMoment, protection: e.target.value})}
              >
                <option value="none">Seleccionar...</option>
                <option value="with">💚 Con protección</option>
                <option value="without">❤️ Sin protección</option>
              </select>
            </div>

            <div className="form-group">
              <label>Notas privadas (opcional)</label>
              <textarea
                value={editMoment.notes}
                onChange={(e) => setEditMoment({...editMoment, notes: e.target.value})}
                placeholder="Detalles que quieran recordar..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Foto Secreta (opcional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--background)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                  <Camera size={20} />
                  {editMoment.photoFile ? 'Cambiar foto' : (editingMoment.image_url ? 'Actualizar foto E2EE' : 'Añadir foto E2EE')}
                  <input type="file" accept="image/*" onChange={(e) => setEditMoment({...editMoment, photoFile: e.target.files[0]})} style={{ display: 'none' }} />
                </label>
                {editMoment.photoFile && <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{editMoment.photoFile.name}</span>}
              </div>
              <small style={{ color: 'var(--text-light)', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>La foto se encriptará en tu celular antes de subirse. Solo podrá verse con tu PIN.</small>
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => { setEditingMoment(null); setEditMoment({ date: '', time: '', notes: '', protection: 'none' }); }} className="btn-secondary">
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
                  const datetime = safeParseDate(moment.moment_date);
                  if (!datetime) return null;
                  
                  return (
                    <div 
                      key={moment.id} 
                      className="moment-item" 
                      style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start' }}
                      onClick={() => setSelectedMoment(moment)}
                    >
                      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
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
                          {moment.protection && moment.protection !== 'none' && (
                            <span className="moment-protection">
                              {moment.protection === 'with' ? '💚 Con protección' : '❤️ Sin protección'}
                            </span>
                          )}
                          {moment.notes && (
                            <p className="moment-notes">{moment.notes.length > 50 ? moment.notes.substring(0, 50) + '...' : moment.notes}</p>
                          )}
                        </div>
                        <div className="moment-actions" style={{ marginLeft: 'auto', alignSelf: 'flex-start' }}>
                          <button 
                            type="button" 
                            className="icon-btn"
                            onClick={(e) => { e.stopPropagation(); startEditing(moment); }}
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            type="button" 
                            className="icon-btn danger"
                            onClick={(e) => { e.stopPropagation(); handleDeleteMoment(moment.id); }}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Imagen movida fuera de moment-info para que ocupe todo el ancho */}
                      {moment.image_url && (
                        <div style={{ position: 'relative', width: '100%', marginTop: '1rem', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                          <EncryptedImage 
                            url={moment.image_url} 
                            pin={user.pin} 
                            style={{ 
                              filter: 'blur(20px)', 
                              transform: 'scale(1.1)', 
                              transition: 'filter 0.3s', 
                              cursor: 'pointer', 
                              width: '100%', 
                              height: 'auto', 
                              display: 'block' 
                            }}
                          />
                          <div style={{ 
                            position: 'absolute', 
                            top: 0, left: 0, right: 0, bottom: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            pointerEvents: 'none', 
                            background: 'rgba(0,0,0,0.1)' 
                          }}>
                            <span style={{ 
                              background: 'rgba(255, 255, 255, 0.85)', 
                              color: '#333', 
                              padding: '0.5rem 1.25rem', 
                              borderRadius: '30px', 
                              fontWeight: '600', 
                              fontSize: '0.85rem', 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <Flame size={16} color="var(--primary)" />
                              Entra para ver la foto
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Detalle de Momento */}
      {selectedMoment && (
        <div className="modal-overlay" onClick={() => setSelectedMoment(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Detalles del Momento</h3>
              <button className="close-btn" onClick={() => setSelectedMoment(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="moment-details" style={{ padding: '1rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <CalendarIcon size={18} color="var(--primary)" />
                <span style={{ fontWeight: 'bold' }}>
                  {format(safeParseDate(selectedMoment.moment_date), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}
                </span>
              </div>
              
              {selectedMoment.protection && selectedMoment.protection !== 'none' && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Protección: </strong>
                  {selectedMoment.protection === 'with' ? '💚 Con protección' : '❤️ Sin protección'}
                </div>
              )}
              
              {selectedMoment.notes && (
                <div style={{ marginBottom: '1rem', background: 'var(--background)', padding: '1rem', borderRadius: '8px' }}>
                  <strong>Notas:</strong>
                  <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{selectedMoment.notes}</p>
                </div>
              )}
              
              {selectedMoment.image_url && (
                <div style={{ marginTop: '1rem' }}>
                  <strong>Foto secreta:</strong>
                  <div style={{ marginTop: '0.5rem' }}>
                    <EncryptedImage 
                      url={selectedMoment.image_url} 
                      pin={user.pin} 
                      style={{ cursor: 'pointer', maxHeight: '300px' }}
                      onClick={() => setFullscreenImage(selectedMoment.image_url)}
                    />
                  </div>
                  <small style={{ color: 'var(--text-light)', display: 'block', marginTop: '0.25rem', textAlign: 'center' }}>
                    Toca la foto para verla en pantalla completa
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visor de foto en pantalla completa */}
      {fullscreenImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
            onClick={() => setFullscreenImage(null)}
          >
            <X size={32} />
          </button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <EncryptedImage 
              url={fullscreenImage} 
              pin={user.pin} 
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
