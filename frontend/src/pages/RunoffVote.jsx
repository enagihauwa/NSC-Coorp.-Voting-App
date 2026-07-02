import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Card, CardContent, Alert, Paper,
  InputAdornment, Chip, Container,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import ReplayIcon from '@mui/icons-material/Replay';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Swal from 'sweetalert2';
import api from '../services/api';
import CandidateCard from '../components/CandidateCard';
import IdCardUpload from '../components/CameraCapture';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import useCountdown from '../hooks/useCountdown';
import { swalColors } from '../theme/tokens';

const RunoffVote = () => {
  const { runoffId } = useParams();
  const navigate = useNavigate();

  const [runoff, setRunoff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [staffNumber, setStaffNumber] = useState('');
  const [fullname, setFullname] = useState('');
  const [member, setMember] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [identityError, setIdentityError] = useState('');

  const [selected, setSelected] = useState(null);
  const [voterPhoto, setVoterPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const countdown = useCountdown(runoff?.end_time);
  const isOpen = !!runoff?.is_open && !countdown.expired;

  const loadRunoff = useCallback(async () => {
    try {
      const res = await api.get(`/runoffs/${runoffId}`);
      setRunoff(res.data.data);
    } catch (err) {
      setLoadError(err.message || 'Runoff not found.');
    } finally {
      setLoading(false);
    }
  }, [runoffId]);

  useEffect(() => { loadRunoff(); }, [loadRunoff]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!staffNumber.trim() || !fullname.trim()) return;
    setVerifying(true);
    setIdentityError('');
    try {
      const res = await api.get(`/members/${encodeURIComponent(staffNumber.trim())}`, {
        params: { fullname: fullname.trim() },
      });
      setMember(res.data.data || res.data.member || res.data);
    } catch (err) {
      setIdentityError(err.message || 'Verification failed. Please check your details.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = () => {
    if (!selected || !voterPhoto || !member) return;
    Swal.fire({
      title: 'Confirm Your Runoff Vote',
      text: 'This action cannot be undone.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: swalColors.confirm,
      cancelButtonColor: swalColors.danger,
      confirmButtonText: 'Yes, Submit Vote!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      setSubmitting(true);
      try {
        await api.post(`/runoffs/${runoffId}/vote`, {
          member_id: member.id,
          candidate_id: selected,
          photo: voterPhoto,
        });
        await Swal.fire('Vote submitted', 'Your runoff vote has been recorded and is pending verification.', 'success');
        navigate('/', { replace: true });
      } catch (err) {
        Swal.fire('Error', err.message || 'Failed to submit runoff vote.', 'error');
      } finally {
        setSubmitting(false);
      }
    });
  };

  if (loading) {
    return <Container maxWidth="md" sx={{ py: 4 }}><LoadingSpinner message="Loading runoff..." /></Container>;
  }

  if (loadError || !runoff) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{loadError || 'Runoff not found.'}</Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>Go Home</Button>
      </Container>
    );
  }

  return (
    <ErrorBoundary>
      <Box py={{ xs: 2, sm: 4 }}>
        <Paper elevation={0} sx={{ mb: 3, p: 2.5, borderRadius: 2, border: '1px solid rgba(245,158,11,0.35)', bgcolor: 'rgba(245,158,11,0.06)' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <ReplayIcon sx={{ color: '#b45309', fontSize: 24 }} />
              <Box>
                <Typography variant="h6" fontWeight={800}>Runoff — {runoff.position_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Tie-breaker vote · Round {runoff.round_number}
                </Typography>
              </Box>
            </Box>
            <Chip label={isOpen ? 'Open' : 'Closed'} size="small"
              sx={{ fontWeight: 600, bgcolor: isOpen ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.1)', color: isOpen ? '#b45309' : 'error.main' }} />
          </Box>
          {isOpen && (
            <Box display="flex" gap={1.5} justifyContent="center" mt={1.5}>
              {[['Days', countdown.days], ['Hours', countdown.hours], ['Mins', countdown.minutes], ['Secs', countdown.seconds]].map(([label, val]) => (
                <Box key={label} textAlign="center" sx={{ minWidth: 48 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#b45309', lineHeight: 1.2 }}>{String(val).padStart(2, '0')}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {!isOpen && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            This runoff is closed and is no longer accepting votes.
          </Alert>
        )}

        {!member ? (
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Typography variant="h6" fontWeight={600} mb={1}>Verify Your Identity</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Enter your staff number and full name to vote in this runoff.
              </Typography>
              <Box component="form" onSubmit={handleVerify}>
                <TextField fullWidth label="Staff Number" value={staffNumber}
                  onChange={(e) => setStaffNumber(e.target.value)} disabled={verifying || !isOpen}
                  InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon fontSize="small" color="action" /></InputAdornment> }}
                  sx={{ mb: 2.5 }} />
                <TextField fullWidth label="Full Name" value={fullname}
                  onChange={(e) => setFullname(e.target.value)} disabled={verifying || !isOpen}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" color="action" /></InputAdornment> }}
                  sx={{ mb: 2.5 }} />
                <Button type="submit" variant="contained" fullWidth size="large"
                  disabled={verifying || !isOpen || !staffNumber.trim() || !fullname.trim()}
                  sx={{ py: 1.5, bgcolor: '#b45309', '&:hover': { bgcolor: '#92400e' }, fontWeight: 600 }}>
                  {verifying ? 'Verifying...' : 'Verify Identity'}
                </Button>
              </Box>
              {identityError && <Alert severity="error" sx={{ mt: 2 }}>{identityError}</Alert>}
            </CardContent>
          </Card>
        ) : (
          <>
            <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'rgba(22,163,74,0.05)' }}>
              <Typography variant="subtitle2" color="text.secondary">Voter</Typography>
              <Typography variant="subtitle1" fontWeight={600}>{member.fullname || member.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Staff No: {member.staff_number || member.staffNumber}
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Select one candidate</Typography>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                {runoff.candidates.map((candidate) => (
                  <CandidateCard key={candidate.id} candidate={candidate}
                    position={runoff.position_name}
                    selected={selected === candidate.id}
                    onSelect={setSelected} />
                ))}
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <BadgeIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={600}>Staff ID Card Upload</Typography>
              </Box>
              <IdCardUpload onCapture={setVoterPhoto} onClear={() => setVoterPhoto(null)} />
            </Paper>

            {submitting && <LoadingSpinner message="Submitting your runoff vote..." />}

            <Box display="flex" justifyContent="flex-end">
              <Button variant="contained" size="large" endIcon={<HowToVoteIcon />}
                disabled={submitting || !isOpen || !selected || !voterPhoto}
                onClick={handleSubmit}
                sx={{ px: 4, py: 1.5, bgcolor: '#b45309', '&:hover': { bgcolor: '#92400e' }, fontWeight: 600 }}>
                {submitting ? 'Submitting...' : 'Submit Runoff Vote'}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default RunoffVote;
