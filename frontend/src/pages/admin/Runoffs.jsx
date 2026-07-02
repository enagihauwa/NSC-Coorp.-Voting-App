import { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Paper, TextField, MenuItem, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { fetchPositionRounds } from '../../redux/runoffSlice';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ErrorBoundary from '../../components/ErrorBoundary';
import { UPLOADS_BASE_URL } from '../../utils/constants';
import { subscribeToAdminVotes } from '../../services/socket';

const maskStaffNo = (s) => (s ? s.slice(0, 3) + 'XXX' : s);

const statusColor = (status) =>
  status === 'verified' ? 'primary.main' : status === 'rejected' ? '#dc2626' : '#f59e0b';

const Runoffs = () => {
  const dispatch = useDispatch();
  const { rounds, loading } = useSelector((s) => s.runoffs);
  const { token } = useSelector((s) => s.auth);

  const [selectedId, setSelectedId] = useState('');
  const [votes, setVotes] = useState([]);
  const [votesLoading, setVotesLoading] = useState(false);
  const [rejectDialog, setRejectDialog] = useState({ open: false, memberId: null });
  const [rejectReason, setRejectReason] = useState('');

  // Flatten all runoff rounds into a selectable list.
  const runoffList = useMemo(() => {
    const list = [];
    (rounds || []).forEach((pos) => {
      (pos.rounds || []).forEach((round) => {
        if (round.runoff_id) {
          list.push({
            runoff_id: round.runoff_id,
            label: `${pos.position_name} — ${round.label}`,
            is_open: round.is_open,
          });
        }
      });
    });
    return list;
  }, [rounds]);

  useEffect(() => { dispatch(fetchPositionRounds()); }, [dispatch]);

  useEffect(() => {
    if (!selectedId && runoffList.length > 0) setSelectedId(runoffList[0].runoff_id);
  }, [runoffList, selectedId]);

  const loadVotes = useCallback(async (runoffId) => {
    if (!runoffId) return;
    setVotesLoading(true);
    try {
      const res = await api.get(`/runoffs/${runoffId}/votes`);
      setVotes(res.data.data || []);
    } catch {
      setVotes([]);
    } finally {
      setVotesLoading(false);
    }
  }, []);

  useEffect(() => { loadVotes(selectedId); }, [selectedId, loadVotes]);

  useEffect(() => {
    if (!token) return undefined;
    return subscribeToAdminVotes(token, () => {
      dispatch(fetchPositionRounds());
      loadVotes(selectedId);
    });
  }, [token, dispatch, selectedId, loadVotes]);

  const handleVerify = async (memberId) => {
    try {
      await api.put(`/runoffs/${selectedId}/verify/${memberId}`);
      Swal.fire('Verified', 'Runoff vote verified.', 'success');
      loadVotes(selectedId);
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to verify runoff vote.', 'error');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await api.put(`/runoffs/${selectedId}/reject/${rejectDialog.memberId}`, { reason: rejectReason.trim() });
      Swal.fire('Rejected', 'Runoff vote rejected.', 'info');
      setRejectDialog({ open: false, memberId: null });
      setRejectReason('');
      loadVotes(selectedId);
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to reject runoff vote.', 'error');
    }
  };

  if (loading && !runoffList.length) return <LoadingSpinner message="Loading runoffs..." />;

  return (
    <ErrorBoundary>
      <Box>
        <Box mb={3}>
          <Typography variant="h5" fontWeight={700}>Runoffs</Typography>
          <Typography variant="body2" color="text.secondary">Verify tie-breaker votes cast in runoff rounds</Typography>
        </Box>

        {!runoffList.length ? (
          <EmptyState icon={ReplayIcon} message="No runoffs have been created yet" />
        ) : (
          <>
            <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <TextField select fullWidth size="small" label="Select Runoff" value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}>
                {runoffList.map((r) => (
                  <MenuItem key={r.runoff_id} value={r.runoff_id}>
                    {r.label} {r.is_open ? '(open)' : '(closed)'}
                  </MenuItem>
                ))}
              </TextField>
            </Paper>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              {votesLoading ? (
                <Box p={3}><LoadingSpinner message="Loading votes..." /></Box>
              ) : votes.length === 0 ? (
                <EmptyState icon={ReplayIcon} message="No votes cast in this runoff yet" />
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Staff No.</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Voter</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Candidate</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {votes.map((v) => (
                        <TableRow key={v.id} hover>
                          <TableCell><Typography fontFamily="monospace">{maskStaffNo(v.staff_number)}</Typography></TableCell>
                          <TableCell><Typography fontWeight={600}>{v.member_name}</Typography></TableCell>
                          <TableCell align="center">
                            {v.voter_photo ? (
                              <Box component="img" src={`${UPLOADS_BASE_URL}/uploads/${v.voter_photo}`} alt="ID"
                                sx={{ width: 48, height: 36, borderRadius: 0.5, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }} />
                            ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                          </TableCell>
                          <TableCell>{v.candidate_name}</TableCell>
                          <TableCell>
                            <Chip label={v.status} size="small" variant="outlined"
                              sx={{ fontWeight: 500, textTransform: 'capitalize', color: statusColor(v.status), borderColor: statusColor(v.status) }} />
                          </TableCell>
                          <TableCell align="right">
                            {v.status === 'pending' ? (
                              <Box display="flex" gap={1} justifyContent="flex-end">
                                <Button size="small" variant="outlined" color="error"
                                  onClick={() => setRejectDialog({ open: true, memberId: v.member_id })}>Reject</Button>
                                <Button size="small" variant="contained" color="success"
                                  onClick={() => handleVerify(v.member_id)}>Verify</Button>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                {v.rejection_reason || '—'}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </>
        )}

        <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, memberId: null })} maxWidth="sm" fullWidth>
          <DialogTitle>Reject Runoff Vote</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>Provide a compulsory reason for rejecting this vote.</Typography>
            <TextField autoFocus fullWidth multiline rows={3} label="Rejection Reason *"
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              error={rejectDialog.open && !rejectReason.trim()}
              helperText={rejectDialog.open && !rejectReason.trim() ? 'Reason is required' : ' '} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setRejectDialog({ open: false, memberId: null }); setRejectReason(''); }}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleReject} disabled={!rejectReason.trim()}>Reject</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ErrorBoundary>
  );
};

export default Runoffs;
