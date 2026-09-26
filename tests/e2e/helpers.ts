/* eslint-disable no-control-regex -- matching literal ANSI control bytes is the point */
/** Strip ANSI/VT100 escape sequences from a string (CSI sequences and OSC). */
export function stripAnsi(str: string): string {
  return str
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/\x1b\][^\x07]*\x07/g, "");
}
/* eslint-enable no-control-regex */
