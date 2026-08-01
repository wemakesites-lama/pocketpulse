// Currency formatting — do NOT use Intl.NumberFormat.
// Intl renders differently across Node versions and browsers (e.g. "R1 449,00").
// This spec requires "R1,449.00" everywhere. Nine deterministic lines beat a locale surprise on stage.

export function formatZAR(rand: number): string {
  const [whole = "0", dec = "00"] = Math.abs(rand).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${rand < 0 ? "-" : ""}R${grouped}.${dec}`;
}
