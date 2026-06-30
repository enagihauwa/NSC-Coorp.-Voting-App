import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import BadgeIcon from '@mui/icons-material/Badge';
import Swal from 'sweetalert2';
import { submitVote, resetSubmissionStatus } from '../redux/voteSlice';
import IdCardUpload from '../components/CameraCapture';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import { STORAGE_KEYS, ELECTION_POSITIONS } from '../utils/constants';

const Confirmation = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { submissionStatus, loading, error } = useSelector((state) => state.votes);
  const [voterPhoto, setVoterPhoto] = useState(null);

  const selections = useMemo(() => {
    try { const d = localStorage.getItem(STORAGE_KEYS.VOTE_SELECTIONS); return d ? JSON.parse(d) : {}; } catch { return {}; }
  }, []);

  const voteData = useMemo(() => {
    try { const d = localStorage.getItem(STORAGE_KEYS.VOTE_DATA); return d ? JSON.parse(d) : null; } catch { return null; }
  }, []);

  const orderedSelections = useMemo(() => {
    return ELECTION_POSITIONS.filter((pos) => selections[pos.id]).map((pos) => ({ ...pos, details: selections[pos.id] }));
  }, [selections]);

  const handleGoBack = () => navigate('/vote');

  const handleSubmitVote = () => {
    Swal.fire({
      title: 'Confirm Your Vote',
      text: 'This action cannot be undone.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Submit Vote!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        const memberId = voteData?.id;
        const votesArray = Object.entries(selections).map(([posId, data]) => ({
          member_id: memberId,
          position_id: parseInt(posId, 10),
          candidate_id: parseInt(data.candidate?.id || data.candidate, 10),
        }));
        console.log('Submitting votes:', JSON.stringify({ votes: votesArray, photo: voterPhoto?.slice(0, 50) }));
        await dispatch(submitVote({ votes: votesArray, photo: voterPhoto }));
      }
    });
  };

  if (submissionStatus === 'success') {
    localStorage.removeItem(STORAGE_KEYS.VOTE_DATA);
    localStorage.removeItem(STORAGE_KEYS.VOTE_SELECTIONS);
    dispatch(resetSubmissionStatus());
    navigate('/success', { replace: true });
    return null;
  }

  if (!voteData || Object.keys(selections).length === 0) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <ErrorBoundary>
      <Box py={4}>
        <Box textAlign="center" mb={4}>
          <CheckCircleIcon sx={{ fontSize: 56, color: '#16a34a', mb: 1 }} />
          <Typography variant="h4" fontWeight={800}>Review Your Vote</Typography>
          <Typography variant="body1" color="text.secondary" mt={1}>
            Please review your selections and upload your staff ID card before submitting
          </Typography>
        </Box>

        {error && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', borderRadius: 2 }}>
            <Typography color="error" fontWeight={600}>{error.message || error}</Typography>
            {error.details && error.details.length > 0 && (
              <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                {error.details.map((d, i) => (
                  <Typography key={i} variant="caption" color="error" component="li">
                    {d.field}: {d.message}
                  </Typography>
                ))}
              </Box>
            )}
          </Paper>
        )}

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 3, bgcolor: 'rgba(22,163,74,0.05)', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary">Voter Information</Typography>
            <Typography variant="subtitle1" fontWeight={600}>{voteData.fullname || voteData.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              Staff No: {voteData.staffNumber || voteData.staff_number} | {voteData.department} | {voteData.location}
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Position</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Selected Candidate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderedSelections.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><Typography fontWeight={500}>{item.label}</Typography></TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip icon={<CheckCircleIcon />} label={item.details?.candidate?.fullname || 'Selected'} size="small"
                          sx={{ bgcolor: 'rgba(22,163,74,0.1)', color: '#16a34a', fontWeight: 500 }} />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, mt: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <BadgeIcon sx={{ color: '#16a34a', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={600}>Staff ID Card Upload</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Upload an image of your staff ID card for identity verification. This ensures transparency and security.
          </Typography>
          <IdCardUpload onCapture={setVoterPhoto} onClear={() => setVoterPhoto(null)} />
          {voterPhoto && (
            <Box mt={2} p={2} sx={{ bgcolor: 'rgba(22,163,74,0.05)', borderRadius: 2, border: '1px solid rgba(22,163,74,0.2)' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
                Uploaded ID Card Preview
              </Typography>
              <Box
                component="img"
                src={voterPhoto}
                alt="Staff ID Card"
                sx={{ width: '100%', maxWidth: 320, borderRadius: 1, display: 'block', mx: 'auto' }}
              />
            </Box>
          )}
        </Paper>

        {loading && <LoadingSpinner message="Submitting your vote..." />}

        <Box display="flex" justifyContent="space-between" gap={2} mt={4}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleGoBack} disabled={loading} sx={{ borderColor: 'divider' }}>
            Go Back
          </Button>
          <Button variant="contained" size="large" endIcon={<HowToVoteIcon />}
            onClick={handleSubmitVote} disabled={loading || !voterPhoto}
            sx={{ px: 4, py: 1.5, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 600 }}>
            {loading ? 'Submitting...' : 'Submit Vote'}
          </Button>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default Confirmation;
