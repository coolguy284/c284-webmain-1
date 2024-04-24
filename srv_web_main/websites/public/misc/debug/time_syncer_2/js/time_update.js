async function timeUpdateLoop() {
  if (timeUpdateLoopRunning) return;
  
  timeUpdateLoopRunning = true;
  
  let ticks = 0;
  let pastNow = Date.now();
  let errorTimeout = null;
  let noError = null;
  let pastNoError = noError;
  let startDisconnectedTicks = null;
  
  while (timeUpdateLoopRunning) {
    if (DO_DISCONNECTED_CHECK && (noError || noError == null || errorTimeout == null)) {
      if (errorTimeout != null) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
      }
      errorTimeout = setTimeout(() => {
        if (timeUpdateLoopRunning) {
          if (startDisconnectedTicks == null) {
            startDisconnectedTicks = ticks;
          }
          connection_status.textContent = `Disconnected ${((ticks - startDisconnectedTicks) * PING_INTERVAL_MS / 1000).toFixed(0)}s`;
        }
        errorTimeout = null;
      }, DISCONNECTED_TIMEOUT);
    }
    
    let now = Date.now();
    let awaitUntil = now + PING_INTERVAL_MS;
    if (DO_DISCONNECTED_CHECK) noError = false;
    
    try {
      let { roundTripMS, clientDiffMS } = await getServerTime();
      
      roundTripMSSamples.newSampleInput(roundTripMS);
      clientDiffMSSamples.newSampleInput(clientDiffMS);
      
      currentClientOffset = clientDiffMSSamples.getSampleAverage();
      let trueTickTime = now - pastNow;
      if (trueTickTime != 0) {
        clientDiffSlewMSSamples.newSampleInput((currentClientOffset - pastClientOffset) / trueTickTime * 1000);
      }
      currentClientOffsetSlew = clientDiffSlewMSSamples.getSampleAverage();
      
      client_minus_server_time.textContent = msToString(currentClientOffset);
      client_minus_server_time_slew.textContent = msToString(currentClientOffsetSlew * 1000);
      
      let closeStatus = null;
      if (Number.isNaN(CLOSE_OFFSET_TARGET)) {
        closeStatus = 'Target NaN';
      } else if (Number.isNaN(CLOSE_OFFSET_TOLERANCE)) {
        closeStatus = 'Threshold NaN';
      } else {
        let shiftedAbsCurrentClientOffset = currentClientOffset - CLOSE_OFFSET_TARGET,
          maybeFlippedCurrentClientOffsetSlew;
        if (shiftedAbsCurrentClientOffset < 0) {
          shiftedAbsCurrentClientOffset = -shiftedAbsCurrentClientOffset;
          maybeFlippedCurrentClientOffsetSlew = -currentClientOffsetSlew;
        } else {
          maybeFlippedCurrentClientOffsetSlew = currentClientOffsetSlew;
        }
        if (shiftedAbsCurrentClientOffset > CLOSE_OFFSET_TOLERANCE) {
          let etaTillCloseSecs = (shiftedAbsCurrentClientOffset - CLOSE_OFFSET_TOLERANCE) / -maybeFlippedCurrentClientOffsetSlew;
          if (etaTillCloseSecs < 0) {
            closeStatus = 'NEVER';
          } else {
            closeStatus = hmsToString(etaTillCloseSecs);
          }
        } else {
          let fracToBoundary = shiftedAbsCurrentClientOffset / CLOSE_OFFSET_TOLERANCE;
          closeStatus = `REACHED (${(fracToBoundary * 100).toFixed(1)}% to boundary)`;
        }
      }
      eta_till_close.textContent = closeStatus;
      
      server_latency.textContent = msToString(roundTripMSSamples.getSampleAverage());
      samples.textContent = roundTripMSSamples.numSamples();
      max_samples.textContent = MAX_SAMPLES;
      
      if (DO_DISCONNECTED_CHECK) {
        noError = true;
        startDisconnectedTicks = null;
      }
    } catch (e) {
      if (!e.toString().startsWith('Error: XHR')) {
        throw e;
      }
    }
    
    if (DO_DISCONNECTED_CHECK && noError) {
      if (errorTimeout != null) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
      }
      
      if (errorTimeout == null || pastNoError == null) {
        // error state was set, but since successful, unset error status
        if (timeUpdateLoopRunning) {
          connection_status.textContent = 'Connected';
        }
      }
    }
    
    ticks++;
    total_ticks.textContent = ticks;
    
    pastClientOffset = currentClientOffset;
    pastNow = now;
    if (DO_DISCONNECTED_CHECK) pastNoError = noError;
    
    let timeLeft = awaitUntil - Date.now();
    if (timeLeft > 0) {
      await new Promise(r => setTimeout(r, timeLeft));
    }
  }
}

function toggleTimeUpdateLoop() {
  if (DUMMY_MODE) {
    connection_dummy.textContent = ' (Dummy)';
  } else {
    connection_dummy.textContent = '';
  }
  if (!timeUpdateLoopRunning) {
    timeUpdateLoop();
    
    if (DO_DISCONNECTED_CHECK) {
      connection_status.textContent = 'Starting';
    } else {
      connection_status.textContent = 'Connected';
    }
  } else {
    timeUpdateLoopRunning = false;
    
    connection_status.textContent = 'Code Not Running';
  }
}
