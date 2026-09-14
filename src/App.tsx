import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LangProvider } from './i18n/LangContext';
import { StoreProvider } from './store';
import { ToastProvider } from './ui';
import DesktopShell from './shell/DesktopShell';
import StaffShell from './shell/StaffShell';
import { isCloud } from './data/supabase';
import { AuthProvider, useAuth, LoginScreen } from './auth';

/** The routed application (unchanged). Rendered only once auth (in cloud mode) has passed. */
function Routed() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/m/health" replace />} />
            <Route path="/m/:moduleId" element={<DesktopShell />} />
            <Route path="/staff" element={<StaffShell />} />
            <Route path="/staff/:moduleId" element={<StaffShell />} />
            <Route path="*" element={<Navigate to="/m/health" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  );
}

const splash = (msg: string) => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFEBDF', color: '#6E7266', fontSize: 14, fontFamily: 'system-ui, sans-serif' }}>{msg}</div>
);

/**
 * Cloud mode: require a signed-in user with a linked profile before the app renders.
 * Local-only mode: `useAuth` yields loading=false + a null session, so this falls straight
 * through to the app exactly as before — no login, nothing gated.
 */
function AuthGate() {
  const { loading, session, profile } = useAuth();
  if (!isCloud) return <Routed />;
  if (loading) return splash('Loading…');
  if (!session) return <LoginScreen />;
  if (!profile) return splash('Your login is not linked to a KIS profile yet. Ask an administrator to link it.');
  return <Routed />;
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </LangProvider>
  );
}
