#!/usr/bin/env bash
# PreToolUse safety hook — vetoes known-destructive shell commands.
# Reads tool input JSON from stdin.
# Outputs JSON + exits 1 to veto; exits 0 to pass through.

set -uo pipefail

PAYLOAD=$(cat)
CMD=$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.command // ""' 2>/dev/null) || CMD=""

# If command is unreadable, fail open (don't block)
[[ -z "$CMD" ]] && exit 0

# Skip pattern checks when the *outer* command is git commit / git tag.
# Commit messages and tag annotations routinely describe dangerous patterns
# (e.g. "vetoes rm -rf, git reset --hard") — the hook must not block them.
# A compound chain like "setup && git commit" is not matched by ^ so it
# still gets checked, which is acceptable.
if printf '%s' "$CMD" | grep -qE '^\s*git\s+(commit|tag\b)'; then
  exit 0
fi

veto() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"[SAFETY] Blocked: %s — edit .claude/hooks/block-dangerous.sh to allow"}}\n' "$1"
  exit 1
}

# 1. rm with recursive+force outside /tmp
# Three detection branches: combined flags (-rf/-fr/-Rf etc.),
# separated flags (-r -f or -f -r), long forms (--recursive --force).
_rm_rf=false
if printf '%s' "$CMD" | grep -qE '\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b'; then
  _rm_rf=true
elif printf '%s' "$CMD" | grep -qE '\brm\b.*\s-[a-zA-Z]*r(\s|$)' && \
     printf '%s' "$CMD" | grep -qE '\brm\b.*\s-[a-zA-Z]*f(\s|$)'; then
  _rm_rf=true
elif printf '%s' "$CMD" | grep -qE '\brm\b.*(--recursive\b.*--force\b|--force\b.*--recursive\b)'; then
  _rm_rf=true
fi

if [[ "$_rm_rf" == "true" ]]; then
  # Allow only when the rm command (before any pipe/semicolon) targets /tmp
  if ! printf '%s' "$CMD" | grep -qE '\brm\b[^|;&]*/tmp(/\S*)?(\s|$)'; then
    veto "rm with recursive+force: target is not under /tmp"
  fi
fi

# 2. git push --force/-f — block unless an explicit feature branch (containing /)
# is named as the target, indicating a deliberate non-protected branch push.
# --force-with-lease is intentionally NOT blocked (safer alternative).
if printf '%s' "$CMD" | grep -qE '\bgit\s+push\b' && \
   printf '%s' "$CMD" | grep -qE '(^|\s)(-f(\s|$)|--force(\s|$))'; then
  # Allow only when an explicit branch name containing / is present (e.g. feature/foo)
  if ! printf '%s' "$CMD" | grep -qE '\s[a-zA-Z0-9_.-]+/[a-zA-Z0-9_/.-]+(\s|$)'; then
    veto "git push --force/-f: bare push or no explicit feature branch — add origin feature/branch-name to allow"
  fi
fi

# 3. git reset --hard
if printf '%s' "$CMD" | grep -qE '\bgit\s+reset\s+--hard\b'; then
  veto "git reset --hard"
fi

# 4. git clean -fd (force + dirs; allowed only if -n dry-run is also present)
# Use -- to prevent grep treating the leading dash as an option flag
if printf '%s' "$CMD" | grep -qE '\bgit\s+clean\b' && \
   printf '%s' "$CMD" | grep -qE -- '-[a-zA-Z]*f[a-zA-Z]*d|-[a-zA-Z]*d[a-zA-Z]*f' && \
   ! printf '%s' "$CMD" | grep -qE -- '-[a-zA-Z]*n\b'; then
  veto "git clean -fd (deletes untracked files and directories; use -n first for a dry run)"
fi

# 5. docker compose/stack down -v (destroys named volumes) or docker volume rm
if printf '%s' "$CMD" | grep -qE '\b(docker-compose|docker\s+compose|docker\s+stack)\s+down\b' && \
   printf '%s' "$CMD" | grep -qE '(^|\s)(-v(\s|$)|--volumes(\s|$))'; then
  veto "docker compose/stack down -v (destroys named volumes)"
fi
if printf '%s' "$CMD" | grep -qE '\bdocker\s+volume\s+rm\b'; then
  veto "docker volume rm"
fi

# 6. SQL: DROP DATABASE / DROP TABLE / TRUNCATE
if printf '%s' "$CMD" | grep -qiE '\b(DROP\s+DATABASE|DROP\s+TABLE|TRUNCATE(\s+TABLE)?)\b'; then
  veto "SQL DROP DATABASE / DROP TABLE / TRUNCATE"
fi

# 7. chmod -R 777
if printf '%s' "$CMD" | grep -qE '\bchmod\b' && \
   printf '%s' "$CMD" | grep -qE '(^|\s)-[a-zA-Z]*R\b' && \
   printf '%s' "$CMD" | grep -qE '\b777\b'; then
  veto "chmod -R 777"
fi

exit 0
