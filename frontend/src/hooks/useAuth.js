import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { STORAGE_KEYS } from '../utils/constants';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { admin, token, loading } = useSelector((state) => state.auth);

  const isAuthenticated = !!token && !!admin;

  const requireAuth = (redirectTo = '/admin/login') => {
    useEffect(() => {
      if (!isAuthenticated && !loading) {
        navigate(redirectTo, { replace: true });
      }
    }, [isAuthenticated, loading, navigate, redirectTo]);
  };

  return {
    admin,
    token,
    loading,
    isAuthenticated,
    requireAuth,
    dispatch,
    navigate,
  };
};

export default useAuth;
