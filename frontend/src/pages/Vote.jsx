import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Button, Stepper, Step, StepLabel,
  Paper, Alert, Container, LinearProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReviewIcon from '@mui/icons-material/Visibility';
import CandidateCard from '../components/CandidateCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import useIsMobile from '../hooks/useIsMobile';
import { fetchCandidates } from '../redux/candidateSlice';
import { ELECTION_POSITIONS, STORAGE_KEYS } from '../utils/constants';

const Vote = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isMobile = useIsMobile();
  const { candidates, loading, error } = useSelector((state) => state.candidates);
  const [selections, setSelections] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VOTE_SELECTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const restored = {};
        for (const [posId, data] of Object.entries(parsed)) {
          restored[posId] = String(data.candidate?.id ?? data.candidate ?? '');
        }
        return restored;
      }
    } catch {}
    return {};
  });
  const [activeStep, setActiveStep] = useState(0);
  const hasRestored = useRef(false);

  const voteData = useMemo(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VOTE_DATA);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }, []);

  useEffect(() => {
    if (!voteData) { navigate('/', { replace: true }); return; }
    dispatch(fetchCandidates({ active: true, force: true }));
  }, [dispatch, navigate, voteData]);

  const candidatesByPosition = useMemo(() => {
    const grouped = {};
    ELECTION_POSITIONS.forEach((pos) => {
      grouped[pos.id] = (candidates || []).filter(
        (c) => parseInt(c.position_id, 10) === pos.id && c.status !== 'inactive'
      );
    });
    return grouped;
  }, [candidates]);

  const activePositions = useMemo(
    () => ELECTION_POSITIONS.filter((p) => (candidatesByPosition[p.id] || []).length > 0),
    [candidatesByPosition]
  );

  useEffect(() => {
    if (!hasRestored.current && activePositions.length > 0) {
      const firstUnfilled = activePositions.findIndex((p) => !selections[p.id]);
      if (firstUnfilled > 0) {
        setActiveStep(firstUnfilled);
      } else if (firstUnfilled === -1) {
        setActiveStep(activePositions.length - 1);
      }
      hasRestored.current = true;
    }
  }, [activePositions, selections]);

  const currentPosition = activePositions[activeStep];
  const isLastStep = activeStep === activePositions.length - 1;
  const totalSteps = activePositions.length;
  const completedCount = Object.keys(selections).length;
  const progress = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;
  const isSelected = currentPosition ? !!selections[currentPosition.id] : false;
  const positionCandidates = currentPosition ? (candidatesByPosition[currentPosition.id] || []) : [];

  const handleSelect = useCallback((positionId) => (candidateId) => {
    setSelections((prev) => ({ ...prev, [positionId]: candidateId }));
  }, []);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      const selectionsWithDetails = {};
      Object.entries(selections).forEach(([posId, candidateId]) => {
        const candidate = candidates.find((c) => parseInt(c.id, 10) === parseInt(candidateId, 10));
        const position = ELECTION_POSITIONS.find((p) => p.id === parseInt(posId, 10));
        selectionsWithDetails[posId] = { position: position?.label || posId, candidate };
      });
      localStorage.setItem(STORAGE_KEYS.VOTE_SELECTIONS, JSON.stringify(selectionsWithDetails));
      navigate('/confirmation');
    } else {
      setActiveStep((prev) => prev + 1);
    }
  }, [isLastStep, selections, candidates, navigate]);

  const handleBack = useCallback(() => {
    if (activeStep === 0) {
      navigate('/');
    } else {
      setActiveStep((prev) => prev - 1);
    }
  }, [activeStep, navigate]);

  if (!voteData) return null;

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <LoadingSpinner message="Loading candidates..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (activePositions.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" mb={3}>
            No candidates are available for voting at this time.
          </Typography>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ borderColor: 'divider' }}>
            Go Back
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <ErrorBoundary>
      <Box py={{ xs: 2, sm: 4 }} sx={{ pb: { xs: 'calc(16px + env(safe-area-inset-bottom))', sm: 4 } }}>
        <Box textAlign="center" mb={3}>
          <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
            Cast Your Vote
          </Typography>
          <Typography variant="body1" color="text.secondary" mt={0.5}>
            Welcome, {voteData.fullname || voteData.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Staff No: {voteData.staffNumber || voteData.staff_number}
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1} flexWrap="wrap" gap={1}>
            <Typography variant="body2" fontWeight={600}>Progress</Typography>
            <Typography variant="body2" fontWeight={600} color="primary.main">
              {completedCount} of {totalSteps} positions filled
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress}
            sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 } }} />
        </Paper>

        {!isMobile ? (
          <Stepper activeStep={activeStep} orientation="horizontal" alternativeLabel
            sx={{ mb: 4, '& .MuiStepLabel-root .Mui-completed': { color: 'primary.main' }, '& .MuiStepLabel-root .Mui-active': { color: 'primary.main' }, overflowX: 'auto' }}>
            {activePositions.map((pos) => (
              <Step key={pos.id}>
                <StepLabel>{pos.label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        ) : (
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Step {activeStep + 1} of {totalSteps}
            </Typography>
            <Typography variant="body2" fontWeight={700} color="primary.main">
              {currentPosition?.label}
            </Typography>
          </Paper>
        )}

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5} flexWrap="wrap" gap={1}>
            <Typography variant="overline" color="text.secondary" fontWeight={600} letterSpacing={1}>
              {!isMobile ? `Step ${activeStep + 1} of ${totalSteps}` : 'Select one candidate'}
            </Typography>
            <Typography variant="caption" sx={{ color: isSelected ? 'primary.main' : 'text.disabled', fontWeight: 600 }}>
              {isSelected ? (
                <Box component="span" display="inline-flex" alignItems="center" gap={0.5}>
                  <CheckCircleIcon sx={{ fontSize: 14 }} /> Selected
                </Box>
              ) : 'Select one candidate'}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={1} mb={3}>
            <Box sx={{ width: 4, height: 24, borderRadius: 2, bgcolor: 'primary.main', flexShrink: 0 }} />
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              {currentPosition.label}
            </Typography>
          </Box>

          {positionCandidates.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No candidates available for this position.
            </Typography>
          ) : (
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
              {positionCandidates.map((candidate) => (
                <CandidateCard key={candidate._id || candidate.id} candidate={candidate}
                  position={currentPosition.label}
                  selected={(selections[currentPosition.id] === candidate._id || selections[currentPosition.id] === candidate.id)}
                  onSelect={handleSelect(currentPosition.id)} />
              ))}
            </Box>
          )}
        </Paper>

        <Box display="flex" flexDirection={{ xs: 'column-reverse', sm: 'row' }} justifyContent="space-between" gap={2}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />}
            onClick={handleBack} fullWidth={isMobile}
            sx={{ borderColor: 'divider', px: 3, py: 1.25, minHeight: 44 }}>
            {activeStep === 0 ? 'Go Back' : 'Previous'}
          </Button>

          <Button variant="contained" size="large"
            endIcon={isLastStep ? <ReviewIcon /> : <ArrowForwardIcon />}
            disabled={!isSelected} fullWidth={isMobile}
            onClick={handleNext}
            sx={{ px: 4, py: 1.25, minHeight: 44, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, fontWeight: 600 }}>
            {isLastStep ? 'Review Vote' : 'Next'}
          </Button>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default Vote;
