import { Card, CardContent, Typography, Box } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const StatsCard = ({ icon: Icon, label, value, trend, trendLabel, color = 'primary', loading = false }) => {
  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
        borderLeft: `4px solid`,
        borderColor: `${color}.main`,
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {loading ? '...' : value ?? 'N/A'}
            </Typography>
            {trend !== undefined && (
              <Box display="flex" alignItems="center" mt={1} gap={0.5}>
                {trend >= 0 ? (
                  <TrendingUpIcon fontSize="small" className={trendColors.up} />
                ) : (
                  <TrendingDownIcon fontSize="small" className={trendColors.down} />
                )}
                <Typography
                  variant="caption"
                  className={trend >= 0 ? trendColors.up : trendColors.down}
                >
                  {Math.abs(trend)}% {trendLabel || 'vs last period'}
                </Typography>
              </Box>
            )}
          </Box>
          {Icon && (
            <Box
              sx={{
                backgroundColor: `${color}.light`,
                borderRadius: 2,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon sx={{ fontSize: 32, color: `${color}.main` }} />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
