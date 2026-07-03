# 🚀 REVIONIX - Guía Rápida de Despliegue en Railway

## Opción A: Despliegue Recomendado (3 clicks en Railway)

### Paso 1: Preparar GitHub (5 minutos)

1. **Crear repositorio en GitHub:**
   - Ir a https://github.com/new
   - Nombre: `revionix-api`
   - Descripción: "REVIONIX - Sistema de Gestión Comercial"
   - Seleccionar **Public** (Railway lo necesita)
   - NO inicializar con README/gitignore
   - Click **Create repository**

2. **Subir código a GitHub:**
   ```bash
   cd C:\ruta\a\railway-deploy
   
   git init
   git add .
   git commit -m "Initial commit: REVIONIX API with MySQL"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/revionix-api.git
   git push -u origin main
   ```

### Paso 2: Conectar a Railway (3 clicks)

1. **Ir a Railway:**
   - https://railway.app
   - Click en **New Project**
   - Click en **Deploy from GitHub**
   - Autorizar GitHub si es la primera vez
   - Seleccionar repositorio **revionix-api**

2. **Railway comienza a desplegar automáticamente**
   - Esperar ~3-5 minutos a que termine
   - Ver logs en Railway Dashboard

### Paso 3: Configurar MySQL (2 minutos)

1. **En Railway Dashboard:**
   - Click **+ New**
   - Buscar y seleccionar **MySQL**
   - Esperar a que se cree (~1 minuto)

2. **Conectar MySQL al proyecto Node.js:**
   - En la tarjeta MySQL → **Connect**
   - Copiar `DATABASE_URL`
   - En tarjeta Node.js → **Variables**
   - Pegar como variable (Railway la detecta automáticamente)

### Paso 4: Crear Tablas en MySQL (1 minuto)

1. **En Railway MySQL → Data → SQL Editor**
2. **Copiar todo de `schema.sql` y ejecutar**
3. **Verificar que se crearon 4 tablas:**
   - compras
   - ventas
   - gastos
   - movilidad

### Paso 5: Verificar Despliegue (1 minuto)

1. **Ir a tu aplicación:**
   - Railway te da URL como: `https://revionix-api-production.up.railway.app`
   - Visitar: `https://tu-url/health`
   - Debe retornar: `{"status":"ok","timestamp":"..."}`

2. **Acceder a la aplicación:**
   - Ir a: `https://tu-url/`
   - Login: usuario/contraseña (cualquiera funciona inicialmente)
   - Deberías ver Dashboard

---

## Estructura de Archivos Incluida

```
railway-deploy/
├── server.js                 # API Express con MySQL
├── package.json             # Dependencias Node.js
├── schema.sql              # Crear tablas MySQL
├── Procfile                # Configuración Railway
├── .env.example            # Variables de referencia
├── .gitignore              # Archivos a ignorar
├── README.md               # Documentación
├── DEPLOYMENT.md           # Este archivo
└── public/
    ├── index.html          # UI principal
    ├── app.js              # Frontend JavaScript
    ├── style.css           # Estilos
    └── uploads/            # Carpeta para archivos
        └── .gitkeep
```

---

## Variables de Entorno (Automáticas en Railway)

Railway proporciona automáticamente para MySQL:
- `DATABASE_URL` ← Conexión completa

Node.js necesita:
- `NODE_ENV=production`
- `PORT=3000`

Railway las configura automáticamente, pero puedes editarlas en:
Railway Dashboard → Tu Proyecto → Variables

---

## Endpoints Disponibles

| Método | Ruta | Función |
|--------|------|---------|
| GET | `/health` | Health check |
| GET | `/api/health` | API status |
| GET | `/api/compras` | Listar compras |
| POST | `/api/compras` | Crear compra (con archivo) |
| DELETE | `/api/compras/:id` | Eliminar compra |
| GET | `/api/gastos` | Listar gastos |
| POST | `/api/gastos` | Crear gasto |
| DELETE | `/api/gastos/:id` | Eliminar gasto |
| GET | `/api/ventas` | Listar ventas |
| POST | `/api/ventas` | Crear venta |
| DELETE | `/api/ventas/:id` | Eliminar venta |
| GET | `/api/analytics/canales` | Análisis por canal |
| GET | `/api/analytics/meses` | Análisis por mes |

---

## Troubleshooting

### ❌ Error: "Cannot GET /"
**Problema:** Aplicación no está sirviendo archivos estáticos
**Solución:** 
1. Verificar que `/public/index.html` existe
2. Revisar logs: Railway Dashboard → Logs → buscar errores

### ❌ Error: "ECONNREFUSED" en API
**Problema:** No puede conectar a MySQL
**Solución:**
1. Verificar que MySQL service existe en Railway
2. Revisar `DATABASE_URL` esté configurada
3. Ejecutar `schema.sql` para crear tablas

### ❌ Error 413 "Payload Too Large"
**Problema:** Archivo para subir es muy grande
**Solución:** Máximo 50MB por archivo (editable en `server.js` línea 40)

### ❌ CORS errors en consola del navegador
**Problema:** Frontend no puede conectar a API
**Solución:**
1. Verificar que `API_BASE` en `app.js` apunta a la URL correcta
2. Verificar que server.js tiene CORS headers

---

## Primeros Pasos en la App

1. **Login:** Usuario/Contraseña cualquiera (demo)
2. **Dashboard:** Ver totales de ventas, compras, gastos
3. **Compras:** Agregar compra mayorista
   - Click ➕ Agregar Compra
   - Llenar formulario
   - Subir PDF/XML como comprobante
4. **Gastos:** Registrar gastos diarios
5. **Canales:** Ver análisis por canal de venta

---

## Costos en Railway

| Servicio | Precio |
|----------|--------|
| Node.js | $5/mes (o free con $5 crédito nuevo) |
| MySQL | $10/mes |
| **Total** | **~$15/mes** (después de crédito inicial) |

*Railway te da $5 crédito inicial - suficiente para 1 mes completo*

---

## Soporte

Para issues o preguntas:
1. Revisar logs en Railway Dashboard
2. Verificar `.env` tiene variables correctas
3. Ejecutar `npm install` localmente para testear
4. Ver error específico en consola del navegador (F12)

---

**¿Listo?** Comienza con Paso 1 arriba 🎉
