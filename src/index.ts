import { createDevice, type Device, type IPatcher, type Parameter } from "@rnbo/js";
import { StepSequencer } from "./sequencer";
import { playNote } from "./playback";
import { Key, noteData, Scale } from "tblswvs";


type SetupResponse = [context: AudioContext, devices: Device[]];


const patcherExportURL = "export/simple-fm.export.json";

let isDraggingSlider = false,
    sequencer: StepSequencer;


const setup = async (): Promise<SetupResponse> => {
  // Create the audio context, gain node and connect them
  const context: AudioContext = new AudioContext();
  const outputNode = context.createGain();
  outputNode.connect(context.destination);

  // Create the device and then connect it to the web audio graph
  let response  = await fetch(patcherExportURL);
  let patcher   = await response.json() as IPatcher;
  const device1 = await createDevice({ patcher, context });
  const device2 = await createDevice({ patcher, context });

  [device1, device2].forEach((device, i) => {
    device.node.connect(outputNode);

    makeSliders(device, i);
  });

  document.body.onclick = () => {
    context.resume();
  }

  loadRootNoteSelector();
  loadScaleSelector();

  return [context, [device1, device2]];
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


const makeSliders = (device: Device, index: number) => {
  // This will allow us to ignore parameter update events while dragging the slider.
  // let isDraggingSlider = false;
  let uiElements: any = {};

  device.parameters.forEach(param => {
    let slider = generateSlider(param, index);
    let text   = generateParameterText(param, index);
    let sliderContainer = document.createElement("div");
    sliderContainer.appendChild(generateLabel(param, index));
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(text);

    watchParameterChanges(param, slider, text);

    // Store the slider and text by name so we can access them later
    uiElements[param.id] = { slider, text };

    // Add the slider element
    document.querySelector(`#synth-${index} .rnbo-parameter-sliders`)!.appendChild(sliderContainer);
  });

  // Listen to parameter changes from the device
  device.parameterChangeEvent.subscribe(param => {
    if (!isDraggingSlider) uiElements[param.id].slider.value = param.value;
    uiElements[param.id].text.value = param.value.toFixed(1);
  });
}


const watchParameterChanges = (param: Parameter, slider: HTMLInputElement, text: HTMLInputElement) => {
  // Make each slider control its parameter
  slider.addEventListener("pointerdown", () => isDraggingSlider = true);
  slider.addEventListener("pointerup", () => {
    isDraggingSlider = false;
    slider.value = "" + param.value;
    text.value = param.value.toFixed(1);
  });
  slider.addEventListener("input", () => param.value = Number.parseFloat(slider.value));

  // Make the text box input control the parameter value as well
  text.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      let newValue = Number.parseFloat(text.value);
      if (isNaN(newValue)) {
        text.value = "" + param.value;
      } else {
        newValue = Math.min(newValue, param.max);
        newValue = Math.max(newValue, param.min);
        text.value = "" + newValue;
        param.value = newValue;
      }
    }
  });
}


const generateLabel = (param: Parameter, index: number) => {
  const label = document.createElement("label");

  label.setAttribute("for", `synth-${index}-${param.name}-slider`);
  label.setAttribute("class", "param-label");
  label.textContent = `${param.name}: `;

  return label;
}


const generateSlider = (param: Parameter, index: number) => {
  const slider = document.createElement("input");

  slider.setAttribute("type", "range");
  slider.setAttribute("class", "param-slider");
  slider.setAttribute("id", `synth-${index}-${param.id}-slider`);
  slider.setAttribute("name", `synth-${index}-${param.name}-slider`);
  slider.setAttribute("min", "" + param.min);
  slider.setAttribute("max", "" + param.max);
  if (param.steps > 1) {
    slider.setAttribute("step", `${(param.max - param.min) / (param.steps - 1)}`);
  } else {
    slider.setAttribute("step", `${(param.max - param.min) / 1000.0}`);
  }
  slider.setAttribute("value", "" + param.value);

  return slider;
}


const generateParameterText = (param: Parameter, index: number) => {
  let text = document.createElement("input");

  text.setAttribute("name", `synth-${index}-${param.name}-text`)
  text.setAttribute("value", param.value.toFixed(1));
  text.setAttribute("type", "text");

  return text;
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
        playNote(sequencer.devices[deviceIndex]!, parseInt(midiNoteNumber) + 48);
        scaleButton.classList.add("clicked");
      }
    });

    scaleButton.addEventListener("pointerup", () => scaleButton.classList.remove("clicked"));
  });
}


setup()
  .then((contextAndDevices: SetupResponse) => {
    const [context, devices] = contextAndDevices;
    sequencer = new StepSequencer(context, devices);
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
