import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Button, Paper, Chip } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import useCountdown from '../hooks/useCountdown';
import { fetchActiveRunoffs } from '../redux/runoffSlice';
import { subscribeToPublicResults } from '../services/socket';

const CountdownRow = ({ endTime }) => {
  const c = useCountdown(endTime);
  const cells = [['Days', c.days], ['Hours', c.hours], ['Mins', c.minutes], ['Secs', c.seconds]];
  return (
    <Box display="flex" gap={1.5} justifyContent="center" mt={1.5}>
      {cells.map(([label, val]) => (
        <Box key={label} textAlign="center" sx={{ minWidth: 44 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#b45309', lineHeight: 1.2 }}>
            {String(val).padStart(2, '0')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{label}</Typography>
        </Box>
      ))}
    </Box>
  );
};

const RunoffItem = ({ runoff }) => {
  const navigate = useNavigate();
  const { expired } = useCountdown(runoff.end_time);

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2, p: 2.5, borderRadius: 2,
        border: '1px solid rgba(245,158,11,0.35)', bgcolor: 'rgba(245,158,11,0.06)',
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <ReplayIcon sx={{ color: '#b45309', fontSize: 22 }} />
          <Box>
            <Typography variant="body2" fontWeight={700}>
              Runoff in progress — {runoff.position_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tie-breaker between {runoff.candidates.map((c) => {
                let label = c.fullname;
                if (c.department) label += ` (${c.department})`;
                if (c.location) label += ` - ${c.location}`;
                return label;
              }).join(' & ')}
            </Typography>
          </Box>
        </Box>
        <Chip label={`Round ${runoff.round_number}`} size="small"
          sx={{ fontWeight: 600, bgcolor: 'rgba(245,158,11,0.15)', color: '#b45309' }} />
      </Box>

      <CountdownRow endTime={runoff.end_time} />

      <Box display="flex" justifyContent="center" mt={2}>
        <Button
          variant="contained"
          startIcon={<HowToVoteIcon />}
          disabled={expired}
          onClick={() => navigate(`/runoff/${runoff.id}`)}
          sx={{ bgcolor: '#b45309', '&:hover': { bgcolor: '#92400e' }, fontWeight: 600 }}
        >
          {expired ? 'Runoff ended' : 'Vote in Runoff'}
        </Button>
      </Box>
    </Paper>
  );
};

const RunoffBanner = () => {
  const dispatch = useDispatch();
  const { activeRunoffs } = useSelector((state) => state.runoffs);

  useEffect(() => {
    dispatch(fetchActiveRunoffs());
    const unsubscribe = subscribeToPublicResults(() => dispatch(fetchActiveRunoffs()));
    return unsubscribe;
  }, [dispatch]);

  if (!activeRunoffs || activeRunoffs.length === 0) return null;

  return (
    <Box mb={3}>
      {activeRunoffs.map((runoff) => (
        <RunoffItem key={runoff.id} runoff={runoff} />
      ))}
    </Box>
  );
};

export default RunoffBanner;
