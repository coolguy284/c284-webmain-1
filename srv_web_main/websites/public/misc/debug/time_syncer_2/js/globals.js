let guiLoopRunning = false;
let timeUpdateLoopRunning = false;
let currentClientOffset = null;
let pastClientOffset = null;
let currentClientOffsetSlew = null;
let roundTripMSSamples = new SampleAverager(MAX_SAMPLES, IGNORED_START_SAMPLES);
let clientDiffMSSamples = new SampleAverager(MAX_SAMPLES, IGNORED_START_SAMPLES);
let clientDiffSlewMSSamples = new SampleAverager(MAX_SAMPLES, IGNORED_START_SAMPLES);

if (DUMMY_MODE) {
  window.startTime = Date.now();
}

function clearAveragers() {
  roundTripMSSamples.clear();
  clientDiffMSSamples.clear();
  clientDiffSlewMSSamples.clear();
  currentClientOffset = null;
  pastClientOffset = null;
  currentClientOffsetSlew = null;
}

function updateAveragerMaxSamples() {
  roundTripMSSamples.setMaxSamples(MAX_SAMPLES);
  clientDiffMSSamples.setMaxSamples(MAX_SAMPLES);
  clientDiffSlewMSSamples.setMaxSamples(MAX_SAMPLES);
}
