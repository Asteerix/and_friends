#!/usr/bin/env bash
# claude-delay.sh — start Claude Code in tmux, wait N seconds, then type your
# prompt, **wait 2 s like a human**, and finally press Return so the message is
# really sent.
# ---------------------------------------------------------------------------
# Requirements: tmux (brew install tmux)
# Usage: ./claude-delay.sh -t 5s -p "Hello" [-- extra flags]
# ---------------------------------------------------------------------------
set -eo pipefail

usage() {
  cat <<'USAGE'
Usage: claude-delay.sh -t <delay> -p <prompt> [-- <extra Claude args>]

  -t <delay>   5s | 45s | 3m | 2h …  (wait AFTER Claude starts)
  -p <prompt>  Text automatically typed, 2 s pause, then Return
  --           Everything after -- is forwarded to `claude`
USAGE
  exit 1
}

to_seconds() {
  case "$1" in
    *h) echo $(( ${1%h} * 3600 )) ;;
    *m) echo $(( ${1%m} * 60   )) ;;
    *s) echo     ${1%s}          ;;
    ''|*[!0-9]*) echo "Invalid delay: $1" >&2; exit 1 ;;
    *)  echo "$1" ;;
  esac
}

command -v tmux >/dev/null || { echo "tmux required → brew install tmux" >&2; exit 1; }

# ----- Parse CLI -----
declare delay_arg="" prompt=""
while getopts "t:p:h" o; do
  case $o in
    t) delay_arg=$OPTARG ;;
    p) prompt=$OPTARG    ;;
    h) usage ;;
    *) usage ;;
  esac
done
shift $((OPTIND-1))
[[ -z $delay_arg || -z $prompt ]] && usage

delay=$(to_seconds "$delay_arg")
extra=( "$@" )
session="claude_$(date +%s)"

# Command for Claude
printf -v claude_cmd '%q ' claude --dangerously-skip-permissions "${extra[@]}"

# Start tmux session detached
 tmux new-session -d -s "$session" "bash -c 'sleep 0.1; $claude_cmd'"

echo "[claude-delay] Claude in tmux ($session). Will send in ${delay}s…" >&2

# Background injector: prompt → pause 2 s → Return
(
  sleep "$delay"
  tmux send-keys -t "$session" "$prompt"
  sleep 2
  tmux send-keys -t "$session" Enter
) &

# Attach user interactively
exec tmux attach -t "$session"
