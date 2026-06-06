# 💕 Nuestros Momentos - PWA de Pareja

Una aplicación web progresiva (PWA) privada y romántica para parejas que quieren llevar seguimiento de:
- ❤️ Ciclo menstrual con predicciones
- 🔥 Momentos íntimos
- 💡 Ideas de citas (hardcodeadas + personalizadas)
- 🍽️ Ideas de comidas/cenas (hardcodeadas + personalizadas)
- 🎮 Juegos casuales para pareja

## ✨ Características

- **100% Privada**: Solo para ustedes dos con autenticación por PIN
- **Instalable**: Funciona como app nativa en móvil y escritorio
- **Offline-first**: Funciona sin internet (después de la primera carga)
- **Base de datos en la nube**: Persistencia de datos con Neon (PostgreSQL)
- **Diseño romántico**: UI moderna y atractiva con colores pastel
- **Notificaciones Push**: Recordatorios automáticos de medicamentos

### 🎯 Funcionalidades principales:

- 📅 **Tracker de Ciclo Menstrual** - Predicción del próximo ciclo y fases actuales
- 💊 **Gestión de Medicamentos** - Programar pastillas con notificaciones automáticas a horario
- 🔥 **Momentos Íntimos** - Registro privado con estadísticas
- 💡 **Ideas de Citas** - 15 hardcodeadas + agregar personalizadas
- 🍽️ **Ideas de Comidas** - 15 recetas + agregar personalizadas
- ⭐ **Sistema de Favoritos** - Marcar las mejores ideas
- 🎮 **Juegos de Pareja** - Trivia, Dados del Amor, y Memoria

## 🚀 Configuración Rápida

### 1. Clonar el proyecto
```bash
git clone <tu-repo>
cd pwa-couple
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Base de Datos Neon

#### a) Crear cuenta en Neon
1. Ve a [supabase.com](https://supabase.com/)
2. Crea una cuenta gratis
3. Crea un nuevo proyecto

#### b) Obtener connection string
1. En tu proyecto de Neon, ve a "Connection Details"
2. Copia el "Connection String" (debería verse así):
   ```
   postgresql://postgres.[tu_id]:[contraseña]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```

#### c) Configurar variables de entorno
1. Crea un archivo `.env` en la raíz del proyecto:
   ```bash
   cp .env.example .env
   ```

2. Abre `.env` y pega tu connection string:
   ```
   VITE_DATABASE_URL=postgresql://tu-connection-string-aqui
   ```

### 4. Inicializar la base de datos

Abre el archivo `src/lib/database.js` y al final del archivo, agrega temporalmente:

```javascript
// Solo ejecutar UNA VEZ para crear las tablas
initializeTables().then(result => {
  console.log('Resultado:', result);
});
```

Luego ejecuta:
```bash
npm run dev
```

Abre la consola del navegador (F12) y verás "✅ Tablas inicializadas correctamente"

**IMPORTANTE**: Después de ver este mensaje, ELIMINA las líneas que agregaste para no volver a ejecutar la inicialización.

### 5. Personalizar PINs de acceso

Abre `src/components/Login.jsx` y modifica los PINs en la línea ~12:

```javascript
const users = [
  { id: 1, name: 'Tu nombre aquí', pin: '1234' },    // Cambia esto
  { id: 2, name: 'Su nombre aquí', pin: '5678' }      // Y esto
];
```

### 6. Iniciar la aplicación

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`

## 📱 Instalar como PWA

### En móvil (iOS/Android):
1. Abre la app en Safari (iOS) o Chrome (Android)
2. Toca el botón de compartir/menú
3. Selecciona "Agregar a pantalla de inicio"
4. ¡Listo! Ahora aparecerá como app nativa

### En escritorio (Chrome/Edge):
1. Abre la app en Chrome o Edge
2. Mira el ícono de instalación en la barra de direcciones
3. Haz clic en "Instalar"
4. ¡Listo! Ahora aparecerá como app de escritorio

## 🌐 Desplegar a Producción

### Opción 1: Vercel (Recomendado - Gratis)

1. Crea cuenta en [vercel.com](https://vercel.com)
2. Instala Vercel CLI:
   ```bash
   npm i -g vercel
   ```

3. Despliega:
   ```bash
   npm run build
   vercel --prod
   ```

4. Configura las variables de entorno en el dashboard de Vercel:
   - Ve a tu proyecto → Settings → Environment Variables
   - Agrega `VITE_DATABASE_URL` con tu connection string de Neon

### Opción 2: Netlify (Gratis)

1. Crea cuenta en [netlify.com](https://netlify.com)
2. Conecta tu repositorio de GitHub
3. Configura:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Agrega variable de entorno `VITE_DATABASE_URL` en Site Settings

## 📊 Estructura de la Base de Datos

```
users                  - Usuarios (ustedes dos)
menstrual_cycles       - Historial de ciclos
intimate_moments       - Registro de momentos íntimos
custom_date_ideas      - Ideas de citas personalizadas
custom_meal_ideas      - Ideas de comidas personalizadas
favorites              - Favoritos marcados
game_scores            - Puntajes de juegos
medications            - Medicamentos/pastillas programadas
medication_logs        - Historial de medicamentos tomados
```

## 🎨 Personalización

### Cambiar colores
Edita `src/styles/App.css` en la sección `:root`:

```css
:root {
  --primary: #ff6b9d;      /* Color principal */
  --secondary: #a78bfa;    /* Color secundario */
  --accent: #fbbf24;       /* Color de acento */
  --background: #fff0f5;   /* Fondo */
}
```

### Agregar más ideas hardcodeadas
Edita `src/data/hardcodedIdeas.js` y agrega más objetos al array.

## 🔒 Seguridad y Privacidad

- Los datos solo son visibles con PIN correcto
- Connection string de base de datos nunca se expone al cliente
- Todas las conexiones a Neon usan SSL/TLS
- Sin tracking ni analytics de terceros
- Sin recolección de datos personal

## 💾 Límites del Plan Gratuito de Neon

- **Almacenamiento**: 0.5 GB (suficiente para años de uso)
- **Cómputo**: 100 CU-hours/mes (más que suficiente)
- **Sin límite de tiempo**: La base de datos es gratis para siempre

## 🐛 Solución de Problemas

### Error: "Database no disponible"
- Verifica que el `.env` tenga la variable `VITE_DATABASE_URL`
- Asegúrate de reiniciar el servidor después de agregar el `.env`

### Las tablas no se crean
- Verifica que ejecutaste `initializeTables()` una vez
- Revisa la consola del navegador para errores
- Verifica que tu connection string sea correcto

### La app no se instala como PWA
- Asegúrate de estar usando HTTPS (en producción)
- Verifica que el manifest.json se esté sirviendo correctamente
- Prueba en modo incógnito

## 📝 Tareas Pendientes (Mejoras futuras)

- [ ] Notificaciones push para recordatorios de ciclo
- [ ] Exportar datos a PDF/CSV
- [ ] Modo oscuro
- [ ] Más juegos
- [ ] Álbum de fotos privado
- [ ] Calendario compartido

## 🤝 Contribuciones

Esta es una app personal, pero si encuentras bugs o tienes sugerencias, ¡házmelo saber!

## 📄 Licencia

Uso personal. No comercial.

---

Hecho con 💕 para parejas que quieren algo privado y especial.
