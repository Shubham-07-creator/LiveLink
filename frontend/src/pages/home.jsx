import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Button, IconButton, TextField } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {


    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");


    const {addToUserHistory} = useContext(AuthContext);
    let handleJoinVideoCall = async () => {
        await addToUserHistory(meetingCode)
        navigate(`/${meetingCode}`)
    }

    return (
        <>

            <div className="navBar">

                 <div
                    style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                    onClick={() => navigate("/")}
                >

                    <img src="/video.svg" alt="logo" style={{ width: "35px" }} />

                    <h2 style={{ margin: 0 }}>
                        <span style={{ color: "black" }}>Live</span>
                        <span style={{ color: "#ff7a00" }}>Link</span>
                    </h2>

                </div>


                <div
    style={{
        display: "flex",
        alignItems: "center",
        gap: "20px"
    }}
>
    <div
        onClick={() => {
            navigate("/history");
        }}
        style={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            fontWeight: "bold",
            color: "black"
        }}
    >
        <RestoreIcon style={{ marginRight: "5px" }} />
        <span>History</span>
    </div>

    <Button
        onClick={() => {
            localStorage.removeItem("token");
            navigate("/auth");
        }}
    >
        <span style={{ color: "black", fontWeight: "bold" }}>
            Logout
        </span>
    </Button>
</div>

            </div>


            <div className="meetContainer">
                <div className="leftPanel">
                    <div>
                        <h2>Distance means nothing with LiveLink</h2>

                        <div style={{ display: 'flex', gap: "10px" }}>

                            <TextField onChange={e => setMeetingCode(e.target.value)} id="outlined-basic" label="Meeting Code" variant="outlined" />
                            <Button onClick={handleJoinVideoCall} variant='contained'>Join</Button>

                        </div>
                    </div>
                </div>
                <div className='rightPanel'>
                    <img srcSet='/logo3.png' alt="" />
                </div>
            </div>
        </>
    )
}


export default withAuth(HomeComponent)