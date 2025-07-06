/**
 * An object oriented port of the MDN Audio Examples step sequencer:
 * https://github.com/mdn/webaudio-examples/tree/main/step-sequencer
 */

import { type Device } from "@rnbo/js";
import { playNote } from "./playback";


type queuedNote = {
  note: number,
  time: number
}


export class StepSequencer {
  audioContext: AudioContext;
  tempo = 120;
  // How frequently to call scheduling function (in milliseconds)
  lookahead = 25.0;
  // How far ahead to schedule audio (sec)
  scheduleAheadTime = 0.1;
  // The note we are currently playing
  currentNote = 0;
  // When the next note is due
  nextNoteTime = 0.0;
  // UI elements that correspond to sequencer steps
  pads: NodeListOf<Element>;
  // Create a queue for the notes that are to be played,
  // with the current time that we want them to play:
  notesInQueue: queuedNote[] = [];
  timerID: NodeJS.Timeout | undefined;
  // Start at last note drawn so first time used it wraps back to index 0
  lastNoteDrawn: number;
  stepCount: number;
  isPlaying = false;
  devices: Device[] = [];


  constructor(audioContext: AudioContext, devices: Device[]) {
    this.audioContext = audioContext;
    this.devices      = devices;

    this.pads          = document.querySelectorAll(".pads");
    this.stepCount     = document.querySelectorAll(".pads label").length / this.devices.length;
    this.lastNoteDrawn = this.stepCount - 1;
  }


  nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += secondsPerBeat; // Add beat length to last beat time

    // Advance the beat number, wrap to zero when reaching 4
    this.currentNote = (this.currentNote + 1) % this.stepCount;
  }


  scheduleNote(beatNumber: number, time: number) {
    // Push the note into the queue, even if we're not playing.
    this.notesInQueue.push({ note: beatNumber, time: time });

    if (this.pads[0]!.querySelectorAll("input")![beatNumber]!.checked) {
      // Play first voice
      const midiNoteNumber = Math.floor(Math.random() * 12) + 48;
      playNote(this.devices[0]!, midiNoteNumber);
    }
    if (this.pads[1]!.querySelectorAll("input")![beatNumber]!.checked) {
      // Play second voice
      const midiNoteNumber = Math.floor(Math.random() * 12) + 48;
      playNote(this.devices[1]!, midiNoteNumber);
    }
  }


  // While there are notes that will need to play before the next interval,
  // schedule them and advance the pointer.
  scheduler(sequencer: StepSequencer) {
    while (sequencer.nextNoteTime < sequencer.audioContext.currentTime + sequencer.scheduleAheadTime) {
      sequencer.scheduleNote(sequencer.currentNote, sequencer.nextNoteTime);
      sequencer.nextNote();
    }
    sequencer.timerID = setTimeout(() => {
      sequencer.scheduler(sequencer);
    }, sequencer.lookahead);
  }


  // Draw function to update the UI, so we can see when the beat progress.
  // This is a loop: it reschedules itself to redraw at the end.
  draw(sequencer: StepSequencer) {
    let drawNote = sequencer.lastNoteDrawn;
    const currentTime = sequencer.audioContext.currentTime;

    while (sequencer.notesInQueue.length && sequencer.notesInQueue[0]!.time < currentTime) {
      drawNote = sequencer.notesInQueue[0]!.note;
      sequencer.notesInQueue.shift(); // Remove note from queue
    }

    // We only need to draw if the note has moved.
    if (sequencer.lastNoteDrawn !== drawNote) {
      sequencer.pads.forEach((pad) => {
        pad.children[this.lastNoteDrawn * 2]!.setAttribute("style", "border-color: var(--black)");
        // pad.children[this.lastNoteDrawn * 2]!.style.borderColor = "var(--black)";
        pad.children[drawNote * 2]!.setAttribute("style", "border-color: var(--yellow)");
        // pad.children[drawNote * 2]!.style.borderColor = "var(--yellow)";
      });

      sequencer.lastNoteDrawn = drawNote;
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

      this.currentNote = 0;
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
