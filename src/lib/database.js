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

  // Migración: agregar columna protection si no existe
  try {
    await sql`ALTER TABLE intimate_moments ADD COLUMN IF NOT EXISTS protection VARCHAR(20)`;
  } catch (e) {
    // La columna ya existe o hay otro error, continuamos
    console.log('Migración protection:', e.message);
  }

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
      protection VARCHAR(20),
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
    )`,

    // Tabla de suscripciones Push para notificaciones
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Tabla de configuración del ciclo menstrual
    `CREATE TABLE IF NOT EXISTS cycle_settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      period_duration INTEGER DEFAULT 5,
      cycle_duration INTEGER DEFAULT 28,
      last_period_start DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    // Tabla de notas del ciclo (síntomas, actividad sexual, etc.)
    `CREATE TABLE IF NOT EXISTS cycle_notes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      note_date DATE NOT NULL,
      note_type VARCHAR(50) NOT NULL,
      note TEXT,
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
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    const result = await sql`
      INSERT INTO menstrual_cycles (user_id, start_date, end_date, notes)
      VALUES (${userId}, ${startDate}, ${endDate}, ${notes})
      RETURNING *
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding cycle:', error);
    return { success: false, error: error.message };
  }
}

export async function getCycles(userId, limit = 12) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada', data: [] };
  }
  
  try {
    // Primero intentar con JOIN
    try {
      const result = await sql`
        SELECT mc.*, u.name as user_name
        FROM menstrual_cycles mc
        LEFT JOIN users u ON mc.user_id = u.id
        ORDER BY mc.start_date DESC
        LIMIT ${limit}
      `;
      return { success: true, data: result };
    } catch (joinError) {
      // Si falla el JOIN, intentar sin JOIN
      console.warn('Error with JOIN, trying simple query:', joinError);
      const result = await sql`
        SELECT * FROM menstrual_cycles
        ORDER BY start_date DESC
        LIMIT ${limit}
      `;
      return { success: true, data: result };
    }
  } catch (error) {
    console.error('Error getting cycles:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// Funciones para momentos íntimos
export async function addIntimateMoment(momentDate, notes = '', protection = null) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    const result = await sql`
      INSERT INTO intimate_moments (moment_date, notes, protection)
      VALUES (${momentDate}, ${notes}, ${protection})
      RETURNING *
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding intimate moment:', error);
    return { success: false, error: error.message };
  }
}

export async function getIntimateMoments(limit = 50) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada', data: [] };
  }
  
  try {
    const result = await sql`
      SELECT * FROM intimate_moments
      ORDER BY moment_date DESC
      LIMIT ${limit}
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting intimate moments:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getIntimateMomentsByMonth(monthStart, monthEnd) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada', data: [] };
  }
  
  try {
    const result = await sql`
      SELECT * FROM intimate_moments
      WHERE moment_date >= ${monthStart} AND moment_date < ${monthEnd}
      ORDER BY moment_date DESC
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting intimate moments by month:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function updateIntimateMoment(momentId, momentDate, notes = '', protection = null) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    const result = await sql`
      UPDATE intimate_moments
      SET moment_date = ${momentDate}, notes = ${notes}, protection = ${protection}
      WHERE id = ${momentId}
      RETURNING *
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating intimate moment:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteIntimateMoment(momentId) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    const result = await sql`
      DELETE FROM intimate_moments
      WHERE id = ${momentId}
      RETURNING *
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error deleting intimate moment:', error);
    return { success: false, error: error.message };
  }
}

// Funciones para ideas personalizadas de citas
export async function addCustomDateIdea(userId, idea) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    const result = await sql`
      INSERT INTO custom_date_ideas (title, category, difficulty, description, emoji, added_by)
      VALUES (${idea.title}, ${idea.category}, ${idea.difficulty}, ${idea.description}, ${idea.emoji}, ${userId})
      RETURNING *
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding custom date idea:', error);
    return { success: false, error: error.message };
  }
}

export async function getCustomDateIdeas() {
  if (!sql) {
    return { success: false, error: 'Database no configurada', data: [] };
  }
  
  try {
    const result = await sql`SELECT * FROM custom_date_ideas ORDER BY created_at DESC`;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting custom date ideas:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// Funciones para ideas personalizadas de comidas
export async function addCustomMealIdea(userId, idea) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    const result = await sql`
      INSERT INTO custom_meal_ideas (title, type, difficulty, time, ingredients, description, emoji, added_by)
      VALUES (${idea.title}, ${idea.type}, ${idea.difficulty}, ${idea.time}, ${JSON.stringify(idea.ingredients)}, ${idea.description}, ${idea.emoji}, ${userId})
      RETURNING *
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding custom meal idea:', error);
    return { success: false, error: error.message };
  }
}

export async function getCustomMealIdeas() {
  if (!sql) {
    return { success: false, error: 'Database no configurada', data: [] };
  }
  
  try {
    const result = await sql`SELECT * FROM custom_meal_ideas ORDER BY created_at DESC`;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting custom meal ideas:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// Funciones para favoritos
export async function toggleFavorite(userId, itemType, itemId, isCustom = false) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    // Primero verificar si ya existe
    const existing = await sql`
      SELECT * FROM favorites
      WHERE user_id = ${userId} AND item_type = ${itemType} AND item_id = ${itemId}
    `;

    if (existing.length > 0) {
      // Si existe, eliminarlo
      await sql`
        DELETE FROM favorites
        WHERE user_id = ${userId} AND item_type = ${itemType} AND item_id = ${itemId}
      `;
      return { success: true, data: [] };
    } else {
      // Si no existe, agregarlo
      const result = await sql`
        INSERT INTO favorites (user_id, item_type, item_id, is_custom)
        VALUES (${userId}, ${itemType}, ${itemId}, ${isCustom})
        RETURNING *
      `;
      return { success: true, data: result };
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return { success: false, error: error.message };
  }
}

export async function getFavorites(userId) {
  if (!sql) {
    return { success: false, error: 'Database no configurada', data: [] };
  }
  
  try {
    const result = await sql`
      SELECT * FROM favorites
      WHERE user_id = ${userId}
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting favorites:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// Funciones para usuarios
export async function getUsers() {
  if (!sql) {
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    const result = await sql`
      SELECT id, name, pin, created_at
      FROM users
      ORDER BY id ASC
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting users:', error);
    return { success: false, error: error.message };
  }
}

// Funciones para medicamentos
export async function addMedication(userId, medication) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    const result = await sql`
      INSERT INTO medications (user_id, name, dosage, frequency, times, notes, color, icon, is_active)
      VALUES (${userId}, ${medication.name}, ${medication.dosage}, ${medication.frequency}, ${JSON.stringify(medication.times)}, ${medication.notes}, ${medication.color}, ${medication.icon}, ${medication.isActive})
      RETURNING *
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding medication:', error);
    return { success: false, error: error.message };
  }
}

export async function getMedications(userId) {
  if (!sql) {
    return { success: false, error: 'Database no configurada', data: [] };
  }
  
  try {
    const result = await sql`
      SELECT * FROM medications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting medications:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function updateMedication(medicationId, medication) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    const result = await sql`
      UPDATE medications
      SET name = ${medication.name}, dosage = ${medication.dosage}, frequency = ${medication.frequency}, times = ${JSON.stringify(medication.times)}, 
          notes = ${medication.notes}, color = ${medication.color}, icon = ${medication.icon}, is_active = ${medication.isActive}
      WHERE id = ${medicationId}
      RETURNING *
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating medication:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteMedication(medicationId) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    await sql`DELETE FROM medications WHERE id = ${medicationId}`;
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error deleting medication:', error);
    return { success: false, error: error.message };
  }
}

// Funciones para actualizar ciclo menstrual
export async function updateCycle(cycleId, startDate, endDate = null, notes = '') {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    // Calcular duración del período si hay fecha de fin
    let cycleLength = null;
    if (endDate) {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      cycleLength = differenceInDays(end, start) + 1;
    }
    
    const result = await sql`
      UPDATE menstrual_cycles
      SET start_date = ${startDate}, end_date = ${endDate}, notes = ${notes}, cycle_length = ${cycleLength}
      WHERE id = ${cycleId}
      RETURNING *
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating cycle:', error);
    return { success: false, error: error.message };
  }
}

// Funciones para eliminar ciclo menstrual
export async function deleteCycle(cycleId) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    await sql`DELETE FROM menstrual_cycles WHERE id = ${cycleId}`;
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error deleting cycle:', error);
    return { success: false, error: error.message };
  }
}

// Funciones para notas del ciclo (síntomas, actividad sexual, etc.)
export async function addCycleNote(userId, date, noteType, note = '', protection = null) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    const result = await sql`
      INSERT INTO cycle_notes (user_id, note_date, note_type, note, protection)
      VALUES (${userId}, ${date}, ${noteType}, ${note}, ${protection})
      RETURNING *
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding cycle note:', error);
    return { success: false, error: error.message };
  }
}

export async function getCycleNotes(userId, monthStart, monthEnd) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada', data: [] };
  }
  
  try {
    const result = await sql`
      SELECT * FROM cycle_notes
      WHERE user_id = ${userId}
        AND note_date >= ${monthStart}
        AND note_date <= ${monthEnd}
      ORDER BY note_date ASC
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting cycle notes:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function deleteCycleNote(noteId) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    await sql`DELETE FROM cycle_notes WHERE id = ${noteId}`;
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error deleting cycle note:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCycleNote(noteId, date, noteType, note, protection = null) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    await sql`
      UPDATE cycle_notes 
      SET note_date = ${date}, note_type = ${noteType}, note = ${note}, protection = ${protection}
      WHERE id = ${noteId}
    `;
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error updating cycle note:', error);
    return { success: false, error: error.message };
  }
}

// Funciones para guardar configuración del ciclo
export async function saveCycleSettings(userId, periodDuration, cycleDuration, lastPeriodStart = null) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    // Verificar si ya existe configuración
    const existing = await sql`
      SELECT * FROM cycle_settings WHERE user_id = ${userId}
    `;
    
    if (existing.length > 0) {
      // Actualizar
      await sql`
        UPDATE cycle_settings
        SET period_duration = ${periodDuration}, cycle_duration = ${cycleDuration}, last_period_start = ${lastPeriodStart}, updated_at = NOW()
        WHERE user_id = ${userId}
      `;
    } else {
      // Crear
      await sql`
        INSERT INTO cycle_settings (user_id, period_duration, cycle_duration, last_period_start)
        VALUES (${userId}, ${periodDuration}, ${cycleDuration}, ${lastPeriodStart})
      `;
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error saving cycle settings:', error);
    return { success: false, error: error.message };
  }
}

export async function getCycleSettings(userId) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada', data: null };
  }
  
  try {
    const result = await sql`
      SELECT * FROM cycle_settings WHERE user_id = ${userId}
    `;
    return { success: true, data: result.length > 0 ? result[0] : null };
  } catch (error) {
    console.error('Error getting cycle settings:', error);
    return { success: false, error: error.message, data: null };
  }
}

// Helper para parseISO ya que date-fns no está disponible en este archivo
function parseISO(dateStr) {
  return new Date(dateStr);
}

function differenceInDays(date1, date2) {
  const diffTime = Math.abs(date1 - date2);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Funciones para historial de medicamentos
export async function addMedicationLog(userId, medicationId, takenAt) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    // Obtener el nombre del medicamento
    const medResult = await sql`SELECT name FROM medications WHERE id = ${medicationId}`;
    
    if (medResult.length === 0) {
      return { success: false, error: 'Medicamento no encontrado' };
    }

    const medicationName = medResult[0].name;

    const result = await sql`
      INSERT INTO medication_logs (user_id, medication_id, medication_name, taken_at)
      VALUES (${userId}, ${medicationId}, ${medicationName}, ${takenAt})
      RETURNING *
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding medication log:', error);
    return { success: false, error: error.message };
  }
}

export async function getMedicationHistory(userId, days = 30) {
  if (!sql) {
    return { success: false, error: 'Database no configurada', data: [] };
  }
  
  try {
    const result = await sql`
      SELECT * FROM medication_logs
      WHERE user_id = ${userId}
        AND taken_at >= NOW() - INTERVAL '30 days'
      ORDER BY taken_at DESC
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting medication history:', error);
    return { success: false, error: error.message, data: [] };
  }
}

