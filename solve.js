// A fast CSV reader: for every case's input it returns exactly the answer
// csv-reader 1.0.0 returns, by the same written broken-row policy, but it
// scans with regular expressions that stop at the next special character
// instead of reading one character at a time and building each field up a
// character at a time.
//
// The policy, as the reference states it: the text is read once, left to
// right, with commas and double quotes. A U+FEFF at its very start is
// dropped. A record ends at LF or CRLF, and a line left with no characters
// is no record. Outside quotes a CR not followed by LF is dropped
// (stray_cr). A field that opens with a quote runs to the next quote that
// is not doubled, "" inside it is one quote and each CRLF or lone CR inside
// it is read as LF; what follows its closing quote, up to the next comma or
// line break, is appended as it stands (quote_junk, when the field ends); a
// quote that never closes is a literal character, and the text after it is
// read again as unquoted (unterminated_quote). A quote inside an unquoted
// field is a literal character. Fields stay strings, never trimmed or
// converted. columns is the first record when header is true, else null;
// rows holds the records after it (every record when header is false), each
// padded with empty strings (short_row, with fields: its field count) or cut
// (long_row, with extra: the cut fields) to the first record's width. Each
// error is {code, line, row}, in the order met, a record's short_row or
// long_row when it ends: line the 1-based line its record starts on,
// counting every LF, CRLF and lone CR inside quotes, and row its record's
// index in rows, null for the header.

/** The next comma, line feed or carriage return, from a position. */
const FIELD_END = /[,\n\r]/g;
/** The next quote, line feed or carriage return, from a position. */
const QUOTE_END = /["\n\r]/g;

/** How a field ended: at a comma, at a line break, or at the end of the text. */
const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

/** The answer for one case's input {text, header}: {columns, rows, errors}. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0;
  let line = 1;
  let recordLine = 1;
  let recordRow = null;

  if (n > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  // Reads an unquoted field starting at pos, onto `start` (the value so
  // far). Returns {value, ended, added}: the field, how it ended, and how
  // many characters were kept. A CR not followed by LF is dropped
  // (stray_cr) and the field goes on.
  function readUnquoted(start) {
    let value = start;
    let added = 0;
    for (;;) {
      FIELD_END.lastIndex = pos;
      const m = FIELD_END.exec(text);
      if (m === null) {
        if (pos < n) {
          const seg = text.slice(pos, n);
          if (seg !== '') {
            value = value === '' ? seg : value + seg;
            added += n - pos;
          }
          pos = n;
        }
        return { value, ended: END, added };
      }
      const p = m.index;
      const ch = m[0];
      if (ch === '\r' && text.charCodeAt(p + 1) !== 10) {
        // A lone CR: dropped, stray_cr, the field goes on.
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        if (p > pos) {
          const seg = text.slice(pos, p);
          value = value === '' ? seg : value + seg;
          added += p - pos;
        }
        pos = p + 1;
        continue;
      }
      // The field ends here: comma, LF, or CRLF.
      if (p > pos) {
        const seg = text.slice(pos, p);
        value = value === '' ? seg : value + seg;
        added += p - pos;
      }
      if (ch === ',') {
        pos = p + 1;
        return { value, ended: COMMA, added };
      }
      if (ch === '\n') {
        pos = p + 1;
        line += 1;
        return { value, ended: LINE_BREAK, added };
      }
      pos = p + 2;
      line += 1;
      return { value, ended: LINE_BREAK, added };
    }
  }

  // Reads a quoted field whose opening quote is at pos. Returns {value,
  // ended, added}: the field and how it ended (added is 0 unless junk
  // follows the closing quote, which readUnquoted counts).
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let parts = null;
    let acc = '';
    const add = (s) => {
      if (s === '') return;
      if (parts) parts.push(s);
      else if (acc === '') acc = s;
      else {
        parts = [acc, s];
        acc = '';
      }
    };
    let cur = pos + 1;
    for (;;) {
      QUOTE_END.lastIndex = cur;
      const m = QUOTE_END.exec(text);
      if (m === null) {
        // The quote never closes: it is a literal character, and the text
        // after it is read again as unquoted.
        pos = open + 1;
        line = openLine;
        errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
        return readUnquoted('"');
      }
      const p = m.index;
      const ch = m[0];
      if (ch === '"') {
        if (text.charCodeAt(p + 1) === 34) {
          // A doubled quote: one literal quote.
          if (p > cur) add(text.slice(cur, p));
          add('"');
          cur = p + 2;
          continue;
        }
        // The closing quote.
        if (p > cur) add(text.slice(cur, p));
        pos = p + 1;
        break;
      }
      // A line break inside the quotes: one LF in the value.
      if (p > cur) add(text.slice(cur, p));
      add('\n');
      line += 1;
      cur = ch === '\n' ? p + 1 : p + (text.charCodeAt(p + 1) === 10 ? 2 : 1);
    }
    const value = parts ? parts.join('') : acc;
    if (pos >= n) return { value, ended: END, added: 0 };
    const c = text.charCodeAt(pos);
    if (c === 44) {
      pos += 1;
      return { value, ended: COMMA, added: 0 };
    }
    if (c === 10) {
      pos += 1;
      line += 1;
      return { value, ended: LINE_BREAK, added: 0 };
    }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      return { value, ended: LINE_BREAK, added: 0 };
    }
    // What follows the closing quote is appended as it stands, up to the
    // next comma or line break.
    const junk = readUnquoted(value);
    if (junk.added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
    return junk;
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === 34;
      field = quoted ? readQuoted() : readUnquoted('');
      fields.push(field.value);
    } while (field.ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record
    // (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
