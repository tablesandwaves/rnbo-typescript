import { createDevice, type IPatcher } from "@rnbo/js";
import { StepSequencer, type SequencerConfiguration } from "./sequencer";
import { Synth } from "./synth";
import { loadRootNoteSelector, loadScaleSelector, loadKey, loadSteps, loadBpmControls, loadPlaybackControl } from "./ui";


const patcherExportURL = "export/simple-fm.export.json";
let sequencer: StepSequencer;


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

    sequencer = new StepSequencer(...sequencerConfig);

    loadKey(sequencer);
    loadRootNoteSelector(sequencer);
    loadScaleSelector(sequencer);
    loadSteps(sequencer);
    loadBpmControls(sequencer);
    loadPlaybackControl(sequencer);

  }).catch(error => {
    console.error(error.message);
  });
