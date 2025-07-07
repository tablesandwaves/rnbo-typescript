import { MIDIEvent, type Device, type MIDIData } from "@rnbo/js";


const midiPort         = 0,
      midiChannel      = 0,
      midiOnVelocity   = 100,
      midiOffVelocity  = 100,
      noteDurationMs   = 250;


export const playNote = (device: Device, midiNoteNumber: number) => {
  let noteOnMessage:  MIDIData = [144 + midiChannel, midiNoteNumber, midiOnVelocity];
  let noteOffMessage: MIDIData = [128 + midiChannel, midiNoteNumber, midiOffVelocity];

  // When scheduling an event to occur in the future, use the current audio context time
  // multiplied by 1000 (converting seconds to milliseconds) for now.
  let noteOnEvent  = new MIDIEvent(device.context.currentTime * 1000, midiPort, noteOnMessage);
  let noteOffEvent = new MIDIEvent(device.context.currentTime * 1000 + noteDurationMs, midiPort, noteOffMessage);

  device.scheduleEvent(noteOnEvent);
  device.scheduleEvent(noteOffEvent);
}


export const updateParameters = (device: Device) => {
  device.parametersById.get("modulator")!.value = Math.round(Math.random() * 3) + 1;
  device.parametersById.get("carrier")!.value   = Math.round(Math.random() * 3) + 1;
  device.parametersById.get("index")!.value     = Math.round(Math.random() * 50) / 10;
}
