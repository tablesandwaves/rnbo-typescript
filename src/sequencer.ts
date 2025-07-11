/**
 * An object oriented port of the MDN Audio Examples step sequencer:
 * https://github.com/mdn/webaudio-examples/tree/main/step-sequencer
 */

import { Synth } from "./synth";
import type { Key } from "tblswvs";


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
  tempo = 120;
  // How frequently to call scheduling function (in milliseconds)
  lookahead = 25.0;
  // How far ahead to schedule audio (sec)
  scheduleAheadTime = 0.1;
  // The note we are currently playing
  currentStep = 0;
  // When the next note is due
  nextNoteTime = 0.0;
  // UI elements that correspond to sequencer steps
  pads: NodeListOf<Element>;
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

    this.pads      = document.querySelectorAll(".pads");
    this.stepCount = document.querySelectorAll(".pads label").length / this.synths.length;
    this.lastStep  = this.stepCount - 1;
  }


  nextNote() {
    const secondsPerBeat = 60.0 / this.tempo / 4;
    this.nextNoteTime += secondsPerBeat; // Add beat length to last beat time

    // Advance the beat number, wrap to zero when reaching the step count
    this.currentStep = (this.currentStep + 1) % this.stepCount;
  }


  scheduleNote(stepIndex: number, time: number) {
    // Push the note into the queue, even if we're not playing.
    this.stepsInQueue.push({ index: stepIndex, time: time });

    if (this.pads[0]!.querySelectorAll("input")![stepIndex]!.checked) {
      // Play first voice
      if (Math.random() > 0.7)
        this.synths[0]!.updateParameters();
      const scaleDegree    = Math.floor(Math.random() * this.key!.mode.scaleOffsets.length) + 1;
      const midiNoteNumber = this.key!.degree(scaleDegree).midi;
      this.synths[0]!.playNote(midiNoteNumber);
    }

    if (this.pads[1]!.querySelectorAll("input")![stepIndex]!.checked) {
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
    while (sequencer.nextNoteTime < sequencer.audioContext.currentTime + sequencer.scheduleAheadTime) {
      sequencer.scheduleNote(sequencer.currentStep, sequencer.nextNoteTime);
      sequencer.nextNote();
    }
    sequencer.timerID = setTimeout(() => {
      sequencer.scheduler(sequencer);
    }, sequencer.lookahead);
  }


  // Draw function to update the UI, so we can see when the beat progress.
  // This is a loop: it reschedules itself to redraw at the end.
  draw(sequencer: StepSequencer) {
    let step = sequencer.lastStep;
    const currentTime = sequencer.audioContext.currentTime;

    while (sequencer.stepsInQueue.length && sequencer.stepsInQueue[0]!.time < currentTime) {
      step = sequencer.stepsInQueue[0]!.index;
      sequencer.stepsInQueue.shift(); // Remove step from queue
    }

    // We only need to draw if the note has moved.
    if (sequencer.lastStep !== step) {
      document.querySelector(`#step-${sequencer.lastStep + 1}`)!.classList.remove("active");
      document.querySelector(`#step-${step + 1}`)!.classList.add("active");
      sequencer.lastStep = step;
    }
    // Set up to draw again
    requestAnimationFrame(() => sequencer.draw(sequencer));
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
      this.nextNoteTime = this.audioContext.currentTime;
      this.scheduler(this); // kick off scheduling
      requestAnimationFrame(() => this.draw(this)); // start the drawing loop.
      (event.target as Element).setAttribute("data-playing", "true");
    } else {
      window.clearTimeout(this.timerID);
      (event.target as Element).setAttribute("data-playing", "false");
    }
  }
}
