# Superpowers Quick Start for REVIONIX

Superpowers está **automáticamente habilitado** en tu proyecto. Aquí cómo usarlo.

## 🚀 Workflow Típico

```
1. Usuario pide feature nueva
   ↓
2. Escribo especificación clara
   ↓
3. Claude escribe PLAN (en docs/superpowers/plans/)
   ↓
4. Claude ejecuta plan con SUBAGENTES
   ↓
5. Claude solicita CODE REVIEW
   ↓
6. Merge a main cuando apruebe
```

## 📝 Skill: Writing Plans

**Cuándo usar:** Feature con 3+ pasos

**Comando (Claude Code):**
```
Crea un plan completo para [feature]
```

**Qué hace:**
- Descompone feature en tareas atómicas
- Especifica archivos a crear/modificar
- Incluye tests para cada tarea
- Formato: 5-15 minutos por tarea

**Dónde se guarda:**
```
docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md
```

**Ejemplo:**
```markdown
# Add Product Inventory - Implementation Plan

## Task 1: Add Database Schema
- [ ] Create inventory table
- [ ] Add indexes on SKU
- [ ] Commit

## Task 2: Add API Endpoints
- [ ] POST /api/inventory
- [ ] GET /api/inventory
- [ ] Test with curl
- [ ] Commit
...
```

---

## ⚙️ Skill: Executing Plans

**Cuándo usar:** Ya tienes un PLAN, necesitas ejecutarlo

**Comando (Claude Code):**
```
Ejecuta el plan docs/superpowers/plans/2026-07-02-inventory.md
```

**Qué hace:**
- Lee el plan
- Ejecuta cada tarea en orden
- Verifica cada paso
- Hace commits atómicos
- Reporta progreso

---

## 🤝 Skill: Subagent-Driven Development

**Cuándo usar:** Tareas INDEPENDIENTES en paralelo

**Ventaja:** 5 tareas que tomarían 2 horas secuencial → 20 minutos en paralelo

**Comando (Claude Code):**
```
Usa subagent-driven-development para ejecutar docs/superpowers/plans/inventory.md
```

**Qué hace:**
- Crea múltiples agentes
- Cada uno ejecuta una tarea
- Trabajan en PARALELO
- Coordinan resultados
- Reporta si hay conflictos

---

## 🧪 Skill: Test-Driven Development

**Cuándo usar:** Nuevo feature o bug fix

**Flujo:**
```
1. Escribe TEST PRIMERO (que falla)
2. Ejecuta test → FALLA ✗
3. Escribe CÓDIGO MÍNIMO
4. Ejecuta test → PASA ✓
5. Refactor y commit
```

**Comando (Claude Code):**
```
Usa test-driven-development para implementar [feature]
```

---

## 🔍 Skill: Systematic Debugging

**Cuándo usar:** Bug desconocido o comportamiento raro

**Ventaja:** 1 hora de debugging → 10 minutos con root-cause

**Comando (Claude Code):**
```
Usa systematic-debugging para encontrar por qué [lo que está roto]
```

**Proceso:**
1. Reproduce el bug
2. Aísla la causa raíz
3. Propone fix
4. Verifica que lo arregla
5. Commit con mensaje claro

---

## 👀 Skill: Requesting Code Review

**Cuándo usar:** Antes de mergear a main

**Comando (Claude Code):**
```
Solicita code review para [rama o commit]
```

**Qué revisa:**
- Correctness (¿funciona?)
- Security (¿seguro?)
- Style (¿sigue patrones?)
- Tests (¿bien testeado?)
- Performance (¿rápido?)

**Salida:**
- Aprobación o lista de cambios
- Sugerencias de mejora

---

## 🌳 Skill: Using Git Worktrees

**Cuándo usar:** Feature grande que necesita aislamiento

**Ventaja:** No interfiere con otros cambios

**Comando (Claude Code):**
```
Usa using-git-worktrees para trabajar en [feature-name]
```

**Crea:**
```
revionix-api/
├── main/                    ← tu main branch
├── feature-inventory/       ← aislado para este feature
└── ...
```

**Ventajas:**
- Cambios completamente aislados
- Puedes cambiar entre branches sin stash
- No afecta otros trabajos

---

## 📋 Ejemplo: Feature Completo con Superpowers

### 1. Pedir el Feature
```
Necesito agregar gestión de inventario con alertas de stock bajo
```

### 2. Claude escribe PLAN
```
Escribiendo plan en docs/superpowers/plans/2026-07-02-inventory.md
```
Plan tiene 6 tareas (schema, API, frontend, tests, alerts, integration)

### 3. Ejecutar con Subagentes
```
Ejecutando con subagent-driven-development...
- Agente 1: Schema + API endpoints (paralelo)
- Agente 2: Frontend pages (paralelo)
- Agente 3: Tests (paralelo)
Completado en 25 minutos (vs 2 horas secuencial)
```

### 4. Solicitar Review
```
Solicitando code review del branch feature-inventory
```

Revisión valida:
- ✅ Schema correcto
- ✅ API endpoints funcionan
- ✅ Tests cubren casos
- ✅ Frontend responsive
- ✅ Security OK

### 5. Merge
```
Mergeando a main
```

---

## 🎯 Superpowers en REVIONIX

### Configuración Automática

Cuando abres REVIONIX en Claude Code:
1. Lee `CLAUDE.md` → Entiende el proyecto
2. Lee `.claude/superpowers-config.md` → Activa skills
3. Está 100% listo para usar Superpowers

### Qué está pre-configurado

✅ Plans guardados en `docs/superpowers/plans/`  
✅ Tasks tracked en `docs/superpowers/tasks/`  
✅ CLAUDE.md define estándares  
✅ Superpowers skills activadas  

### Próximo paso

1. En Claude Code abre REVIONIX
2. Pide feature nueva (ej: "Agregar autenticación de usuarios")
3. Claude automáticamente:
   - Escribe un plan
   - Pide confirmación
   - Ejecuta con subagentes
   - Solicita review
   - Mergea cuando está listo

---

## 💡 Tips

**Tip 1:** Siempre describe bien el feature
```
✅ BIEN: "Agregar inventario con alertas si stock < 10"
❌ MAL: "Agregar inventario"
```

**Tip 2:** Deja que Claude escriba el plan
```
No digas cómo hacerlo, solo QUÉ hacer
Claude es mejor planificando que tú siguiendo instrucciones
```

**Tip 3:** Subagentes para features grandes (3+ tareas independientes)
```
1 tarea → Executing Plans
3+ tareas independientes → Subagent-Driven Development
```

**Tip 4:** Commits frecuentes y atómicos
```
Cada tarea = 1 commit
Cada commit debe compilar y pasar tests
```

**Tip 5:** Code review antes de main
```
Superpowers solicita automáticamente
Acepta feedback sin defensiva
```

---

## Cuando NO usar Superpowers

- **Typo fixes:** Edit + commit directo
- **Config changes:** Cambios sencillos directo
- **Simple refactors:** Si cabe en 1 commit
- **Pequeñas adiciones:** Menos de 50 líneas

---

**¿Listo?** En Claude Code di:
```
Necesito [nueva feature]. Escribe un plan completo.
```

¡Superpowers hace el resto! 🚀
