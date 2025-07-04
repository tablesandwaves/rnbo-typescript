import { createDevice, MIDIEvent, type Device, type MIDIData, type IPatcher, type Parameter } from "@rnbo/js";


const patcherExportURL = "export/simple-fm.export.json",
      midiNotes        = [49, 52, 56, 63],
      midiPort         = 0,
      midiChannel      = 0,
      midiOnVelocity   = 100,
      midiOffVelocity  = 100,
      noteDurationMs   = 1000;

let isDraggingSlider = false;


const setup = async () => {
  // Create the audio context, gain node and connect them
  const context: AudioContext = new AudioContext();
  const outputNode = context.createGain();
  outputNode.connect(context.destination);

  // Create the device and then connect it to the web audio graph
  let response = await fetch(patcherExportURL);
  let patcher  = await response.json() as IPatcher;
  const device = await createDevice({ patcher, context });
  device.node.connect(outputNode);

  // (Optional) Extract the name and rnbo version of the patcher from the description
  document.getElementById("patcher-title")!.innerText = patcher.desc.meta.filename + " (v" + patcher.desc.meta.rnboversion + ")";

  // (Optional) Automatically create sliders for the device parameters
  makeSliders(device);

  // (Optional) Load presets, if any
  loadPresets(device, patcher);

  // (Optional) Connect MIDI inputs
  makeMIDIKeyboard(device);

  document.body.onclick = () => {
    context.resume();
  }
}


const makeSliders = (device: Device) => {
  // This will allow us to ignore parameter update events while dragging the slider.
  // let isDraggingSlider = false;
  let uiElements: any = {};

  device.parameters.forEach(param => {
    let slider = generateSlider(param);
    let text   = generateParameterText(param);
    let sliderContainer = document.createElement("div");
    sliderContainer.appendChild(generateLabel(param));
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(text);

    watchParameterChanges(param, slider, text);

    // Store the slider and text by name so we can access them later
    uiElements[param.id] = { slider, text };

    // Add the slider element
    document.getElementById("rnbo-parameter-sliders")!.appendChild(sliderContainer);
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


const generateLabel = (param: Parameter) => {
  const label = document.createElement("label");

  label.setAttribute("name", param.name);
  label.setAttribute("for", param.name);
  label.setAttribute("class", "param-label");
  label.textContent = `${param.name}: `;

  return label;
}


const generateSlider = (param: Parameter) => {
  const slider = document.createElement("input");

  slider.setAttribute("type", "range");
  slider.setAttribute("class", "param-slider");
  slider.setAttribute("id", param.id);
  slider.setAttribute("name", param.name);
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


const generateParameterText = (param: Parameter) => {
  let text = document.createElement("input");

  text.setAttribute("value", param.value.toFixed(1));
  text.setAttribute("type", "text");

  return text;
}


const loadPresets = (device: Device, patcher: IPatcher) => {
  let presets: any = patcher.presets || [];

  let presetSelect = document.getElementById("preset-select") as HTMLSelectElement;
  presets.forEach((preset: any, index: number) => {
    const option = document.createElement("option");
    option.innerText = preset.name;
    option.value = "" + index;
    presetSelect!.appendChild(option);
  });
  presetSelect!.onchange = () => device.setPreset(presets[presetSelect!.value].preset);
}


const makeMIDIKeyboard = (device: Device) => {
  midiNotes.forEach(midiNoteNumber => {
    const key = document.createElement("div");
    const label = document.createElement("p");
    label.textContent = "" + midiNoteNumber;
    key.appendChild(label);
    key.addEventListener("pointerdown", () => {
      // Format a MIDI message paylaod, this constructs a MIDI on event
      // Code for a note on: 10010000 & midi channel (0-15)
      // Code for a note off: 10000000 & midi channel (0-15)
      let noteOnMessage:  MIDIData = [144 + midiChannel, midiNoteNumber, midiOnVelocity];
      let noteOffMessage: MIDIData = [128 + midiChannel, midiNoteNumber, midiOffVelocity];

      // When scheduling an event to occur in the future, use the current audio context time
      // multiplied by 1000 (converting seconds to milliseconds) for now.
      let noteOnEvent  = new MIDIEvent(device.context.currentTime * 1000, midiPort, noteOnMessage);
      let noteOffEvent = new MIDIEvent(device.context.currentTime * 1000 + noteDurationMs, midiPort, noteOffMessage);

      device.scheduleEvent(noteOnEvent);
      device.scheduleEvent(noteOffEvent);

      key.classList.add("clicked");
    });

    key.addEventListener("pointerup", () => key.classList.remove("clicked"));

    document.getElementById("rnbo-clickable-keyboard")!.appendChild(key);
  });
}


setup();
