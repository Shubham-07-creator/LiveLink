import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeCustomProvider } from './contexts/ThemeContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import ProfilePage from './pages/profile';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <Router>
          <AuthProvider>
            <ThemeCustomProvider>
              <Routes>
                <Route path='/' element={<LandingPage />} />
                <Route path='/auth' element={<Authentication />} />
                <Route path='/home' element={<HomeComponent />} />
                <Route path='/history' element={<History />} />
                <Route path='/profile' element={<ProfilePage />} />
                <Route path='/:url' element={<VideoMeetComponent />} />
              </Routes>
            </ThemeCustomProvider>
          </AuthProvider>
        </Router>
      </div>
    </ErrorBoundary>
  );
}

export default App;