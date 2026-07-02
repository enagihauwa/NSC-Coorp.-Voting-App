export const brandColors = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryHover: '#15803d',
  deepBrand: '#166534',
};

export const chartSeriesColors = [
  '#059669',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
];

export const swalColors = {
  confirm: brandColors.primary,
  cancel: '#6b7280',
  danger: '#d33',
};

export const truncateLabel = (label, max = 18) => {
  if (!label) return '';
  const text = String(label);
  return text.length > max ? `${text.slice(0, max)}…` : text;
};
