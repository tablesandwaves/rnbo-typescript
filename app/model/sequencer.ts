/**
 * An object oriented port of the MDN Audio Examples step sequencer:
 * https://github.com/mdn/webaudio-examples/tree/main/step-sequencer
 */

import { Synth } from "./synth";
import type { Key } from "tblswvs";
import { draw } from "../view/sequencer";


type queuedStep = {
  index: number,
  time: number
}

export type SequencerConfiguration = [
  context: AudioContext,
  synths: Synth[]
];


export class StepSequencer {
  audioContext: AudioContext;
  // Store time: BPM and step time
  #tempo = 120;
  #secondsPerStep = 60.0 / this.#tempo / 4;
  // How frequently to call scheduling function (in milliseconds)
  lookahead = 25.0;
  // How far ahead to schedule audio (sec)
  scheduleAheadTime = 0.1;
  // The step we are currently playing
  currentStep = 0;
  // When the next step is due
  nextStepTime = 0.0;
  // Sequencer steps as an array of gates
  sequence: (0|1)[][] = new Array();
  // Create a queue for the steps that are to be played, with the current time that we want them to play
  stepsInQueue: queuedStep[] = [];
  // ID for clearing setTimeout() when sequencer stops
  timerID: NodeJS.Timeout | undefined;
  // Start at last step drawn so first time used it wraps back to index 0
  lastStep: number;
  // Number of steps in the loop
  #stepCount: number;
  // Keep track of play status
  isPlaying = false;
  // RNBO synth devices
  synths: Synth[] = [];
  // Key for the synths
  key: Key | undefined;


  constructor(audioContext: AudioContext, synths: Synth[], stepCount: number) {
    this.audioContext = audioContext;
    this.synths       = synths;
    this.#stepCount   = stepCount;
    this.lastStep     = this.#stepCount - 1;

    for (let voice = 0; voice < this.synths.length; voice++)
      this.sequence[voice] = new Array(16).fill(0);
  }


  get tempo() {
    return this.#tempo;
  }


  set tempo(tempo: number) {
    this.#tempo = tempo;
    this.#secondsPerStep = 60.0 / this.#tempo / 4;
  }


  set stepCount(stepCount: number) {
    this.#stepCount = stepCount;

    if (this.lastStep > this.#stepCount - 1)
      this.lastStep = 0;
  }


  nextStep() {
    // Add beat length to last beat time
    this.nextStepTime += this.#secondsPerStep;
    // Advance the beat number, wrap to zero when reaching the step count
    this.currentStep = (this.currentStep + 1) % this.#stepCount;
  }


  scheduleStep(stepIndex: number, time: number) {
    // Push the step into the queue, even if we're not playing.
    this.stepsInQueue.push({ index: stepIndex, time: time });

    if (this.sequence[0]![stepIndex]) {
      if (Math.random() > 0.7)
        this.synths[0]!.updateParameters();
      const scaleDegree    = Math.floor(Math.random() * this.key!.mode.scaleOffsets.length) + 1;
      const midiNoteNumber = this.key!.degree(scaleDegree).midi;
      this.synths[0]!.playNote(midiNoteNumber);
    }

    if (this.sequence[1]![stepIndex]) {
      if (Math.random() > 0.3)
        this.synths[1]!.updateParameters();
      const scaleDegree    = Math.floor(Math.random() * this.key!.mode.scaleOffsets.length) + 1;
      const midiNoteNumber = this.key!.degree(scaleDegree).midi;
      this.synths[1]!.playNote(midiNoteNumber);
    }
  }


  // While there are steps that will need to play before the next interval,
  // schedule them and advance the pointer.
  scheduler(sequencer: StepSequencer) {
    while (sequencer.nextStepTime < sequencer.audioContext.currentTime + sequencer.scheduleAheadTime) {
      sequencer.scheduleStep(sequencer.currentStep, sequencer.nextStepTime);
      sequencer.nextStep();
    }
    sequencer.timerID = setTimeout(() => {
      sequencer.scheduler(sequencer);
    }, sequencer.lookahead);
  }


  togglePlayback() {
    this.isPlaying = !this.isPlaying;

    // Start playing
    if (this.isPlaying) {
      // Check if context is in suspended state (autoplay policy)
      if (this.audioContext.state === "suspended")
        this.audioContext.resume();

      this.currentStep = 0;
      this.nextStepTime = this.audioContext.currentTime;
      this.scheduler(this); // kick off scheduling
      requestAnimationFrame(() => draw(this)); // start the drawing loop.
    } else {
      window.clearTimeout(this.timerID);
    }
  }
}
