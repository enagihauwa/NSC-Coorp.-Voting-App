import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import store from './redux/store';
import App from './App';
import './index.css';

const getInitialTheme = () => {
  try {
    const stored = localStorage.getItem('nsc_voting_theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const buildTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#059669',
      light: '#a7f3d0',
      dark: '#047857',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6366f1',
      light: '#c7d2fe',
      dark: '#4f46e5',
    },
    success: { main: '#10b981', light: '#d1fae5' },
    warning: { main: '#f59e0b', light: '#fef3c7' },
    error: { main: '#ef4444', light: '#fee2e2' },
    info: { main: '#3b82f6', light: '#dbeafe' },
    ...(mode === 'dark'
      ? {
          background: { default: '#0f172a', paper: '#1e293b' },
          text: { primary: '#f1f5f9', secondary: '#94a3b8' },
          divider: 'rgba(148, 163, 184, 0.12)',
        }
      : {
          background: { default: '#f8fafc', paper: '#ffffff' },
          text: { primary: '#1e293b', secondary: '#64748b' },
          divider: 'rgba(0, 0, 0, 0.08)',
        }),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          transition: 'background-color 0.3s ease, color 0.3s ease',
          backgroundColor: theme.palette.background.default,
        },
      }),
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, padding: '8px 20px' },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          ...(theme.palette.mode === 'dark'
            ? { backgroundImage: 'none', border: '1px solid rgba(148, 163, 184, 0.1)' }
            : { boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }),
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          ...(theme.palette.mode === 'dark' && { backgroundImage: 'none' }),
          transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderColor: theme.palette.divider,
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: 'none',
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            borderBottom: `1px solid ${theme.palette.divider}`,
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
          },
          '& .MuiDataGrid-virtualScroller': {
            backgroundColor: 'transparent',
          },
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRight: `1px solid ${theme.palette.divider}`,
          ...(theme.palette.mode === 'dark' && { backgroundColor: '#1e293b' }),
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          ...(theme.palette.mode === 'dark' && {
            backgroundColor: '#1e293b',
            borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
          }),
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 16,
          ...(theme.palette.mode === 'dark' && { backgroundImage: 'none' }),
        }),
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 5 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 6 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { borderRadius: 6 },
      },
    },
  },
});

const Root = () => {
  const [mode, setMode] = React.useState(getInitialTheme);

  React.useEffect(() => {
    localStorage.setItem('nsc_voting_theme', mode);
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const theme = React.useMemo(() => buildTheme(mode), [mode]);

  const toggleTheme = React.useCallback(() => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App toggleTheme={toggleTheme} currentTheme={mode} />
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
