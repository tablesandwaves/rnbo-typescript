/**
 * An object oriented port of the MDN Audio Examples step sequencer:
 * https://github.com/mdn/webaudio-examples/tree/main/step-sequencer
 */

import { Synth } from "./synth";
import type { Key } from "tblswvs";
import { draw } from "./ui";


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
  // The note we are currently playing
  currentStep = 0;
  // When the next note is due
  nextStepTime = 0.0;
  // Sequencer steps as an array of gates
  sequence: (0|1)[][] = new Array();
  // Create a queue for the notes that are to be played, with the current time that we want them to play
  stepsInQueue: queuedStep[] = [];
  // ID for clearing setTimeout() when sequencer stops
  timerID: NodeJS.Timeout | undefined;
  // Start at last note drawn so first time used it wraps back to index 0
  lastStep: number;
  // Number of steps in the loop
  stepCount: number;
  // Keep track of play status
  isPlaying = false;
  // RNBO synth devices
  synths: Synth[] = [];
  // Key for the synths
  key: Key | undefined;


  constructor(audioContext: AudioContext, synths: Synth[]) {
    this.audioContext = audioContext;
    this.synths       = synths;

    this.stepCount = document.querySelectorAll(".pads label").length / this.synths.length;
    this.lastStep  = this.stepCount - 1;

    for (let voice = 0; voice < this.synths.length; voice++)
      this.sequence[voice] = new Array(this.stepCount).fill(0);
  }


  get tempo() {
    return this.#tempo;
  }


  set tempo(tempo: number) {
    this.#tempo = tempo;
    this.#secondsPerStep = 60.0 / this.#tempo / 4;
  }


  nextNote() {
    // Add beat length to last beat time
    this.nextStepTime += this.#secondsPerStep;
    // Advance the beat number, wrap to zero when reaching the step count
    this.currentStep = (this.currentStep + 1) % this.stepCount;
  }


  scheduleNote(stepIndex: number, time: number) {
    // Push the note into the queue, even if we're not playing.
    this.stepsInQueue.push({ index: stepIndex, time: time });

    if (this.sequence[0]![stepIndex]) {
      // Play first voice
      if (Math.random() > 0.7)
        this.synths[0]!.updateParameters();
      const scaleDegree    = Math.floor(Math.random() * this.key!.mode.scaleOffsets.length) + 1;
      const midiNoteNumber = this.key!.degree(scaleDegree).midi;
      this.synths[0]!.playNote(midiNoteNumber);
    }

    if (this.sequence[1]![stepIndex]) {
      // Play second voice
      if (Math.random() > 0.3)
        this.synths[1]!.updateParameters();
      const scaleDegree    = Math.floor(Math.random() * this.key!.mode.scaleOffsets.length) + 1;
      const midiNoteNumber = this.key!.degree(scaleDegree).midi;
      this.synths[1]!.playNote(midiNoteNumber);
    }
  }


  // While there are notes that will need to play before the next interval,
  // schedule them and advance the pointer.
  scheduler(sequencer: StepSequencer) {
    while (sequencer.nextStepTime < sequencer.audioContext.currentTime + sequencer.scheduleAheadTime) {
      sequencer.scheduleNote(sequencer.currentStep, sequencer.nextStepTime);
      sequencer.nextNote();
    }
    sequencer.timerID = setTimeout(() => {
      sequencer.scheduler(sequencer);
    }, sequencer.lookahead);
  }


  togglePlayback(event: Event) {
    this.isPlaying = !this.isPlaying;

    // Start playing
    if (this.isPlaying) {
      // Check if context is in suspended state (autoplay policy)
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      this.currentStep = 0;
      this.nextStepTime = this.audioContext.currentTime;
      this.scheduler(this); // kick off scheduling
      requestAnimationFrame(() => draw(this)); // start the drawing loop.
      (event.target as Element).setAttribute("data-playing", "true");
    } else {
      window.clearTimeout(this.timerID);
      (event.target as Element).setAttribute("data-playing", "false");
    }
  }
}
