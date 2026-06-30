import { Component } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8} px={2}>
          <ErrorOutlineIcon sx={{ fontSize: 64, color: '#ef4444', mb: 2 }} />
          <Typography variant="h6" fontWeight={600} mb={1}>Something went wrong</Typography>
          <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
