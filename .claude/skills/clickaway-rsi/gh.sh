#!/bin/sh
# usage: gh.sh METHOD /path [json-file]
T=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p')
if [ -n "$3" ]; then D="--data-binary @$3"; else D=""; fi
curl -s -X "$1" -H "Authorization: Bearer $T" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/QuinOG/ClickAway$2" $D
