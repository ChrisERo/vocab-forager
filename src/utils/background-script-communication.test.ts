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
        [{isActivated: false}, false],
        [{lang: 'Spanish'}, false],
        [{dict: {name: 'spanishdict', url: 'https://www.test.com'}}, false],
        [{lang: 'Spanish', dict: {name: 'spanishdict', url: 'https://www.test.com'}}, true],
        [{lang: 'French', dict: {name: 'frenchdict', url: 'http://www.test.francois.com'}}, true],
        [{lang: 'FakeDict', dict: {url: 'http://www.missingName.com'}}, false],
        [{lang: 'FakeDict', dict: {name: 'missingUrl'}}, false],
        [{lang: 12345, dict: {name: 'frenchdict', url: 'http://www.test.francois.com'}}, true],
        [null, false],
        [undefined, false],
    ])('Is %p a AddNewDictRequest request', (object: any, isRequestType: boolean) => {
        expect(isAddNewDictRequest(object)).toEqual(isRequestType);
    });

});