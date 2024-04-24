function copyLocalVarsToUi() {
  render_frame_skips.value = RENDER_FRAME_SKIPS;
  render_frame_skips_text.value = RENDER_FRAME_SKIPS;
  eta_till_close_target.value = CLOSE_OFFSET_TARGET;
  eta_till_close_tolerance.value = CLOSE_OFFSET_TOLERANCE;
}

function loadVarsFromLocalStorage() {
  let data = localStorage.timeSyncer2Data;
  if (data == null) return;
  try {
    data = JSON.parse(data);
  } catch {
    return;
  }
  
  if (data.RENDER_FRAME_SKIPS != null) RENDER_FRAME_SKIPS = data.RENDER_FRAME_SKIPS;
  if (data.CLOSE_OFFSET_TARGET != null) CLOSE_OFFSET_TARGET = data.CLOSE_OFFSET_TARGET;
  if (data.CLOSE_OFFSET_TOLERANCE != null) CLOSE_OFFSET_TOLERANCE = data.CLOSE_OFFSET_TOLERANCE;
  if (data.guiLoopRunning == null || data.guiLoopRunning) toggleGuiLoop();
  if (data.timeUpdateLoopRunning == null || data.timeUpdateLoopRunning) toggleTimeUpdateLoop();
  
  copyLocalVarsToUi();
}

function saveVarsToLocalStorage() {
  localStorage.timeSyncer2Data = JSON.stringify({
    RENDER_FRAME_SKIPS,
    CLOSE_OFFSET_TARGET,
    CLOSE_OFFSET_TOLERANCE,
    guiLoopRunning,
    timeUpdateLoopRunning,
  });
}
