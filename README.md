# RNBO Typescript Example

An example app for RNBO + Typescript that has a simple two synth sequencer.

## About

This library serves as a reference implementation for working with RNBO and Typescript. It builds a Web Audio app that uses [Cycling 74](https://cycling74.com/)'s RNBO Web export target.

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
