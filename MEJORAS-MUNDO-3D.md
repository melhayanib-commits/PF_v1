# Pantalla Focus Campus 3D — notas de esta revisión

## Mundo 3D
- El avatar ya no utiliza una cabeza cúbica: usa geometría redondeada, detalles de cara, cabello, torso, cinturón, brazos y piernas articuladas.
- Los tres portales de memoria están agrupados y señalizados cerca del punto inicial.
- WASD/flechas mueven al jugador en relación con la orientación de la cámara; arriba avanza y abajo retrocede.
- Espacio y el botón táctil ejecutan el salto; Shift y DASH activan el impulso.
- El ratón puede orientar la cámara (clic sobre el canvas para bloquear el puntero; botón derecho y arrastre también orientan la cámara). En móvil, arrastra sobre el área del mundo.
- La selección de aspecto cambia el color de la indumentaria.
- Se conserva el historial local de las sesiones.

## Límites conocidos
Esta entrega es un prototipo WebGL con modelos procedurales creados mediante Three.js; no incluye todavía assets AAA, captura de movimiento, esqueletos profesionales, monstruo con IA de navegación ni salas completas con físicas individuales. Las pruebas de memoria se presentan en paneles interactivos al activar los portales. No debe anunciarse como un juego comercial terminado.

## FocusIA: despliegue real del backend
La aplicación no puede crear por sí sola un servidor remoto ni generar una clave API. Se ha eliminado la URL de Render que estaba escrita como destino por defecto, porque una URL no desplegada provoca el error engañoso «no hay conexión con el backend».

1. Despliega la carpeta `v7` en Render u otro host Node compatible, usando `render.yaml` como configuración de referencia.
2. Configura `OPENAI_API_KEY` como variable privada en el panel del host. Nunca la pegues en HTML, JavaScript público ni GitHub Pages.
3. Revisa `OPENAI_MODEL` y usa un modelo disponible en tu cuenta con la API Responses.
4. Abre `https://TU-SERVIDOR/api/health`. La respuesta debe incluir `ok: true` y `configured: true`.
5. En Pantalla Focus, abre Preferencias y privacidad y guarda `https://TU-SERVIDOR` en «URL del backend de FocusIA».
6. Si la salud responde `configured: false`, falta la clave. Si da error de red, revisa la URL, CORS y los logs del host. Si responde error de cuota, revisa la facturación/límites de la API.

La conexión real solo se puede confirmar tras desplegar el servidor con una clave válida y hacer una petición real; el chequeo estático no prueba una llamada remota.
