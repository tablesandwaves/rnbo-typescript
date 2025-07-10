import { createDevice, type IPatcher } from "@rnbo/js";
import { StepSequencer } from "./sequencer";
import { Key, noteData, Scale } from "tblswvs";
import { Synth } from "./synth";


type SetupResponse = [context: AudioContext, synths: Synth[]];


const patcherExportURL = "export/simple-fm.export.json";
let sequencer: StepSequencer;


const setup = async (): Promise<SetupResponse> => {
  const context: AudioContext = new AudioContext();
  document.body.onclick = () => context.resume();

  const outputNode = context.createGain();
  outputNode.connect(context.destination);

  // Create the device, then their synths and then connect them to the web audio graph.
  let response  = await fetch(patcherExportURL);
  let patcher   = await response.json() as IPatcher;
  const synth1  = new Synth(await createDevice({patcher, context}), 0);
  const synth2  = new Synth(await createDevice({patcher, context}), 1);
  [synth1, synth2].forEach(synth => synth.device.node.connect(outputNode));

  loadRootNoteSelector();
  loadScaleSelector();

  return [context, [synth1, synth2]];
}


const loadScaleSelector = () => {
  const scales = Object.values(Scale).filter(s => typeof s === "string" && s !== "GS").sort();
  const scaleSelect = document.querySelector("#scale");
  scales.forEach(scale => {
    const option = document.createElement("option");
    option.setAttribute("value", "" + scale);
    option.innerText = "" + scale;
    if (scale === "Minor") option.selected = true;
    scaleSelect?.appendChild(option);
  });

  scaleSelect?.addEventListener("change", loadKey);
}


const loadRootNoteSelector = () => {
  const rootNoteSelect = document.querySelector("#root-note");
  noteData.slice(0, 12).forEach(note => {
    const option = document.createElement("option");
    option.setAttribute("value", note.note);
    option.innerText = note.note;
    rootNoteSelect?.appendChild(option);
  });

  rootNoteSelect?.addEventListener("change", loadKey);
}


const loadKey = () => {
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


setup()
  .then((contextAndSynths: SetupResponse) => {
    const [context, synths] = contextAndSynths;
    sequencer = new StepSequencer(context, synths);
    loadKey();
    document.querySelector("#playBtn")!.addEventListener("click", (event) => sequencer.togglePlayback(event));

    const bpmControl = document.querySelector("#bpm");
    const bpmValEl = document.querySelector("#bpmval");
    bpmControl!.addEventListener("input", (ev) => {
      sequencer.tempo = parseFloat((ev.target as HTMLInputElement)!.value);
      (bpmValEl as HTMLElement)!.innerText = "" + sequencer.tempo;
    }, false);
  }).catch(error => {
    console.error(error.message);
  });
