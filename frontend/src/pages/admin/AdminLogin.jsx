import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box, Typography, TextField, Button, Paper, Alert, IconButton, InputAdornment, useTheme,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import { loginAdmin, clearError } from '../../redux/authSlice';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';

const schema = yup.object({
  username: yup.string().required('Username is required'),
  password: yup.string().required('Password is required'),
});

const AdminLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, loading, error } = useSelector((state) => state.auth);
  const theme = useTheme();

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  useEffect(() => { if (token) navigate('/admin', { replace: true }); }, [token, navigate]);
  useEffect(() => { dispatch(clearError()); }, [dispatch]);

  const onSubmit = (data) => dispatch(loginAdmin(data));

  const isDark = theme.palette.mode === 'dark';

  return (
    <ErrorBoundary>
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center"
        sx={{
          background: isDark
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)',
          p: 2,
        }}>
        <Paper elevation={8} sx={{ p: 4, maxWidth: 420, width: '100%', borderRadius: 3 }}>
          <Box textAlign="center" mb={4}>
            <Box sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: '#166534', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LockIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Typography variant="h5" fontWeight={700}>Admin Login</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Nigerian Shippers&apos; Council Cooperative Voting System
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <TextField fullWidth label="Username" {...register('username')}
              error={!!errors.username} helperText={errors.username?.message} disabled={loading} sx={{ mb: 2.5 }} />
            <TextField fullWidth label="Password" type={showPassword ? 'text' : 'password'} {...register('password')}
              error={!!errors.password} helperText={errors.password?.message} disabled={loading} sx={{ mb: 3 }}
              InputProps={{ endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )}} />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}
              sx={{ py: 1.5, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 600 }}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Box>

          {loading && <LoadingSpinner message="Authenticating..." />}
        </Paper>
      </Box>
    </ErrorBoundary>
  );
};

export default AdminLogin;
