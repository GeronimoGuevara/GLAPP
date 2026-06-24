import { useState, useEffect } from 'react';
import { Plus, Heart, Filter, Star, Camera, Lightbulb } from 'lucide-react';
import { defaultDateIdeas } from '../data/hardcodedIdeas';
import { getCustomDateIdeas, addCustomDateIdea, toggleFavorite, getFavorites } from '../lib/database';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import toast from 'react-hot-toast';

export default function DateIdeas({ user }) {
  const [customIdeas, setCustomIdeas] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('todas');
  const [newIdea, setNewIdea] = useState({
    title: '',
    category: 'romántico',
    difficulty: 'fácil',
    description: '',
    emoji: '💕',
    photoFile: null
  });

  // Cargar ideas personalizadas y favoritos
  useEffect(() => {
    loadCustomIdeas();
    loadFavorites();
  }, []);

  const loadCustomIdeas = async () => {
    const result = await getCustomDateIdeas(user.couple_id);
    if (result.success) {
      setCustomIdeas(result.data);
    }
  };

  const loadFavorites = async () => {
    const result = await getFavorites(user.id);
    if (result.success) {
      setFavorites(result.data);
    }
  };

  const handleAddIdea = async (e) => {
    e.preventDefault();
    
    let imageUrl = null;
    let loadingToast = null;
    
    try {
      if (newIdea.photoFile) {
        loadingToast = toast.loading('Subiendo imagen...');
        imageUrl = await uploadImageToCloudinary(newIdea.photoFile);
        toast.dismiss(loadingToast);
      }
      
      const ideaToSave = { ...newIdea, image_url: imageUrl };
      const result = await addCustomDateIdea(user.id, ideaToSave);
      
      if (result.success) {
        setCustomIdeas([result.data[0], ...customIdeas]);
        setNewIdea({
          title: '',
          category: 'romántico',
          difficulty: 'fácil',
          description: '',
          emoji: '💕',
          photoFile: null
        });
        setShowAddForm(false);
        toast.success('Idea agregada con éxito');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      if (loadingToast) toast.dismiss(loadingToast);
      toast.error('Error: ' + error.message);
    }
  };

  const handleToggleFavorite = async (ideaId, isCustom) => {
    await toggleFavorite(user.id, 'date', ideaId, isCustom);
    loadFavorites();
  };

  const isFavorite = (ideaId) => {
    return favorites.some(fav => fav.item_type === 'date' && fav.item_id === ideaId);
  };

  // Combinar ideas hardcodeadas con personalizadas
  const allIdeas = [
    ...defaultDateIdeas.map(idea => ({ ...idea, isCustom: false })),
    ...customIdeas.map(idea => ({ ...idea, id: idea.id.toString(), isCustom: true }))
  ];

  // Filtrar por categoría
  const filteredIdeas = filterCategory === 'todas' 
    ? allIdeas 
    : allIdeas.filter(idea => idea.category === filterCategory);

  // Obtener categorías únicas
  const categories = ['todas', ...new Set(allIdeas.map(idea => idea.category))];

  return (
    <div className="date-ideas-view">
      <div className="view-header">
        <h2>Ideas de Citas {filterCategory !== 'todas' && `· ${filterCategory}`}</h2>
        <button className="add-btn" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={20} />
          Agregar
        </button>
      </div>

      {/* Formulario para agregar nueva idea */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Nueva Idea de Cita</h3>
              <button className="close-btn" onClick={() => setShowAddForm(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddIdea}>
              <div className="form-group">
                <label>Emoji</label>
                <input
                  type="text"
                  value={newIdea.emoji}
                  onChange={(e) => setNewIdea({...newIdea, emoji: e.target.value})}
                  maxLength={2}
                  placeholder="💕"
                />
              </div>

              <div className="form-group">
                <label>Título</label>
                <input
                  type="text"
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({...newIdea, title: e.target.value})}
                  placeholder="Ej: Noche de película bajo las estrellas"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={newIdea.category}
                    onChange={(e) => setNewIdea({...newIdea, category: e.target.value})}
                  >
                    <option value="romántico">Romántico</option>
                    <option value="divertido">Divertido</option>
                    <option value="activo">Activo</option>
                    <option value="relajado">Relajado</option>
                    <option value="cultural">Cultural</option>
                    <option value="creativo">Creativo</option>
                    <option value="en casa">En casa</option>
                    <option value="casual">Casual</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Dificultad</label>
                  <select
                    value={newIdea.difficulty}
                    onChange={(e) => setNewIdea({...newIdea, difficulty: e.target.value})}
                  >
                    <option value="muy fácil">Muy fácil</option>
                    <option value="fácil">Fácil</option>
                    <option value="media">Media</option>
                    <option value="difícil">Difícil</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={newIdea.description}
                  onChange={(e) => setNewIdea({...newIdea, description: e.target.value})}
                  placeholder="Describe la actividad..."
                  rows={3}
                  required
                />
              </div>

              <div className="form-group">
                <label>Foto (opcional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--background)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                    <Camera size={20} />
                    {newIdea.photoFile ? 'Cambiar foto' : 'Añadir foto'}
                    <input type="file" accept="image/*" onChange={(e) => setNewIdea({...newIdea, photoFile: e.target.files[0]})} style={{ display: 'none' }} />
                  </label>
                  {newIdea.photoFile && <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{newIdea.photoFile.name}</span>}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Idea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filtros de categoría */}
      <div className="category-filters">
        {categories.map(cat => (
          <button
            key={cat}
            className={`filter-btn ${filterCategory === cat ? 'active' : ''}`}
            onClick={() => setFilterCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista de ideas */}
      <div className="ideas-grid">
        {filteredIdeas.map(idea => (
          <div key={idea.id} className="idea-card">
            <div className="idea-header">
              <span className="idea-emoji">{idea.emoji}</span>
              <button
                className={`favorite-btn ${isFavorite(idea.id) ? 'active' : ''}`}
                onClick={() => handleToggleFavorite(idea.id, idea.isCustom)}
              >
                <Star size={20} fill={isFavorite(idea.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
            <h3>{idea.title}</h3>
            <div className="idea-tags">
              <span className="tag">{idea.category}</span>
              <span className="tag">{idea.difficulty}</span>
              {idea.isCustom && <span className="tag custom">Personalizada</span>}
            </div>
            <p className="idea-description">{idea.description}</p>
            {idea.image_url && (
              <img 
                src={idea.image_url} 
                alt={idea.title} 
                style={{ width: '100%', borderRadius: '8px', marginTop: '1rem', objectFit: 'cover', maxHeight: '200px' }} 
              />
            )}
          </div>
        ))}
      </div>

      {filteredIdeas.length === 0 && (
        <div className="empty-state">
          <Lightbulb size={48} />
          <p>No hay ideas en esta categoría</p>
        </div>
      )}
    </div>
  );
}
