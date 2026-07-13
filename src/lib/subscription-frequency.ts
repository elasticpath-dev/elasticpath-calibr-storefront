// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function frequencyLabel(t: any, freq: number, interval: string): string {
  const key = `frequency${interval.charAt(0).toUpperCase()}${interval.slice(1)}`;
  return t(key, { count: freq });
}
