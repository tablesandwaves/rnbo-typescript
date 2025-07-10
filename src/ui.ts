import { Key, noteData, Scale } from "tblswvs";
import type { StepSequencer } from "./sequencer";


export const loadScaleSelector = (sequencer: StepSequencer) => {
  const scales = Object.values(Scale).filter(s => typeof s === "string" && s !== "GS").sort();
  const scaleSelect = document.querySelector("select#scale");
  scales.forEach(scale => {
    const option = document.createElement("option");
    option.setAttribute("value", "" + scale);
    option.innerText = "" + scale;
    if (scale === "Minor") option.selected = true;
    scaleSelect?.appendChild(option);
  });

  scaleSelect?.addEventListener("change", () => loadKey(sequencer));
}


export const loadRootNoteSelector = (sequencer: StepSequencer) => {
  const rootNoteSelect = document.querySelector("#root-note");

  noteData.slice(0, 12).forEach(note => {
    const option = document.createElement("option");
    option.setAttribute("value", note.note);
    option.innerText = note.note;
    rootNoteSelect?.appendChild(option);
  });

  rootNoteSelect?.addEventListener("change", () => loadKey(sequencer));
}


export const loadKey = (sequencer: StepSequencer) => {
  const tonic           = (document.querySelector("select#root-note") as HTMLSelectElement).value;
  const scaleName       = (document.querySelector("select#scale") as HTMLSelectElement).value;
  const scale           = Scale[scaleName as keyof typeof Scale];
  const keyboardWrapper = document.querySelector("#scale-degree-keyboard");

  document.querySelectorAll(".scale-button").forEach(div => div.parentElement?.removeChild(div));

  sequencer.key = new Key(tonic, scale);
  sequencer.key.mode.scaleOffsets.forEach((_, i) => {
    const div = document.createElement("div");
    div.classList.add("scale-button");
    div.setAttribute("data-midi-number", "" + (sequencer.key!.midiTonic + i));
    div.innerText = "" + (i + 1);
    keyboardWrapper?.appendChild(div);
  });

  document.querySelectorAll(".scale-button").forEach(scaleButton => {
    scaleButton.addEventListener("pointerdown", () => {
      const deviceIndex = parseInt((document.querySelector("select#device-selector") as HTMLSelectElement).value);

      const midiNoteNumber = scaleButton.getAttribute("data-midi-number");
      if (midiNoteNumber) {
        sequencer.synths[deviceIndex]!.playNote(parseInt(midiNoteNumber) + 48);
        scaleButton.classList.add("clicked");
      }
    });

    scaleButton.addEventListener("pointerup", () => scaleButton.classList.remove("clicked"));
  });
}
