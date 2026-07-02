import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Button, Paper, TextField, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Grid, Collapse, IconButton, InputAdornment,
} from '@mui/material';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Swal from 'sweetalert2';
import { fetchVotes } from '../../redux/voteSlice';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ErrorBoundary from '../../components/ErrorBoundary';
import { LOCATIONS, UPLOADS_BASE_URL } from '../../utils/constants';
import { subscribeToAdminVotes } from '../../services/socket';
const maskStaffNo = (s) => s ? s.slice(0, 3) + 'XXX' : s;

const Votes = () => {
  const dispatch = useDispatch();
  const { votes, loading } = useSelector((s) => s.votes);
  const { token } = useSelector((s) => s.auth);
  const [locationFilter, setLocationFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [page, setPage] = useState(0);
  const [rejectDialog, setRejectDialog] = useState({ open: false, memberId: null });
  const [rejectReason, setRejectReason] = useState('');
  const pageSize = 15;

  useEffect(() => {
    const params = { page: 1, limit: 500 };
    if (locationFilter) params.location = locationFilter;
    dispatch(fetchVotes(params));
  }, [dispatch, locationFilter]);

  useEffect(() => {
    if (!token) return undefined;
    return subscribeToAdminVotes(token, () => {
      const params = { page: 1, limit: 500 };
      if (locationFilter) params.location = locationFilter;
      dispatch(fetchVotes(params));
    });
  }, [dispatch, locationFilter, token]);

  const groupedVoters = useMemo(() => {
    const flat = Array.isArray(votes) ? votes : [];
    const map = {};
    flat.forEach((v) => {
      const key = v.member_id;
      if (!map[key]) {
        map[key] = {
          member_id: v.member_id,
          staff_number: v.staff_number,
          member_name: v.member_name,
          location: v.location,
          voter_photo: v.voter_photo,
          votes: [],
        };
      }
      map[key].votes.push({
        id: v.id,
        position_name: v.position_name,
        candidate_name: v.candidate_name,
        created_at: v.created_at,
        status: v.status || 'pending',
        rejection_reason: v.rejection_reason || null,
      });
    });
    const grouped = Object.values(map);

    if (!searchTerm) return grouped;
    const q = searchTerm.toLowerCase();
    return grouped.filter(
      (g) =>
        g.staff_number?.toLowerCase().includes(q) ||
        g.member_name?.toLowerCase().includes(q)
    );
  }, [votes, searchTerm]);

  const pagedVoters = useMemo(() => {
    const start = page * pageSize;
    return groupedVoters.slice(start, start + pageSize);
  }, [groupedVoters, page]);

  const totalPages = Math.ceil(groupedVoters.length / pageSize);

  const handleView = useCallback((voter) => {
    setSelectedVoter(voter);
    setDetailOpen(true);
  }, []);

  const handleVerifyAll = async (memberId) => {
    try {
      await api.put(`/votes/verify/${memberId}`);
      Swal.fire('Verified', 'All votes for this voter have been verified', 'success');
      dispatch(fetchVotes({ page: 1, limit: 500, ...(locationFilter && { location: locationFilter }), force: true }));
      setDetailOpen(false);
    } catch {
      Swal.fire('Error', 'Failed to verify votes', 'error');
    }
  };

  const handleRejectAll = async () => {
    if (!rejectReason.trim()) return;
    try {
      await api.put(`/votes/reject/${rejectDialog.memberId}`, { reason: rejectReason.trim() });
      Swal.fire('Rejected', 'Votes have been rejected', 'info');
      dispatch(fetchVotes({ page: 1, limit: 500, ...(locationFilter && { location: locationFilter }), force: true }));
      setRejectDialog({ open: false, memberId: null });
      setRejectReason('');
      setDetailOpen(false);
    } catch {
      Swal.fire('Error', 'Failed to reject votes', 'error');
    }
  };

  const handleExport = () => {
    if (!groupedVoters.length) return;
    const rows = [['Staff No.', 'Member', 'Location', 'Position', 'Candidate', 'Date']];
    groupedVoters.forEach((v) => {
      v.votes.forEach((vote) => {
        rows.push([
          v.staff_number,
          v.member_name,
          v.location,
          vote.position_name,
          vote.candidate_name,
          vote.created_at ? new Date(vote.created_at).toLocaleString() : '',
        ]);
      });
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `votes_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !votes.length) return <LoadingSpinner message="Loading votes..." />;

  return (
    <ErrorBoundary>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Votes</Typography>
            <Typography variant="body2" color="text.secondary">View all votes grouped by voter</Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport}>
              Export CSV
            </Button>
          </Box>
        </Box>

        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth size="small" placeholder="Search by name or staff no."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField select fullWidth size="small" label="Filter by Location" value={locationFilter}
                onChange={(e) => { setLocationFilter(e.target.value); setPage(0); }}
                InputProps={{ startAdornment: <FilterListIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}>
                <MenuItem value="">All Locations</MenuItem>
                {LOCATIONS.map((loc) => <MenuItem key={loc} value={loc}>{loc}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          {!groupedVoters.length ? (
            <EmptyState icon={HowToVoteIcon} message="No votes match your criteria" />
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell width={48} />
                      <TableCell sx={{ fontWeight: 600 }}>Staff No.</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Voter</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} width={60} align="center">ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="center">Positions</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Recent</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} width={100}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedVoters.map((voter) => (
                      <VoterRow
                        key={voter.member_id}
                        voter={voter}
                        expanded={expandedRow === voter.member_id}
                        onToggle={() => setExpandedRow(expandedRow === voter.member_id ? null : voter.member_id)}
                        onView={() => handleView(voter)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box display="flex" justifyContent="space-between" alignItems="center" p={2} borderTop="1px solid" borderColor="divider">
                <Typography variant="caption" color="text.secondary">
                  Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, groupedVoters.length)} of {groupedVoters.length} voters
                </Typography>
                <Box display="flex" gap={1}>
                  <Button size="small" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button size="small" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </Box>
              </Box>
            </>
          )}
        </Paper>

        <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Voter Details</DialogTitle>
          <DialogContent>
            {selectedVoter ? (
              <Box>
                <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(22,163,74,0.05)', borderRadius: 2, border: '1px solid rgba(22,163,74,0.15)' }}>
                  <Typography variant="body2" color="text.secondary">Voter</Typography>
                  <Typography variant="subtitle2" fontWeight={600}>{selectedVoter.member_name}</Typography>
                  <Typography variant="caption" color="text.secondary">Staff No: {maskStaffNo(selectedVoter.staff_number)}</Typography>
                  {selectedVoter.location && (
                    <Typography variant="caption" color="text.secondary" display="block">{selectedVoter.location}</Typography>
                  )}
                  {selectedVoter.voter_photo && (
                    <Box mt={1.5}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                        Staff ID Card
                      </Typography>
                      <Box
                        component="img"
                        src={`${UPLOADS_BASE_URL}/uploads/${selectedVoter.voter_photo}`}
                        alt="Voter ID card"
                        sx={{ width: '100%', maxWidth: 240, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                      />
                    </Box>
                  )}
                </Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Votes Cast ({selectedVoter.votes.length})
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Position</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Rejection Reason</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedVoter.votes.map((vote) => (
                        <TableRow key={vote.id}>
                          <TableCell>{vote.position_name}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {vote.created_at ? new Date(vote.created_at).toLocaleString() : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={vote.status || 'pending'} size="small" variant="outlined"
                              sx={{ fontWeight: 500, textTransform: 'capitalize',
                                color: vote.status === 'verified' ? 'primary.main' : vote.status === 'rejected' ? '#dc2626' : '#f59e0b',
                                borderColor: vote.status === 'verified' ? 'primary.main' : vote.status === 'rejected' ? '#dc2626' : '#f59e0b' }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {vote.rejection_reason || '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {selectedVoter.votes.some(v => (v.status || 'pending') === 'pending') && (
                  <Box display="flex" gap={1} justifyContent="flex-end" mt={2}>
                    <Button variant="outlined" color="error" size="small"
                      onClick={() => setRejectDialog({ open: true, memberId: selectedVoter.member_id })}>
                      Reject All
                    </Button>
                    <Button variant="contained" color="success" size="small"
                      onClick={() => handleVerifyAll(selectedVoter.member_id)}>
                      Verify All
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <Typography color="text.secondary">No details available</Typography>
            )}
          </DialogContent>
          <DialogActions><Button onClick={() => setDetailOpen(false)}>Close</Button></DialogActions>
        </Dialog>

        <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, memberId: null })} maxWidth="sm" fullWidth>
          <DialogTitle>Reject All Votes</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Provide a compulsory reason for rejecting all votes from this voter.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              rows={3}
              label="Rejection Reason *"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              error={rejectDialog.open && !rejectReason.trim()}
              helperText={rejectDialog.open && !rejectReason.trim() ? 'Reason is required' : ' '}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setRejectDialog({ open: false, memberId: null }); setRejectReason(''); }}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleRejectAll} disabled={!rejectReason.trim()}>
              Reject All
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ErrorBoundary>
  );
};

const VoterRow = ({ voter, expanded, onToggle, onView }) => {
  const latestVote = voter.votes.reduce((latest, v) => {
    return !latest || (v.created_at && new Date(v.created_at) > new Date(latest.created_at)) ? v : latest;
  }, null);

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }} onClick={onToggle}>
        <TableCell>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell><Typography fontWeight={500} fontFamily="monospace">{voter.staff_number ? maskStaffNo(voter.staff_number) : '—'}</Typography></TableCell>
        <TableCell><Typography fontWeight={600}>{voter.member_name}</Typography></TableCell>
        <TableCell align="center">
          {voter.voter_photo ? (
            <Box
              component="img"
              src={`${UPLOADS_BASE_URL}/uploads/${voter.voter_photo}`}
              alt="ID"
              sx={{ width: 48, height: 36, borderRadius: 0.5, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }}
            />
          ) : (
            <Typography variant="caption" color="text.disabled">—</Typography>
          )}
        </TableCell>
        <TableCell>{voter.location}</TableCell>
        <TableCell align="center">
          <Chip label={voter.votes.length} size="small"
            sx={{ bgcolor: 'rgba(22,163,74,0.1)', color: 'primary.main', fontWeight: 600 }} />
        </TableCell>
        <TableCell>
          <Typography variant="caption" color="text.secondary">
            {latestVote?.created_at ? new Date(latestVote.created_at).toLocaleString() : 'N/A'}
          </Typography>
        </TableCell>
        <TableCell>
          <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); onView(); }}
            title="View details">
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, borderBottom: expanded ? 1 : 0, borderColor: 'divider' }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>All Votes</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Position</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {voter.votes.map((vote) => (
                    <TableRow key={vote.id}>
                      <TableCell>{vote.position_name}</TableCell>
                      <TableCell><Typography variant="body2">{vote.created_at ? new Date(vote.created_at).toLocaleString() : 'N/A'}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default Votes;