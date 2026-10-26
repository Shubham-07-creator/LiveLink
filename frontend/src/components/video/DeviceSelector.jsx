import React from "react";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import tokens from "../../tokens";

export default function DeviceSelector({ label, devices = [], value, onChange }) {
  if (!devices || devices.length === 0) return null;

  return (
    <FormControl fullWidth size="small">
      <Box
        component="label"
        sx={{
          display: "block",
          fontSize: "14px",
          fontWeight: 500,
          color: "#cbd5e1",
          mb: "6px"
        }}
      >
        {label}
      </Box>
      <Select
        value={value || devices[0]?.deviceId || ""}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          color: "white",
          bgcolor: "#1f2937",
          borderRadius: tokens.radii.input,
          height: tokens.buttonHeights.normal
        }}
      >
        {devices.map((d) => (
          <MenuItem key={d.deviceId} value={d.deviceId}>
            {d.label || `${label} (${d.deviceId.slice(0, 6)}...)`}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
