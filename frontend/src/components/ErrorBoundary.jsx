import React from "react";
import { Box, Typography, Button, Paper, Container } from "@mui/material";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import RefreshIcon from "@mui/icons-material/Refresh";
import HomeIcon from "@mui/icons-material/Home";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("LiveLink Uncaught Error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/home";
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#090d16",
            color: "#f8fafc",
            p: 3
          }}
        >
          <Container maxWidth="sm">
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3.5, sm: 5 },
                borderRadius: "24px",
                backgroundColor: "rgba(15, 23, 42, 0.85)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                textAlign: "center",
                boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)"
              }}
            >
              <Box
                sx={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px"
                }}
              >
                <ErrorOutlineRoundedIcon sx={{ fontSize: 38 }} />
              </Box>

              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5, color: "#ffffff" }}>
                Something went wrong
              </Typography>

              <Typography variant="body1" sx={{ color: "#94a3b8", mb: 4, lineHeight: 1.6 }}>
                LiveLink encountered an unexpected problem. We recommend reloading the page or returning to the dashboard.
              </Typography>

              <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReload}
                  sx={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    px: 3,
                    py: 1.2,
                    borderRadius: "12px",
                    fontWeight: 700,
                    textTransform: "none",
                    "&:hover": { backgroundColor: "#1d4ed8" }
                  }}
                >
                  Reload Page
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                  sx={{
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    color: "#cbd5e1",
                    px: 3,
                    py: 1.2,
                    borderRadius: "12px",
                    fontWeight: 700,
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "#ffffff",
                      backgroundColor: "rgba(255, 255, 255, 0.05)"
                    }
                  }}
                >
                  Return to Dashboard
                </Button>
              </Box>

              {process.env.NODE_ENV !== "production" && this.state.error && (
                <Box
                  sx={{
                    mt: 4,
                    p: 2,
                    borderRadius: "12px",
                    backgroundColor: "rgba(0, 0, 0, 0.4)",
                    textAlign: "left",
                    overflowX: "auto"
                  }}
                >
                  <Typography variant="caption" sx={{ color: "#ef4444", fontFamily: "monospace", display: "block" }}>
                    {this.state.error.toString()}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
