# Cost report

Generated: 2026-11-13 15:09 UTC

"Avg prompt tokens" is the full prompt: uncached input + cache read + cache write.
"Avg input tokens" is the uncached part of the prompt only.

| Model | Task | Calls | Avg prompt tokens | Avg input tokens | Avg cache read | Avg cache write | Avg output tokens | Avg time | Avg cost | Total cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude-haiku-5-5 | spec | 4 | 5352 | 5352 | 0 | 0 | 1672 | 9.9 s | $0.00137 | $0.00548 |
| claude-sonnet-5-5 | spec | 2 | 5305 | 5305 | 0 | 0 | 1891 | 16.5 s | $0.02951 | $0.05903 |
| claude-opus-5-5 | spec | 2 | 5310 | 5310 | 0 | 0 | 2221 | 22.5 s | $0.06566 | $0.13132 |
| claude-haiku-5-5 | spec:cached | 4 | 5308 | 240 | 3801 | 1267 | 2317 | 11.9 s | $0.00138 | $0.00551 |
| claude-sonnet-5-5 | spec:cached | 4 | 5308 | 240 | 3801 | 1267 | 1405 | 11.3 s | $0.01807 | $0.07229 |
| claude-opus-5-5 | spec:cached | 4 | 5308 | 240 | 3801 | 1267 | 2322 | 23.6 s | $0.05450 | $0.21798 |
