import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Container from "@mui/material/Container";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import tokens from "../tokens";

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
      const call = tokens.colors.call;

      return (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: call.stageBg,
            color: "#f8fafc",
            p: 3
          }}
        >
          <Container maxWidth="sm">
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3.5, sm: 5 },
                borderRadius: tokens.radii.modal,
                backgroundColor: call.dockBg,
                backdropFilter: "blur(16px)",
                border: `1px solid ${call.dockBorder}`,
                textAlign: "center",
                boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)"
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: tokens.colors.light.dangerSoftBg,
                  color: tokens.colors.light.danger,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px"
                }}
              >
                <ErrorOutlineOutlinedIcon sx={{ fontSize: 34 }} />
              </Box>

              <Typography
                variant="h4"
                sx={{
                  fontFamily: tokens.typography.fonts.heading,
                  fontWeight: 700,
                  fontSize: "24px",
                  mb: 1.5,
                  color: "#ffffff"
                }}
              >
                Something went wrong
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  fontFamily: tokens.typography.fonts.body,
                  color: "#94a3b8",
                  mb: 4,
                  lineHeight: 1.6
                }}
              >
                LiveLink encountered an unexpected problem. We recommend reloading the page or returning to the dashboard.
              </Typography>

              <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshOutlinedIcon />}
                  onClick={this.handleReload}
                  sx={{
                    backgroundColor: tokens.colors.light.primary,
                    color: "#ffffff",
                    px: 3,
                    py: 1.2,
                    borderRadius: tokens.radii.button,
                    fontWeight: 600,
                    textTransform: "none",
                    "&:hover": { backgroundColor: tokens.colors.light.primaryHover }
                  }}
                >
                  Reload page
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<HomeOutlinedIcon />}
                  onClick={this.handleGoHome}
                  sx={{
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    color: "#cbd5e1",
                    px: 3,
                    py: 1.2,
                    borderRadius: tokens.radii.button,
                    fontWeight: 600,
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "#ffffff",
                      backgroundColor: "rgba(255, 255, 255, 0.05)"
                    }
                  }}
                >
                  Return to dashboard
                </Button>
              </Box>

              {process.env.NODE_ENV !== "production" && this.state.error && (
                <Box
                  sx={{
                    mt: 4,
                    p: 2,
                    borderRadius: tokens.radii.button,
                    backgroundColor: "rgba(0, 0, 0, 0.4)",
                    textAlign: "left",
                    overflowX: "auto"
                  }}
                >
                  <Typography variant="caption" sx={{ color: tokens.colors.light.danger, fontFamily: "monospace", display: "block" }}>
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
