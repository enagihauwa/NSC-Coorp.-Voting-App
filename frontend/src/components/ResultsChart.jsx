import { Box, Typography, useTheme } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

const COLORS = [
  '#22c55e',
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        p: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        boxShadow: 3,
      }}
    >
      <Typography variant="caption" fontWeight="bold">
        {label}
      </Typography>
      {payload.map((entry, index) => (
        <Typography key={index} variant="caption" display="block" sx={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </Typography>
      ))}
    </Box>
  );
};

export const BarChartComponent = ({ data, xKey, bars, title, height = 300 }) => {
  const theme = useTheme();
  return (
    <Box>
      {title && (
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
          {title}
        </Typography>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12 }}
            stroke={theme.palette.text.secondary}
          />
          <YAxis tick={{ fontSize: 12 }} stroke={theme.palette.text.secondary} />
          <Tooltip content={<CustomTooltip />} />
          {(bars || [{ dataKey: 'value', fill: '#22c55e', name: 'Votes' }]).map(
            (bar, index) => (
              <Bar
                key={index}
                dataKey={bar.dataKey}
                fill={bar.fill || COLORS[index % COLORS.length]}
                name={bar.name || bar.dataKey}
                radius={[4, 4, 0, 0]}
              />
            )
          )}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export const PieChartComponent = ({ data, dataKey, nameKey, title, height = 300, innerRadius = 0 }) => {
  const theme = useTheme();
  return (
    <Box>
      {title && (
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
          {title}
        </Typography>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={Math.min(height / 2 - 40, 120)}
            dataKey={dataKey || 'value'}
            nameKey={nameKey || 'name'}
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            labelLine
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke={theme.palette.background.paper}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export { COLORS };
export default BarChartComponent;
