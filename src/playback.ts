import { MIDIEvent, type Device, type MIDIData } from "@rnbo/js";
import { Synth } from "./synth";


const midiPort         = 0,
      midiChannel      = 0,
      midiOnVelocity   = 100,
      midiOffVelocity  = 100,
      noteDurationMs   = 250;


export const playNote = (synth: Synth, midiNoteNumber: number) => {
  let noteOnMessage:  MIDIData = [144 + midiChannel, midiNoteNumber, midiOnVelocity];
  let noteOffMessage: MIDIData = [128 + midiChannel, midiNoteNumber, midiOffVelocity];

  // When scheduling an event to occur in the future, use the current audio context time
  // multiplied by 1000 (converting seconds to milliseconds) for now.
  let noteOnEvent  = new MIDIEvent(synth.device.context.currentTime * 1000, midiPort, noteOnMessage);
  let noteOffEvent = new MIDIEvent(synth.device.context.currentTime * 1000 + noteDurationMs, midiPort, noteOffMessage);

  synth.device.scheduleEvent(noteOnEvent);
  synth.device.scheduleEvent(noteOffEvent);
}


export const updateParameters = (synth: Synth) => {
  synth.device.parametersById.get("modulator")!.value = Math.round(Math.random() * 3) + 1;
  synth.device.parametersById.get("carrier")!.value   = Math.round(Math.random() * 10) + 1;
  synth.device.parametersById.get("index")!.value     = Math.round(Math.random() * 100) / 10;
}
