# REVIONIX - Claude Code Configuration

**Project:** REVIONIX - Sistema de Gestión Comercial  
**Stack:** Node.js Express + Vanilla JS + MySQL  
**Deployment:** Railway.app  

## Overview

Full-stack application for managing purchases, expenses, sales, and transportation with real-time analytics and file uploads.

### Tech Stack
- **Backend:** Node.js 18+, Express.js, MySQL 8.0+
- **Frontend:** Vanilla HTML/CSS/JS (fetch API)
- **Deployment:** Railway with Docker
- **File Storage:** Multer for PDF/XML/IMG uploads
- **Database:** MySQL with connection pooling

### Architecture

```
┌─ Browser (HTML/CSS/JS)
│  └─ Fetch API (/api/*)
└─ Express Server
   ├─ /api/compras - Purchase management
   ├─ /api/ventas - Sales tracking
   ├─ /api/gastos - Expense management
   ├─ /api/movilidad - Transportation
   └─ /api/analytics/* - Reports & analytics
       └─ MySQL Database
```

## File Structure

```
revionix-api/
├── server.js                 # Express app (300+ lines, do not split)
├── package.json             # Dependencies
├── schema.sql              # MySQL schema
├── .env.example            # Config template
├── Procfile                # Railway deployment
├── public/
│   ├── index.html          # Main UI
│   ├── app.js              # Frontend logic
│   ├── style.css           # Styling
│   └── uploads/            # File storage
├── docs/
│   └── superpowers/        # Plans & tasks
└── .claude/
    ├── superpowers-config.md
    └── this file (CLAUDE.md)
```

## Code Standards

### Comments
- **No comments by default** - use clear naming
- **Only add WHY comments** when:
  - Hidden constraint or non-obvious behavior
  - Workaround for specific bug
  - Subtle invariant a reader would miss
- Never reference the current task, issue #123, or "added for X flow"

### Code Patterns
- **No premature abstraction** - YAGNI (You Aren't Gonna Need It)
- **Three similar lines** is better than a utility function
- **No error handling** for scenarios that can't happen
- **Trust framework guarantees** - only validate at system boundaries (user input, APIs)
- **Edit existing files** over creating new ones

### Testing
- Write tests BEFORE code (TDD)
- Integration tests hit real database, not mocks
- Unit tests for pure functions
- Test golden path + edge cases
- No brittle snapshot tests

### Git
- **Create NEW commits**, never amend published ones
- Use worktrees for isolated feature branches
- Atomic commits with clear messages
- Follow repository commit conventions

## API Endpoints

### Health
- `GET /health` - Basic health check
- `GET /api/health` - API status with version

### Compras (Purchases)
- `POST /api/compras` - Create purchase with optional PDF/XML
- `GET /api/compras` - List purchases (last 100)
- `DELETE /api/compras/:id` - Remove purchase

### Ventas (Sales)
- `POST /api/ventas` - Register sale
- `GET /api/ventas` - List sales (last 100)
- `DELETE /api/ventas/:id` - Remove sale

### Gastos (Expenses)
- `POST /api/gastos` - Record expense
- `GET /api/gastos` - List expenses (last 100)
- `DELETE /api/gastos/:id` - Remove expense

### Analytics
- `GET /api/analytics/canales` - Sales by channel
- `GET /api/analytics/meses` - Sales by month

## Database Schema

### compras (purchases)
```sql
id | numero_factura (UNIQUE) | fecha | proveedor | marca
cantidad | moneda | precio_usd | precio_sol | total_sol
ruta_comprobante | created_at
```

### ventas (sales)
```sql
id | fecha | canal | sku | modelo | marca | cantidad
precio_venta | total_venta | costo | margen | medio_pago | created_at
```

### gastos (expenses)
```sql
id | fecha | tipo_comprobante | serie | numero | categoria | canal
descripcion | responsable | monto | ruta_comprobante | created_at
```

### movilidad (transportation)
```sql
id | fecha | descripcion | monto | ruta_comprobante | created_at
```

## Environment Variables

```env
NODE_ENV=production|development
PORT=3000
DB_HOST=mysql          # Railway MySQL hostname
DB_USER=root
DB_PASSWORD=*****
DB_NAME=revionix
DB_PORT=3306
```

## Deployment (Railway)

1. Push code to GitHub
2. Create MySQL service in Railway
3. Execute schema.sql
4. Set environment variables
5. Railway auto-deploys on push

Production URL: `https://<railway-domain>.up.railway.app`

## Common Tasks

### Add New Endpoint
1. Define route in server.js (POST/GET/DELETE)
2. Add database query with proper params
3. Return JSON response
4. Update frontend app.js with fetch call
5. Test with curl or browser
6. Commit with clear message

### Upload Files
- Multer stores in `/public/uploads/`
- Filename format: `{name}-{timestamp}{ext}`
- Max 50MB per file (editable in server.js line 40)
- CORS enabled for all origins

### Add Frontend Page
1. Add HTML skeleton in index.html
2. Add `.page` div with unique id
3. Add nav item with `onclick="goPage('pageName')"`
4. Implement load/render functions in app.js
5. Use API_BASE for endpoints
6. Style with existing CSS classes

## Superpowers Integration

This project uses [Superpowers](https://github.com/obra/superpowers) methodology:

- **Planning**: Write comprehensive plans before coding
- **Execution**: Use subagent-driven development for tasks
- **Testing**: Test-driven development workflow
- **Review**: Request code review before merging
- **Debugging**: Systematic root-cause analysis

Plans and tasks saved to `docs/superpowers/`

### When to Use Skills

- **Multi-step feature** → Use writing-plans + subagent-driven-development
- **Bug fix** → Use systematic-debugging + test-driven-development
- **Code review** → Use requesting-code-review skill
- **Large refactor** → Use git-worktrees for isolation

See `.claude/superpowers-config.md` for full details.

## Helpful Commands

```bash
# Local development
npm install
npm start          # Production mode
npm run dev        # Development mode

# Test health
curl http://localhost:3000/health

# Git
git log --oneline
git diff HEAD~1    # See last commit changes
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| Fix typo | Edit file directly, commit |
| Add endpoint | Edit server.js, test, commit |
| Frontend bug | Edit app.js/index.html, test |
| New feature | Write plan → execute → test → review |
| Not sure? | Ask for clarification first |

## Remember

- ✅ Edit existing files over creating new ones
- ✅ Trust framework defaults
- ✅ Write tests first (TDD)
- ✅ Commit frequently
- ✅ Keep it simple (YAGNI)
- ✅ Use Superpowers for complex work

❌ Don't amend published commits  
❌ Don't mock real databases in tests  
❌ Don't add comments explaining WHAT (use clear names)  
❌ Don't optimize prematurely  
❌ Don't add unused error handling  

---

Ready to build? Start with a clear spec, write a plan, then execute task-by-task 🚀
