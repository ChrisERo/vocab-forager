import * as csc from './content-script-communication'

describe('Contet-Script-Communication Package', () => {
    it.each([
        [{isActivated: true}, false],
        [{newActivatedState: true}, true],
        [{newActivatedState: false}, true],
        [{}, false],
        [null, false],
        [undefined, false],
    ])('%# Is %p a NewActivatedState', (object: any, isRequestType: boolean) => {
        expect(csc.isNewActivatedState(object)).toEqual(isRequestType);
    });

    it.each([
        [{messageType: csc.CSMessageType.ActivationStateChange}, true],
        [{messageType: csc.CSMessageType.ActivationStateChange, payload: {newActivatedState: true}}, true],
        [{messageType: csc.CSMessageType.ChangeHighlightStyle}, true],
        [{messageType: csc.CSMessageType.DeleteChosenHighlight}, true],
        [{messageType: csc.CSMessageType.StartQuiz}, true],
        [{messageType: 'wish this would fail, but it will not'}, true],
        [{newActivatedState: true}, false],
        [{payload: csc.CSMessageType.ActivationStateChange}, false],
        [{}, false],
        [null, false],
        [undefined, false],
    ])('%# Is %p a CSMessage', (object: any, isRequestType: boolean) => {
        expect(csc.isCsMessage(object)).toEqual(isRequestType);
    });
});
