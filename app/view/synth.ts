import { type Parameter } from "@rnbo/js";
import { Synth } from "../model/synth";


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
