[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/romdhoncom/csv-reader-speed-01-run-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/romdhoncom/csv-reader-speed-01-run-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

# Fast CSV reader

A fast drop-in for csv-reader 1.0.0: `solve.js` reads a CSV text once, left
to right, by the competition's written broken-row policy (BOM dropped, LF and
CRLF record breaks, lone CRs dropped as `stray_cr`, quoted fields with `""`
escapes and LF-normalised breaks inside, `quote_junk` after a closing quote,
`unterminated_quote` re-read as unquoted, short rows padded and long rows cut
to the first record's width), and returns exactly the same
`{columns, rows, errors}` answer. It scans with regular expressions that stop
at the next special character instead of reading one character at a time, so
it is far faster than the reference's per-character loop. `main.ts` is the
program the harness runs: it reads every case from `/input/cases.json`,
answers each one with `run`, and writes `/output/answers.json`.

Entry for the make.fun bounty
[Read broken CSV files faster, 21 November 2026](https://make.fun/bounty/csv-reader-speed-01-run-20261121).
