# 🔔 Guía de Notificaciones Push - Recordatorios de Medicamentos

## ¿Cómo funcionan las notificaciones?

La app incluye un sistema completo de notificaciones push para recordarte tomar tus medicamentos a la hora exacta. 

### ✨ Características:

- **Recordatorios automáticos** a las horas que configures
- **Notificaciones nativas** en celular y escritorio
- **Múltiples horarios** por medicamento (ej: mañana, tarde, noche)
- **Vibración** en dispositivos móviles
- **Sin conexión requerida** después de la configuración inicial

## 📱 Activar Notificaciones

### Paso 1: Dar permiso

1. Ve a la sección "Pastillas" en la app
2. Verás un banner que dice "Activar notificaciones"
3. Haz clic en "Activar"
4. El navegador te pedirá permiso - acepta

### Paso 2: Agregar un medicamento

1. Haz clic en el botón "Agregar"
2. Completa la información:
   - **Nombre**: Ej: "Anticonceptivo", "Vitamina D"
   - **Dosis**: Ej: "1 tableta", "5mg"
   - **Frecuencia**: Diario, Semanal, o Según necesidad
   - **Horarios**: Agrega todos los horarios que necesites
   - **Notas**: Opcional (ej: "Tomar con comida")

3. Haz clic en "Guardar"

### Paso 3: ¡Listo!

Las notificaciones se programarán automáticamente. Recibirás un recordatorio en cada horario configurado.

## 🎯 Ejemplos de Uso

### Anticonceptivo diario
```
Nombre: Anticonceptivo
Dosis: 1 tableta
Frecuencia: Diario
Horarios: 21:00
Notas: Tomar siempre a la misma hora
```

### Vitaminas
```
Nombre: Vitamina D
Dosis: 2000 UI
Frecuencia: Diario
Horarios: 09:00
Notas: Tomar con el desayuno
```

### Medicamento 3 veces al día
```
Nombre: Antibiótico
Dosis: 500mg
Frecuencia: Diario
Horarios: 08:00, 14:00, 20:00
Notas: Tomar cada 8 horas con comida
```

## ⚙️ Cómo Funcionan Técnicamente

### En la App:
1. Cuando agregas un medicamento, se programa un recordatorio
2. La app guarda cuándo debe notificarte
3. A la hora exacta, el navegador muestra la notificación
4. Si cierras la app, las notificaciones siguen funcionando
5. Cuando reabres la app, las notificaciones se re-programan automáticamente

### Persistencia:
- Las notificaciones programadas se guardan en el navegador
- Aunque cierres la app, seguirán funcionando
- Al reinstalar la app, debes volver a activar los permisos

## 📲 Configuración por Plataforma

### iPhone/iPad (iOS):
1. **Safari es obligatorio** para PWAs en iOS
2. Abre la app → Toca el botón de compartir
3. "Agregar a pantalla de inicio"
4. Abre la app desde la pantalla de inicio (no desde Safari)
5. Activa las notificaciones cuando te lo pida

**Nota**: Las notificaciones de PWA en iOS solo funcionan desde iOS 16.4+

### Android:
1. Funciona en Chrome, Firefox, Edge
2. Instala la app desde el navegador
3. Acepta los permisos de notificación
4. ¡Listo!

### Escritorio (Windows/Mac/Linux):
1. Chrome, Edge, o Firefox
2. Instala la app desde el navegador
3. Acepta los permisos de notificación
4. Las notificaciones aparecerán en el centro de notificaciones del sistema

## 🔧 Solución de Problemas

### No recibo notificaciones

**Verifica permisos del navegador:**
- Chrome: Configuración → Privacidad y seguridad → Configuración de sitios → Notificaciones
- Safari (iOS): Ajustes → Safari → Notificaciones
- Firefox: Configuración → Privacidad y seguridad → Permisos → Notificaciones

**Verifica permisos del sistema:**
- Windows: Configuración → Sistema → Notificaciones
- Mac: Preferencias del Sistema → Notificaciones
- Android: Ajustes → Aplicaciones → [Navegador] → Notificaciones
- iOS: Ajustes → Notificaciones → Safari

### Las notificaciones dejaron de funcionar

1. Abre la app
2. Ve a "Pastillas"
3. Las notificaciones se re-programarán automáticamente

### Quiero desactivar temporalmente un medicamento

1. En la tarjeta del medicamento, haz clic en "Editar"
2. Las notificaciones se pausarán
3. Para reactivar, vuelve a editar y guarda

### Quiero cambiar el horario

1. Edita el medicamento
2. Cambia los horarios
3. Guarda
4. Las notificaciones se actualizarán automáticamente

## 🎨 Personalización

### Cambiar el ícono del medicamento:
- Usa emojis: 💊 💉 🩹 🧪 🌡️ 💊 💝
- Ayuda a identificar visualmente cada medicamento

### Cambiar el color:
- Cada medicamento puede tener su propio color
- Útil para distinguir entre diferentes tipos

## 📊 Seguimiento

### Ver historial:
- Marca cada toma con el botón "Tomar"
- Ve el historial de los últimos 30 días
- Verifica que no se te haya olvidado ninguna dosis

### Progreso diario:
- La app muestra cuántas dosis has tomado hoy
- Barra de progreso visual
- Checkmarks en las tomas completadas

## 💡 Tips

1. **Sé consistente**: Programa los horarios que realmente puedas cumplir
2. **Usa notas**: Agrega recordatorios como "con comida" o "antes de dormir"
3. **Colores diferentes**: Asigna un color a cada tipo de medicamento
4. **Revisa el historial**: Verifica que estés tomando todo a tiempo
5. **No silencies**: Las notificaciones están para ayudarte

## 🔒 Privacidad

- Las notificaciones son **locales** - solo aparecen en tu dispositivo
- Nadie más puede ver tus notificaciones
- Los datos de medicamentos están en tu base de datos privada en Neon
- Sin tracking ni compartir información con terceros

## ⚠️ Importante

Esta app es una **herramienta de ayuda** para recordatorios. NO reemplaza:
- Consulta médica profesional
- Instrucciones específicas de tu doctor
- Información del prospecto del medicamento

Siempre sigue las indicaciones de tu médico y el prospecto del medicamento.

---

¿Preguntas? Revisa el README.md principal o abre un issue en GitHub.
