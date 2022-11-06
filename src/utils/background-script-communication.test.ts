import * as bgcom from "./background-script-communication";

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
    ])('Is %p a SetActivation', (object: any, isSetActivationResult: boolean) => {
        expect(bgcom.isSetActivationRequest(object)).toEqual(isSetActivationResult);
    });

    it.each([
        [{isActivated: true}, false],
        [{lang: 'Spanish'}, false],
        [{dict: {name: 'spanishdict', url: 'https://www.test.com'}}, false],
        [{lang: 'Spanish', dict: {name: 'spanishdict', url: 'https://www.test.com'}}, true],
        [{lang: 'French', dict: {name: 'frenchdict', url: 'http://www.test.francois.com'}}, true],
        [{lang: 'FakeDict', dict: {url: 'http://www.missingName.com'}}, false],
        [{lang: 'FakeDict', dict: {name: 'missingUrl'}}, false],
        [{lang: 12345, dict: {name: 'frenchdict', url: 'http://www.test.francois.com'}}, true],
        [null, false],
        [undefined, false],
    ])('Is %p a AddNewDictRequest', (object: any, isRequestType: boolean) => {
        expect(bgcom.isAddNewDictRequest(object)).toEqual(isRequestType);
    });

    it.each([
        [{isActivated: true}, false],
        [{lang: 'Castellano'}, false],
        [{language: 'Castellano'}, true],
        [{language: 'Francais'}, true],
        [{language: 12345}, true],  // TODO: make it so that these types of checks return false due to string !== number
        [{dict: {name: 'spanishdict', url: 'https://www.test.com'}}, false],
        [null, false],
        [undefined, false],
    ])('Is %p a DictsOfLang', (object: any, isRequestType: boolean) => {
        expect(bgcom.isDictsOfLangRequest(object)).toEqual(isRequestType);
    });

    it.each([
        [{isActivated: true}, false],
        [{lang: 'Castellano'}, false],
        [{word: 'Castellano'}, true],
        [{word: 'Francais'}, true],
        [{word: 12345}, true],  // TODO: make it so that these types of checks return false due to string !== number
        [{dict: {name: 'spanishdict', url: 'https://www.test.com'}}, false],
        [null, false],
        [undefined, false],
    ])('Is %p a SearchRequest', (object: any, isRequestType: boolean) => {
        expect(bgcom.isSearchRequest(object)).toEqual(isRequestType);
    });

    it.each([
        [{isActivated: true}, false],
        [{url: 'https://www.google.com'}, false],
        [{url: 'https://www.google.com', data: {wordEntries: [], missingWords: []}}, true],
        [{url: 'https://www.test.net', data: {wordEntries: [], missingWords: ['pie']}}, true],
        [{url: 'https://www.test.net', data: {missingWords: ['pie']}}, false],
        [{url: 'https://www.test.net', data: {wordEntries: []}}, false],
        [null, false],
        [undefined, false],
    ])('Is %p a PageDataPiar', (object: any, isRequestType: boolean) => {
        expect(bgcom.isPageDataPair(object)).toEqual(isRequestType);
    });
});