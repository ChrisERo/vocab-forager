import { BSMessageType, isAddNewDictRequest, isSetActivationRequest } from "./background-script-communication";

describe('Type Checks', () => {
    it.each([
        [{isActivated: true}, true],
        [{isActivated: false}, true],
        [{something: 47, isActivated: false}, true],
        [{isSomethingElse: false}, false],
        [{isSomethingElse: undefined}, false],
        [{isSomethingElse: null}, false],
        [null, false],
        [undefined, false],
    ])('Is %p a SetActivation request', (object: any, isSetActivationResult: boolean) => {
        expect(isSetActivationRequest(object)).toEqual(isSetActivationResult);
    });

    it.each([
        [{isActivated: true}, false],
        [{isActivated: false}, true],
        [{something: 47, isActivated: false}, true],
        [{isSomethingElse: false}, false],
        [{isSomethingElse: undefined}, false],
        [{isSomethingElse: null}, false],
        [null, false],
        [undefined, false],
    ])('Is %p a AddNewDictRequest request', (object: any, isRequestType: boolean) => {
        expect(isAddNewDictRequest(object)).toEqual(isRequestType);
    });

});