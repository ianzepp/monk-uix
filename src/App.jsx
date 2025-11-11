import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/auth';
import { Login } from './pages/Login';
import { SchemaView } from './pages/SchemaView';
import { RecordDetail } from './pages/RecordDetail';
import './styles/global.css';

function ProtectedRoute({ children }) {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/schemas" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schemas"
          element={
            <ProtectedRoute>
              <SchemaView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schemas/:schema/:recordId"
          element={
            <ProtectedRoute>
              <RecordDetail />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/schemas" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
