import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HomeIcon from '@mui/icons-material/Home';
import ErrorBoundary from '../components/ErrorBoundary';

const Success = () => {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <Box py={8} display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="80vh" textAlign="center">
        <Box sx={{ opacity: showContent ? 1 : 0, transform: showContent ? 'scale(1)' : 'scale(0.5)', transition: 'all 0.5s ease-out' }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 120, color: 'primary.main' }} />
        </Box>
        <Box sx={{ opacity: showContent ? 1 : 0, transition: 'opacity 0.5s ease-out 0.3s' }}>
          <Typography variant="h3" fontWeight={800} sx={{ mt: 3, mb: 1 }}>Vote Successfully Recorded!</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>Thank you for participating in this election.</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            You have successfully cast your vote in the{' '}
            <strong>Nigerian Shippers&apos; Council Cooperative Society</strong> election.
          </Typography>
          <Paper elevation={0} sx={{ p: 3, mb: 4, maxWidth: 400, mx: 'auto', bgcolor: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Your vote has been securely recorded and encrypted. You may now close this page.
            </Typography>
          </Paper>
          <Button variant="outlined" startIcon={<HomeIcon />} onClick={() => navigate('/', { replace: true })} sx={{ borderColor: 'divider' }}>
            Return to Home
          </Button>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default Success;
