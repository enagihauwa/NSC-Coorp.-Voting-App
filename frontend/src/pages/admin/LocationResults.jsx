import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Paper, Accordion, AccordionSummary, AccordionDetails,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BarChartIcon from '@mui/icons-material/BarChart';
import { fetchLocationResults } from '../../redux/resultSlice';
import { BarChartComponent, PieChartComponent } from '../../components/ResultsChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ErrorBoundary from '../../components/ErrorBoundary';
import { ELECTION_POSITIONS, POSITION_LABELS } from '../../utils/constants';
import { subscribeToAdminVotes } from '../../services/socket';

const LocationResults = () => {
  const dispatch = useDispatch();
  const { locationResults, loading } = useSelector((state) => state.results);
  const { token } = useSelector((state) => state.auth);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    dispatch(fetchLocationResults());
  }, [dispatch]);

  useEffect(() => {
    if (!token) return undefined;
    return subscribeToAdminVotes(token, (event) => {
      if (event === 'results:updated') dispatch(fetchLocationResults());
    });
  }, [dispatch, token]);

  const locations = useMemo(() => {
    if (!locationResults) return [];
    if (Array.isArray(locationResults)) return locationResults;
    const data = locationResults.data || locationResults;
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') {
      return Object.entries(data).map(([location, info]) => ({
        location,
        ...info,
      }));
    }
    return [];
  }, [locationResults]);

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const hasData = locations.length > 0;

  if (loading && !hasData) return <LoadingSpinner message="Loading location results..." />;

  return (
    <ErrorBoundary>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Location Results</Typography>
            <Typography variant="body2" color="text.secondary">View election results breakdown by location</Typography>
          </Box>
        </Box>

        {!hasData ? (
          <EmptyState icon={LocationOnIcon} message="No location results available" />
        ) : (
          locations.map((loc, idx) => {
            const positionResults = loc.results || loc.positions || loc.votes || [];
            const totalVotes = loc.totalVotes || loc.total_votes || 0;

            const chartData = (positionResults.length > 0 ? positionResults : ELECTION_POSITIONS.map((pos) => ({
              name: pos.label,
              value: 0,
            }))).slice(0, 10);

            return (
              <Accordion
                key={loc.location || loc._id || idx}
                expanded={expanded === idx}
                onChange={handleAccordionChange(idx)}
                elevation={0}
                sx={{
                  mb: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px !important',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <LocationOnIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      {loc.location || 'Unknown Location'}
                    </Typography>
                    <Chip label={`${totalVotes} vote${totalVotes !== 1 ? 's' : ''}`} size="small"
                      sx={{ bgcolor: 'rgba(22, 163, 74, 0.1)', color: 'primary.main', fontWeight: 600 }} />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {totalVotes > 0 && (
                    <Box mb={3}>
                      <Typography variant="subtitle2" fontWeight={600} mb={2}>Vote Distribution</Typography>
                      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
                        <BarChartComponent
                          data={chartData.map((d) => ({
                            name: POSITION_LABELS[d.position] || d.position || d.name || 'Unknown',
                            votes: d.votes || d.totalVotes || d.value || 0,
                          }))}
                          xKey="name" bars={[{ dataKey: 'votes', name: 'Votes' }]} height={250} />
                        <PieChartComponent
                          data={chartData.map((d) => ({
                            name: POSITION_LABELS[d.position] || d.position || d.name || 'Unknown',
                            value: d.votes || d.totalVotes || d.value || 0,
                          }))}
                          dataKey="value" nameKey="name" height={250} />
                      </Box>
                    </Box>
                  )}

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Position</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Candidate</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Votes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(Array.isArray(positionResults) ? positionResults : []).length > 0 ? (
                          positionResults.map((item, i) => {
                            const candidates = item.candidates || [];
                            if (candidates.length === 0) {
                              return (
                                <TableRow key={i}>
                                  <TableCell>{POSITION_LABELS[item.position] || item.position || item.name}</TableCell>
                                  <TableCell colSpan={2} align="center">
                                    <Typography variant="caption" color="text.secondary">No data</Typography>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            return candidates.map((cand, ci) => (
                              <TableRow key={`${i}-${ci}`}>
                                {ci === 0 && (
                                  <TableCell rowSpan={candidates.length}>
                                    {POSITION_LABELS[item.position] || item.position || item.name}
                                  </TableCell>
                                )}
                                <TableCell>{cand.fullname || cand.name || 'Unknown'}</TableCell>
                                <TableCell align="right">{cand.votes || cand.voteCount || 0}</TableCell>
                              </TableRow>
                            ));
                          })
                        ) : (
                          ELECTION_POSITIONS.map((pos) => (
                            <TableRow key={pos.id}>
                              <TableCell>{pos.label}</TableCell>
                              <TableCell colSpan={2} align="center">
                                <Typography variant="caption" color="text.secondary">No candidates</Typography>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          })
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default LocationResults;
