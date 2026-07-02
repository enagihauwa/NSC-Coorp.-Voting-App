import { useEffect, useState, useCallback, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Paper, LinearProgress, Avatar, Divider, Chip, Stack, Button,
  alpha, useTheme, Link,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import BlockIcon from '@mui/icons-material/Block';
import PersonIcon from '@mui/icons-material/Person';
import ReplayIcon from '@mui/icons-material/Replay';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SyncIcon from '@mui/icons-material/Sync';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import api from '../services/api';
import { resolvePhotoUrl } from '../utils/constants';
import { brandColors, chartSeriesColors } from '../theme/tokens';
import useCountdown from '../hooks/useCountdown';
import { subscribeToPublicResults } from '../services/socket';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';

const RunoffCountdown = ({ endTime }) => {
  const theme = useTheme();
  const c = useCountdown(endTime);
  const accent = theme.palette.warning.dark;
  const cells = [['D', c.days], ['H', c.hours], ['M', c.minutes], ['S', c.seconds]];

  return (
    <Box display="flex" gap={0.75} alignItems="center">
      {cells.map(([label, val]) => (
        <Box
          key={label}
          textAlign="center"
          sx={{
            minWidth: 34,
            px: 0.75,
            py: 0.5,
            borderRadius: 1.5,
            bgcolor: alpha(accent, 0.1),
            border: '1px solid',
            borderColor: alpha(accent, 0.2),
          }}
        >
          <Typography variant="body2" fontWeight={700} sx={{ color: accent, lineHeight: 1.1 }}>
            {String(val).padStart(2, '0')}
          </Typography>
          <Typography variant="caption" sx={{ color: accent, fontSize: 9, fontWeight: 600 }}>
            {label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const StatCard = ({ icon, label, value, color, hint }) => {
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(color, 0.03),
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(color, 0.1),
            color,
          }}
        >
          {icon}
        </Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h4" fontWeight={800} sx={{ color, fontSize: { xs: '1.75rem', sm: '2.25rem' }, lineHeight: 1.1 }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
          {hint}
        </Typography>
      )}
    </Paper>
  );
};

const CandidateBars = ({ round, barColor }) => {
  const theme = useTheme();
  const isRunoff = round.round_number > 1;
  const accent = isRunoff ? theme.palette.warning.dark : barColor;

  return (
    <>
      {round.candidates.map((c) => {
        const pct = round.total_votes > 0 ? (c.vote_count / round.total_votes) * 100 : 0;
        const isWinner = round.winner && round.winner.id === c.id;
        return (
          <Box key={c.id} mb={1.5}>
            <Box display="flex" alignItems="flex-start" gap={1.5} mb={0.75} flexWrap={{ xs: 'wrap', sm: 'nowrap' }}>
              <Avatar src={resolvePhotoUrl(c.photo)} sx={{ width: 36, height: 36, bgcolor: 'action.hover' }}>
                {!c.photo && <PersonIcon sx={{ fontSize: 18 }} />}
              </Avatar>
              <Box flex={1} minWidth={0}>
                <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
                  <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                    {c.fullname}
                  </Typography>
                  {isWinner && (
                    <Chip
                      icon={<EmojiEventsIcon sx={{ fontSize: '14px !important' }} />}
                      label="Leading"
                      size="small"
                      sx={{
                        height: 22,
                        fontWeight: 600,
                        bgcolor: alpha('#ca8a04', 0.12),
                        color: '#a16207',
                        '& .MuiChip-icon': { color: '#ca8a04' },
                      }}
                    />
                  )}
                </Box>
              </Box>
              <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                {c.vote_count}
                <Typography variant="caption" color="text.disabled" component="span" sx={{ ml: 0.5 }}>
                  ({pct.toFixed(1)}%)
                </Typography>
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: alpha(theme.palette.text.primary, 0.06),
                '& .MuiLinearProgress-bar': { bgcolor: accent, borderRadius: 4 },
              }}
            />
          </Box>
        );
      })}
    </>
  );
};

const RoundBlock = ({ round, barColor }) => {
  const theme = useTheme();
  const isRunoff = round.round_number > 1;
  const accent = isRunoff ? theme.palette.warning.dark : barColor;

  return (
    <Box
      sx={{
        mb: 2.5,
        pl: isRunoff ? 1.5 : 0,
        borderLeft: isRunoff ? `3px solid ${alpha(theme.palette.warning.main, 0.45)}` : 'none',
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={2}>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          {isRunoff && <ReplayIcon sx={{ fontSize: 18, color: accent }} />}
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: isRunoff ? accent : 'text.primary' }}>
            {round.label}
          </Typography>
          {round.is_open && (
            <Chip
              label="Runoff in progress"
              size="small"
              sx={{ fontWeight: 600, bgcolor: alpha(theme.palette.warning.main, 0.12), color: accent, height: 22 }}
            />
          )}
          {round.still_tied && !round.is_open && (
            <Chip label="Tied" size="small" sx={{ fontWeight: 600, bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main', height: 22 }} />
          )}
        </Box>
        {round.is_open && round.end_time ? (
          <RunoffCountdown endTime={round.end_time} />
        ) : (
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            {round.total_votes} vote{round.total_votes !== 1 ? 's' : ''}
          </Typography>
        )}
      </Box>

      <CandidateBars round={round} barColor={barColor} />
    </Box>
  );
};

const VerifiedVotes = () => {
  const theme = useTheme();
  const [positions, setPositions] = useState([]);
  const [rejected, setRejected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [electionTitle, setElectionTitle] = useState('');
  const liveTimerRef = useRef(null);

  const pulseLive = useCallback(() => {
    setIsLive(true);
    if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    liveTimerRef.current = setTimeout(() => setIsLive(false), 3000);
  }, []);

  const loadResults = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [roundsRes, verifiedRes, settingsRes] = await Promise.all([
        api.get('/runoffs/rounds'),
        api.get('/votes/verified/public').catch(() => null),
        api.get('/settings/public').catch(() => null),
      ]);
      setPositions(Array.isArray(roundsRes.data.data) ? roundsRes.data.data : []);
      if (verifiedRes) setRejected(verifiedRes.data?.data?.rejected || 0);
      if (settingsRes?.data?.data?.election_title) {
        setElectionTitle(settingsRes.data.data.election_title);
      }
      setLastUpdated(new Date());
    } catch {
      // keep previous data on refresh failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
    const unsubscribe = subscribeToPublicResults(() => {
      pulseLive();
      loadResults({ silent: true });
    });
    return () => {
      unsubscribe();
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    };
  }, [loadResults, pulseLive]);

  const totalVotes = positions.reduce((s, p) => {
    const initial = p.rounds?.[0];
    return s + (initial ? initial.total_votes : 0);
  }, 0);

  const activePositions = positions.filter((p) =>
    (p.rounds || []).some((r) => r.candidates.length > 0)
  );
  const hasResults = activePositions.length > 0;

  return (
    <ErrorBoundary>
      <Box py={{ xs: 1, sm: 2 }}>
        {/* Top navigation */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
          <Button
            component={RouterLink}
            to="/"
            size="small"
            startIcon={<ArrowBackIcon />}
            sx={{ fontWeight: 600, color: 'text.secondary' }}
          >
            Back to Voting
          </Button>
          <Stack direction="row" alignItems="center" spacing={1}>
            {isLive && (
              <Chip
                label="Live update"
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.success.main, 0.12),
                  color: 'success.dark',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.55 } },
                }}
              />
            )}
            {refreshing && (
              <Chip
                icon={<SyncIcon sx={{ fontSize: '16px !important', animation: 'spin 1s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />}
                label="Refreshing"
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Stack>
        </Stack>

        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 4 },
            mb: 3,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
            boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.05)}`,
          }}
        >
          <Box
            sx={{
              width: { xs: 64, sm: 72 },
              height: { xs: 64, sm: 72 },
              mx: 'auto',
              mb: 2,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${brandColors.deepBrand} 0%, ${brandColors.primary} 100%)`,
              boxShadow: `0 8px 24px ${alpha(brandColors.primary, 0.25)}`,
            }}
          >
            <VerifiedIcon sx={{ fontSize: { xs: 32, sm: 36 }, color: 'white' }} />
          </Box>
          <Typography variant="overline" color="primary.main" fontWeight={700} letterSpacing={2}>
            Public Record
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, fontSize: { xs: '1.4rem', sm: '1.85rem' } }}>
            Verified Election Results
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mt: 1 }}>
            Official tally of verified votes, updated in real time — including tie-breaker runoffs.
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
        </Paper>

        {loading ? (
          <LoadingSpinner message="Loading verified results..." />
        ) : !hasResults ? (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, sm: 6 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HowToVoteIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
            </Box>
            <Typography variant="h6" fontWeight={700} color="text.secondary" mb={1}>
              No verified results yet
            </Typography>
            <Typography variant="body2" color="text.disabled" maxWidth={420} mx="auto" mb={3}>
              Results will appear here once election officers review and verify submitted votes.
            </Typography>
            <Button component={RouterLink} to="/" variant="contained" startIcon={<HowToVoteIcon />}>
              Go to Voting Page
            </Button>
          </Paper>
        ) : (
          <>
            {/* Summary stats */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
              <StatCard
                icon={<VerifiedIcon sx={{ fontSize: 18 }} />}
                label="Verified"
                value={totalVotes}
                color={theme.palette.primary.main}
                hint="total verified votes cast"
              />
              <StatCard
                icon={<WorkspacesIcon sx={{ fontSize: 18 }} />}
                label="Positions"
                value={activePositions.length}
                color={theme.palette.info.main}
                hint="positions with tallies"
              />
              <StatCard
                icon={<BlockIcon sx={{ fontSize: 18 }} />}
                label="Rejected"
                value={rejected}
                color={theme.palette.error.main}
                hint="votes marked invalid"
              />
            </Stack>

            {/* Position results */}
            {activePositions.map((pos, posIdx) => {
              const barColor = chartSeriesColors[posIdx % chartSeriesColors.length];
              const rounds = (pos.rounds || []).filter((r) => r.candidates.length > 0);
              const latestRound = rounds[rounds.length - 1];
              const leadingWinner = latestRound?.winner;

              return (
                <Paper
                  key={pos.position_id}
                  elevation={0}
                  sx={{
                    p: { xs: 2, sm: 3 },
                    mb: 2.5,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: `0 2px 12px ${alpha(theme.palette.common.black, 0.04)}`,
                  }}
                >
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} flexWrap="wrap" mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1rem', sm: '1.15rem' } }}>
                        {pos.position_name}
                      </Typography>
                      {leadingWinner && !latestRound?.still_tied && (
                        <Box display="flex" alignItems="center" gap={0.75} mt={0.75}>
                          <EmojiEventsIcon sx={{ fontSize: 16, color: '#ca8a04' }} />
                          <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            Leading: <strong>{leadingWinner.fullname}</strong>
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Chip
                      label={`${latestRound?.total_votes || 0} votes`}
                      size="small"
                      sx={{ fontWeight: 600, bgcolor: alpha(barColor, 0.1), color: barColor }}
                    />
                  </Box>
                  <Divider sx={{ mb: 2.5 }} />
                  {rounds.map((round) => (
                    <RoundBlock
                      key={`${pos.position_id}-${round.round_number}`}
                      round={round}
                      barColor={barColor}
                    />
                  ))}
                </Paper>
              );
            })}

            <Box textAlign="center" mt={3} mb={1}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="caption" color="text.disabled">
                {lastUpdated
                  ? `Last updated · ${lastUpdated.toLocaleString()}`
                  : 'Results update automatically'}
              </Typography>
            </Box>
          </>
        )}

        <Box textAlign="center" mt={3}>
          <Typography variant="caption" color="text.secondary" display="block">
            &copy; {new Date().getFullYear()} Nigerian Shippers&apos; Council Cooperative Society
          </Typography>
          <Link component={RouterLink} to="/" variant="caption" sx={{ mt: 0.5, fontWeight: 500 }}>
            Return to voting
          </Link>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default VerifiedVotes;
