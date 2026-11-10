// Text/role matchers the call tests use. Edit to match your UI labels (aria-label or visible text).
module.exports = {
  nameInput: 'input[placeholder*="name" i], input[name*="name" i], input[aria-label*="name" i]',
  joinBtn: /join (meeting )?now|enter meeting|join meeting|^join$/i,
  micBtn: /mute|unmute|microphone/i,
  camBtn: /turn (on|off) camera|camera|video (on|off)/i,
  shareBtn: /share screen|present|screen share/i,
  chatBtn: /chat/i,
  chatInput: 'textarea, input[placeholder*="message" i]',
  leaveBtn: /leave|end call|hang up/i,
  leaveConfirm: /^(leave|yes|confirm|leave meeting|leave call)$/i,
  withoutMedia: /without (camera|mic)|continue without|join without/i,
  roomFull: /room (is )?full|maximum|at capacity|limit reached/i,
  permissionMsg: /blocked|denied|allow|permission/i,
  errorBoundary: /something went wrong/i,
  reconnecting: /reconnecting/i,
};
