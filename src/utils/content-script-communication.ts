
/**
 * Types of messages that can be sent to ContentScript listener for processing
 */
export enum CSMessageType {
    ActivationStateChange,
    DeleteChosenHighlight,
    StartQuiz,
}

/**
 * Message indicating new activated state to use
 */
export interface NewActivatedState {
    newActivatedState: boolean
}

type CSMessagePayload = NewActivatedState|null;

/**
 * Message that can be sent to content scripts
 */
export interface CSMessage {
    messageType: CSMessageType;
    payload?: CSMessagePayload;

}