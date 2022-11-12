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
        [{fontColor: '#000000', backgroundColor: '#FFFFFF'}, true],
        [{fontColor: '#123456', backgroundColor: '#789ABC'}, true],
        [{backgroundColor: '#789ABC'}, false],
        [{fontColor: '#123456'}, false],
    ])('Is %p a HighlightOption', (object: any, isSiteData: boolean) => {
        expect(models.isHighlightOption(object)).toBe(isSiteData);
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
    
    it.each([
        [undefined, false],
        [{fontColor: '#000000', backgroundColor: '#ffff01'}, true],
        [{fontColor: '#000000', backgroundColor: '#faff01'}, false],
        [{fontColor: '#000001', backgroundColor: '#faff01'}, false],
        [{fontColor: '#ffff01', backgroundColor: '#000000'}, false],
        [{backgroundColor: '#0008fa', fontColor: '#ffffff'}, false],
        
    ])('Is %p LightMode', (opt: models.HighlightOptions | undefined, isLightMode: boolean) => {
        expect(models.isHighlightLight(opt)).toBe(isLightMode);
    });

    it.each([
        [undefined],
        [{fontColor: '#000000', backgroundColor: '#ffff01'}],
        [{fontColor: '#000000', backgroundColor: '#faff01'}],
        [{fontColor: '#000001', backgroundColor: '#faff01'}],
        [{fontColor: '#ffff01', backgroundColor: '#000000'}],
        [{backgroundColor: '#0008fa', fontColor: '#ffffff'}], 
    ])('Force LightMode: %pe', (opt: models.HighlightOptions | undefined) => {
        const result = models.enforceExplicityLightMode(opt);
        expect(models.isHighlightLight(result)).toEqual(true);
        if (opt !== undefined) {
            expect(models.isHighlightLight(opt)).toEqual(true);
        }
    });

});