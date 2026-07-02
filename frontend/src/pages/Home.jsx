import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, TextField, Button, Card, CardContent, Avatar, Alert, Paper,
  InputAdornment, Chip, Stack, Divider, alpha, useTheme,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BadgeIcon from '@mui/icons-material/Badge';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import BarChartIcon from '@mui/icons-material/BarChart';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import RunoffBanner from '../components/RunoffBanner';
import useCountdown from '../hooks/useCountdown';
import { fetchMemberByStaffNumber, clearCurrentMember, clearError } from '../redux/memberSlice';
import { STORAGE_KEYS } from '../utils/constants';
import { brandColors } from '../theme/tokens';

const RESULTS_PATH = '/verified-votes';

const STEPS = [
  { label: 'Verify identity', active: true },
  { label: 'Cast your vote', active: false },
  { label: 'Get confirmation', active: false },
];

const CountdownUnit = ({ value, label, color }) => (
  <Box
    sx={{
      minWidth: { xs: 52, sm: 64 },
      px: 1,
      py: 1,
      borderRadius: 2,
      textAlign: 'center',
      bgcolor: alpha(color, 0.08),
      border: '1px solid',
      borderColor: alpha(color, 0.18),
    }}
  >
    <Typography variant="h5" fontWeight={800} color={color} sx={{ lineHeight: 1.1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
      {String(value).padStart(2, '0')}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {label}
    </Typography>
  </Box>
);

const Home = () => {
  const theme = useTheme();
  const [staffNumber, setStaffNumber] = useState('');
  const [fullname, setFullname] = useState('');
  const [searched, setSearched] = useState(false);
  const [electionOpen, setElectionOpen] = useState(true);
  const [endTime, setEndTime] = useState('');
  const [electionTitle, setElectionTitle] = useState('');
  const countdown = useCountdown(endTime);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentMember, loading, error } = useSelector((state) => state.members);

  const resultsUrl = `${window.location.origin}${RESULTS_PATH}`;

  useEffect(() => {
    api.get('/settings/public').then((res) => {
      const data = res?.data?.data || {};
      setElectionOpen(String(data.election_open).toLowerCase() === 'true');
      if (data.election_end_time) setEndTime(data.election_end_time);
      if (data.election_title) setElectionTitle(data.election_title);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSearched(false);
    dispatch(clearError());
    dispatch(clearCurrentMember());
    if (!staffNumber.trim() || !fullname.trim()) return;
    await dispatch(fetchMemberByStaffNumber({ staffNumber: staffNumber.trim(), fullname: fullname.trim() }));
    setSearched(true);
  };

  const handleProceedToVote = () => {
    if (currentMember) {
      localStorage.setItem(STORAGE_KEYS.VOTE_DATA, JSON.stringify(currentMember));
      navigate('/vote');
    }
  };

  const statusColor = electionOpen ? theme.palette.primary.main : theme.palette.error.main;

  return (
    <ErrorBoundary>
      <Box py={{ xs: 1, sm: 3 }}>
        {/* Top bar: results link */}
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            component="a"
            href={resultsUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            size="small"
            startIcon={<BarChartIcon />}
            endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderRadius: 99,
              fontWeight: 600,
              borderColor: alpha(theme.palette.primary.main, 0.35),
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
              },
            }}
          >
            View Election Results
          </Button>
        </Box>

        {/* Election status banner */}
        {endTime && (
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: alpha(statusColor, 0.25),
              bgcolor: alpha(statusColor, 0.04),
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box display="flex" alignItems="center" gap={1.5}>
                {electionOpen
                  ? <AccessTimeIcon sx={{ color: statusColor, fontSize: 24 }} />
                  : <ErrorOutlineIcon sx={{ color: statusColor, fontSize: 24 }} />}
                <Box>
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography variant="body1" fontWeight={700}>
                      Election is {electionOpen ? 'open' : 'closed'}
                    </Typography>
                    <Chip
                      label={electionOpen ? 'Open' : 'Closed'}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        height: 22,
                        bgcolor: alpha(statusColor, 0.12),
                        color: statusColor,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {electionOpen
                      ? `Closes ${new Date(endTime).toLocaleString()}`
                      : 'Voting is not currently accepting submissions'}
                  </Typography>
                </Box>
              </Box>

              {electionOpen && (
                <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'center', sm: 'flex-end' } }}>
                  <CountdownUnit value={countdown.days} label="Days" color={statusColor} />
                  <CountdownUnit value={countdown.hours} label="Hours" color={statusColor} />
                  <CountdownUnit value={countdown.minutes} label="Mins" color={statusColor} />
                  <CountdownUnit value={countdown.seconds} label="Secs" color={statusColor} />
                </Stack>
              )}
            </Stack>
          </Paper>
        )}

        <RunoffBanner />

        {/* Hero */}
        <Box textAlign="center" mb={{ xs: 4, sm: 5 }}>
          <Box
            sx={{
              width: { xs: 80, sm: 96 },
              height: { xs: 80, sm: 96 },
              mx: 'auto',
              mb: 2.5,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${brandColors.deepBrand} 0%, ${brandColors.primary} 100%)`,
              boxShadow: `0 12px 32px ${alpha(brandColors.primary, 0.35)}`,
            }}
          >
            <HowToVoteIcon sx={{ fontSize: { xs: 40, sm: 48 }, color: 'white' }} />
          </Box>
          <Typography variant="overline" color="primary.main" fontWeight={700} letterSpacing={2.5}>
            Nigerian Shippers&apos; Council
          </Typography>
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{ mt: 0.5, fontSize: { xs: '1.65rem', sm: '2.35rem' }, lineHeight: 1.2 }}
          >
            Cooperative Society
          </Typography>
          <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ mt: 1, fontSize: { xs: '1rem', sm: '1.15rem' } }}>
            Electronic Voting System
          </Typography>
          {electionTitle && (
            <Chip
              label={electionTitle}
              size="small"
              sx={{
                mt: 2,
                fontWeight: 600,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: 'primary.main',
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.2),
              }}
            />
          )}
        </Box>

        {/* Steps */}
        <Stack
          direction="row"
          justifyContent="center"
          spacing={{ xs: 0.5, sm: 2 }}
          mb={3}
          sx={{ overflowX: 'auto', pb: 0.5 }}
        >
          {STEPS.map((step, i) => (
            <Box key={step.label} display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                  bgcolor: step.active ? 'primary.main' : alpha(theme.palette.text.secondary, 0.1),
                  color: step.active ? 'white' : 'text.secondary',
                }}
              >
                {i + 1}
              </Box>
              <Typography
                variant="caption"
                fontWeight={step.active ? 700 : 500}
                color={step.active ? 'primary.main' : 'text.secondary'}
                sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}
              >
                {step.label}
              </Typography>
              {i < STEPS.length - 1 && (
                <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.disabled', mx: { xs: 0, sm: 0.5 }, display: { xs: 'none', sm: 'block' } }} />
              )}
            </Box>
          ))}
        </Stack>

        {/* Verification card */}
        <Card
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={1}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }}
              >
                <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              </Box>
              <Typography variant="h6" fontWeight={700}>Verify Your Identity</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Enter your staff number and full name exactly as registered to proceed with voting.
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Staff Number"
                placeholder="e.g. NSC001"
                value={staffNumber}
                onChange={(e) => setStaffNumber(e.target.value)}
                variant="outlined"
                size="medium"
                disabled={loading}
                autoComplete="off"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Full Name"
                placeholder="Enter your full name"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                variant="outlined"
                size="medium"
                disabled={loading}
                autoComplete="name"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2.5 }}
              />

              {!electionOpen && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                  Voting is currently closed. You can still view verified results using the link above.
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading || !electionOpen || !staffNumber.trim() || !fullname.trim()}
                sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
              >
                {loading ? 'Verifying...' : 'Verify Identity'}
              </Button>
            </Box>

            {loading && <LoadingSpinner message="Verifying your details..." />}

            {error && searched && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                {typeof error === 'string' ? error : 'Verification failed. Please check your details.'}
              </Alert>
            )}

            {currentMember && searched && !loading && (
              <Paper
                elevation={0}
                sx={{
                  mt: 3,
                  p: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                  borderRadius: 2,
                }}
              >
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {currentMember.fullname || currentMember.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Staff No: {currentMember.staffNumber || currentMember.staff_number}
                    </Typography>
                  </Box>
                </Box>
                <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2} sx={{ mb: 3 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Department</Typography>
                    <Typography variant="body2" fontWeight={600}>{currentMember.department || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Location</Typography>
                    <Typography variant="body2" fontWeight={600}>{currentMember.location || 'N/A'}</Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleProceedToVote}
                  endIcon={<ArrowForwardIcon />}
                  sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
                >
                  Continue to Vote
                </Button>
              </Paper>
            )}
          </CardContent>
        </Card>

        {/* Results CTA */}
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            border: '1px dashed',
            borderColor: alpha(theme.palette.primary.main, 0.3),
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            textAlign: 'center',
          }}
        >
          <BarChartIcon sx={{ color: 'primary.main', fontSize: 28, mb: 0.5 }} />
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Live Election Results
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            View verified vote tallies updated in real time — no login required.
          </Typography>
          <Button
            component="a"
            href={resultsUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            color="inherit"
            endIcon={<OpenInNewIcon />}
            sx={{
              fontWeight: 600,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06), borderColor: 'primary.main' },
            }}
          >
            Open Results Page
          </Button>
        </Paper>

        <Divider sx={{ my: 3 }} />

        <Box textAlign="center">
          <Typography variant="caption" color="text.secondary" display="block">
            &copy; {new Date().getFullYear()} Nigerian Shippers&apos; Council Cooperative Society. All rights reserved.
          </Typography>
          <Button
            component="a"
            href={resultsUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            sx={{ mt: 0.5, fontWeight: 500, color: 'text.secondary', textTransform: 'none' }}
          >
            Election Results
            <OpenInNewIcon sx={{ fontSize: 13, ml: 0.5 }} />
          </Button>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default Home;
