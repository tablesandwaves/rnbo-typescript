import { MIDIEvent, type Device, type Parameter, type MIDIData } from "@rnbo/js";
import { makeSliders } from "../view/synth";


const midiPort         = 0,
      midiChannel      = 0,
      midiOnVelocity   = 100,
      midiOffVelocity  = 100,
      noteDurationMs   = 250;


export class Synth {
  // The RNBO device.
  #device: Device;
  // Keep track of parameters for update events while dragging the slider.
  uiElements: any = {};


  constructor(device: Device, voiceNumber: number) {
    this.#device = device;
    makeSliders(this, voiceNumber);
  }


  get device() {
    return this.#device;
  }


  playNote(midiNoteNumber: number) {
    let noteOnMessage:  MIDIData = [144 + midiChannel, midiNoteNumber, midiOnVelocity];
    let noteOffMessage: MIDIData = [128 + midiChannel, midiNoteNumber, midiOffVelocity];

    // When scheduling an event to occur in the future, use the current audio context time
    // multiplied by 1000 (converting seconds to milliseconds) for now.
    let noteOnEvent  = new MIDIEvent(this.#device.context.currentTime * 1000, midiPort, noteOnMessage);
    let noteOffEvent = new MIDIEvent(this.#device.context.currentTime * 1000 + noteDurationMs, midiPort, noteOffMessage);

    this.#device.scheduleEvent(noteOnEvent);
    this.#device.scheduleEvent(noteOffEvent);
  }


  updateParameters () {
    this.#device.parametersById.get("modulator")!.value = Math.round(Math.random() * 3) + 1;
    this.#device.parametersById.get("carrier")!.value   = Math.round(Math.random() * 10) + 1;
    this.#device.parametersById.get("index")!.value     = Math.round(Math.random() * 100) / 10;
  }
}
