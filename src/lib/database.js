import { neon } from '@neondatabase/serverless';

// IMPORTANTE: Reemplaza esto con tu connection string de Neon
// Lo puedes obtener desde tu dashboard de Neon
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL || '';

if (!DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL no configurada. La app funcionará en modo offline.');
}

// Crear cliente SQL
export const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

// Helper para ejecutar queries de forma segura
export async function executeQuery(query, params = []) {
  if (!sql) {
    console.warn('Database no disponible - trabajando en modo offline');
    return { success: false, error: 'Database no configurada' };
  }

  try {
    const result = await sql(query, params);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error en query:', error);
    return { success: false, error: error.message };
  }
}

// Inicializar tablas (ejecutar una vez al configurar)
export async function initializeTables() {
  if (!sql) return { success: false, error: 'Database no configurada' };

  const tables = [
    // Tabla de usuarios (solo ustedes dos)
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      pin VARCHAR(4) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Tabla de ciclos menstruales
    `CREATE TABLE IF NOT EXISTS menstrual_cycles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      start_date DATE NOT NULL,
      end_date DATE,
      cycle_length INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Tabla de relaciones íntimas
    `CREATE TABLE IF NOT EXISTS intimate_moments (
      id SERIAL PRIMARY KEY,
      moment_date TIMESTAMP NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Tabla de ideas de citas personalizadas (las que agregan)
    `CREATE TABLE IF NOT EXISTS custom_date_ideas (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      category VARCHAR(50),
      difficulty VARCHAR(50),
      description TEXT,
      emoji VARCHAR(10),
      added_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Tabla de ideas de comidas personalizadas (las que agregan)
    `CREATE TABLE IF NOT EXISTS custom_meal_ideas (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      type VARCHAR(50),
      difficulty VARCHAR(50),
      time VARCHAR(50),
      ingredients TEXT,
      description TEXT,
      emoji VARCHAR(10),
      added_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Tabla de favoritos (para marcar ideas que les gustan)
    `CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      item_type VARCHAR(20), -- 'date' o 'meal'
      item_id VARCHAR(50), -- puede ser hardcoded ID o custom ID
      is_custom BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Tabla de juegos (para guardar puntajes)
    `CREATE TABLE IF NOT EXISTS game_scores (
      id SERIAL PRIMARY KEY,
      game_name VARCHAR(100),
      player_name VARCHAR(100),
      score INTEGER,
      played_at TIMESTAMP DEFAULT NOW()
    )`,

    // Tabla de medicamentos/pastillas
    `CREATE TABLE IF NOT EXISTS medications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      dosage VARCHAR(100),
      frequency VARCHAR(50),
      times TEXT,
      notes TEXT,
      color VARCHAR(20) DEFAULT '#ff6b9d',
      icon VARCHAR(10) DEFAULT '💊',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Tabla de historial de medicamentos tomados
    `CREATE TABLE IF NOT EXISTS medication_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      medication_id INTEGER REFERENCES medications(id) ON DELETE CASCADE,
      medication_name VARCHAR(200),
      taken_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  ];

  try {
    for (const tableQuery of tables) {
      await sql(tableQuery);
    }
    console.log('✅ Tablas inicializadas correctamente');
    return { success: true };
  } catch (error) {
    console.error('Error inicializando tablas:', error);
    return { success: false, error: error.message };
  }
}

// Funciones para ciclos menstruales
export async function addCycle(userId, startDate, endDate = null, notes = '') {
  const query = `
    INSERT INTO menstrual_cycles (user_id, start_date, end_date, notes)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  return executeQuery(query, [userId, startDate, endDate, notes]);
}

export async function getCycles(userId, limit = 12) {
  const query = `
    SELECT * FROM menstrual_cycles
    WHERE user_id = $1
    ORDER BY start_date DESC
    LIMIT $2
  `;
  return executeQuery(query, [userId, limit]);
}

// Funciones para momentos íntimos
export async function addIntimateмомент(momentDate, notes = '') {
  const query = `
    INSERT INTO intimate_moments (moment_date, notes)
    VALUES ($1, $2)
    RETURNING *
  `;
  return executeQuery(query, [momentDate, notes]);
}

export async function getIntimateMoments(limit = 50) {
  const query = `
    SELECT * FROM intimate_moments
    ORDER BY moment_date DESC
    LIMIT $1
  `;
  return executeQuery(query, [limit]);
}

// Funciones para ideas personalizadas de citas
export async function addCustomDateIdea(userId, idea) {
  const query = `
    INSERT INTO custom_date_ideas (title, category, difficulty, description, emoji, added_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  return executeQuery(query, [
    idea.title,
    idea.category,
    idea.difficulty,
    idea.description,
    idea.emoji,
    userId
  ]);
}

export async function getCustomDateIdeas() {
  const query = `SELECT * FROM custom_date_ideas ORDER BY created_at DESC`;
  return executeQuery(query);
}

// Funciones para ideas personalizadas de comidas
export async function addCustomMealIdea(userId, idea) {
  const query = `
    INSERT INTO custom_meal_ideas (title, type, difficulty, time, ingredients, description, emoji, added_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  return executeQuery(query, [
    idea.title,
    idea.type,
    idea.difficulty,
    idea.time,
    JSON.stringify(idea.ingredients),
    idea.description,
    idea.emoji,
    userId
  ]);
}

export async function getCustomMealIdeas() {
  const query = `SELECT * FROM custom_meal_ideas ORDER BY created_at DESC`;
  return executeQuery(query);
}

// Funciones para favoritos
export async function toggleFavorite(userId, itemType, itemId, isCustom = false) {
  // Primero verificar si ya existe
  const checkQuery = `
    SELECT * FROM favorites
    WHERE user_id = $1 AND item_type = $2 AND item_id = $3
  `;
  const existing = await executeQuery(checkQuery, [userId, itemType, itemId]);

  if (existing.success && existing.data.length > 0) {
    // Si existe, eliminarlo
    const deleteQuery = `
      DELETE FROM favorites
      WHERE user_id = $1 AND item_type = $2 AND item_id = $3
    `;
    return executeQuery(deleteQuery, [userId, itemType, itemId]);
  } else {
    // Si no existe, agregarlo
    const insertQuery = `
      INSERT INTO favorites (user_id, item_type, item_id, is_custom)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    return executeQuery(insertQuery, [userId, itemType, itemId, isCustom]);
  }
}

export async function getFavorites(userId) {
  const query = `
    SELECT * FROM favorites
    WHERE user_id = $1
  `;
  return executeQuery(query, [userId]);
}

// Funciones para usuarios
export async function getUsers() {
  const query = `
    SELECT id, name, pin, created_at
    FROM users
    ORDER BY id ASC
  `;
  return executeQuery(query);
}

// Funciones para medicamentos
export async function addMedication(userId, medication) {
  const query = `
    INSERT INTO medications (user_id, name, dosage, frequency, times, notes, color, icon, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  return executeQuery(query, [
    userId,
    medication.name,
    medication.dosage,
    medication.frequency,
    JSON.stringify(medication.times),
    medication.notes,
    medication.color,
    medication.icon,
    medication.isActive
  ]);
}

export async function getMedications(userId) {
  const query = `
    SELECT * FROM medications
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  return executeQuery(query, [userId]);
}

export async function updateMedication(medicationId, medication) {
  const query = `
    UPDATE medications
    SET name = $1, dosage = $2, frequency = $3, times = $4, 
        notes = $5, color = $6, icon = $7, is_active = $8
    WHERE id = $9
    RETURNING *
  `;
  return executeQuery(query, [
    medication.name,
    medication.dosage,
    medication.frequency,
    JSON.stringify(medication.times),
    medication.notes,
    medication.color,
    medication.icon,
    medication.isActive,
    medicationId
  ]);
}

export async function deleteMedication(medicationId) {
  const query = `DELETE FROM medications WHERE id = $1`;
  return executeQuery(query, [medicationId]);
}

// Funciones para historial de medicamentos
export async function addMedicationLog(userId, medicationId, takenAt) {
  // Obtener el nombre del medicamento
  const medQuery = `SELECT name FROM medications WHERE id = $1`;
  const medResult = await executeQuery(medQuery, [medicationId]);
  
  if (!medResult.success || medResult.data.length === 0) {
    return { success: false, error: 'Medicamento no encontrado' };
  }

  const medicationName = medResult.data[0].name;

  const query = `
    INSERT INTO medication_logs (user_id, medication_id, medication_name, taken_at)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  return executeQuery(query, [userId, medicationId, medicationName, takenAt]);
}

export async function getMedicationHistory(userId, days = 30) {
  const query = `
    SELECT * FROM medication_logs
    WHERE user_id = $1
      AND taken_at >= NOW() - INTERVAL '${days} days'
    ORDER BY taken_at DESC
  `;
  return executeQuery(query, [userId]);
}

