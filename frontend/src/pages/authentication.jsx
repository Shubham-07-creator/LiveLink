import * as React from 'react';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar, ButtonGroup } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const defaultTheme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
        },
    },
});

export default function Authentication() {
    const [username, setUsername] = React.useState(''); // Keeps backend variable name intact
    const [password, setPassword] = React.useState('');
    const [name, setName] = React.useState('');
    const [error, setError] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [formState, setFormState] = React.useState(0);
    const [open, setOpen] = React.useState(false);

    const navigate = useNavigate();
    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    const handleAuth = async () => {
        try {
            if (formState === 0) {
                await handleLogin(username, password);
            }
            if (formState === 1) {
                let result = await handleRegister(name, username, password);
                setUsername("");
                setMessage(result || "Registered successfully!");
                setOpen(true);
                setError("");
                setFormState(0);
                setPassword("");
            }
        } catch (err) {
            console.log(err);
            let errMsg = err.response?.data?.message || "Something went wrong";
            setError(errMsg);
        }
    };

    return (
        <ThemeProvider theme={defaultTheme}>
            {/* Main wrapper container to perfectly center the form */}
            <Box
                sx={{
                    height: '100vh',
                    width: '100vw',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: (t) => t.palette.grey[100], 
                    overflow: 'hidden',
                    p: 2
                }}
            >
                <CssBaseline />

                {/* Centered Auth Card */}
                <Paper
                    elevation={4}
                    sx={{
                        maxWidth: 420,
                        width: '100%',
                        p: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        borderRadius: 3, 
                    }}
                >
                    {/* LiveLink Logo and Title Component */}
                    <div
                        style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "8px", 
                            cursor: "pointer",
                            marginBottom: "24px"
                        }}
                        onClick={() => navigate("/")}
                    >
                        <img src="/video.svg" alt="logo" style={{ width: "35px" }} />
                        <h2 style={{ margin: 0, fontFamily: 'sans-serif', fontWeight: 700 }}>
                            <span style={{ color: "black" }}>Live</span>
                            <span style={{ color: "#ff7a00" }}>Link</span>
                        </h2>
                    </div>

                    <Typography component="h1" variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                        {formState === 0 ? "Welcome Back" : "Create Account"}
                    </Typography>

                    {/* Toggle Buttons for Sign In / Sign Up */}
                    <ButtonGroup variant="outlined" fullWidth sx={{ mb: 3 }}>
                        <Button 
                            variant={formState === 0 ? "contained" : "outlined"} 
                            onClick={() => { setFormState(0); setError(""); }}
                        >
                            Sign In
                        </Button>
                        <Button 
                            variant={formState === 1 ? "contained" : "outlined"} 
                            onClick={() => { setFormState(1); setError(""); }}
                        >
                            Sign Up
                        </Button>
                    </ButtonGroup>

                    <Box component="form" noValidate sx={{ width: '100%' }}>
                        {formState === 1 && (
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="name"
                                label="Full Name"
                                name="name"
                                value={name}
                                autoFocus
                                onChange={(e) => setName(e.target.value)}
                            />
                        )}

                        {/* CHANGED: Label set to Email / Email Address & type set to email */}
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Email Address"
                            name="username"
                            type="email"
                            value={username}
                            autoFocus={formState === 0}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        {error && (
                            <Typography color="error" variant="body2" sx={{ mt: 1.5, textAlign: 'center', fontWeight: 'medium' }}>
                                {error}
                            </Typography>
                        )}

                        <Button
                            type="button"
                            fullWidth
                            variant="contained"
                            size="large"
                            sx={{ mt: 3, py: 1.2, borderRadius: 2, fontWeight: 'bold', textTransform: 'none', fontSize: '1rem' }}
                            onClick={handleAuth}
                        >
                            {formState === 0 ? "Login" : "Register"}
                        </Button>
                    </Box>
                </Paper>
            </Box>

            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={() => setOpen(false)}
                message={message}
            />
        </ThemeProvider>
    );
}