import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, TextField, Button, Card, CardContent, Avatar, Alert, Paper, InputAdornment, Chip,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BadgeIcon from '@mui/icons-material/Badge';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import { fetchMemberByStaffNumber, clearCurrentMember, clearError } from '../redux/memberSlice';
import { STORAGE_KEYS } from '../utils/constants';

const Home = () => {
  const [staffNumber, setStaffNumber] = useState('');
  const [fullname, setFullname] = useState('');
  const [searched, setSearched] = useState(false);
  const [electionOpen, setElectionOpen] = useState(true);
  const [endTime, setEndTime] = useState('');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentMember, loading, error } = useSelector((state) => state.members);

  useEffect(() => {
    api.get('/settings').then((res) => {
      const data = Array.isArray(res.data.data) ? res.data.data : [];
      const openSetting = data.find((s) => s.key === 'election_open');
      if (openSetting) setElectionOpen(openSetting.value === 'true');
      const endSetting = data.find((s) => s.key === 'election_end_time');
      if (endSetting) setEndTime(endSetting.value);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!endTime) return;
    const target = new Date(endTime).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) { setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 }); clearInterval(interval); return; }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

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

  return (
    <ErrorBoundary>
      <Box py={4}>
        {endTime && (
          <Paper elevation={0} sx={{ mb: 3, p: 2.5, borderRadius: 2, border: '1px solid', borderColor: electionOpen ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)', bgcolor: electionOpen ? 'rgba(22,163,74,0.04)' : 'rgba(239,68,68,0.04)' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
              <Box display="flex" alignItems="center" gap={1.5}>
                {electionOpen ? <AccessTimeIcon sx={{ color: '#16a34a', fontSize: 22 }} /> : <ErrorOutlineIcon sx={{ color: '#ef4444', fontSize: 22 }} />}
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Election is {electionOpen ? 'open' : 'closed'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {electionOpen ? `Ends at ${new Date(endTime).toLocaleString()}` : 'Voting is not currently accepting submissions'}
                  </Typography>
                </Box>
              </Box>
              <Chip label={electionOpen ? 'Open' : 'Closed'} size="small"
                sx={{ fontWeight: 600, bgcolor: electionOpen ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)', color: electionOpen ? '#16a34a' : '#ef4444' }} />
            </Box>
            {electionOpen && (
              <Box display="flex" gap={1.5} justifyContent="center" mt={1.5}>
                {[['Days', countdown.days], ['Hours', countdown.hours], ['Mins', countdown.minutes], ['Secs', countdown.seconds]].map(([label, val]) => (
                  <Box key={label} textAlign="center" sx={{ minWidth: 48 }}>
                    <Typography variant="h6" fontWeight={700} color="#16a34a" sx={{ lineHeight: 1.2 }}>{String(val).padStart(2, '0')}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        )}

        <Box textAlign="center" mb={6}>
          <Box sx={{ width: 90, height: 90, mx: 'auto', mb: 2, bgcolor: '#166534', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HowToVoteIcon sx={{ fontSize: 48, color: 'white' }} />
          </Box>
          <Typography variant="overline" color="#16a34a" fontWeight={600} letterSpacing={2}>
            Nigerian Shippers&apos; Council
          </Typography>
          <Typography variant="h3" fontWeight={800} sx={{ mt: 1, fontSize: { xs: '1.75rem', sm: '2.5rem' } }}>
            Cooperative Society
          </Typography>
          <Typography variant="h5" color="text.secondary" fontWeight={400} sx={{ mt: 1 }}>
            Electronic Voting System
          </Typography>
        </Box>

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <CheckCircleIcon sx={{ color: '#16a34a' }} />
              <Typography variant="h6" fontWeight={600}>Verify Your Identity</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Enter your staff number and full name to proceed with voting.
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              <TextField fullWidth label="Staff Number" placeholder="Enter your staff number"
                value={staffNumber} onChange={(e) => setStaffNumber(e.target.value)}
                variant="outlined" size="medium" disabled={loading}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><BadgeIcon fontSize="small" color="action" /></InputAdornment>,
                }}
                sx={{ mb: 2.5 }} />
              <TextField fullWidth label="Full Name" placeholder="Enter your full name"
                value={fullname} onChange={(e) => setFullname(e.target.value)}
                variant="outlined" size="medium" disabled={loading}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" color="action" /></InputAdornment>,
                }}
                sx={{ mb: 2.5 }} />
              <Button type="submit" variant="contained" fullWidth size="large"
                disabled={loading || !staffNumber.trim() || !fullname.trim()}
                sx={{ py: 1.5, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 600 }}>
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
              <Paper elevation={0} sx={{ mt: 3, p: 3, bgcolor: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 2 }}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Avatar sx={{ bgcolor: '#16a34a', width: 48, height: 48 }}><PersonIcon /></Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>{currentMember.fullname || currentMember.name}</Typography>
                    <Typography variant="body2" color="text.secondary">Staff No: {currentMember.staffNumber || currentMember.staff_number}</Typography>
                  </Box>
                </Box>
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} sx={{ mb: 3 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Department</Typography>
                    <Typography variant="body2" fontWeight={500}>{currentMember.department || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Location</Typography>
                    <Typography variant="body2" fontWeight={500}>{currentMember.location || 'N/A'}</Typography>
                  </Box>
                </Box>
                <Button variant="contained" fullWidth size="large" onClick={handleProceedToVote}
                  sx={{ py: 1.5, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 600 }}>
                  Continue to Vote
                </Button>
              </Paper>
            )}
          </CardContent>
        </Card>

        <Box textAlign="center" mt={4}>
          <Typography variant="caption" color="text.secondary">
            &copy; {new Date().getFullYear()} Nigerian Shippers&apos; Council Cooperative Society. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default Home;
