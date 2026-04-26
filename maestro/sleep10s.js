// Busy-wait for 10 seconds so the room view is held on screen
// while background API updates are captured in the recording.
var deadline = Date.now() + 10000;
while (Date.now() < deadline) {}
