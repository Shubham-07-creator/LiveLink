let IS_PROD = true;

const server = IS_PROD
  ? "https://livelink-backend-pol2.onrender.com"
  : "http://localhost:8000";

export default server;