import React, { lazy, Suspense } from 'react';
import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeCustomProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

// High-Performance Route Code-Splitting: Lazy load chunks on demand
const LandingPage = lazy(() => import('./pages/landing'));
const Authentication = lazy(() => import('./pages/authentication'));
const HomeComponent = lazy(() => import('./pages/home'));
const History = lazy(() => import('./pages/history'));
const ProfilePage = lazy(() => import('./pages/profile'));
const VideoMeetComponent = lazy(() => import('./pages/VideoMeet'));

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#ffffff'
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          border: '3px solid rgba(59, 130, 246, 0.2)',
          borderTopColor: '#3b82f6',
          animation: 'pageLoaderSpin 0.75s linear infinite'
        }}
      />
      <style>{`
        @keyframes pageLoaderSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <Router>
          <AuthProvider>
            <ThemeCustomProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path='/' element={<LandingPage />} />
                  <Route path='/auth' element={<Authentication />} />
                  <Route path='/home' element={<HomeComponent />} />
                  <Route path='/history' element={<History />} />
                  <Route path='/profile' element={<ProfilePage />} />
                  <Route path='/:url' element={<VideoMeetComponent />} />
                </Routes>
              </Suspense>
            </ThemeCustomProvider>
          </AuthProvider>
        </Router>
      </div>
    </ErrorBoundary>
  );
}

export default App;