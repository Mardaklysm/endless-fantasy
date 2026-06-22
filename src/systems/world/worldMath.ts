export function wrap(value: number, length: number) {
  return ((value % length) + length) % length;
}

export function seededNoise(x: number, y: number, seed: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}
