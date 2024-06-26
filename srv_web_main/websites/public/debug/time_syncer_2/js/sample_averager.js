class SampleAverager {
  #maxSamples;
  #ignoredStartSamples;
  #currentSampleIndex;
  #samples = [0];
  #sampleAverage = 0;
  
  constructor(maxSamples, ignoredStartSamples) {
    this.#maxSamples = maxSamples;
    this.#ignoredStartSamples = ignoredStartSamples;
    this.#currentSampleIndex = -this.#ignoredStartSamples;
  }
  
  #updateAtIndex(index, value) {
    this.#sampleAverage -= this.#samples[index] / this.#samples.length;
    this.#samples[index] = value;
    this.#sampleAverage += this.#samples[index] / this.#samples.length;
  }
  
  #appendToEnd(value) {
    this.#sampleAverage *= this.#samples.length / (this.#samples.length + 1);
    this.#samples.push(value);
    this.#sampleAverage += this.#samples.at(-1) / this.#samples.length;
  }
  
  #removeAtIndex(index) {
    this.#sampleAverage -= this.#samples[index] / this.#samples.length;
    this.#sampleAverage *= this.#samples.length / (this.#samples.length - 1);
    this.#samples.splice(index, 1);
  }
  
  newSampleInput(sample) {
    if (this.#currentSampleIndex < 0) {
      this.#currentSampleIndex++;
    } else {
      if (this.#currentSampleIndex in this.#samples) {
        this.#updateAtIndex(this.#currentSampleIndex, sample);
      } else {
        if (this.#samples.length >= this.#maxSamples) {
          this.#currentSampleIndex = 0;
          this.#updateAtIndex(this.#currentSampleIndex, sample);
        } else {
          this.#appendToEnd(sample);
        }
      }
      
      this.#currentSampleIndex++;
    }
  }
  
  getSampleAverage() {
    return this.#sampleAverage;
  }
  
  numSamples() {
    return this.#samples.length;
  }
  
  maxSamples() {
    return this.#maxSamples;
  }
  
  setMaxSamples(newMax) {
    this.#maxSamples = newMax;
    
    while (this.#samples.length > this.#maxSamples) {
      this.#removeAtIndex(0);
      if (this.#currentSampleIndex > 0) this.#currentSampleIndex--;
    }
  }
  
  clear() {
    this.#currentSampleIndex = -this.#ignoredStartSamples;
    this.#samples = [0];
  }
  
  _getTrueAverage() {
    return this.#samples.reduce((a, c) => a + c) / this.#samples.length;
  }
  
  recalculate() {
    this.#sampleAverage = this._getTrueAverage();
  }
}

function testSampleAverager() {
  let nums1 = new Array(258).fill().map(() => Math.random());
  let nums2 = new Array(150).fill().map(() => Math.random());
  
  let avg = new SampleAverager(100, 0);
  
  let checkIntegrity = () => {
    let reportedAvg = avg.getSampleAverage();
    let trueAvg = avg._getTrueAverage();
    let diff = Math.abs(reportedAvg - trueAvg);
    
    if (diff > 1e-14) {
      throw new Error(`Integrity check failed: average: reported: ${reportedAvg}, true: ${trueAvg}, diff: ${diff}`);
    }
    
    if (avg.numSamples() > avg.maxSamples()) {
      throw new Error(`Integrity check failed: num max samples: current: ${avg.numSamples()}, max: ${avg.maxSamples()}`);
    }
  };
  
  nums1.forEach(x => {
    avg.newSampleInput(x);
    checkIntegrity();
  });
  
  avg.setMaxSamples(10);
  checkIntegrity();
  
  nums2.forEach(x => {
    avg.newSampleInput(x);
    checkIntegrity();
  });
  
  console.log('SampleAverager test successful.');
}
