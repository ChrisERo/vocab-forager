import * as models from "./models";

describe('Type Checks', () => {
    it.each([
        [{isActivated: true}, false],
        [{dict: {name: 'spanishdict', url: 'https://www.test.com'}}, false], 
        [{nameFieldWrong: 'frenchdict', url: 'http://www.test.francois.com'}, false],
        [{url: 'http://www.missingName.com'}, false],
        [{name: 'missingUrl'}, false],
        [{name: 'frenchdict', url: 'http://www.test.francois.com'}, true],
        [{name: 'spanishdict', url: 'http://www.test.spanish.com'}, true],
        [null, false],
        [undefined, false],
    ])('Is %p a Dictionary', (object: any, isRequestType: boolean) => {
        expect(models.isDictionary(object)).toEqual(isRequestType);
    });

});