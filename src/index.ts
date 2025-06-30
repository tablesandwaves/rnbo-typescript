import { createDevice, MIDIEvent, MessagePortType, MIDIData } from "@rnbo/js";


async function setup() {
  const patchExportURL = "export/simple-fm.export.json";
  let response = await fetch(patchExportURL);
  let patcher  = await response.json();
  const context: AudioContext = new AudioContext();

  // Create gain node and connect it to audio output
  const outputNode = context.createGain();
  outputNode.connect(context.destination);

  const device = await createDevice({ patcher, context });

  // (Optional) Load the samples
  // (Optional) Fetch the dependencies
  let dependencies: any[] = [];
  try {
    const dependenciesResponse = await fetch("export/dependencies.json");
    dependencies = await dependenciesResponse.json();

    // Prepend "export" to any file dependenciies
    dependencies = dependencies.map(d => d.file ? Object.assign({}, d, { file: "export/" + d.file }) : d);
  } catch (e) {}
  if (dependencies.length)
    await device.loadDataBufferDependencies(dependencies);

  // Connect the device to the web audio graph
  device.node.connect(outputNode);

  // (Optional) Extract the name and rnbo version of the patcher from the description
  document.getElementById("patcher-title")!.innerText = (patcher.desc.meta.filename || "Unnamed Patcher") + " (v" + patcher.desc.meta.rnboversion + ")";

  // (Optional) Automatically create sliders for the device parameters
  makeSliders(device);

  // (Optional) Create a form to send messages to RNBO inputs
  makeInportForm(device);

  // (Optional) Attach listeners to outports so you can log messages from the RNBO patcher
  attachOutports(device);

  // (Optional) Load presets, if any
  loadPresets(device, patcher);

  // (Optional) Connect MIDI inputs
  makeMIDIKeyboard(device);

  document.body.onclick = () => {
    context.resume();
  }
}


function makeSliders(device) {
  let pdiv = document.getElementById("rnbo-parameter-sliders");
  let noParamLabel = document.getElementById("no-param-label");
  if (noParamLabel && device.numParameters > 0) pdiv!.removeChild(noParamLabel);

  // This will allow us to ignore parameter update events while dragging the slider.
  let isDraggingSlider = false;
  let uiElements = {};

  device.parameters.forEach(param => {
    // Subpatchers also have params. If we want to expose top-level
    // params only, the best way to determine if a parameter is top level
    // or not is to exclude parameters with a '/' in them.
    // You can uncomment the following line if you don't want to include subpatcher params

    //if (param.id.includes("/")) return;

    // Create a label, an input slider and a value display
    let label = document.createElement("label");
    let slider = document.createElement("input");
    let text = document.createElement("input");
    let sliderContainer = document.createElement("div");
    sliderContainer.appendChild(label);
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(text);

    // Add a name for the label
    label.setAttribute("name", param.name);
    label.setAttribute("for", param.name);
    label.setAttribute("class", "param-label");
    label.textContent = `${param.name}: `;

    // Make each slider reflect its parameter
    slider.setAttribute("type", "range");
    slider.setAttribute("class", "param-slider");
    slider.setAttribute("id", param.id);
    slider.setAttribute("name", param.name);
    slider.setAttribute("min", param.min);
    slider.setAttribute("max", param.max);
    if (param.steps > 1) {
        slider.setAttribute("step", `${(param.max - param.min) / (param.steps - 1)}`);
    } else {
        slider.setAttribute("step", `${(param.max - param.min) / 1000.0}`);
    }
    slider.setAttribute("value", param.value);

    // Make a settable text input display for the value
    text.setAttribute("value", param.value.toFixed(1));
    text.setAttribute("type", "text");

    // Make each slider control its parameter
    slider.addEventListener("pointerdown", () => {
      isDraggingSlider = true;
    });
    slider.addEventListener("pointerup", () => {
      isDraggingSlider = false;
      slider.value = param.value;
      text.value = param.value.toFixed(1);
    });
    slider.addEventListener("input", () => {
        let value = Number.parseFloat(slider.value);
        param.value = value;
    });

    // Make the text box input control the parameter value as well
    text.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        let newValue = Number.parseFloat(text.value);
        if (isNaN(newValue)) {
          text.value = param.value;
        } else {
          newValue = Math.min(newValue, param.max);
          newValue = Math.max(newValue, param.min);
          text.value = "" + newValue;
          param.value = newValue;
        }
      }
    });

    // Store the slider and text by name so we can access them later
    uiElements[param.id] = { slider, text };

    // Add the slider element
    pdiv!.appendChild(sliderContainer);
  });

  // Listen to parameter changes from the device
  device.parameterChangeEvent.subscribe(param => {
    if (!isDraggingSlider)
      uiElements[param.id].slider.value = param.value;
    uiElements[param.id].text.value = param.value.toFixed(1);
  });
}

function makeInportForm(device) {
  const idiv = document.getElementById("rnbo-inports");
  const inportSelect = document.getElementById("inport-select") as HTMLSelectElement;
  const inportText = document.getElementById("inport-text") as HTMLInputElement;
  const inportForm = document.getElementById("inport-form");
  let inportTag: string;

  // Device messages correspond to inlets/outlets or inports/outports
  // You can filter for one or the other using the "type" of the message
  const messages = device.messages;
  const inports = messages.filter(message => message.type === MessagePortType.Inport);

  if (inports.length === 0) {
    const inportForm = document.getElementById("inport-form");
    if (inportForm)
      idiv!.removeChild(inportForm);
    return;
  } else {
    const noInportsLabel = document.getElementById("no-inports-label");
    if (noInportsLabel)
      idiv!.removeChild(noInportsLabel);
    inports.forEach(inport => {
      const option = document.createElement("option");
      option.innerText = inport.tag;
      inportSelect!.appendChild(option);
    });
    inportSelect!.onchange = () => inportTag = inportSelect!.value;
    inportTag = inportSelect!.value;

    // inportForm!.onsubmit = (ev) => {
    //     // Do this or else the page will reload
    //     ev.preventDefault();

    //     // Turn the text into a list of numbers (RNBO messages must be numbers, not text)
    //     const values = inportText!.value.split(/\s+/).map(s => parseFloat(s));

    //     // Send the message event to the RNBO device
    //     let messageEvent = new MessageEvent(TimeNow, inportTag, values);
    //     device.scheduleEvent(messageEvent);
    // }
  }
}

function attachOutports(device) {
  const outports = device.outports;
  if (outports.length < 1) {
    const rnboConsoleDiv = document.getElementById("rnbo-console-div");
    if (rnboConsoleDiv)
      document.getElementById("rnbo-console")!.removeChild(rnboConsoleDiv);
    return;
  }

  const noOutportsLabel = document.getElementById("no-outports-label");
  if (noOutportsLabel)
    document.getElementById("rnbo-console")!.removeChild(noOutportsLabel);

  device.messageEvent.subscribe((ev) => {
    // Ignore message events that don't belong to an outport
    if (outports.findIndex(elt => elt.tag === ev.tag) < 0) return;

    // Message events have a tag as well as a payload
    console.log(`${ev.tag}: ${ev.payload}`);

    document.getElementById("rnbo-console-readout")!.innerText = `${ev.tag}: ${ev.payload}`;
  });
}

function loadPresets(device, patcher) {
  let presets = patcher.presets || [];
  if (presets.length < 1) {
    const presetSelect = document.getElementById("preset-select");
    if (presetSelect)
      document.getElementById("rnbo-presets")!.removeChild(presetSelect);
    return;
  }

  const noPresetsLabel = document.getElementById("no-presets-label");
  if (noPresetsLabel)
    document.getElementById("rnbo-presets")!.removeChild(noPresetsLabel);

  let presetSelect = document.getElementById("preset-select") as HTMLSelectElement;
  presets.forEach((preset, index) => {
    const option = document.createElement("option");
    option.innerText = preset.name;
    option.value = index;
    presetSelect!.appendChild(option);
  });
  presetSelect!.onchange = () => device.setPreset(presets[presetSelect!.value].preset);
}

function makeMIDIKeyboard(device) {
  let mdiv = document.getElementById("rnbo-clickable-keyboard");
  if (device.numMIDIInputPorts === 0) return;

  const noMidiLabel = document.getElementById("no-midi-label");
  if (noMidiLabel)
    mdiv!.removeChild(noMidiLabel);

  const midiNotes = [49, 52, 56, 63];
  midiNotes.forEach(note => {
    const key = document.createElement("div");
    const label = document.createElement("p");
    label.textContent = "" + note;
    key.appendChild(label);
    key.addEventListener("pointerdown", () => {
      let midiChannel = 0;

      // Format a MIDI message paylaod, this constructs a MIDI on event
      let noteOnMessage: MIDIData = [
        144 + midiChannel, // Code for a note on: 10010000 & midi channel (0-15)
        note, // MIDI Note
        100 // MIDI Velocity
      ];

      let noteOffMessage: MIDIData = [
        128 + midiChannel, // Code for a note off: 10000000 & midi channel (0-15)
        note, // MIDI Note
        0 // MIDI Velocity
      ];

      // Including rnbo.min.js (or the unminified rnbo.js) will add the RNBO object
      // to the global namespace. This includes the TimeNow constant as well as
      // the MIDIEvent constructor.
      let midiPort = 0;
      let noteDurationMs = 1000;

      // When scheduling an event to occur in the future, use the current audio context time
      // multiplied by 1000 (converting seconds to milliseconds) for now.
      let noteOnEvent  = new MIDIEvent(device.context.currentTime * 1000, midiPort, noteOnMessage);
      let noteOffEvent = new MIDIEvent(device.context.currentTime * 1000 + noteDurationMs, midiPort, noteOffMessage);

      device.scheduleEvent(noteOnEvent);
      device.scheduleEvent(noteOffEvent);

      key.classList.add("clicked");
    });

    key.addEventListener("pointerup", () => key.classList.remove("clicked"));

    mdiv!.appendChild(key);
  });
}

setup();
