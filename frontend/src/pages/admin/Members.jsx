import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, TextField, Button, Paper, Chip, InputAdornment,
  Grid, Alert,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PeopleIcon from '@mui/icons-material/People';
import Swal from 'sweetalert2';
import { fetchMembers, importMembers } from '../../redux/memberSlice';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ErrorBoundary from '../../components/ErrorBoundary';

const Members = () => {
  const dispatch = useDispatch();
  const { members, total, loading, error } = useSelector((s) => s.members);
  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  useEffect(() => {
    const params = { page: paginationModel.page + 1, limit: paginationModel.pageSize };
    if (search.trim()) params.search = search.trim();
    dispatch(fetchMembers(params));
  }, [dispatch, paginationModel, search]);

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv,.xlsx,.xls';
    input.onchange = async (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      const fd = new FormData(); fd.append('file', file);
      const result = await dispatch(importMembers(fd));
      if (result.meta.requestStatus === 'fulfilled') {
        Swal.fire({ icon: 'success', title: 'Imported', text: 'Members imported successfully', timer: 1500, showConfirmButton: false });
        dispatch(fetchMembers({ page: paginationModel.page + 1, limit: paginationModel.pageSize, force: true }));
      } else { Swal.fire({ icon: 'error', title: 'Error', text: result.payload || 'Import failed' }); }
    };
    input.click();
  };

  const columns = [
    { field: 'staff_number', headerName: 'Staff No.', flex: 1, minWidth: 120 },
    { field: 'fullname', headerName: 'Name', flex: 1.5, minWidth: 180 },
    { field: 'department', headerName: 'Department', flex: 1, minWidth: 150 },
    { field: 'location', headerName: 'Location', flex: 1, minWidth: 180 },
    { field: 'has_voted', headerName: 'Status', width: 110, renderCell: (p) => (
      <Chip label={p.row.has_voted ? 'Voted' : 'Pending'} size="small" sx={{ fontWeight: 600, bgcolor: p.row.has_voted ? 'rgba(22,163,74,0.1)' : 'rgba(245,158,11,0.1)', color: p.row.has_voted ? 'primary.main' : '#d97706' }} />
    )},
  ];

  const hasData = Array.isArray(members) && members.length > 0;

  return (
    <ErrorBoundary>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Members</Typography>
            <Typography variant="body2" color="text.secondary">View and manage registered cooperative members</Typography>
          </Box>
          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={handleImport}
            sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 2, px: 3 }}>
            Import CSV
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{typeof error === 'string' ? error : 'Failed to load members'}</Alert>}

        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <TextField fullWidth size="small" placeholder="Search by staff number, name, department, or location..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        </Paper>

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          {loading && !hasData ? <LoadingSpinner message="Loading members..." />
          : !hasData ? <EmptyState icon={PeopleIcon} message="No members found. Import a CSV to get started." />
          : <DataGrid rows={members.map((m) => ({ ...m, id: m.id }))} columns={columns}
              paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 25, 50, 100]} rowCount={total || members.length}
              paginationMode="server" disableRowSelectionOnClick autoHeight
              sx={{ '& .MuiDataGrid-cell': { py: 1.5 }, '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', fontWeight: 600 } }} />}
        </Paper>
      </Box>
    </ErrorBoundary>
  );
};

export default Members;
