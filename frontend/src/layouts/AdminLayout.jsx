import { useState, useMemo, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BarChartIcon from '@mui/icons-material/BarChart';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import BallotIcon from '@mui/icons-material/Ballot';
import { logout } from '../redux/authSlice';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: <DashboardIcon /> },
  { label: 'Members', path: '/admin/members', icon: <PeopleIcon /> },
  { label: 'Candidates', path: '/admin/candidates', icon: <BallotIcon /> },
  { label: 'Votes', path: '/admin/votes', icon: <HowToVoteIcon /> },
  { label: 'Results', path: '/admin/results', icon: <BarChartIcon /> },
  { label: 'Location Results', path: '/admin/location-results', icon: <LocationOnIcon /> },
  { label: 'Settings', path: '/admin/settings', icon: <SettingsIcon /> },
];

const NavSection = ({ navItems, currentPath, isMobile, onNavigate }) => {
  const isActive = (item) =>
    item.path === '/admin'
      ? currentPath === '/admin'
      : currentPath.startsWith(item.path);

  return (
    <List sx={{ flex: 1, px: 1, py: 1 }}>
      {navItems.map((item) => {
        const active = isActive(item);
        return (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => onNavigate(item.path)}
              selected={active}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'rgba(22, 163, 74, 0.12)',
                  '&:hover': { bgcolor: 'rgba(22, 163, 74, 0.18)' },
                  '& .MuiListItemIcon-root': { color: '#16a34a' },
                  '& .MuiListItemText-primary': { color: '#16a34a', fontWeight: 600 },
                },
              }}
            >
              <ListItemIcon
                sx={{ minWidth: 40, color: active ? '#16a34a' : 'text.secondary' }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: active ? 600 : 400,
                }}
              />
              {active && (
                <Box
                  sx={{
                    width: 3,
                    height: 24,
                    bgcolor: '#16a34a',
                    borderRadius: 1.5,
                    ml: 'auto',
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
};

const DrawerContent = ({ admin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useMediaQuery('(max-width:899px)');

  const handleNavigation = useCallback(
    (path) => {
      navigate(path);
    },
    [navigate]
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          py: 3,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 32 }} />
        <Typography variant="h6" fontWeight="bold" noWrap>
          NSC Voting
        </Typography>
      </Box>
      <Divider />
      <NavSection
        navItems={navItems}
        currentPath={currentPath}
        isMobile={isMobile}
        onNavigate={handleNavigation}
      />
      <Divider />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 16 }}>
          {admin?.username?.[0]?.toUpperCase() || 'A'}
        </Avatar>
        <Box flex={1}>
          <Typography variant="body2" fontWeight={600}>
            {admin?.username || 'Admin'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Administrator
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const AdminLayout = ({ toggleTheme, currentTheme }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { admin } = useSelector((state) => state.auth);

  const handleDrawerToggle = useCallback(() => setMobileOpen((prev) => !prev), []);

  const handleMenuOpen = useCallback((e) => setAnchorEl(e.currentTarget), []);
  const handleMenuClose = useCallback(() => setAnchorEl(null), []);

  const handleLogout = useCallback(async () => {
    handleMenuClose();
    await dispatch(logout());
    navigate('/admin/login');
  }, [dispatch, navigate, handleMenuClose]);

  const location = useLocation();

  const drawerContent = useMemo(
    () => <DrawerContent admin={admin} />,
    [admin]
  );

  const activeLabel = useMemo(() => {
    return navItems.find((item) =>
      item.path === '/admin'
        ? location.pathname === '/admin'
        : location.pathname.startsWith(item.path)
    )?.label || 'Admin';
  }, [location.pathname]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          transition: 'background-color 0.3s ease',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography key={activeLabel} variant="h6" fontWeight={600} noWrap sx={{ flex: 1, animation: 'fadeIn 0.2s ease' }}>
            {activeLabel}
          </Typography>
          <Tooltip title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}>
            <IconButton onClick={toggleTheme} sx={{ mr: 1 }}>
              {currentTheme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          <IconButton onClick={handleMenuOpen}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#16a34a', fontSize: 14 }}>
              {admin?.username?.[0]?.toUpperCase() || 'A'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
              },
            }}
          >
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
                borderRight: '1px solid',
                borderColor: 'divider',
                transition: 'background-color 0.3s ease, border-color 0.3s ease',
              },
            }}
            open
          >
            {drawerContent}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          minHeight: 'calc(100vh - 64px)',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          bgcolor: 'background.default',
          transition: 'background-color 0.3s ease',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminLayout;
