// URL de la base de datos (solo la comprobamos para ver si hay backend configurado)
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL || '';

if (!DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL no configurada. La app funcionará en modo offline.');
}

// Función principal de sql para tagged template literals
export async function sql(strings, ...values) {
  if (!DATABASE_URL) throw new Error('Database no configurada');

  let query = strings[0];
  for (let i = 1; i < strings.length; i++) {
    query += `$${i}` + strings[i];
  }
  
  const token = localStorage.getItem('glapp_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('/api/query', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, params: values })
  });
  
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Unknown query error');
  }
  
  return data.result;
}

// Para queries crudos sin tagged templates
sql.unsafe = async function(query, params = []) {
  if (!DATABASE_URL) throw new Error('Database no configurada');

  const token = localStorage.getItem('glapp_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('/api/query', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, params })
  });
  
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Unknown query error');
  }
  
  return data.result;
}

// Helper para ejecutar queries de forma segura
export async function executeQuery(query, params = []) {
  if (!DATABASE_URL) {
    console.warn('Database no disponible - trabajando en modo offline');
    return { success: false, error: 'Database no configurada' };
  }

  try {
    const result = await sql.unsafe(query, params);
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
    await sql`ALTER TABLE cycle_notes ADD COLUMN IF NOT EXISTS protection VARCHAR(20)`;
  } catch (e) {
    console.log('Migración protection:', e.message);
  }

  // Migración: agregar cycle_id a cycle_notes y nuevas columnas de imágenes
  try {
    await sql`ALTER TABLE cycle_notes ADD COLUMN IF NOT EXISTS cycle_id INTEGER REFERENCES menstrual_cycles(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE intimate_moments ADD COLUMN IF NOT EXISTS image_url TEXT`;
    await sql`ALTER TABLE custom_date_ideas ADD COLUMN IF NOT EXISTS image_url TEXT`;
    await sql`CREATE TABLE IF NOT EXISTS couple_photos (
      id SERIAL PRIMARY KEY,
      couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      category VARCHAR(50) DEFAULT 'general',
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`;
  } catch (e) {
    console.log('Migración cycle_id e imágenes:', e.message);
  }

  // Migración: tabla couples y columnas en users
  try {
    await sql`CREATE TABLE IF NOT EXISTS couples (id SERIAL PRIMARY KEY, created_at TIMESTAMP DEFAULT NOW())`;
    await sql`ALTER TABLE couples ADD COLUMN IF NOT EXISTS invite_code VARCHAR(20) UNIQUE`;
    await sql`ALTER TABLE couples ADD COLUMN IF NOT EXISTS email VARCHAR(255)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'mujer'`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS couple_id INTEGER REFERENCES couples(id)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`;
    await sql`ALTER TABLE intimate_moments ADD COLUMN IF NOT EXISTS couple_id INTEGER REFERENCES couples(id)`;
    await sql`ALTER TABLE game_scores ADD COLUMN IF NOT EXISTS couple_id INTEGER REFERENCES couples(id)`;

    // Auto-vincular usuarios existentes a una pareja inicial
    const usersExist = await sql`SELECT * FROM users WHERE couple_id IS NULL`;
    if (usersExist.length > 0) {
      // Crear una pareja por defecto
      const newCouple = await sql`INSERT INTO couples DEFAULT VALUES RETURNING id`;
      const coupleId = newCouple[0].id;
      // Actualizar a todos los usuarios sueltos a esta pareja
      await sql`UPDATE users SET couple_id = ${coupleId} WHERE couple_id IS NULL`;
      
      // Intentar inferir género por nombre (hardcodeado según contexto "Geronimo/Lucia" típico en esta app, o genérico)
      await sql`UPDATE users SET gender = 'hombre' WHERE name ILIKE '%gero%' OR name ILIKE '%geronimo%' OR name ILIKE '%hombre%'`;
      await sql`UPDATE users SET gender = 'mujer' WHERE name ILIKE '%lucia%' OR name ILIKE '%lu%' OR name ILIKE '%mujer%' OR name ILIKE '%novia%'`;

      // Actualizar emails predeterminados
      await sql`UPDATE users SET email = 'geronimoguevaramansuino@gmail.com' WHERE name ILIKE '%gero%' OR name ILIKE '%geronimo%'`;
      await sql`UPDATE users SET email = 'luciadanielapereyra@gmail.com' WHERE name ILIKE '%lucia%' OR name ILIKE '%lu%'`;

      // Actualizar tablas antiguas sin couple_id
      await sql`UPDATE intimate_moments SET couple_id = ${coupleId} WHERE couple_id IS NULL`;
      await sql`UPDATE game_scores SET couple_id = ${coupleId} WHERE couple_id IS NULL`;
    }
  } catch (e) {
    console.log('Migración parejas:', e.message);
  }

  const tables = [
    // Tabla de parejas
    `CREATE TABLE IF NOT EXISTS couples (
      id SERIAL PRIMARY KEY,
      invite_code VARCHAR(20) UNIQUE,
      email VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Tabla de usuarios (ahora con email, couple_id, gender y avatar)
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE,
      pin VARCHAR(4) NOT NULL,
      gender VARCHAR(10) DEFAULT 'mujer',
      couple_id INTEGER REFERENCES couples(id),
      avatar TEXT,
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
      couple_id INTEGER REFERENCES couples(id),
      moment_date TIMESTAMP NOT NULL,
      notes TEXT,
      protection VARCHAR(20),
      image_url TEXT,
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
      image_url TEXT,
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
      couple_id INTEGER REFERENCES couples(id),
      game_name VARCHAR(100),
      player_name VARCHAR(100),
      score INTEGER,
      played_at TIMESTAMP DEFAULT NOW()
    )`,

    // Tabla de competencias entre parejas
    `CREATE TABLE IF NOT EXISTS competitions (
      id SERIAL PRIMARY KEY,
      invite_code VARCHAR(20) UNIQUE,
      couple_a_id INTEGER REFERENCES couples(id),
      couple_b_id INTEGER REFERENCES couples(id),
      created_at TIMESTAMP DEFAULT NOW()
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
      endpoint TEXT NOT NULL UNIQUE,
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
      cycle_id INTEGER REFERENCES menstrual_cycles(id) ON DELETE CASCADE,
      note_date DATE NOT NULL,
      note_type VARCHAR(50) NOT NULL,
      note TEXT,
      protection VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Tabla de fotos de pareja
    `CREATE TABLE IF NOT EXISTS couple_photos (
      id SERIAL PRIMARY KEY,
      couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      category VARCHAR(50) DEFAULT 'general',
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  ];

  try {
    for (const tableQuery of tables) {
      await sql.unsafe(tableQuery);
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

export async function getCycles(coupleId, limit = 12) {
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
        WHERE u.couple_id = ${coupleId} OR u.couple_id IS NULL
        ORDER BY mc.start_date DESC
        LIMIT ${limit}
      `;
      return { success: true, data: result };
    } catch (joinError) {
      // Si falla el JOIN, intentar sin JOIN
      console.warn('Error with JOIN, trying simple query:', joinError);
      const result = await sql`
        SELECT * FROM menstrual_cycles
        WHERE user_id IN (SELECT id FROM users WHERE couple_id = ${coupleId} OR couple_id IS NULL)
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
export async function addIntimateMoment(coupleId, momentDate, notes = '', protection = null, image_url = null) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    const result = await sql`
      INSERT INTO intimate_moments (couple_id, moment_date, notes, protection, image_url)
      VALUES (${coupleId}, ${momentDate}, ${notes}, ${protection}, ${image_url || null})
      RETURNING *
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding intimate moment:', error);
    return { success: false, error: error.message };
  }
}

export async function getIntimateMoments(coupleId, limit = 50) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada', data: [] };
  }
  
  try {
    const result = await sql`
      SELECT * FROM intimate_moments
      WHERE couple_id = ${coupleId} OR couple_id IS NULL
      ORDER BY moment_date DESC
      LIMIT ${limit}
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting intimate moments:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getIntimateMomentsByMonth(coupleId, monthStart, monthEnd) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada', data: [] };
  }
  
  try {
    const result = await sql`
      SELECT * FROM intimate_moments
      WHERE (couple_id = ${coupleId} OR couple_id IS NULL)
      AND moment_date >= ${monthStart} AND moment_date < ${monthEnd}
      ORDER BY moment_date DESC
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting intimate moments by month:', error);
    return { success: false, error: error.message, data: [] };
  }
}



export async function updateIntimateMoment(momentId, momentDate, notes = '', protection = null, image_url = null) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    const result = await sql`
      UPDATE intimate_moments
      SET moment_date = ${momentDate}, notes = ${notes}, protection = ${protection}, image_url = COALESCE(${image_url}, image_url)
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
      INSERT INTO custom_date_ideas (title, category, difficulty, description, emoji, image_url, added_by)
      VALUES (${idea.title}, ${idea.category}, ${idea.difficulty}, ${idea.description}, ${idea.emoji}, ${idea.image_url || null}, ${userId})
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
export async function addCycleNote(userId, date, noteType, note = '', protection = null, cycleId = null) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    const result = await sql`
      INSERT INTO cycle_notes (user_id, cycle_id, note_date, note_type, note, protection)
      VALUES (${userId}, ${cycleId}, ${date}, ${noteType}, ${note}, ${protection})
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
      WHERE note_date >= ${monthStart}
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

export async function updateCycleNote(noteId, date, noteType, note, protection = null, cycleId = null) {
  if (!sql) {
    console.error('Database no disponible');
    return { success: false, error: 'Database no configurada' };
  }
  
  try {
    await sql`
      UPDATE cycle_notes 
      SET note_date = ${date}, note_type = ${noteType}, note = ${note}, protection = ${protection}, cycle_id = COALESCE(${cycleId}, cycle_id)
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
    // Verificar si ya existe configuración (compartida para ambos)
    const existing = await sql`
      SELECT * FROM cycle_settings LIMIT 1
    `;
    
    if (existing.length > 0) {
      // Actualizar
      await sql`
        UPDATE cycle_settings
        SET period_duration = ${periodDuration}, cycle_duration = ${cycleDuration}, last_period_start = ${lastPeriodStart}, updated_at = NOW()
        WHERE id = ${existing[0].id}
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
      SELECT * FROM cycle_settings LIMIT 1
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

// ----------------------------------------------------
// Novedades para Parejas, Perfiles y Login Segurizado
// ----------------------------------------------------

export async function getUserById(id) {
  if (!sql) return { success: false, error: 'Database no configurada' };
  try {
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    if (result.length > 0) {
      return { success: true, data: result[0] };
    }
    return { success: false, error: 'Usuario no encontrado' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function loginUser(email, pin) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin })
    });
    
    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Login fallido' };
    }
    
    // Guardar el token para futuras peticiones
    localStorage.setItem('glapp_token', data.token);
    
    return { success: true, data: data.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Deprecated: getUserByEmailAndPin (reemplazado por loginUser)
export async function getUserByEmailAndPin(email, pin) {
  return await loginUser(email, pin);
}

export async function registerUser(name, email, pin, gender) {
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, pin, gender })
    });
    
    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Registro fallido' };
    }
    
    localStorage.setItem('glapp_token', data.token);
    return { success: true, data: data.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getPartner(coupleId, currentUserId) {
  if (!sql || !coupleId) return { success: false, error: 'Datos insuficientes' };
  try {
    const result = await sql`SELECT id, name, avatar, gender FROM users WHERE couple_id = ${coupleId} AND id != ${currentUserId} LIMIT 1`;
    if (result.length > 0) {
      return { success: true, data: result[0] };
    }
    return { success: false, error: 'Pareja no encontrada' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getEncryptionKey(coupleId) {
  if (!sql || !coupleId) return null;
  try {
    const result = await sql`SELECT encryption_key FROM couples WHERE id = ${coupleId} LIMIT 1`;
    if (result.length > 0) {
      return result[0].encryption_key;
    }
    return null;
  } catch (error) {
    console.error('Error fetching encryption key:', error);
    return null;
  }
}

export async function updateUserPassword(userId, currentPassword, newPassword) {
  try {
    const token = localStorage.getItem('glapp_token');
    const response = await fetch('/api/update-password', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Actualización fallida' };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// Genera un string random de n caracteres (letras mayúsculas y números)
function generateInviteCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function getMonthlySummary(coupleId, year, month) {
  if (!sql) return { success: false, error: 'Database no configurada' };
  try {
    const padMonth = month.toString().padStart(2, '0');
    const prefix = `${year}-${padMonth}`;
    
    // Actividad íntima
    const intimate = await sql`
      SELECT COUNT(*) as count 
      FROM intimate_moments 
      WHERE couple_id = ${coupleId} 
      AND TO_CHAR(moment_date, 'YYYY-MM') = ${prefix}
    `;
    
    // Juegos (Memoria Emoji) mejor puntaje por jugador en el mes
    const games = await sql`
      SELECT player_name, MIN(score) as best_score
      FROM game_scores
      WHERE couple_id = ${coupleId}
      AND game_name = 'Memoria Emoji'
      AND TO_CHAR(played_at, 'YYYY-MM') = ${prefix}
      GROUP BY player_name
      ORDER BY best_score ASC
    `;

    // Obtener competencias de ligas (vs otras parejas) y sus resultados del mes
    const activeComps = await sql`
      SELECT * FROM competitions WHERE couple_a_id = ${coupleId} OR couple_b_id = ${coupleId}
    `;

    const leaguesData = [];
    
    for (const comp of activeComps) {
      if (!comp.couple_b_id) continue; // Si nadie se unió, no hay liga aún
      
      const opponentId = comp.couple_a_id === coupleId ? comp.couple_b_id : comp.couple_a_id;
      
      // Obtener mejor score global de nuestra pareja
      const myCoupleBest = await sql`
        SELECT MIN(score) as best FROM game_scores 
        WHERE couple_id = ${coupleId} AND game_name = 'Memoria Emoji' AND TO_CHAR(played_at, 'YYYY-MM') = ${prefix}
      `;
      
      // Obtener mejor score global de pareja rival
      const opponentBest = await sql`
        SELECT MIN(score) as best FROM game_scores 
        WHERE couple_id = ${opponentId} AND game_name = 'Memoria Emoji' AND TO_CHAR(played_at, 'YYYY-MM') = ${prefix}
      `;

      // Obtener nombres de la pareja rival
      const opponentUsers = await sql`SELECT array_agg(name) as names FROM users WHERE couple_id = ${opponentId}`;
      
      leaguesData.push({
        opponentNames: opponentUsers[0]?.names?.join(' & ') || 'Pareja Rival',
        myBest: myCoupleBest[0]?.best || null,
        opponentBest: opponentBest[0]?.best || null,
        invite_code: comp.invite_code
      });
    }
    
    return { 
      success: true, 
      data: {
        intimateCount: parseInt(intimate[0]?.count || 0),
        memoryGame: games, // array of {player_name, best_score} ordered by best_score asc
        leagues: leaguesData
      } 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createCouple(email) {
  if (!sql) return { success: false, error: 'Database no configurada' };
  // Intentamos crear hasta tener un invite_code único (muy raro colisionar con 6 caracteres, pero por seguridad)
  for (let attempts = 0; attempts < 3; attempts++) {
    const code = generateInviteCode(6);
    try {
      const encryptionKey = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
      const result = await sql`
        INSERT INTO couples (invite_code, email, encryption_key)
        VALUES (${code}, ${email || null}, ${encryptionKey})
        RETURNING *
      `;
      if (result.length > 0) {
        return { success: true, data: result[0] };
      }
    } catch (e) {
      if (!e.message.includes('unique constraint')) {
        return { success: false, error: e.message };
      }
    }
  }
  return { success: false, error: 'No se pudo generar un código único para la pareja' };
}

export async function updateUserCouple(userId, coupleId) {
  if (!sql) return { success: false, error: 'Database no configurada' };
  try {
    const result = await sql`
      UPDATE users 
      SET couple_id = ${coupleId} 
      WHERE id = ${userId} 
      RETURNING *
    `;
    if (result.length > 0) {
      return { success: true, data: result[0] };
    }
    return { success: false, error: 'No se pudo vincular a la pareja' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getCoupleByInviteCode(inviteCode) {
  if (!sql) return { success: false, error: 'Database no configurada' };
  try {
    // Buscar la pareja
    const coupleResult = await sql`SELECT * FROM couples WHERE invite_code = ${inviteCode.toUpperCase()}`;
    
    if (coupleResult.length === 0) {
      return { success: false, error: 'Código de invitación inválido o no existe.' };
    }
    
    const couple = coupleResult[0];
    
    // Buscar a los miembros actuales de esta pareja
    const usersResult = await sql`SELECT name FROM users WHERE couple_id = ${couple.id}`;
    
    const partnerName = usersResult.length > 0 
                        ? usersResult[0].name 
                        : 'Alguien';
                        
    return { success: true, data: { coupleId: couple.id, partnerName } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateUserAvatar(userId, avatarBase64) {
  if (!sql) return { success: false, error: 'Database no configurada' };
  try {
    const result = await sql`
      UPDATE users 
      SET avatar = ${avatarBase64} 
      WHERE id = ${userId} 
      RETURNING *
    `;
    if (result.length > 0) {
      return { success: true, data: result[0] };
    }
    return { success: false, error: 'No se pudo actualizar la foto de perfil' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// NUEVAS FUNCIONES PARA JUEGOS Y COMPETENCIAS
// ==========================================

export async function saveGameScore(coupleId, gameName, playerName, score) {
  if (!sql) return { success: false, error: 'Database no configurada' };
  try {
    const result = await sql`
      INSERT INTO game_scores (couple_id, game_name, player_name, score)
      VALUES (${coupleId}, ${gameName}, ${playerName}, ${score})
      RETURNING *
    `;
    return { success: true, data: result[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createCompetition(coupleId) {
  if (!sql) return { success: false, error: 'Database no configurada' };
  try {
    // Generar un código aleatorio de 6 letras/números
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const result = await sql`
      INSERT INTO competitions (invite_code, couple_a_id) 
      VALUES (${inviteCode}, ${coupleId}) 
      RETURNING *
    `;
    return { success: true, data: result[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function joinCompetition(coupleId, inviteCode) {
  if (!sql) return { success: false, error: 'Database no configurada' };
  try {
    const compResult = await sql`SELECT * FROM competitions WHERE invite_code = ${inviteCode.toUpperCase()}`;
    if (compResult.length === 0) {
      return { success: false, error: 'Código de competencia inválido' };
    }
    
    const comp = compResult[0];
    if (comp.couple_b_id) {
      return { success: false, error: 'Esta competencia ya está llena' };
    }
    
    if (comp.couple_a_id === coupleId) {
      return { success: false, error: 'No puedes unirte a tu propia competencia' };
    }
    
    const updateResult = await sql`
      UPDATE competitions 
      SET couple_b_id = ${coupleId} 
      WHERE id = ${comp.id} 
      RETURNING *
    `;
    return { success: true, data: updateResult[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getCompetitions(coupleId) {
  if (!sql) return { success: false, error: 'Database no configurada' };
  try {
    const comps = await sql`
      SELECT c.*, 
             (SELECT array_agg(u.name) FROM users u WHERE u.couple_id = c.couple_a_id) as couple_a_names,
             (SELECT array_agg(u.name) FROM users u WHERE u.couple_id = c.couple_b_id) as couple_b_names
      FROM competitions c
      WHERE c.couple_a_id = ${coupleId} OR c.couple_b_id = ${coupleId}
      ORDER BY c.created_at DESC
    `;
    
    return { success: true, data: comps };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// Funciones para Fotos de Pareja
// ==========================================

export async function addCouplePhoto(coupleId, userId, url, category = 'general') {
  if (!sql) return { success: false, error: 'Database no configurada' };
  try {
    const result = await sql`
      INSERT INTO couple_photos (couple_id, uploaded_by, url, category)
      VALUES (${coupleId}, ${userId}, ${url}, ${category})
      RETURNING *
    `;
    return { success: true, data: result[0] };
  } catch (error) {
    console.error('Error adding couple photo:', error);
    return { success: false, error: error.message };
  }
}

export async function getCouplePhotos(coupleId, category = null) {
  if (!sql) return { success: false, error: 'Database no configurada', data: [] };
  try {
    let result;
    if (category) {
      result = await sql`SELECT * FROM couple_photos WHERE couple_id = ${coupleId} AND category = ${category} ORDER BY created_at DESC`;
    } else {
      result = await sql`SELECT * FROM couple_photos WHERE couple_id = ${coupleId} ORDER BY created_at DESC`;
    }
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting couple photos:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function deleteCouplePhoto(photoId) {
  if (!sql) return { success: false, error: 'Database no configurada' };
  try {
    await sql`DELETE FROM couple_photos WHERE id = ${photoId}`;
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error deleting couple photo:', error);
    return { success: false, error: error.message };
  }
}
