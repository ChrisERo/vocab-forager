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

    it.each([
        ['pyar', 0, 5, [[4, 5, 6, 2]]],
        ['my name is', 13, 1, [[4, 5, 6, 2], [3, 5, 6, 2]]],
    ])('Is %p a Dictionary', (word: string, 
        startIndex: number,endIndex: number, nodes
        ) => {
        const data = models.wordFromComponents(word, startIndex, endIndex, nodes);
        expect(data.word).toEqual(word);
        expect(data.startOffset).toEqual(startIndex);
        expect(data.endOffset).toEqual(endIndex);
        expect(data.nodePath).toEqual(nodes);
    });

    it.each([
        [null, false],
        [undefined, false],
        [{wordEntries: [], missingWords: []}, true],
        [{wordEntries: [], missingWords: ['foo', 'bar'] }, true],
        [{missingWords: ['foo', 'bar']}, false],
        [{wordEntries: [], missingWords: ['foo', 'bar'], highlightOptions: {fontColor: '#000000', backgroundColor: '#000000'} }, true],
        [{wordEntries: [], missingWords: ['foo', 'bar'], highlightOptions: {fontColor: '#000000'} }, false],
    ])('Is %p a SiteData', (object: any, isSiteData: boolean) => {
        expect(models.isSiteData(object)).toBe(isSiteData);
    });

});