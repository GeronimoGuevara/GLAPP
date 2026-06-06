# 🚀 Guía de Despliegue - Nuestros Momentos

## Paso 1: Configurar Neon (Base de Datos)

### 1.1 Crear cuenta y proyecto
1. Ve a [https://supabase.com/](https://supabase.com/)
2. Crea una cuenta gratis (con GitHub o email)
3. Haz clic en "Create Project"
4. Nombra tu proyecto: "our-moments" o como quieras
5. Región: Elige la más cercana a ti (US East, EU Central, etc.)

### 1.2 Crear las tablas
1. En tu proyecto de Neon, ve a "SQL Editor"
2. Copia TODO el contenido de `database/init.sql`
3. Pégalo en el SQL Editor y haz clic en "Run"
4. Verás el mensaje: ✅ Todas las tablas se crearon correctamente

### 1.3 Obtener connection string
1. Ve a "Connection Details" o "Dashboard"
2. Copia el "Connection String" completo
3. Guárdalo para el siguiente paso

## Paso 2: Desplegar la App en Vercel

### 2.1 Preparar el código
1. Sube tu código a GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <tu-repo-de-github>
   git push -u origin main
   ```

### 2.2 Desplegar en Vercel
1. Ve a [https://vercel.com](https://vercel.com)
2. Crea cuenta (con GitHub)
3. Haz clic en "New Project"
4. Importa tu repositorio de GitHub
5. En "Environment Variables" agrega:
   - Name: `VITE_DATABASE_URL`
   - Value: Tu connection string de Neon
6. Haz clic en "Deploy"
7. Espera 2-3 minutos

### 2.3 Configurar dominio (Opcional)
1. Vercel te da un dominio gratis: `tu-app.vercel.app`
2. O puedes usar tu propio dominio desde Settings → Domains

## Paso 3: Instalar la PWA

### En tu celular:

**iOS (Safari):**
1. Abre `tu-app.vercel.app` en Safari
2. Toca el botón de compartir (cuadrado con flecha)
3. Desliza hacia abajo y toca "Agregar a pantalla de inicio"
4. Nómbrala "Nuestros Momentos 💕"
5. ¡Listo! Ahora aparece como app

**Android (Chrome):**
1. Abre `tu-app.vercel.app` en Chrome
2. Toca los tres puntos (menú)
3. Toca "Instalar app" o "Agregar a pantalla de inicio"
4. ¡Listo!

### En tu computadora:

**Chrome/Edge:**
1. Abre `tu-app.vercel.app`
2. Mira el ícono de instalación en la barra de direcciones (➕)
3. Haz clic en "Instalar"
4. ¡Ahora es una app de escritorio!

## Paso 4: Personalizar PINs

1. En Vercel, ve a tu proyecto → Settings → Environment Variables
2. O edita directamente `src/components/Login.jsx` antes de hacer commit

## 🎯 Checklist Final

- [ ] Base de datos creada en Neon
- [ ] Tablas inicializadas con init.sql
- [ ] Connection string copiado
- [ ] Código subido a GitHub
- [ ] Desplegado en Vercel
- [ ] Variable VITE_DATABASE_URL configurada
- [ ] App instalada en celular
- [ ] PINs personalizados
- [ ] Probado el login
- [ ] Probado agregar un ciclo
- [ ] Probado agregar una idea personalizada

## 🔧 Solución de Problemas

### "Database no disponible"
→ Verifica que VITE_DATABASE_URL esté bien configurada en Vercel

### Las tablas no existen
→ Ejecuta de nuevo el script SQL en Neon SQL Editor

### La app no se actualiza
→ En Vercel, ve a Deployments → Redeploy

### Error de CORS
→ Neon ya tiene CORS habilitado por defecto, no debería pasar

## 🔄 Actualizar la App

Cuando hagas cambios al código:

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

Vercel detectará el push y re-desplegará automáticamente en ~2 minutos.

## 💡 Tips

- Usa el plan gratuito de Neon: es suficiente para años
- Vercel también es gratis para proyectos personales
- Guarda el connection string en un lugar seguro
- Haz backups periódicos desde el SQL Editor de Neon

## 🎉 ¡Listo!

Ahora tienen su app privada de pareja funcionando 24/7 en la nube, accesible desde cualquier dispositivo.

¿Preguntas? Revisa el README.md principal.
