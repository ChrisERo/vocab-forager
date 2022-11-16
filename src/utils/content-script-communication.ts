
/**
 * Types of messages that can be sent to ContentScript listener for processing
 */
export enum CSMessageType {
    ActivationStateChange,
    DeleteChosenHighlight,
    StartQuiz,
    ChangeHighlightStyle,
}

/**
 * Message indicating new activated state to use
 */
export interface NewActivatedState {
    newActivatedState: boolean
}

/**
 * Returns true if and only if object provided is a NewActivatedState
 */
 export function isNewActivatedState(mssg: any): mssg is NewActivatedState {
    let temp = mssg as NewActivatedState;
    return temp != null && temp.newActivatedState !== undefined;
}

type CSMessagePayload = NewActivatedState|null;

/**
 * Message that can be sent to content scripts
 */
export interface CSMessage {
    messageType: CSMessageType;
    payload?: CSMessagePayload;
}

/**
 * Returns true if and only if object provided is a CSMessage
 */
 export function isCsMessage(mssg: any): mssg is CSMessage {
    let temp = mssg as CSMessage;
    return temp != null && temp.messageType !== undefined;
}