# ✅ REVIONIX - COMIENZA AQUÍ

Tu paquete de despliegue está **100% listo** 🎉

## 📋 Lo que tienes incluido

✅ **Backend Node.js Express** con API REST completa  
✅ **Frontend HTML/CSS/JS** con interfaz moderna  
✅ **Base de datos MySQL** esquema precargado  
✅ **Configuración Railway** (Procfile + .env)  
✅ **CORS y seguridad** preconfigurados  
✅ **Subida de archivos** con Multer  

---

## 🚀 Despliegue en 3 Pasos (10 minutos)

### 1️⃣ Crear GitHub repo
```bash
cd C:\ruta\a\railway-deploy
git init
git add .
git commit -m "REVIONIX API"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/revionix-api.git
git push -u origin main
```

### 2️⃣ Conectar a Railway
- Ir a railway.app
- "+ New Project"
- "Deploy from GitHub" → seleccionar revionix-api

### 3️⃣ Agregar MySQL + Ejecutar schema
- "+ New" → MySQL
- Ejecutar `schema.sql` en el editor SQL de Railway

**¡Listo! Tu app estará en vivo en ~5 minutos** 🎊

---

## 📁 Archivos Importantes

| Archivo | Para qué |
|---------|----------|
| `server.js` | API Node.js (NO TOCAR) |
| `public/index.html` | Frontend principal (puede editar) |
| `public/app.js` | Lógica JavaScript (puede editar) |
| `schema.sql` | Crear tablas MySQL (ejecutar en Railway) |
| `DEPLOYMENT.md` | Guía completa paso-a-paso |
| `package.json` | Dependencias Node.js |

---

## 🔐 Credenciales Temporales

**Login inicial:** Usuario/Contraseña = **cualquiera**  
(Cambiar en código después si necesario)

---

## 💡 Primeros Usos

1. **Agregar una compra:**
   - Menú → Compras Mayoristas
   - ➕ Agregar Compra
   - Llenar datos + subir PDF/XML

2. **Registrar un gasto:**
   - Menú → Gastos / Movilidad
   - Completar formulario
   - Click "Registrar Gasto"

3. **Ver análisis:**
   - Menú → Canales
   - Menú → Mes a Mes

---

## ⚠️ Si algo no funciona

1. **Revisar logs en Railway:**
   - Dashboard → Logs tab
   - Buscar líneas rojas (errores)

2. **Verificar MySQL:**
   - MySQL tab → Data → ejecutar `schema.sql`

3. **Revisar conexión:**
   - Visitar: `https://tu-url/health`
   - Debe retornar: `{"status":"ok",...}`

---

## 📞 Siguiente paso

**Lee `DEPLOYMENT.md`** para instrucciones detalladas 👈

---

Creado con ❤️ para REVIONIX  
Despliegue simplificado con Railway + MySQL
