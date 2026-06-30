import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, LinearProgress, Avatar, Container, Divider,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import BlockIcon from '@mui/icons-material/Block';
import PersonIcon from '@mui/icons-material/Person';
import api from '../services/api';

const BANNER_COLORS = ['#059669', '#0891b2', '#7c3aed', '#d97706', '#dc2626', '#2563eb', '#db2777', '#65a30d'];

const VerifiedVotes = () => {
  const [positions, setPositions] = useState([]);
  const [rejected, setRejected] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/votes/verified/public')
      .then((res) => {
        const d = res.data.data || {};
        setPositions(Array.isArray(d.positions) ? d.positions : []);
        setRejected(d.rejected || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalVotes = positions.reduce((s, p) => s + p.total_votes, 0);

  return (
    <Box>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 3,
          background: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
          p: { xs: 3, sm: 5 },
          mb: 4,
          textAlign: 'center',
        }}
      >
        <Box sx={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
        <Box sx={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)' }} />
        <VerifiedIcon sx={{ fontSize: 56, color: 'rgba(255,255,255,0.9)', mb: 1.5 }} />
        <Typography variant="h4" fontWeight={800} color="white" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Verified Election Results
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.75)', maxWidth: 500, mx: 'auto', mt: 1 }}>
          Official public record of verified votes &mdash; transparent and tamper-proof
        </Typography>
      </Box>

      {loading ? (
        <Box textAlign="center" py={6}>
          <HowToVoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">Loading results...</Typography>
        </Box>
      ) : positions.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
          <Box sx={{ width: 80, height: 80, mx: 'auto', mb: 2, borderRadius: '50%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HowToVoteIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
          </Box>
          <Typography variant="h6" fontWeight={600} color="text.secondary" mb={1}>
            No verified results yet
          </Typography>
          <Typography variant="body2" color="text.disabled" maxWidth={400} mx="auto">
            Verified results will appear here once the election officer reviews and verifies the submitted votes.
          </Typography>
        </Paper>
      ) : (
        <Box>
          <Box display="flex" gap={2} mb={4} flexWrap="wrap">
            <Paper elevation={0} sx={{
              flex: 1, minWidth: 180, p: 3, borderRadius: 2.5,
              border: '1px solid', borderColor: 'divider',
              position: 'relative', overflow: 'hidden',
            }}>
              <Box sx={{ position: 'absolute', top: -12, right: -12, width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(5,150,105,0.08)' }} />
              <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(5,150,105,0.1)', display: 'flex' }}>
                  <VerifiedIcon sx={{ fontSize: 18, color: '#059669' }} />
                </Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>Verified</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700} color="#059669">{totalVotes}</Typography>
              <Typography variant="caption" color="text.disabled">total verified votes cast</Typography>
            </Paper>
            <Paper elevation={0} sx={{
              flex: 1, minWidth: 180, p: 3, borderRadius: 2.5,
              border: '1px solid', borderColor: 'divider',
              position: 'relative', overflow: 'hidden',
            }}>
              <Box sx={{ position: 'absolute', top: -12, right: -12, width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(220,38,38,0.08)' }} />
              <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(220,38,38,0.1)', display: 'flex' }}>
                  <BlockIcon sx={{ fontSize: 18, color: '#dc2626' }} />
                </Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>Rejected</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700} color="#dc2626">{rejected}</Typography>
              <Typography variant="caption" color="text.disabled">votes marked as invalid</Typography>
            </Paper>
          </Box>

          {positions.map((pos, posIdx) => {
            const barColor = BANNER_COLORS[posIdx % BANNER_COLORS.length];

            return (
              <Paper key={pos.position_id} elevation={0} sx={{
                p: 3, mb: 2.5, borderRadius: 2.5,
                border: '1px solid', borderColor: 'divider',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
              }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                  <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                    {pos.position_name}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ px: 1.5, py: 0.25, borderRadius: 1, bgcolor: `${barColor}15` }}>
                      <Typography variant="caption" fontWeight={600} sx={{ color: barColor }}>
                        {pos.total_votes} vote{pos.total_votes !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Divider sx={{ mb: 2.5 }} />
                {pos.candidates.map((c, i) => {
                  const pct = pos.total_votes > 0 ? (c.vote_count / pos.total_votes) * 100 : 0;

                  return (
                    <Box key={i} mb={i < pos.candidates.length - 1 ? 2 : 0}>
                      <Box display="flex" alignItems="center" gap={1.5} mb={0.75}>
                        <Avatar src={c.photo ? `http://localhost:5000/uploads/${c.photo}` : undefined}
                          sx={{ width: 36, height: 36, bgcolor: 'action.hover' }}>
                          {!c.photo && <PersonIcon sx={{ fontSize: 18 }} />}
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {c.fullname}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                          {c.vote_count}
                          <Typography variant="caption" color="text.disabled" component="span" sx={{ ml: 0.5 }}>
                            ({pct.toFixed(1)}%)
                          </Typography>
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pct}
                        sx={{
                          height: 7, borderRadius: 4, bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 4 },
                        }} />
                    </Box>
                  );
                })}
              </Paper>
            );
          })}

          <Box textAlign="center" mt={4} mb={2}>
            <Divider sx={{ mb: 2.5 }} />
            <Typography variant="caption" color="text.disabled">
              Results last updated &middot; {new Date().toLocaleString()}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default VerifiedVotes;
