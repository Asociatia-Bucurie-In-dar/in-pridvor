export const capitalizeFirst = (str: string): string =>
{
  if (!str) { return str; }
  if (str.length === 1) { return str.toUpperCase(); }

  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
