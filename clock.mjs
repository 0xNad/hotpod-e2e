#!/usr/bin/env node
// Pod Clock: a countdown to a round's deadline, in one line.
//   node clock.mjs <deadline> [--now <date>]
//   node clock.mjs 2026-10-08T12:00:00Z --now 2026-10-07T09:54:51Z   ->   1d 02h 05m 09s left

/** Units from the largest down, in seconds. */
const UNITS = [["d", 86_400], ["h", 3_600], ["m", 60], ["s", 1]];
const UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/;

/** Stops with a one-line reason on stderr and nothing on stdout. */
function fail(reason) {
  process.stderr.write(`clock: ${reason}\n`);
  process.exit(1);
}

/** Reads a UTC date (`2026-10-07T12:00:00Z`), refusing one the calendar does not have. */
export function parseDate(text, what) {
  const m = UTC.exec(text ?? "");
  if (!m) fail(`${what} must be a UTC date like 2026-10-07T12:00:00Z, got ${JSON.stringify(text ?? "")}`);
  const ms = Date.parse(text);
  const d = new Date(ms);
  const fields = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];
  if (Number.isNaN(ms) || fields.some((v, i) => v !== Number(m[i + 1]))) fail(`${what} ${text} is not a real date`);
  return ms;
}

/** Reads the arguments: one deadline, and `--now <date>` at most once. */
export function readArgs(argv) {
  let deadline, now;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--now") {
      if (now !== undefined) fail("--now given twice");
      if (i + 1 >= argv.length) fail("--now needs a date");
      now = parseDate(argv[++i], "--now");
    } else if (a.startsWith("-")) {
      fail(`unknown flag ${a}`);
    } else if (deadline !== undefined) {
      fail("give one deadline only");
    } else {
      deadline = parseDate(a, "the deadline");
    }
  }
  if (deadline === undefined) fail("usage: node clock.mjs <deadline> [--now <date>]");
  return { deadline, now: now ?? Date.now() };
}

/** `2h 05m 09s`: from the largest unit that is not zero; the first unpadded, the rest on two digits. */
export function span(seconds) {
  const parts = [];
  for (const [unit, size] of UNITS) {
    const n = Math.floor(seconds / size);
    seconds -= n * size;
    if (parts.length || n || unit === "s") parts.push(`${parts.length ? String(n).padStart(2, "0") : n}${unit}`);
  }
  return parts.join(" ");
}

/** The line for a difference in whole seconds (positive: before the deadline). */
export function line(diff) {
  if (diff === 0) return "closing now";
  return diff > 0 ? `${span(diff)} left` : `closed ${span(-diff)} ago`;
}

const { deadline, now } = readArgs(process.argv.slice(2));
process.stdout.write(`${line(Math.trunc((deadline - now) / 1000))}\n`);
