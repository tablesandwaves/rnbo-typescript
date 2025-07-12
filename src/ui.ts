import { type Parameter } from "@rnbo/js";
import { Key, noteData, Scale } from "tblswvs";
import { StepSequencer } from "./sequencer";
import type { Synth } from "./synth";


// SCALE DEGREE KEYBOARD

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


// SYNTH

// These will allow us to ignore parameter update events while dragging the slider.
let isDraggingSlider = false;


export const makeSliders = (synth: Synth, index: number) => {
  synth.device.parameters.forEach(param => {
    let slider = generateSlider(param, index);
    let text   = generateParameterText(param, index);
    let sliderContainer = document.createElement("div");
    sliderContainer.appendChild(generateLabel(param, index));
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(text);

    watchParameterChanges(param, slider, text);

    // Store the slider and text by name so we can access them later
    synth.uiElements[param.id] = { slider, text };

    // Add the slider element
    document.querySelector(`#synth-${index} .rnbo-parameter-sliders`)!.appendChild(sliderContainer);
  });

  // Listen to parameter changes from the device
  synth.device.parameterChangeEvent.subscribe(param => {
    if (!isDraggingSlider) synth.uiElements[param.id].slider.value = param.value;
    synth.uiElements[param.id].text.value = param.value.toFixed(1);
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


// SEQUENCER

const MAX_STEP_COUNT = 16;

// Draw function to update the UI, so we can see when the beat progress.
// This is a loop: it reschedules itself to redraw at the end.
export const draw = (sequencer: StepSequencer) => {
  let step = sequencer.lastStep;
  const currentTime = sequencer.audioContext.currentTime;

  while (sequencer.stepsInQueue.length && sequencer.stepsInQueue[0]!.time < currentTime) {
    step = sequencer.stepsInQueue[0]!.index;
    sequencer.stepsInQueue.shift(); // Remove step from queue
  }

  // We only need to draw if the note has moved.
  if (sequencer.lastStep !== step) {
    document.querySelector(`#step-${sequencer.lastStep}`)!.classList.remove("active");
    document.querySelector(`#step-${step}`)!.classList.add("active");
    sequencer.lastStep = step;
  }
  // Set up to draw again
  requestAnimationFrame(() => draw(sequencer));
}


export const loadSteps = (sequencer: StepSequencer, stepCount: number) => {
  const stepMarkers = document.querySelector("section#step-markers");

  document.querySelectorAll("section.voice-steps").forEach((padGroup, voiceIndex) => {
    for (let stepIndex = 0; stepIndex < MAX_STEP_COUNT; stepIndex++) {
      const input = document.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("id", `voice-${voiceIndex}-step-${stepIndex}`);
      if (stepIndex < stepCount) input.classList.add("enabled");

      input.addEventListener("change", () =>
        sequencer.sequence[voiceIndex]![stepIndex] = input.checked ? 1 : 0);

      const label = document.createElement("label");
      label.setAttribute("for", `voice-${voiceIndex}-step-${stepIndex}`);
      label.textContent = `Voice ${voiceIndex}, Step ${stepIndex}`;

      padGroup.appendChild(input);
      padGroup.appendChild(label);

      if (voiceIndex === 0) {
        const stepMarker = document.createElement("span");
        stepMarker.setAttribute("class", "step");
        stepMarker.setAttribute("id", `step-${stepIndex}`);
        if (stepIndex < stepCount) stepMarker.classList.add("enabled")

        stepMarkers?.appendChild(stepMarker);
      }
    }
  });
}


export const loadBpmControls = (sequencer: StepSequencer) => {
  const bpmControl = document.querySelector("#bpm");
  const bpmValEl = document.querySelector("#bpmval");
  bpmControl!.addEventListener("input", (ev) => {
    sequencer.tempo = parseFloat((ev.target as HTMLInputElement)!.value);
    (bpmValEl as HTMLElement)!.innerText = "" + sequencer.tempo;
  }, false);
}


export const loadPlaybackControl = (sequencer: StepSequencer) => {
  document.querySelector("#playBtn")!.addEventListener("click", () => sequencer.togglePlayback());
}


export const watchStepCounts = (sequencer: StepSequencer) => {
  document.querySelector("input#steps")?.addEventListener("change", (event) => {
    if (event.target !== null) {
      const stepCount = parseInt((event.target as HTMLInputElement).value);
      sequencer.stepCount = stepCount;
      updateSteps(stepCount);

      document.querySelector("#step-val")!.textContent = "" + stepCount;
    }
  });
}


const updateSteps = (stepCount: number) => {
  document.querySelectorAll("section.voice-steps").forEach((padGroup, voiceIndex) => {
    for (let stepIndex = 0; stepIndex < MAX_STEP_COUNT; stepIndex++) {
      const input = document.querySelector(`#voice-${voiceIndex}-step-${stepIndex}`);
      if (input)
        stepIndex < stepCount ?
        input.classList.add("enabled") :
        input.classList.remove("enabled");

      const span = document.querySelector(`#step-${stepIndex}`);
      if (span)
        stepIndex < stepCount ?
        span.classList.add("enabled") :
        span.classList.remove("enabled");
    }
  });
}
