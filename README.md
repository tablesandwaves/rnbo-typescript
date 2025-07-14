# RNBO Typescript Example

An example app for RNBO + Typescript that has a simple two synth sequencer.

## About

This codebase serves as a reference implementation for working with RNBO and Typescript. It builds a Web Audio app that uses [Cycling 74](https://cycling74.com/)'s RNBO Web export target. The app does not do much, but it demonstrates a few things:

* Loading and playing multiple instances of a RNBO patcher
* A complete Typescript app using RNBO

The RNBO patcher functionality is based on Cycling 74's [JavaScript tutorial for RNBO](https://rnbo.cycling74.com/learn/getting-the-rnbojs-library).

The sequencer is an adaptation the Mozilla Developer Network [Step Sequencer example](https://github.com/mdn/webaudio-examples/tree/main/step-sequencer) for Web Audio.

### RNBO Patcher

To open the source RNBO patcher, see the `rnbo` directory. A copy of the RNBO device's Web Audio export is saved in the `export` directory.

### Running Version

A running version can be seen here:

[https://tablesandwaves.github.io/rnbo-typescript/](https://tablesandwaves.github.io/rnbo-typescript/)

### What does it do?

This app has a two voice sequencer. Each voice is an independent instance of the same simple RNBO FM synthesizer. You can also play individual notes using the **Scale Degree Keyboard** buttons to test the sound with the current parameter settings.

#### Sequencer Features

* Start/stop transport
* Adjust BPM
* Adjust the active step count between 2 and 16 steps
* Select a root note/tonic
* Select a scale
* Activate/deactivate steps

The sequencer will play random notes for each active step. Each row of sequencer steps corresponds to one of the two synths. For each active step when a random scale note is played, it will also determine whether or not to randomize some of the synthesis parameters.

#### Synth Features

* Respond to sequencer steps
* Respond to the scale degree keyboard
* Adjust synthesizer parameters



### Installation

From the root directory:

```bash
$ npm install
$ npm run build
```

The app builds into the `dist` directory. Once the build creates the file `dist/js/main.js`, the files must be loaded in your browser using a server. Common options for doing this include:

* Copy the contents of the `dist` directory to an existing web server
* Run a Web Server using [VS Code](https://code.visualstudio.com/)
* Run the [Node.js web server](https://www.npmjs.com/package/http-server) via `npx http-server`

### Dependencies

This Node.js app uses the following libraries.

* @rnbo/js - Cycling 74's RNBO JavaScript library
* tblswvs.js - my own library used for scale-awareness
* typescript - it's Typescript code
* esbuild - dev dependency for building
* npm-run-all - dev dependency for build on save (my concern)

## Code Structure

This app is organized using the Model-View-Controller design pattern. Objects that store state, the `StepSequencer` and the `Synth`, are model objects. All dynamic UI elements created with JavaScript are implemented as functions within the `app/view/` path.

The state based objects are implemented using JavaScript classes. The `StepSequencer` and `Synth` classes are found in the `app/model/` path.

View code is implemented as standalone functions. Since the functions do not need to persist state they are not encapsulated in classes. Their purpose is to load and respond to UI interaction (JS Events) and as such they implement immediate updates to the HTML DOM.

This app has a single page, so there is only an index controller. Its job is simply to load the RNBO patcher file from which it creates the `Synth`s' devices and then load the `StepSequencer` and finally setup all user interface interactions.
