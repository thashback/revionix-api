# Superpowers Configuration for REVIONIX

This project uses [Superpowers](https://github.com/obra/superpowers) methodology for development.

## Enabled Skills

- **writing-plans** - Create implementation plans before coding
- **executing-plans** - Execute plans task-by-task  
- **subagent-driven-development** - Use subagents for parallel work
- **test-driven-development** - TDD workflow
- **systematic-debugging** - Root cause analysis
- **requesting-code-review** - Code review workflow
- **using-git-worktrees** - Isolated worktrees for features

## Project Guidelines

### Architecture
- Full-stack: Node.js Express backend + Vanilla JS frontend
- Database: MySQL with connection pooling
- API: REST with CORS
- Deployment: Railway with Docker

### Code Standards
- Minimal comments - only WHY, not WHAT
- No premature abstractions - YAGNI
- No error handling for impossible scenarios
- Three similar lines is better than abstraction
- Prefer editing existing files over creating new ones

### Testing
- Write tests before code (TDD)
- Unit tests for business logic
- Integration tests for APIs
- No mocking databases in tests that need accuracy

### Git Workflow
- Create new commits (don't amend published)
- Use git worktrees for feature branches
- One feature per PR
- Atomic commits with clear messages

### Deployment
- Railway.app for production
- GitHub for source control
- MySQL for persistence
- Automatic CI/CD

## File Paths

- Plans: `docs/superpowers/plans/`
- Tasks: `docs/superpowers/tasks/`
- Skills: `.claude/superpowers/`

## When to Use Each Skill

**Writing Plans**: Any feature with 3+ steps  
**Executing Plans**: Implementing a plan task-by-task  
**Subagents**: Parallel independent tasks  
**TDD**: New features or bug fixes  
**Code Review**: Before merging to main  
**Debugging**: Root cause analysis needed  
**Worktrees**: Large features in isolation  

---

See [Superpowers README](https://github.com/obra/superpowers) for full methodology.
