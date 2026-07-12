import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Button, Paper, Avatar, LinearProgress, Chip, MobileStepper, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControlLabel, Checkbox,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonIcon from '@mui/icons-material/Person';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import GroupsIcon from '@mui/icons-material/Groups';
import ReplayIcon from '@mui/icons-material/Replay';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { fetchSummary } from '../../redux/resultSlice';
import { fetchPositionRounds, fetchTies } from '../../redux/runoffSlice';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ErrorBoundary from '../../components/ErrorBoundary';
import { ELECTION_POSITIONS, resolvePhotoUrl } from '../../utils/constants';
import useCountdown from '../../hooks/useCountdown';
import { subscribeToAdminVotes } from '../../services/socket';

const RoundBlock = ({ round, announceWinners, onClose }) => {
  const isRunoff = round.round_number > 1;
  const accent = isRunoff ? '#b45309' : '#3b82f6';
  const countdown = useCountdown(round.is_open ? round.end_time : null);

  return (
    <Box sx={{ mb: 3, pl: isRunoff ? 1.5 : 0, borderLeft: isRunoff ? '3px solid rgba(245,158,11,0.4)' : 'none' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1.5}>
        <Box display="flex" alignItems="center" gap={1}>
          {isRunoff && <ReplayIcon sx={{ fontSize: 18, color: '#b45309' }} />}
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: isRunoff ? '#b45309' : 'text.primary' }}>
            {round.label}
          </Typography>
          {round.is_open && (
            <Chip label="In progress" size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(245,158,11,0.15)', color: '#b45309', height: 22 }} />
          )}
          {round.still_tied && !round.is_open && (
            <Chip label="Tied" size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(239,68,68,0.1)', color: 'error.main', height: 22 }} />
          )}
        </Box>
        <Box display="flex" alignItems="center" gap={1.5}>
          {round.is_open && (
            <Typography variant="caption" fontWeight={700} sx={{ color: '#b45309' }}>
              {countdown.expired ? 'Ending…' : `${String(countdown.days).padStart(2, '0')}:${String(countdown.hours).padStart(2, '0')}:${String(countdown.minutes).padStart(2, '0')}:${String(countdown.seconds).padStart(2, '0')}`}
            </Typography>
          )}
          {round.is_open && onClose && (
            <Button size="small" variant="outlined" color="warning" onClick={() => onClose(round.runoff_id)}>
              Close Runoff
            </Button>
          )}
          <Chip label={`${round.total_votes} vote${round.total_votes !== 1 ? 's' : ''}`} size="small"
            sx={{ fontWeight: 600, bgcolor: 'rgba(22,163,74,0.1)', color: 'primary.main' }} />
        </Box>
      </Box>

      {round.candidates.map((c) => {
        const pct = round.total_votes > 0 ? (c.vote_count / round.total_votes) * 100 : 0;
        const isWinner = announceWinners && round.winner && round.winner.id === c.id;
        return (
          <Box key={c.id} mb={2}>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <Avatar src={resolvePhotoUrl(c.photo)} sx={{ width: 40, height: 40, border: isWinner ? '2px solid #f59e0b' : '2px solid transparent' }}>
                {!c.photo && <PersonIcon />}
              </Avatar>
              <Box flex={1}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="subtitle2" fontWeight={600}>{c.fullname}</Typography>
                  {isWinner && <Chip icon={<EmojiEventsIcon sx={{ fontSize: 14 }} />} label="Winner" size="small"
                    sx={{ bgcolor: 'rgba(234,179,8,0.12)', color: '#ca8a04', fontWeight: 600, height: 24 }} />}
                </Box>
                {(c.department || c.location) && (
                  <Box display="flex" gap={0.5} mb={0.5} flexWrap="wrap">
                    {c.department && (
                      <Typography variant="caption" color="text.secondary">
                        {c.department}
                      </Typography>
                    )}
                    {c.department && c.location && (
                      <Typography variant="caption" color="text.secondary">·</Typography>
                    )}
                    {c.location && (
                      <Typography variant="caption" color="text.secondary">
                        {c.location}
                      </Typography>
                    )}
                  </Box>
                )}
                <Box display="flex" alignItems="center" gap={2}>
                  <Box flex={1}>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: isWinner ? '#22c55e' : accent, borderRadius: 4 } }} />
                  </Box>
                  <Typography variant="body2" fontWeight={600} minWidth={80} textAlign="right">
                    {c.vote_count} ({pct.toFixed(1)}%)
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

const Results = () => {
  const dispatch = useDispatch();
  const { rounds, ties, loading } = useSelector((s) => s.runoffs);
  const { token } = useSelector((s) => s.auth);
  const [activeStep, setActiveStep] = useState(0);
  const [announceWinners, setAnnounceWinners] = useState(false);
  const [runoffDialog, setRunoffDialog] = useState({ open: false, tie: null });
  const [endTime, setEndTime] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);

  const refetch = () => { dispatch(fetchPositionRounds()); dispatch(fetchTies()); dispatch(fetchSummary()); };

  useEffect(() => { refetch(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dispatch]);

  useEffect(() => {
    if (!token) return undefined;
    return subscribeToAdminVotes(token, () => refetch());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, token]);

  useEffect(() => {
    api.get('/settings').then((res) => {
      const data = res?.data?.data || {};
      setAnnounceWinners(String(data.announce_winners).toLowerCase() === 'true');
    }).catch(() => {});
  }, []);

  const positionsData = useMemo(() => (Array.isArray(rounds) ? rounds : []), [rounds]);
  const getPosition = (posId) => positionsData.find((r) => parseInt(r.position_id, 10) === posId);

  const filteredPositions = useMemo(
    () => ELECTION_POSITIONS.filter((pos) => {
      const p = getPosition(pos.id);
      return p && (p.rounds || []).some((r) => r.candidates.length > 0);
    }),
    [positionsData]
  );

  const currentPos = filteredPositions[activeStep];
  const posData = currentPos ? getPosition(currentPos.id) : null;
  const posRounds = posData?.rounds || [];
  const tie = currentPos ? ties.find((t) => t.position_id === currentPos.id) : null;
  const hasOpenRunoff = posRounds.some((r) => r.is_open);

  useEffect(() => {
    if (activeStep >= filteredPositions.length) setActiveStep(0);
  }, [filteredPositions.length, activeStep]);

  const summaryStats = useMemo(() => {
    const totalVotes = positionsData.reduce((sum, p) => sum + (p.rounds?.[0]?.total_votes || 0), 0);
    const totalCandidates = positionsData.reduce((sum, p) => sum + (p.rounds?.[0]?.candidates.length || 0), 0);
    return { totalVotes, totalCandidates, totalPositions: filteredPositions.length };
  }, [positionsData, filteredPositions]);

  const handlePrint = () => window.print();

  const handleExport = () => {
    if (!filteredPositions.length) {
      Swal.fire('Nothing to export', 'There are no results to export yet.', 'info');
      return;
    }
    const rows = [['Position', 'Round', 'Candidate', 'Department', 'Location', 'Votes', 'Percentage']];
    filteredPositions.forEach((pos) => {
      const p = getPosition(pos.id);
      (p?.rounds || []).forEach((round) => {
        if (round.candidates.length === 0) return;
        round.candidates.forEach((c) => {
          const pct = round.total_votes > 0 ? ((c.vote_count / round.total_votes) * 100).toFixed(1) : '0.0';
          rows.push([pos.label, round.label, c.fullname, c.department || '', c.location || '', c.vote_count, `${pct}%`]);
        });
      });
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openRunoffDialog = () => {
    if (!tie) return;
    setSelectedCandidateIds(tie.tied_candidates.map((c) => c.id));
    setEndTime('');
    setRunoffDialog({ open: true, tie });
  };

  const toggleCandidate = (id) => {
    setSelectedCandidateIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreateRunoff = async () => {
    if (!runoffDialog.tie || !endTime || selectedCandidateIds.length < 2) return;
    try {
      await api.post('/runoffs', {
        position_id: runoffDialog.tie.position_id,
        candidate_ids: selectedCandidateIds,
        end_time: new Date(endTime).toISOString(),
      });
      setRunoffDialog({ open: false, tie: null });
      Swal.fire('Runoff started', 'Voters can now cast their tie-breaker votes.', 'success');
      refetch();
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to start runoff.', 'error');
    }
  };

  const handleCloseRunoff = async (runoffId) => {
    const confirm = await Swal.fire({
      title: 'Close this runoff?',
      text: 'No further votes will be accepted for this round.',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Close Runoff', reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;
    try {
      await api.put(`/runoffs/${runoffId}/close`);
      Swal.fire('Closed', 'The runoff has been closed.', 'success');
      refetch();
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to close runoff.', 'error');
    }
  };

  if (loading && !positionsData.length) return <LoadingSpinner message="Loading results..." />;

  return (
    <ErrorBoundary>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2} className="no-print">
          <Box>
            <Typography variant="h5" fontWeight={700}>Election Results</Typography>
            <Typography variant="body2" color="text.secondary">Real-time results, round history and runoffs</Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport}>Export</Button>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>Print</Button>
          </Box>
        </Box>

        {!filteredPositions.length && !loading && <EmptyState icon={BarChartIcon} message="No results available yet" />}

        {summaryStats.totalPositions > 0 && (
          <Box display="flex" gap={2} mb={3} flexWrap="wrap">
            <Paper elevation={0} sx={{ flex: 1, minWidth: 140, p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
              <HowToVoteIcon sx={{ fontSize: 32, color: 'primary.main', mb: 0.5 }} />
              <Typography variant="h4" fontWeight={700}>{summaryStats.totalVotes}</Typography>
              <Typography variant="caption" color="text.secondary">Total Votes Cast</Typography>
            </Paper>
            <Paper elevation={0} sx={{ flex: 1, minWidth: 140, p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
              <GroupsIcon sx={{ fontSize: 32, color: '#3b82f6', mb: 0.5 }} />
              <Typography variant="h4" fontWeight={700}>{summaryStats.totalCandidates}</Typography>
              <Typography variant="caption" color="text.secondary">Total Candidates</Typography>
            </Paper>
            <Paper elevation={0} sx={{ flex: 1, minWidth: 140, p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
              <BarChartIcon sx={{ fontSize: 32, color: '#f59e0b', mb: 0.5 }} />
              <Typography variant="h4" fontWeight={700}>{summaryStats.totalPositions}</Typography>
              <Typography variant="caption" color="text.secondary">Positions Contested</Typography>
            </Paper>
          </Box>
        )}

        {currentPos && (
          <Paper elevation={0} sx={{ p: 3, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
              <Typography variant="h6" fontWeight={700}>{currentPos.label}</Typography>
            </Box>

            {tie && !hasOpenRunoff && (
              <Alert severity="warning" icon={<ReplayIcon />} sx={{ mb: 3, borderRadius: 1 }}
                action={<Button color="warning" variant="contained" size="small" onClick={openRunoffDialog}>Start Runoff</Button>}>
                {tie.tied_candidates.length} candidates are tied at {tie.tied_candidates[0]?.vote_count} vote(s) in the latest
                round. Start a runoff to break the tie.
              </Alert>
            )}

            {posRounds.map((round) => (
              <RoundBlock key={round.round_number} round={round} announceWinners={announceWinners} onClose={handleCloseRunoff} />
            ))}

            {!announceWinners && (
              <Alert severity="info" sx={{ mt: 1, borderRadius: 1 }}>
                Winners will be announced by the election officer.
              </Alert>
            )}
          </Paper>
        )}

        {filteredPositions.length > 1 && (
          <MobileStepper
            variant="dots" steps={filteredPositions.length} position="static" activeStep={activeStep}
            sx={{ bgcolor: 'transparent', justifyContent: 'center', '& .MuiMobileStepper-dot': { mx: 0.5 } }}
            nextButton={<Button size="small" onClick={() => setActiveStep((s) => Math.min(s + 1, filteredPositions.length - 1))} disabled={activeStep === filteredPositions.length - 1}>Next <KeyboardArrowRight /></Button>}
            backButton={<Button size="small" onClick={() => setActiveStep((s) => Math.max(s - 1, 0))} disabled={activeStep === 0}><KeyboardArrowLeft /> Prev</Button>}
          />
        )}

        <Dialog open={runoffDialog.open} onClose={() => setRunoffDialog({ open: false, tie: null })} maxWidth="xs" fullWidth>
          <DialogTitle>Start Runoff — {currentPos?.label}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Only the selected candidates will appear on the runoff ballot. Set when voting should close.
            </Typography>
            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>Candidates</Typography>
            <Box mb={2}>
              {(runoffDialog.tie?.tied_candidates || []).map((c) => (
                <FormControlLabel key={c.id}
                  control={<Checkbox checked={selectedCandidateIds.includes(c.id)} onChange={() => toggleCandidate(c.id)} />}
                  label={`${c.fullname} — ${c.vote_count} vote(s)`} />
              ))}
            </Box>
            <TextField fullWidth type="datetime-local" label="Runoff End Time" value={endTime}
              onChange={(e) => setEndTime(e.target.value)} InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date().toISOString().slice(0, 16) }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRunoffDialog({ open: false, tie: null })}>Cancel</Button>
            <Button variant="contained" color="warning" onClick={handleCreateRunoff}
              disabled={!endTime || selectedCandidateIds.length < 2}>
              Start Runoff
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ErrorBoundary>
  );
};

export default Results;
