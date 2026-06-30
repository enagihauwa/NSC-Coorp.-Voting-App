import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Button, Paper, Avatar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, LinearProgress, Chip, IconButton, MobileStepper, Alert,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonIcon from '@mui/icons-material/Person';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import GroupsIcon from '@mui/icons-material/Groups';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { fetchResults, fetchSummary } from '../../redux/resultSlice';
import { BarChartComponent } from '../../components/ResultsChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ErrorBoundary from '../../components/ErrorBoundary';
import { ELECTION_POSITIONS } from '../../utils/constants';

const Results = () => {
  const dispatch = useDispatch();
  const { results, loading } = useSelector((s) => s.results);
  const [activeStep, setActiveStep] = useState(0);
  const [announceWinners, setAnnounceWinners] = useState(false);

  useEffect(() => { dispatch(fetchResults()); dispatch(fetchSummary()); }, [dispatch]);

  useEffect(() => {
    api.get('/settings').then((res) => {
      const data = Array.isArray(res.data.data) ? res.data.data : [];
      const announceSetting = data.find((s) => s.key === 'announce_winners');
      if (announceSetting) setAnnounceWinners(announceSetting.value === 'true');
    }).catch(() => {});
  }, []);

  const positionsData = useMemo(() => Array.isArray(results) ? results : [], [results]);

  const getPosition = (posId) => positionsData.find((r) => parseInt(r.position_id, 10) === posId);

  const filteredPositions = useMemo(() => {
    return ELECTION_POSITIONS.filter((pos) => {
      const posResult = getPosition(pos.id);
      const candidates = posResult?.candidates || [];
      return candidates.length > 0 || posResult;
    });
  }, [positionsData]);

  const currentPos = filteredPositions[activeStep];
  const posResult = currentPos ? getPosition(currentPos.id) : null;
  const candidates = posResult?.candidates || [];
  const total = posResult?.total_votes || 0;
  const maxVotes = Math.max(...candidates.map((c) => c.vote_count || 0), 1);
  const winner = candidates.find((c) => (c.vote_count || 0) === maxVotes);
  const chartData = candidates.map((c) => ({ name: c.fullname, value: c.vote_count || 0 }));

  useEffect(() => {
    if (activeStep >= filteredPositions.length) setActiveStep(0);
  }, [filteredPositions.length, activeStep]);

  const summaryStats = useMemo(() => {
    const totalVotes = positionsData.reduce((sum, p) => sum + (p.total_votes || 0), 0);
    const totalCandidates = positionsData.reduce((sum, p) => sum + (p.candidates?.length || 0), 0);
    const totalPositions = filteredPositions.length;
    return { totalVotes, totalCandidates, totalPositions };
  }, [positionsData, filteredPositions]);

  const handlePrint = () => window.print();

  if (loading && !positionsData.length) return <LoadingSpinner message="Loading results..." />;

  return (
    <ErrorBoundary>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2} className="no-print">
          <Box>
            <Typography variant="h5" fontWeight={700}>Election Results</Typography>
            <Typography variant="body2" color="text.secondary">Real-time results and vote breakdowns</Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Button variant="outlined" startIcon={<FileDownloadIcon />}
              onClick={() => Swal.fire({ icon: 'info', title: 'Export', text: 'Export feature coming soon', confirmButtonColor: '#16a34a' })}>Export</Button>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>Print</Button>
          </Box>
        </Box>

        {!filteredPositions.length && !loading && <EmptyState icon={BarChartIcon} message="No results available yet" />}

        {summaryStats.totalPositions > 0 && (
          <Box display="flex" gap={2} mb={3} flexWrap="wrap">
            <Paper elevation={0} sx={{ flex: 1, minWidth: 140, p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
              <HowToVoteIcon sx={{ fontSize: 32, color: '#16a34a', mb: 0.5 }} />
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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" fontWeight={700}>{currentPos.label}</Typography>
              <Chip label={`${total} vote${total !== 1 ? 's' : ''}`} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(22,163,74,0.1)', color: '#16a34a' }} />
            </Box>

            {candidates.map((c, idx) => {
              const votes = c.vote_count || 0;
              const pct = total > 0 ? (votes / total) * 100 : 0;
              const isWinner = announceWinners && winner && c.fullname === winner.fullname;

              return (
                <Box key={idx} mb={2.5}>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Avatar src={c.photo ? (c.photo.startsWith('http') ? c.photo : `http://localhost:5000/uploads/${c.photo}`) : undefined}
                      sx={{ width: 44, height: 44, border: isWinner ? '2px solid #f59e0b' : '2px solid transparent' }}>
                      {!c.photo && <PersonIcon />}
                    </Avatar>
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Typography variant="subtitle2" fontWeight={600}>{c.fullname}</Typography>
                        {isWinner && <Chip icon={<EmojiEventsIcon sx={{ fontSize: 14 }} />} label="Winner" size="small"
                          sx={{ bgcolor: 'rgba(234,179,8,0.12)', color: '#ca8a04', fontWeight: 600, height: 24 }} />}
                      </Box>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box flex={1}>
                          <LinearProgress variant="determinate" value={pct}
                            sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover',
                              '& .MuiLinearProgress-bar': { bgcolor: isWinner ? '#22c55e' : '#3b82f6', borderRadius: 4 } }} />
                        </Box>
                        <Typography variant="body2" fontWeight={600} minWidth={80} textAlign="right">
                          {votes} ({pct.toFixed(1)}%)
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              );
            })}

            {!announceWinners && total > 0 && (
              <Alert severity="info" sx={{ mt: 2, borderRadius: 1 }}>
                Winners will be announced by the election officer.
              </Alert>
            )}

            {chartData.length > 1 && (
              <Box mt={3}>
                <BarChartComponent data={chartData} xKey="name" bars={[{ dataKey: 'value', fill: '#22c55e', name: 'Votes' }]} height={220} title="Vote Distribution" />
              </Box>
            )}
          </Paper>
        )}

        {filteredPositions.length > 1 && (
          <MobileStepper
            variant="dots"
            steps={filteredPositions.length}
            position="static"
            activeStep={activeStep}
            sx={{ bgcolor: 'transparent', justifyContent: 'center', '& .MuiMobileStepper-dot': { mx: 0.5 } }}
            nextButton={
              <Button size="small" onClick={() => setActiveStep((s) => Math.min(s + 1, filteredPositions.length - 1))}
                disabled={activeStep === filteredPositions.length - 1}>
                Next <KeyboardArrowRight />
              </Button>
            }
            backButton={
              <Button size="small" onClick={() => setActiveStep((s) => Math.max(s - 1, 0))}
                disabled={activeStep === 0}>
                <KeyboardArrowLeft /> Prev
              </Button>
            }
          />
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default Results;
