export const createId = (prefix: string): string => {
  const suffix = Math.random()
    .toString(36)
    .slice(2)
    .padEnd(8, '0')
    .slice(0, 8);
  return `${prefix}_${suffix}`;
};
