import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Stack, useMediaQuery, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import BadgeIcon from '@mui/icons-material/Badge';
import EditIcon from '@mui/icons-material/Edit';
import Swal from 'sweetalert2';
import { submitVote, resetSubmissionStatus } from '../redux/voteSlice';
import { fetchCandidates } from '../redux/candidateSlice';
import IdCardUpload from '../components/CameraCapture';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import { STORAGE_KEYS, ELECTION_POSITIONS } from '../utils/constants';
import { swalColors } from '../theme/tokens';

const Confirmation = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { submissionStatus, loading, error } = useSelector((state) => state.votes);
  const { candidates } = useSelector((state) => state.candidates);
  const [voterPhoto, setVoterPhoto] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPositionId, setEditPositionId] = useState(null);
  const [editCandidateId, setEditCandidateId] = useState('');

  const [selections, setSelections] = useState(() => {
    try { const d = localStorage.getItem(STORAGE_KEYS.VOTE_SELECTIONS); return d ? JSON.parse(d) : {}; } catch { return {}; }
  });

  const voteData = useMemo(() => {
    try { const d = localStorage.getItem(STORAGE_KEYS.VOTE_DATA); return d ? JSON.parse(d) : null; } catch { return null; }
  }, []);

  useEffect(() => {
    if (!candidates || candidates.length === 0) {
      dispatch(fetchCandidates({ active: true, force: true }));
    }
  }, [dispatch, candidates]);

  const candidatesByPosition = useMemo(() => {
    const grouped = {};
    ELECTION_POSITIONS.forEach((pos) => {
      grouped[pos.id] = (candidates || []).filter(
        (c) => parseInt(c.position_id, 10) === pos.id && c.status !== 'inactive'
      );
    });
    return grouped;
  }, [candidates]);

  const orderedSelections = useMemo(() => {
    return ELECTION_POSITIONS.filter((pos) => selections[pos.id]).map((pos) => ({ ...pos, details: selections[pos.id] }));
  }, [selections]);

  const handleGoBack = () => navigate('/vote');

  const editPosition = editPositionId
    ? ELECTION_POSITIONS.find((p) => p.id === editPositionId)
    : null;

  const handleOpenEdit = useCallback((positionId) => {
    const currentId = selections[positionId]
      ? String(selections[positionId].candidate?.id ?? selections[positionId].candidate ?? '')
      : '';
    setEditPositionId(positionId);
    setEditCandidateId(currentId);
    setEditModalOpen(true);
  }, [selections]);

  const handleSaveEdits = useCallback(() => {
    if (!editPositionId || !editCandidateId) return;
    const candidate = candidates.find((c) => parseInt(c.id, 10) === parseInt(editCandidateId, 10));
    if (!candidate) return;
    const position = ELECTION_POSITIONS.find((p) => p.id === editPositionId);
    const updated = {
      ...selections,
      [editPositionId]: { position: position?.label || editPositionId, candidate },
    };
    localStorage.setItem(STORAGE_KEYS.VOTE_SELECTIONS, JSON.stringify(updated));
    setSelections(updated);
    setEditModalOpen(false);
    setEditPositionId(null);
    setEditCandidateId('');
  }, [editPositionId, editCandidateId, candidates, selections]);

  const handleSubmitVote = () => {
    Swal.fire({
      title: 'Confirm Your Vote',
      text: 'This action cannot be undone.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: swalColors.confirm,
      cancelButtonColor: swalColors.danger,
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
        await dispatch(submitVote({ votes: votesArray, photo: voterPhoto }));
      }
    });
  };

  const hasSelections = !!voteData && Object.keys(selections).length > 0;

  useEffect(() => {
    if (submissionStatus === 'success') {
      localStorage.removeItem(STORAGE_KEYS.VOTE_DATA);
      localStorage.removeItem(STORAGE_KEYS.VOTE_SELECTIONS);
      dispatch(resetSubmissionStatus());
      navigate('/success', { replace: true });
    }
  }, [submissionStatus, dispatch, navigate]);

  useEffect(() => {
    if (!hasSelections) navigate('/', { replace: true });
  }, [hasSelections, navigate]);

  if (submissionStatus === 'success' || !hasSelections) return null;

  return (
    <ErrorBoundary>
      <Box py={4}>
        <Box textAlign="center" mb={4}>
          <CheckCircleIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
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
          <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Position</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Selected Candidate</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 80 }}>Edit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderedSelections.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><Typography fontWeight={500}>{item.label}</Typography></TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip icon={<CheckCircleIcon />} label={item.details?.candidate?.fullname || 'Selected'} size="small"
                          sx={{ bgcolor: 'rgba(22,163,74,0.1)', color: 'primary.main', fontWeight: 500 }} />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleOpenEdit(item.id)} color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' }, p: 2 }}>
            {orderedSelections.map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{item.label}</Typography>
                    <Typography variant="body2" fontWeight={600} mt={0.5}>
                      {item.details?.candidate?.fullname || 'Selected'}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => handleOpenEdit(item.id)} color="primary">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, mt: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <BadgeIcon sx={{ color: 'primary.main', fontSize: 20 }} />
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

        <Box display="flex" flexDirection={{ xs: 'column-reverse', sm: 'row' }} justifyContent="space-between" gap={2} mt={4}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleGoBack} disabled={loading} fullWidth={isMobile} sx={{ borderColor: 'divider', minHeight: 44 }}>
            Go Back
          </Button>
          <Button variant="contained" size="large" endIcon={<HowToVoteIcon />}
            onClick={handleSubmitVote} disabled={loading} fullWidth={isMobile}
            sx={{ px: 4, py: 1.5, minHeight: 44, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, fontWeight: 600 }}>
            {loading ? 'Submitting...' : 'Submit Vote'}
          </Button>
        </Box>

        <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700}>Edit {editPosition?.label || 'Position'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              {editPositionId && (
                <FormControl fullWidth size="small">
                  <InputLabel>{editPosition?.label || 'Candidate'}</InputLabel>
                  <Select
                    value={editCandidateId}
                    label={editPosition?.label || 'Candidate'}
                    onChange={(e) => setEditCandidateId(e.target.value)}
                  >
                    {(candidatesByPosition[editPositionId] || []).map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>
                        {c.fullname}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleSaveEdits} variant="contained">
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ErrorBoundary>
  );
};

export default Confirmation;
