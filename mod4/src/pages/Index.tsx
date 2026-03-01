// MOD4 Index - Go straight to dashboard (dev mode)
import { Navigate } from 'react-router-dom';

const Index = () => {
  return <Navigate to="/dashboard" replace />;
};

export default Index;
