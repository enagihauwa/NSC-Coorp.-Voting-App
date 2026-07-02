import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
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
} from 'recharts';
import { chartSeriesColors, truncateLabel } from '../theme/tokens';

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

const useChartLayout = (height = 300) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  return {
    isMobile,
    isTablet,
    height: isMobile ? 220 : isTablet ? 260 : height,
    tickFontSize: isMobile ? 10 : 12,
    xAxisAngle: isMobile ? -35 : 0,
    bottomMargin: isMobile ? 56 : 20,
    showPieLabels: !isMobile,
    pieOuterRadius: isMobile ? 70 : Math.min(height / 2 - 40, 120),
    colors: chartSeriesColors,
    axisColor: theme.palette.text.secondary,
    gridColor: theme.palette.divider,
  };
};

export const BarChartComponent = ({ data, xKey, bars, title, height = 300 }) => {
  const layout = useChartLayout(height);

  if (!data?.length) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">No chart data available</Typography>
      </Box>
    );
  }

  return (
    <Box role="img" aria-label={title || 'Bar chart'}>
      {title && (
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
          {title}
        </Typography>
      )}
      <Box sx={{ width: '100%', minHeight: layout.height }}>
        <ResponsiveContainer width="100%" height={layout.height}>
          <BarChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: layout.bottomMargin }}>
            <CartesianGrid strokeDasharray="3 3" stroke={layout.gridColor} />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: layout.tickFontSize }}
              stroke={layout.axisColor}
              angle={layout.xAxisAngle}
              textAnchor={layout.xAxisAngle ? 'end' : 'middle'}
              height={layout.xAxisAngle ? 60 : 30}
              tickFormatter={(value) => truncateLabel(value, layout.isMobile ? 12 : 18)}
            />
            <YAxis tick={{ fontSize: layout.tickFontSize }} stroke={layout.axisColor} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            {(bars || [{ dataKey: 'value', name: 'Votes' }]).map((bar, index) => (
              <Bar
                key={index}
                dataKey={bar.dataKey}
                fill={bar.fill || layout.colors[index % layout.colors.length]}
                name={bar.name || bar.dataKey}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export const PieChartComponent = ({ data, dataKey, nameKey, title, height = 300, innerRadius = 0 }) => {
  const theme = useTheme();
  const layout = useChartLayout(height);

  if (!data?.length) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">No chart data available</Typography>
      </Box>
    );
  }

  return (
    <Box role="img" aria-label={title || 'Pie chart'}>
      {title && (
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
          {title}
        </Typography>
      )}
      <Box sx={{ width: '100%', minHeight: layout.height }}>
        <ResponsiveContainer width="100%" height={layout.height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={layout.pieOuterRadius}
              dataKey={dataKey || 'value'}
              nameKey={nameKey || 'name'}
              label={layout.showPieLabels
                ? ({ name, percent }) => `${truncateLabel(name, 14)} ${(percent * 100).toFixed(0)}%`
                : false}
              labelLine={layout.showPieLabels}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={layout.colors[index % layout.colors.length]}
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
    </Box>
  );
};

export { chartSeriesColors as COLORS };
export default BarChartComponent;
