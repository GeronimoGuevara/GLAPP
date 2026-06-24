import { useState, useEffect } from 'react';
import { Plus, Star, Clock, ChefHat, X } from 'lucide-react';
import { defaultMealIdeas } from '../data/hardcodedIdeas';
import { getCustomMealIdeas, addCustomMealIdea, toggleFavorite, getFavorites } from '../lib/database';

export default function MealIdeas({ user }) {
  const [customIdeas, setCustomIdeas] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState('todas');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [newIdea, setNewIdea] = useState({
    title: '',
    type: 'cena',
    difficulty: 'fácil',
    time: '',
    ingredients: [],
    description: '',
    emoji: '🍽️'
  });
  const [ingredientInput, setIngredientInput] = useState('');

  useEffect(() => {
    loadCustomIdeas();
    loadFavorites();
  }, []);

  const loadCustomIdeas = async () => {
    const result = await getCustomMealIdeas(user.couple_id);
    if (result.success) {
      const parsed = result.data.map(idea => ({
        ...idea,
        ingredients: JSON.parse(idea.ingredients)
      }));
      setCustomIdeas(parsed);
    }
  };

  const loadFavorites = async () => {
    const result = await getFavorites(user.id);
    if (result.success) {
      setFavorites(result.data);
    }
  };

  const handleAddIngredient = () => {
    if (ingredientInput.trim()) {
      setNewIdea({
        ...newIdea,
        ingredients: [...newIdea.ingredients, ingredientInput.trim()]
      });
      setIngredientInput('');
    }
  };

  const handleRemoveIngredient = (index) => {
    setNewIdea({
      ...newIdea,
      ingredients: newIdea.ingredients.filter((_, i) => i !== index)
    });
  };

  const handleAddIdea = async (e) => {
    e.preventDefault();
    const result = await addCustomMealIdea(user.id, newIdea);
    
    if (result.success) {
      loadCustomIdeas();
      setNewIdea({
        title: '',
        type: 'cena',
        difficulty: 'fácil',
        time: '',
        ingredients: [],
        description: '',
        emoji: '🍽️'
      });
      setShowAddForm(false);
    }
  };

  const handleToggleFavorite = async (ideaId, isCustom) => {
    await toggleFavorite(user.id, 'meal', ideaId, isCustom);
    loadFavorites();
  };

  const isFavorite = (ideaId) => {
    return favorites.some(fav => fav.item_type === 'meal' && fav.item_id === ideaId);
  };

  const allIdeas = [
    ...defaultMealIdeas.map(idea => ({ ...idea, isCustom: false })),
    ...customIdeas.map(idea => ({ ...idea, id: idea.id.toString(), isCustom: true }))
  ];

  const filteredIdeas = filterType === 'todas' 
    ? allIdeas 
    : allIdeas.filter(idea => idea.type === filterType);

  const types = ['todas', 'desayuno', 'almuerzo', 'cena'];

  return (
    <div className="meal-ideas-view">
      <div className="view-header">
        <h2>Ideas de Comidas {filterType !== 'todas' && `· ${filterType}`}</h2>
        <button className="add-btn" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={20} />
          Agregar
        </button>
      </div>

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Nueva Receta</h3>
              <button className="close-btn" onClick={() => setShowAddForm(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddIdea} style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label>Emoji</label>
                <input
                  type="text"
                  value={newIdea.emoji}
                  onChange={(e) => setNewIdea({...newIdea, emoji: e.target.value})}
                  maxLength={2}
                  placeholder="🍽️"
                />
              </div>

              <div className="form-group">
                <label>Nombre del plato</label>
                <input
                  type="text"
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({...newIdea, title: e.target.value})}
                  placeholder="Ej: Pasta carbonara casera"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo</label>
                  <select
                    value={newIdea.type}
                    onChange={(e) => setNewIdea({...newIdea, type: e.target.value})}
                  >
                    <option value="desayuno">Desayuno</option>
                    <option value="almuerzo">Almuerzo</option>
                    <option value="cena">Cena</option>
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
                    <option value="media-alta">Media-alta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tiempo</label>
                  <input
                    type="text"
                    value={newIdea.time}
                    onChange={(e) => setNewIdea({...newIdea, time: e.target.value})}
                    placeholder="Ej: 30 min"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ingredientes</label>
                <div className="ingredient-input">
                  <input
                    type="text"
                    value={ingredientInput}
                    onChange={(e) => setIngredientInput(e.target.value)}
                    placeholder="Agregar ingrediente..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddIngredient())}
                  />
                  <button type="button" onClick={handleAddIngredient} className="btn-secondary">
                    Agregar
                  </button>
                </div>
                <div className="ingredients-list">
                  {newIdea.ingredients.map((ing, idx) => (
                    <span key={idx} className="ingredient-tag">
                      {ing}
                      <button type="button" onClick={() => handleRemoveIngredient(idx)}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={newIdea.description}
                  onChange={(e) => setNewIdea({...newIdea, description: e.target.value})}
                  placeholder="Describe el plato..."
                  rows={3}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Receta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="category-filters">
        {types.map(type => (
          <button
            key={type}
            className={`filter-btn ${filterType === type ? 'active' : ''}`}
            onClick={() => setFilterType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="ideas-grid">
        {filteredIdeas.map(idea => (
          <div key={idea.id} className="idea-card meal-card" onClick={() => setSelectedIdea(idea)}>
            <div className="idea-header">
              <span className="idea-emoji">{idea.emoji}</span>
              <button
                className={`favorite-btn ${isFavorite(idea.id) ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(idea.id, idea.isCustom);
                }}
              >
                <Star size={20} fill={isFavorite(idea.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
            <h3>{idea.title}</h3>
            <div className="idea-tags">
              <span className="tag">{idea.type}</span>
              <span className="tag">{idea.difficulty}</span>
              <span className="tag"><Clock size={14} /> {idea.time}</span>
              {idea.isCustom && <span className="tag custom">Personalizada</span>}
            </div>
            <p className="idea-description">{idea.description}</p>
          </div>
        ))}
      </div>

      {/* Modal con detalles de la receta */}
      {selectedIdea && (
        <div className="modal-overlay" onClick={() => setSelectedIdea(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedIdea(null)}>×</button>
            <div className="modal-header">
              <span className="modal-emoji">{selectedIdea.emoji}</span>
              <h2>{selectedIdea.title}</h2>
            </div>
            <div className="modal-body">
              <div className="recipe-meta">
                <span><Clock size={16} /> {selectedIdea.time}</span>
                <span><ChefHat size={16} /> {selectedIdea.difficulty}</span>
              </div>
              <h3>Ingredientes:</h3>
              <ul className="ingredients-detailed">
                {selectedIdea.ingredients.map((ing, idx) => (
                  <li key={idx}>{ing}</li>
                ))}
              </ul>
              <h3>Preparación:</h3>
              <p>{selectedIdea.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
