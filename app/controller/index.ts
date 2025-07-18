import { createDevice, type IPatcher } from "@rnbo/js";
import { StepSequencer, type SequencerConfiguration } from "../model/sequencer";
import { Synth } from "../model/synth";
import * as sequencerUI from "../view/sequencer";


const patcherExportURL = "export/simple-fm.export.json";


const setup = async (): Promise<SequencerConfiguration> => {
  const context: AudioContext = new AudioContext();
  document.body.onclick = () => context.resume();

  const outputNode = context.createGain();
  outputNode.connect(context.destination);

  // Create the device, then their synths and then connect them to the web audio graph.
  let response = await fetch(patcherExportURL);
  let patcher  = await response.json() as IPatcher;
  const synth1 = new Synth(await createDevice({patcher, context}), 0);
  const synth2 = new Synth(await createDevice({patcher, context}), 1);
  [synth1, synth2].forEach(synth => synth.device.node.connect(outputNode));

  return [context, [synth1, synth2]];
}


setup()
  .then((sequencerConfig: SequencerConfiguration) => {

    const stepCount = parseInt((document.querySelector("input#steps") as HTMLInputElement).value);
    const sequencer = new StepSequencer(...sequencerConfig, stepCount);

    sequencerUI.loadKey(sequencer);
    sequencerUI.loadRootNoteSelector(sequencer);
    sequencerUI.loadScaleSelector(sequencer);
    sequencerUI.loadSteps(sequencer, stepCount);
    sequencerUI.loadBpmControls(sequencer);
    sequencerUI.watchStepCounts(sequencer);
    sequencerUI.loadPlaybackControl(sequencer);

  }).catch(error => {
    console.error(error.message);
  });
