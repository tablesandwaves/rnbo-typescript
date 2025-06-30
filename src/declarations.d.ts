interface AudioContext {
    state: string;
    close: () => void;
    createMediaStreamSource: () => MediaStreamAudioSourceNode;
    createMediaStreamDestination: () => any;
    resume: () => void;
    suspend: () => void;
}
