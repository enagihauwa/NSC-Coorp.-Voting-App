import { Box, Container, useTheme, alpha } from '@mui/material';
import { Outlet } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';

const PublicLayout = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        background: isDark
          ? `linear-gradient(165deg, ${theme.palette.background.default} 0%, #1e293b 45%, ${theme.palette.background.default} 100%)`
          : `linear-gradient(165deg, #ffffff 0%, ${theme.palette.background.default} 40%, #eef2f6 100%)`,
        transition: 'background 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: isDark
            ? `radial-gradient(ellipse 80% 50% at 50% -10%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 60%)`
            : `radial-gradient(ellipse 70% 45% at 50% -5%, ${alpha(theme.palette.primary.main, 0.04)} 0%, transparent 55%)`,
        },
      }}
    >
      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 }, position: 'relative' }}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </Container>
    </Box>
  );
};

export default PublicLayout;
