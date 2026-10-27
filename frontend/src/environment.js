const IS_PROD = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
const server = process.env.REACT_APP_BACKEND_URL || (IS_PROD ? "https://livelink-backend-po12.onrender.com" : "http://localhost:8000");
export default server;
