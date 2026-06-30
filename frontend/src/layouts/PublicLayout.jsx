import { Box, Container, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';

const PublicLayout = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #0a1628 0%, #1a2332 50%, #0f1a1a 100%)'
          : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)',
        transition: 'background 0.3s ease',
      }}
    >
      <Container maxWidth="md" sx={{ py: 4 }}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </Container>
    </Box>
  );
};

export default PublicLayout;
