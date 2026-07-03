# REVIONIX - Sistema de Gestión Comercial

Full-Stack application para gestión de compras, gastos, ventas, y movilidad con API REST y base de datos MySQL.

## Requisitos

- Node.js 18+
- Git
- Railway CLI (opcional)

## Instalación Local

```bash
# Clonar repositorio
git clone <tu-repo>
cd revionix-api

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de MySQL

# Ejecutar aplicación
npm start

# En desarrollo
npm run dev
```

## Despliegue en Railway

### Opción 1: GitHub + Railway Dashboard (Recomendado)

1. **Crear repositorio en GitHub**
   - Ir a https://github.com/new
   - Crear nuevo repositorio "revionix-api"
   - No inicializar con README

2. **Subir código a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: REVIONIX API with MySQL"
   git branch -M main
   git remote add origin https://github.com/tuusuario/revionix-api.git
   git push -u origin main
   ```

3. **Conectar a Railway**
   - Ir a https://railway.app
   - Click "+ New" → "Project"
   - Click "Deploy from GitHub"
   - Autorizar y seleccionar "revionix-api"
   - Esperar a que Railway termine de desplegar

4. **Configurar MySQL en Railway**
   - En Railway Dashboard: Click "+ New"
   - Seleccionar "MySQL"
   - Esperar a que se cree la base de datos
   - Ir a "Variables" y copiar: `DATABASE_URL`

5. **Configurar variables de entorno**
   - En el proyecto Node.js → "Variables"
   - Agregar:
     ```
     NODE_ENV=production
     PORT=3000
     ```
   - Railway automáticamente proporciona `DATABASE_URL`

6. **Ejecutar schema.sql**
   - En la pestaña MySQL → "Data"
   - Ir a "Connect" → Copiar comando ssh/mysql
   - Conectar y ejecutar:
     ```sql
     mysql -h <host> -u root -p<password> <database> < schema.sql
     ```
   - O copiar contenido de schema.sql y ejecutar en el editor SQL de Railway

7. **Verificar despliegue**
   - Railway te proporciona una URL (ej: https://revionix-api.up.railway.app)
   - Visitar: `https://tu-url/health`

### Opción 2: Railway CLI (Avanzado)

```bash
npm install -g @railway/cli

railway init
railway up
railway open

# En el dashboard, agregar MySQL y configurar variables
```

## Estructura del Proyecto

```
revionix-api/
├── server.js              # Aplicación Express con APIs REST
├── package.json           # Dependencias Node.js
├── .env.example          # Template de variables de entorno
├── schema.sql            # Esquema de base de datos MySQL
├── Procfile              # Configuración para Railway
├── public/               # Archivos estáticos (HTML, CSS, JS)
│   ├── index.html        # Interfaz principal
│   ├── app.js            # JavaScript frontend
│   ├── style.css         # Estilos
│   └── uploads/          # Carpeta para archivos subidos
└── .gitignore            # Archivos a ignorar en Git
```

## Endpoints API

### Salud / Health
- `GET /health` - Health check básico
- `GET /api/health` - Health check con detalles API

### Compras
- `POST /api/compras` - Crear compra (con comprobante opcional)
- `GET /api/compras` - Listar compras
- `DELETE /api/compras/:id` - Eliminar compra

### Gastos
- `POST /api/gastos` - Crear gasto (con comprobante opcional)
- `GET /api/gastos` - Listar gastos
- `DELETE /api/gastos/:id` - Eliminar gasto

### Ventas
- `POST /api/ventas` - Registrar venta
- `GET /api/ventas` - Listar ventas
- `DELETE /api/ventas/:id` - Eliminar venta

### Analytics
- `GET /api/analytics/canales` - Análisis por canal de venta
- `GET /api/analytics/meses` - Análisis por mes

## Subida de Archivos

Los archivos se guardan en `/public/uploads/` con nombre único basado en timestamp:
- PDF, XML, IMG soportados
- Máximo 50MB por archivo
- Rutas accesibles vía `/uploads/<filename>`

## Variables de Entorno

```env
NODE_ENV=production           # development | production
PORT=3000                     # Puerto de escucha
DB_HOST=mysql                # Host MySQL (Railway usa "mysql")
DB_USER=root                 # Usuario MySQL
DB_PASSWORD=password         # Contraseña MySQL
DB_NAME=revionix             # Nombre base de datos
DB_PORT=3306                 # Puerto MySQL
```

## Troubleshooting

### Error de conexión a base de datos
- Verificar que MySQL está corriendo
- Confirmar credenciales en `.env`
- Revisar `DB_HOST` (en Railway debe ser el servicio MySQL)

### Archivos no se suben
- Verificar permisos en `/public/uploads/`
- Confirmar límite de archivo en Multer (50MB)

### CORS errors
- Verificar origen en header `Access-Control-Allow-Origin`
- Actualmente permite '*' (todos los orígenes)

## Licencia

MIT

## Soporte

Para reportar bugs o mejoras, contactar al equipo de desarrollo.
