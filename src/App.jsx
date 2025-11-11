import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/auth';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { SchemaView } from './pages/SchemaView';
import { FindView } from './pages/FindView';
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
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/data" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/data"
          element={
            <ProtectedRoute>
              <SchemaView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/find"
          element={
            <ProtectedRoute>
              <FindView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/data/:schema/:recordId"
          element={
            <ProtectedRoute>
              <RecordDetail />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/data" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
