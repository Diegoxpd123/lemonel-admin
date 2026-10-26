# Lemonel Panel

Panel de administración de la tienda Lemonel. React + Vite, habla con `lemonel-api`.

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:5173
```

Necesita la API corriendo en `http://localhost:50002` (cambia con `VITE_API_URL`).
Acceso local: el correo y la contraseña de `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env` de la API.

## Qué se administra

- Productos: nombre, material, descripción, fotos (arrastrar para ordenar), precios por pieza (collar, aretes, set…), opciones de la clienta (medida, color, letra…), agotado, oculto, más vendido, nuevo.
- Categorías, colecciones (con foto y productos), colores (muestras), preguntas frecuentes.
- Ajustes: WhatsApp y redes, envíos y reservas, descuentos por cantidad, videos de la portada.
- Cambio de contraseña.

## Despliegue en Dokploy

Aplicación con el `Dockerfile` (nginx, puerto 80). Variables de construcción (Build Args):

| Variable | Ejemplo |
| --- | --- |
| `VITE_API_URL` | `https://lemonel-api.tupaginazo.com` |
| `VITE_STORE_URL` | `https://lemonel.tupaginazo.com` |

El dominio del panel debe estar en `CORS_ORIGINS` de la API.
