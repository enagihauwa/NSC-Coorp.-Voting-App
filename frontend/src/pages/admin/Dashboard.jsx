import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Grid, Typography, Paper, LinearProgress, Chip, Avatar, Collapse,
  IconButton,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import { BarChartComponent } from '../../components/ResultsChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import { fetchDashboard } from '../../redux/adminSlice';
import { fetchResults } from '../../redux/resultSlice';
import { subscribeToAdminVotes } from '../../services/socket';

const maskStaffNo = (s) => s ? s.slice(0, 3) + 'XXX' : s;

const statCards = [
  { icon: PeopleIcon, label: 'Total Members', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { icon: HowToVoteIcon, label: 'Votes Cast', color: 'primary.main', bg: 'rgba(22,163,74,0.1)' },
  { icon: PendingActionsIcon, label: 'Pending Votes', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { icon: TrendingUpIcon, label: 'Turnout', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', suffix: '%' },
];

const Dashboard = () => {
  const dispatch = useDispatch();
  const { stats, loading } = useSelector((s) => s.admin);
  const { results } = useSelector((s) => s.results);
  const { token } = useSelector((s) => s.auth);
  const [expandedVoter, setExpandedVoter] = useState(null);

  useEffect(() => { dispatch(fetchDashboard()); dispatch(fetchResults()); }, [dispatch]);

  useEffect(() => {
    if (!token) return undefined;
    return subscribeToAdminVotes(token, (event) => {
      if (event === 'results:updated' || event === 'vote:pending:new' || event === 'vote:status:changed') {
        dispatch(fetchDashboard());
        dispatch(fetchResults());
      }
    });
  }, [dispatch, token]);

  const d = stats?.members || {};
  const totalMembers = d.total || 0;
  const totalVotes = d.voted || 0;
  const pendingVotes = d.pending || 0;
  const turnout = stats?.turnout_percentage || 0;
  const recentVotes = stats?.recent_votes || [];

  const statValues = [totalMembers, totalVotes, pendingVotes, turnout];

  const chartData = useMemo(() => {
    if (!Array.isArray(results)) return [];
    return results.map((r) => ({ name: r?.position_name, votes: r?.total_votes || 0 }));
  }, [results]);

  const groupedVoters = useMemo(() => {
    const map = {};
    recentVotes.forEach((v) => {
      const key = v.staff_number;
      if (!map[key]) {
        map[key] = {
          staff_number: v.staff_number,
          member_name: v.member_name,
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
    return Object.values(map);
  }, [recentVotes]);

  if (loading && !stats) return <LoadingSpinner message="Loading dashboard..." />;

  return (
    <ErrorBoundary>
      <Box>
        <Box mb={4}>
          <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">Election overview and real-time statistics</Typography>
        </Box>

        <Grid container spacing={2} mb={4}>
          {statCards.map((item, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: item.bg, border: '1px solid', borderColor: 'divider' }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box sx={{ bgcolor: item.color, borderRadius: 1.5, p: 1, display: 'flex' }}>
                    <item.icon sx={{ fontSize: 20, color: '#fff' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>{item.label}</Typography>
                    <Typography variant="h5" fontWeight={700} color={item.color}>
                      {loading ? '...' : `${statValues[i]}${item.suffix || ''}`}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Votes per Position</Typography>
              {chartData.length > 0 ? (
                <BarChartComponent data={chartData} xKey="name" bars={[{ dataKey: 'votes', name: 'Votes' }]} height={280} />
              ) : (
                <Typography color="text.secondary" textAlign="center" py={4}>No voting data yet</Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={600} mb={3}>Election Progress</Typography>
              <Box mb={3}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">Turnout</Typography>
                  <Typography variant="body2" fontWeight={600} color="primary.main">{turnout}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={turnout} sx={{ height: 10, borderRadius: 5, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 5 } }} />
              </Box>
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">Voter Participation</Typography>
                  <Typography variant="body2" fontWeight={600}>{totalVotes} / {totalMembers}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={totalMembers > 0 ? (totalVotes / totalMembers) * 100 : 0} sx={{ height: 10, borderRadius: 5, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6', borderRadius: 5 } }} />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <AccessTimeIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={600}>Recent Voters</Typography>
          </Box>
          {groupedVoters.length > 0 ? (
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ position: 'absolute', left: 27, top: 0, bottom: 0, width: 2, bgcolor: 'divider' }} />
              {groupedVoters.map((voter, idx) => {
                const latest = voter.votes.reduce((a, b) =>
                  new Date(a.created_at) > new Date(b.created_at) ? a : b
                );
                const timeAgo = getTimeAgo(new Date(latest.created_at));
                const expanded = expandedVoter === idx;

                return (
                  <Box key={voter.staff_number} sx={{ position: 'relative', ml: 0, mb: 2 }}>
                    <Box display="flex" alignItems="flex-start" gap={2}>
                      <Box sx={{ position: 'relative', zIndex: 1, mt: 0.5 }}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: 16, fontWeight: 700 }}>
                          {voter.member_name?.charAt(0) || <PersonIcon />}
                        </Avatar>
                      </Box>
                      <Paper
                        elevation={0}
                        sx={{
                          flex: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                          transition: 'box-shadow 0.2s', cursor: 'pointer',
                          '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
                        }}
                        onClick={() => setExpandedVoter(expanded ? null : idx)}
                      >
                        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>{voter.member_name}</Typography>
                            <Box display="flex" alignItems="center" gap={1} mt={0.25}>
                              <Typography variant="caption" color="text.secondary" fontFamily="monospace">{maskStaffNo(voter.staff_number)}</Typography>
                              <Chip label={`${voter.votes.length} position${voter.votes.length > 1 ? 's' : ''}`} size="small"
                                sx={{ height: 20, fontSize: 11, bgcolor: 'rgba(22,163,74,0.08)', color: 'primary.main', fontWeight: 600 }} />
                              <Typography variant="caption" color="text.disabled">{timeAgo}</Typography>
                            </Box>
                          </Box>
                          <IconButton size="small" sx={{ color: 'text.secondary' }}>
                            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </Box>
                        <Collapse in={expanded} timeout="auto" unmountOnExit>
                          <Box sx={{ pb: 2, px: 2, borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
                            {voter.votes.map((vote) => {
                              const voteStatus = vote.status || 'pending';
                              const statusColor = voteStatus === 'verified' ? 'primary.main' : voteStatus === 'rejected' ? '#dc2626' : '#f59e0b';
                              return (
                                <Box key={vote.id} display="flex" alignItems="center" gap={1.5} py={0.75}>
                                  <CheckCircleIcon sx={{ fontSize: 16, color: statusColor }} />
                                  <Box flex={1}>
                                    <Typography variant="body2" fontWeight={500}>{vote.position_name}</Typography>
                                  </Box>
                                  <Chip label={voteStatus} size="small" variant="outlined"
                                    sx={{ height: 20, fontSize: 10, fontWeight: 600, textTransform: 'capitalize',
                                      color: statusColor, borderColor: statusColor }} />
                                  <Typography variant="caption" color="text.disabled">
                                    {new Date(vote.created_at).toLocaleTimeString()}
                                  </Typography>
                                </Box>
                              );
                            })}
                          </Box>
                        </Collapse>
                      </Paper>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
              <HowToVoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No votes recorded yet</Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

const getTimeAgo = (date) => {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default Dashboard;