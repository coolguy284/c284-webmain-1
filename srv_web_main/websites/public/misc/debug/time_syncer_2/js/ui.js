function updateFrameSkip(elem) {
  switch (elem.type) {
    case 'range':
      RENDER_FRAME_SKIPS = Number(elem.value);
      render_frame_skips_text.value = RENDER_FRAME_SKIPS;
      break;
    
    case 'text': {
      let newVal = Number(elem.value);
      if (Number.isSafeInteger(newVal)) {
        RENDER_FRAME_SKIPS = newVal;
        render_frame_skips.value = RENDER_FRAME_SKIPS;
      }
      } break;
  }
  
  saveVarsToLocalStorage();
}

function updateEtaTillClose(elem) {
  switch (elem) {
    case eta_till_close_target:
      CLOSE_OFFSET_TARGET = Number(eta_till_close_target.value);
      break;
    
    case eta_till_close_tolerance:
      CLOSE_OFFSET_TOLERANCE = Number(eta_till_close_tolerance.value);
      break;
  }
  
  saveVarsToLocalStorage();
}

function updateMaxSamples() {
  let val = Number(max_samples_text.value);
  if (!Number.isSafeInteger(val) || val <= 0) {
    max_samples_text.value = MAX_SAMPLES;
  } else {
    MAX_SAMPLES = val;
  }
  
  updateAveragerMaxSamples();
  saveVarsToLocalStorage();
}
