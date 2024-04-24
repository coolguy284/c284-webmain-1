async function guiLoop() {
  if (guiLoopRunning) return;
  
  guiLoopRunning = true;
  
  while (guiLoopRunning) {
    let clientNow = new Date();
    let serverNow = new Date(clientNow.getTime() - currentClientOffset);
    
    client_time.textContent = dateToString(clientNow);
    server_time.textContent = dateToString(serverNow);
    
    if (RENDER_FRAME_SKIPS > 0) {
      for (let i = 0; i < RENDER_FRAME_SKIPS; i++) {
        await new Promise(r => requestAnimationFrame(r));
        if (!guiLoopRunning) break;
      }
    } else {
      await new Promise(r => requestAnimationFrame(r));
    }
  }
}

function toggleGuiLoop() {
  if (!guiLoopRunning) {
    guiLoop();
    
    rendering_status.textContent = 'Rendering';
  } else {
    guiLoopRunning = false;
    
    rendering_status.textContent = 'Not Rendering';
  }
  
  saveVarsToLocalStorage();
}
