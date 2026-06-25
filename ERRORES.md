# Registro de Errores y Lecciones Aprendidas

Este documento sirve como un registro para no volver a cometer los mismos errores en el futuro, especialmente relacionados con CSS global y bugs de dispositivos específicos.

## 1. Modificar el CSS global sin medir el impacto
- **El Error**: Intenté solucionar un scroll horizontal en un formulario específico agregando reglas como `overflow-x: hidden` o `width: 100vw` en archivos globales como `App.css`.
- **La Consecuencia**: Rompí el diseño de otras partes de la app, como la vista de "cards", causando que las fotos dejaran de verse.
- **La Solución**: Aplicar correcciones siempre mediante estilos en línea (inline styles) directamente en los componentes de React que tienen el problema o con clases CSS estrictamente limitadas a ese contexto.

## 2. Inputs de Fecha y Hora en iOS (Desborde horizontal)
- **El Error**: Asumir que `width: 100%` hace que un input de fecha/hora respete el contenedor en dispositivos móviles (iOS/Safari).
- **La Consecuencia**: Safari fuerza un ancho mínimo a sus selectores nativos de fecha y hora. Si la pantalla es más chica que ese ancho, el input rompe el diseño e ignora los márgenes, viéndose desplazado hacia los costados.
- **La Solución**: Los inputs de fecha y hora en móvil siempre deben tener estilos como `-webkit-appearance: none`, `appearance: none`, y `min-width: 0` para forzar a que el sistema operativo los dibuje dentro del espacio límite asignado.
