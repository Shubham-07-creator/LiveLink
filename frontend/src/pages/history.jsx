import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import HomeIcon from "@mui/icons-material/Home";
import DeleteIcon from "@mui/icons-material/Delete";

import { IconButton } from "@mui/material";
export default function History() {
  const { getHistoryOfUser, deleteHistory } = useContext(AuthContext);

  const [meetings, setMeetings] = useState([]);

  const routeTo = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getHistoryOfUser();
        setMeetings(history);
      } catch {
        // IMPLEMENT SNACKBAR
      }
    };

    fetchHistory();
  }, []);

  let formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  return (
    <div>
      <div
        onClick={() => {
          routeTo("/home");
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          padding: "8px",
          width: "fit-content",
        }}
      >
        <img src="/video.svg" alt="logo" style={{ width: "28px" }} />

        <h2 style={{ margin: 0 }}>
          <span style={{ color: "black" }}>Live</span>
          <span style={{ color: "#ff7a00" }}>Link</span>
        </h2>
      </div>

      {meetings.length !== 0 ? (
        meetings.map((e, i) => {
          return (
            <>
              <Card key={i} variant="outlined">
                <CardContent>
                  <Typography
                    sx={{ fontSize: 14 }}
                    color="text.secondary"
                    gutterBottom
                  >
                    Code: {e.meetingCode}
                  </Typography>

                  <Typography sx={{ mb: 1.5 }} color="text.secondary">
                    Date: {formatDate(e.date)}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: "flex-end" }}>
  <Button
    startIcon={<DeleteIcon />}
    variant="contained"
    onClick={async () => {
      if (window.confirm("Delete this history?")) {
        await deleteHistory(e._id);
        setMeetings(meetings.filter((m) => m._id !== e._id));
      }
    }}
    sx={{
      background: "linear-gradient(90deg,#ff7a00,#ff9839)",
      color: "#fff",
      borderRadius: "10px",
      textTransform: "none",
      "&:hover": {
        background: "linear-gradient(90deg,#e66d00,#ff7a00)"
      }
    }}
  >
    Delete
  </Button>
</CardActions>
              </Card>
            </>
          );
        })
      ) : (
        <></>
      )}
    </div>
  );
}