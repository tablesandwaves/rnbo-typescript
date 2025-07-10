import { MIDIEvent, type Device, type Parameter, type MIDIData } from "@rnbo/js";


const midiPort         = 0,
      midiChannel      = 0,
      midiOnVelocity   = 100,
      midiOffVelocity  = 100,
      noteDurationMs   = 250;


export class Synth {
  // The RNBO device.
  #device: Device;
  // These will allow us to ignore parameter update events while dragging the slider.
  #isDraggingSlider = false;
  #uiElements: any = {};


  constructor(device: Device, voiceNumber: number) {
    this.#device = device;
    this.#makeSliders(voiceNumber);
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



  #makeSliders(index: number) {
    this.#device.parameters.forEach(param => {
      let slider = this.#generateSlider(param, index);
      let text   = this.#generateParameterText(param, index);
      let sliderContainer = document.createElement("div");
      sliderContainer.appendChild(this.#generateLabel(param, index));
      sliderContainer.appendChild(slider);
      sliderContainer.appendChild(text);

      this.#watchParameterChanges(param, slider, text);

      // Store the slider and text by name so we can access them later
      this.#uiElements[param.id] = { slider, text };

      // Add the slider element
      document.querySelector(`#synth-${index} .rnbo-parameter-sliders`)!.appendChild(sliderContainer);
    });

    // Listen to parameter changes from the device
    this.#device.parameterChangeEvent.subscribe(param => {
      if (!this.#isDraggingSlider) this.#uiElements[param.id].slider.value = param.value;
      this.#uiElements[param.id].text.value = param.value.toFixed(1);
    });
  }


  #watchParameterChanges(param: Parameter, slider: HTMLInputElement, text: HTMLInputElement) {
    // Make each slider control its parameter
    slider.addEventListener("pointerdown", () => this.#isDraggingSlider = true);
    slider.addEventListener("pointerup", () => {
      this.#isDraggingSlider = false;
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


  #generateLabel(param: Parameter, index: number) {
    const label = document.createElement("label");

    label.setAttribute("for", `synth-${index}-${param.name}-slider`);
    label.setAttribute("class", "param-label");
    label.textContent = `${param.name}: `;

    return label;
  }


  #generateSlider(param: Parameter, index: number) {
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


  #generateParameterText(param: Parameter, index: number) {
    let text = document.createElement("input");

    text.setAttribute("name", `synth-${index}-${param.name}-text`)
    text.setAttribute("value", param.value.toFixed(1));
    text.setAttribute("type", "text");

    return text;
  }
}
