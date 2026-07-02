import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Avatar, IconButton, Chip, Alert, Grid,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import BallotIcon from '@mui/icons-material/Ballot';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PersonIcon from '@mui/icons-material/Person';
import Swal from 'sweetalert2';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { fetchCandidates, createCandidate, updateCandidate, deleteCandidate, toggleCandidateStatus } from '../../redux/candidateSlice';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ErrorBoundary from '../../components/ErrorBoundary';
import { ELECTION_POSITIONS, resolvePhotoUrl } from '../../utils/constants';

const schema = yup.object({
  fullname: yup.string().required('Candidate name is required'),
  position_id: yup.number().required('Position is required').positive().integer(),
  manifesto: yup.string().nullable(),
});

const defaultValues = { fullname: '', position_id: '', manifesto: '' };

const Candidates = () => {
  const dispatch = useDispatch();
  const { candidates, loading, error } = useSelector((s) => s.candidates);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [localError, setLocalError] = useState(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema), defaultValues,
  });

  const load = useCallback(() => dispatch(fetchCandidates()), [dispatch]);

  useEffect(() => { load(); }, [load]);

  const handleOpenAdd = () => {
    setEditing(null); setPhotoFile(null); setPhotoPreview(null);
    reset(defaultValues); setDialogOpen(true);
  };

  const handleOpenEdit = (candidate) => {
    setEditing(candidate); setPhotoFile(null);
    setPhotoPreview(resolvePhotoUrl(candidate.photo) || null);
    reset({ fullname: candidate.fullname || '', position_id: parseInt(candidate.position_id, 10) || '', manifesto: candidate.manifesto || '' });
    setDialogOpen(true);
  };

  const handleClose = () => { setDialogOpen(false); setEditing(null); setPhotoFile(null); setPhotoPreview(null); };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) { setPhotoFile(file); const r = new FileReader(); r.onload = (ev) => setPhotoPreview(ev.target.result); r.readAsDataURL(file); }
  };

  const onSubmit = async (data) => {
    const fd = new FormData();
    fd.append('fullname', data.fullname); fd.append('position_id', data.position_id);
    if (data.manifesto) fd.append('manifesto', data.manifesto);
    if (photoFile) fd.append('photo', photoFile);
    setLocalError(null);
    const result = editing ? await dispatch(updateCandidate({ id: editing.id, data: fd })) : await dispatch(createCandidate(fd));
    if (result.meta.requestStatus === 'fulfilled') {
      Swal.fire({ icon: 'success', title: 'Success', text: `Candidate ${editing ? 'updated' : 'created'}`, timer: 1500, showConfirmButton: false });
      handleClose();
      dispatch(fetchCandidates({ force: true }));
    } else {
      setLocalError(result.payload || 'Operation failed');
    }
  };

  const handleDelete = (candidate) => {
    Swal.fire({ title: 'Delete Candidate?', text: `Remove ${candidate.fullname}?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6b7280', confirmButtonText: 'Delete', reverseButtons: true })
      .then(async (r) => { if (r.isConfirmed) { const res = await dispatch(deleteCandidate(candidate.id)); if (res.meta.requestStatus === 'fulfilled') { Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, showConfirmButton: false }); dispatch(fetchCandidates({ force: true })); } } });
  };

  const handleToggleStatus = async (candidate) => {
    const res = await dispatch(toggleCandidateStatus(candidate.id));
    if (res.meta.requestStatus === 'fulfilled') {
      const status = res.payload?.data?.status || res.payload?.status;
      Swal.fire({ icon: 'success', title: 'Updated', text: `Candidate is now ${status === 'active' ? 'active' : 'inactive'}`, timer: 1500, showConfirmButton: false });
      dispatch(fetchCandidates({ force: true }));
    }
  };

  const getPositionLabel = (posId) => ELECTION_POSITIONS.find((p) => p.id === posId)?.label || posId;

  const columns = [
    { field: 'photo', headerName: '', width: 60, sortable: false, renderCell: (p) => (
      <Avatar src={resolvePhotoUrl(p.row.photo)} sx={{ width: 36, height: 36 }}><PersonIcon fontSize="small" /></Avatar>
    )},
    { field: 'fullname', headerName: 'Name', flex: 1.5, minWidth: 180 },
    { field: 'position_name', headerName: 'Position', flex: 1, minWidth: 150, valueGetter: (p) => p?.row?.position_name || getPositionLabel(p?.row?.position_id) },
    { field: 'status', headerName: 'Status', width: 100, renderCell: (p) => (
      <Chip label={p.row.status === 'active' ? 'Active' : 'Inactive'} size="small" sx={{ fontWeight: 600, bgcolor: p.row.status === 'active' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)', color: p.row.status === 'active' ? 'primary.main' : '#ef4444' }} />
    )},
    { field: 'actions', headerName: 'Actions', width: 140, sortable: false, renderCell: (p) => (
      <Box display="flex" gap={0.5}>
        <IconButton size="small" onClick={() => handleOpenEdit(p.row)} sx={{ color: '#3b82f6' }}><EditIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={() => handleToggleStatus(p.row)} sx={{ color: p.row.status === 'active' ? '#d97706' : 'primary.main' }}>{p.row.status === 'active' ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}</IconButton>
        <IconButton size="small" onClick={() => handleDelete(p.row)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton>
      </Box>
    )},
  ];

  const hasData = Array.isArray(candidates) && candidates.length > 0;

  return (
    <ErrorBoundary>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Candidates</Typography>
            <Typography variant="body2" color="text.secondary">Manage election candidates and their positions</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 2, px: 3, py: 1 }}>Add Candidate</Button>
        </Box>

        {(error || localError) && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setLocalError(null)}>
            {localError || (typeof error === 'string' ? error : 'Failed to load candidates')}
          </Alert>
        )}

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          {loading && !hasData ? <LoadingSpinner message="Loading candidates..." />
          : !hasData ? <EmptyState icon={BallotIcon} message="No candidates registered yet. Click 'Add Candidate' to get started." />
          : <DataGrid rows={candidates.map((c) => ({ ...c, id: c.id }))} columns={columns} paginationModel={paginationModel} onPaginationModelChange={setPaginationModel} pageSizeOptions={[10, 25, 50]} disableRowSelectionOnClick autoHeight
              sx={{ '& .MuiDataGrid-cell': { py: 1.5 }, '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', fontWeight: 600 } }} />}
        </Paper>

        <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <DialogTitle sx={{ fontWeight: 700 }}>{editing ? 'Edit Candidate' : 'Add New Candidate'}</DialogTitle>
            <DialogContent>
              <Box display="flex" flexDirection="column" alignItems="center" my={2}>
                <input accept="image/*" style={{ display: 'none' }} id="photo-upload" type="file" onChange={handlePhotoChange} />
                <label htmlFor="photo-upload">
                  <Avatar src={photoPreview} sx={{ width: 100, height: 100, cursor: 'pointer', border: '2px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
                    <PhotoCameraIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                  </Avatar>
                  <Typography variant="caption" display="block" textAlign="center" mt={1} color="text.secondary">Click to upload photo</Typography>
                </label>
              </Box>
              <TextField fullWidth label="Full Name" {...register('fullname')} error={!!errors.fullname} helperText={errors.fullname?.message} sx={{ mb: 2.5, mt: 1 }} />
              <Controller name="position_id" control={control} render={({ field }) => (
                <TextField {...field} fullWidth select label="Position" error={!!errors.position_id} helperText={errors.position_id?.message} sx={{ mb: 2.5 }}>
                  {ELECTION_POSITIONS.map((pos) => <MenuItem key={pos.id} value={pos.id}>{pos.label}</MenuItem>)}
                </TextField>
              )} />
              <TextField fullWidth multiline rows={4} label="Manifesto" {...register('manifesto')} sx={{ mb: 2 }} />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}>
                {isSubmitting ? 'Saving...' : editing ? 'Update Candidate' : 'Add Candidate'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </Box>
    </ErrorBoundary>
  );
};

export default Candidates;
