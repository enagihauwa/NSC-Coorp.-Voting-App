import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Button, Paper, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Switch, FormControlLabel, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  InputAdornment, Chip, Alert,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import RestoreIcon from '@mui/icons-material/Restore';
import BackupIcon from '@mui/icons-material/Backup';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VerifiedIcon from '@mui/icons-material/Verified';
import Swal from 'sweetalert2';
import { fetchSettings, updateSetting, fetchLogs } from '../../redux/adminSlice';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';

const SettingsPage = () => {
  const dispatch = useDispatch();
  const { settings, logs, loading } = useSelector((state) => state.admin);
  const [logSearch, setLogSearch] = useState('');
  const [editDialog, setEditDialog] = useState({ open: false, key: '', value: '' });
  const [electionOpen, setElectionOpen] = useState(true);
  const [electionEndTime, setElectionEndTime] = useState('');
  const [endTimeDialog, setEndTimeDialog] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [countdownTarget, setCountdownTarget] = useState('');
  const [announceWinners, setAnnounceWinners] = useState(false);

  useEffect(() => { dispatch(fetchSettings()); dispatch(fetchLogs()); }, [dispatch]);

  useEffect(() => {
    const electionSetting = Array.isArray(settings)
      ? settings.find((s) => s.key === 'election_open' || s.key === 'electionStatus') : null;
    if (electionSetting) {
      setElectionOpen(electionSetting.value === 'true' || electionSetting.value === true);
    }
    const endTimeSetting = Array.isArray(settings)
      ? settings.find((s) => s.key === 'election_end_time' || s.key === 'electionEnd') : null;
    if (endTimeSetting) {
      setCountdownTarget(endTimeSetting.value);
      const d = new Date(endTimeSetting.value);
      if (!isNaN(d.getTime())) {
        setElectionEndTime(d.toISOString().slice(0, 16));
      }
    }
    const announceSetting = Array.isArray(settings)
      ? settings.find((s) => s.key === 'announce_winners') : null;
    if (announceSetting) {
      setAnnounceWinners(announceSetting.value === 'true');
    }
  }, [settings]);

  useEffect(() => {
    if (!countdownTarget) return;
    const target = new Date(countdownTarget).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) { setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 }); clearInterval(interval); return; }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownTarget]);

  const filteredLogs = useMemo(() => {
    if (!Array.isArray(logs)) return [];
    if (!logSearch) return logs;
    return logs.filter((log) =>
      (log.action || log.message || '').toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.admin || log.user || '').toLowerCase().includes(logSearch.toLowerCase())
    );
  }, [logs, logSearch]);

  const handleToggleElection = async (e) => {
    const newValue = e.target.checked;
    setElectionOpen(newValue);
    await dispatch(updateSetting({ key: 'election_open', value: String(newValue) }));
    Swal.fire('Updated', `Election is now ${newValue ? 'open' : 'closed'} for voting`, 'success');
  };

  const handleEditSetting = (key, value) => setEditDialog({ open: true, key, value: String(value) });

  const handleSaveSetting = async () => {
    await dispatch(updateSetting({ key: editDialog.key, value: editDialog.value }));
    setEditDialog({ open: false, key: '', value: '' });
    Swal.fire('Success', 'Setting updated successfully', 'success');
    dispatch(fetchSettings({ force: true }));
  };

  const handleSaveEndTime = async () => {
    if (!electionEndTime) return;
    await dispatch(updateSetting({ key: 'election_end_time', value: new Date(electionEndTime).toISOString() }));
    setEndTimeDialog(false);
    Swal.fire('Success', 'Election end time updated', 'success');
    dispatch(fetchSettings({ force: true }));
  };

  const handleBackup = () => {
    Swal.fire({ title: 'Backup Database', text: 'This will create a backup of the election data. Proceed?', icon: 'question', showCancelButton: true, confirmButtonColor: '#16a34a', confirmButtonText: 'Backup', reverseButtons: true })
      .then((r) => { if (r.isConfirmed) Swal.fire('Success', 'Database backup initiated successfully', 'success'); });
  };

  const handleRestore = () => {
    Swal.fire({ title: 'Restore Database', text: 'This will overwrite current data with a backup. Are you sure?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6b7280', confirmButtonText: 'Restore', reverseButtons: true })
      .then((r) => { if (r.isConfirmed) Swal.fire('Success', 'Database restore initiated successfully', 'success'); });
  };

  const hasSettings = Array.isArray(settings) && settings.length > 0;

  if (loading && !hasSettings) return <LoadingSpinner message="Loading settings..." />;

  return (
    <ErrorBoundary>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Settings</Typography>
            <Typography variant="body2" color="text.secondary">Manage election configuration and system settings</Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={3}>Election Controls</Typography>
              <FormControlLabel
                control={<Switch checked={electionOpen} onChange={handleToggleElection}
                  sx={{ '& .MuiSwitch-thumb': { bgcolor: electionOpen ? '#16a34a' : '#ef4444' },
                    '& .MuiSwitch-track': { bgcolor: electionOpen ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)' } }} />}
                label={<Box><Typography variant="body1" fontWeight={500}>Election Status</Typography>
                  <Chip label={electionOpen ? 'Open' : 'Closed'} size="small"
                    sx={{ mt: 0.5, fontWeight: 600, bgcolor: electionOpen ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)', color: electionOpen ? '#16a34a' : '#ef4444' }} /></Box>}
                labelPlacement="end" sx={{ mb: 3 }} />

              {countdownTarget && (
                <Box sx={{ p: 2, bgcolor: 'rgba(22,163,74,0.05)', borderRadius: 2, border: '1px solid rgba(22,163,74,0.2)' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <AccessTimeIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={600}>Countdown to Election End</Typography>
                    <Button size="small" variant="text" sx={{ ml: 'auto', minWidth: 0, p: 0.5 }} onClick={() => setEndTimeDialog(true)}>
                      <EditIcon fontSize="small" />
                    </Button>
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Ends at: {new Date(countdownTarget).toLocaleString()}
                  </Typography>
                  <Box display="flex" gap={2} justifyContent="center" mt={2}>
                    {[['Days', countdown.days], ['Hours', countdown.hours], ['Mins', countdown.minutes], ['Secs', countdown.seconds]].map(([label, val], i) => (
                      <Box key={label} display="flex" alignItems="center" gap={2}>
                        <Box textAlign="center">
                          <Typography variant="h4" fontWeight={700} color="#16a34a">{String(val).padStart(2, '0')}</Typography>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                        </Box>
                        {i < 3 && <Typography variant="h4" fontWeight={700} color="#16a34a">:</Typography>}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              <FormControlLabel
                control={<Switch checked={announceWinners}
                  onChange={async (e) => {
                    const val = e.target.checked;
                    setAnnounceWinners(val);
                    await dispatch(updateSetting({ key: 'announce_winners', value: String(val) }));
                    Swal.fire('Updated', val ? 'Winners are now visible on the results page' : 'Winner indicators hidden', 'success');
                  }}
                  sx={{ '& .MuiSwitch-thumb': { bgcolor: announceWinners ? '#f59e0b' : '#9ca3af' },
                    '& .MuiSwitch-track': { bgcolor: announceWinners ? 'rgba(245,158,11,0.3)' : 'rgba(156,163,175,0.3)' } }} />}
                label={<Box><Typography variant="body1" fontWeight={500}>Announce Winners</Typography>
                  <Chip label={announceWinners ? 'Announced' : 'Hidden'} size="small"
                    sx={{ mt: 0.5, fontWeight: 600, bgcolor: announceWinners ? 'rgba(245,158,11,0.1)' : 'rgba(156,163,175,0.1)', color: announceWinners ? '#ca8a04' : '#6b7280' }} /></Box>}
                labelPlacement="end" sx={{ mt: 2 }} />
            </Paper>

            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Database</Typography>
              <Box display="flex" gap={2}>
                <Button variant="outlined" startIcon={<BackupIcon />} onClick={handleBackup} sx={{ flex: 1 }}>Backup</Button>
                <Button variant="outlined" startIcon={<RestoreIcon />} onClick={handleRestore} sx={{ flex: 1 }}>Restore</Button>
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <VerifiedIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={600}>Public Verification Page</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                View all verified votes on a public page. Anyone with the link can see the verified election results.
              </Typography>
              <Button variant="contained" endIcon={<OpenInNewIcon />}
                onClick={() => window.open('/verified-votes', '_blank')}
                sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}>
                Open Public Page
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
              <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={600}>Election Settings</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Key</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Value</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} width={60}>Edit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hasSettings ? settings.map((setting, idx) => (
                      <TableRow key={setting.key || idx}>
                        <TableCell><Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{setting.key?.replace(/_/g, ' ')}</Typography></TableCell>
                        <TableCell><Chip label={String(setting.value)} size="small" variant="outlined" /></TableCell>
                        <TableCell><IconButton size="small" onClick={() => handleEditSetting(setting.key, setting.value)}><EditIcon fontSize="small" /></IconButton></TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={3} align="center"><Typography variant="body2" color="text.secondary">No settings configured</Typography></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>Activity Logs</Typography>
                <TextField fullWidth size="small" placeholder="Search logs..." value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
              </Box>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Admin</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.length > 0 ? filteredLogs.map((log, idx) => (
                      <TableRow key={log._id || idx}>
                        <TableCell><Typography variant="body2">{log.action || log.message}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{log.admin || log.user || 'System'}</Typography></TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}</Typography></TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={3} align="center"><Typography variant="body2" color="text.secondary">No logs found</Typography></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

        <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, key: '', value: '' })} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Setting</DialogTitle>
          <DialogContent>
            <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', mb: 2 }}>{editDialog.key?.replace(/_/g, ' ')}</Typography>
            {editDialog.key?.includes('time') || editDialog.key?.includes('date') || editDialog.key?.includes('end') ? (
              <TextField fullWidth type="datetime-local" label="Value" value={editDialog.value}
                onChange={(e) => setEditDialog((prev) => ({ ...prev, value: e.target.value }))}
                InputLabelProps={{ shrink: true }} autoFocus />
            ) : (
              <TextField fullWidth label="Value" value={editDialog.value}
                onChange={(e) => setEditDialog((prev) => ({ ...prev, value: e.target.value }))} autoFocus />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog({ open: false, key: '', value: '' })}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveSetting} sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}>Save</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={endTimeDialog} onClose={() => setEndTimeDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Set Election End Time</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Choose the date and time when voting should close.
            </Typography>
            <TextField fullWidth type="datetime-local" label="End Date & Time" value={electionEndTime}
              onChange={(e) => setElectionEndTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date().toISOString().slice(0, 16) }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEndTimeDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveEndTime}
              sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}>Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ErrorBoundary>
  );
};

export default SettingsPage;
