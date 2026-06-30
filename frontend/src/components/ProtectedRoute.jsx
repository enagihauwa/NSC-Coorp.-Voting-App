import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { admin, token, loading } = useSelector((state) => state.auth);

  if (loading) {
    return <LoadingSpinner message="Verifying access..." />;
  }

  if (!token || !admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
