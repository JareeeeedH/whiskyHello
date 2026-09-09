# WhiskyHello Development Rules

- Read WHISKYHELLO_SPEC.md before making architectural changes.
- Do not add features outside the current phase without approval.
- Use TypeScript for all new code.
- Frontend must not access MongoDB directly.
- Keep backend architecture:
  Route → Validation → Controller → Service → Model
- Do not introduce new frameworks, major dependencies, or architectural patterns without approval.
- Inspect the existing code before making changes; do not rewrite or replace working code without a clear reason.
- Prefer small, focused changes that solve the current task.
- When requirements are ambiguous or a change would affect architecture, stop and ask for clarification.
- Do not expose secrets or credentials.
- After completing a task, report what changed, what was tested, and any remaining issues.
