class SampleAverager {
  #maxSamples;
  #samples = [0];
  #currentSampleIndex = -2;
  #sampleAverage = 0;
  
  constructor(maxSamples, ignoredStartSamples) {
    this.#maxSamples = maxSamples;
    this.#currentSampleIndex = -ignoredStartSamples;
  }
  
  newSampleInput(sample) {
    if (this.#currentSampleIndex < 0) {
      this.#currentSampleIndex++;
    } else {
      if (this.#currentSampleIndex in this.#samples) {
        this.#sampleAverage -= this.#samples[this.#currentSampleIndex] / this.#samples.length;
      } else {
        this.#sampleAverage *= this.#samples.length / (this.#samples.length + 1);
      }
      this.#samples[this.#currentSampleIndex] = sample;
      this.#sampleAverage += this.#samples[this.#currentSampleIndex] / this.#samples.length;
      
      this.#currentSampleIndex++;
      if (this.#currentSampleIndex >= this.#samples.length) {
        if (this.#samples.length >= this.#maxSamples) {
          this.#currentSampleIndex = 0;
        }
      }
    }
  }
  
  getSampleAverage() {
    return this.#sampleAverage;
  }
  
  numSamples() {
    return this.#samples.length;
  }
}
