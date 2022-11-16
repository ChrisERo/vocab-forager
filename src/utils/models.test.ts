import * as models from "./models";

describe('Models Package', () => {
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
    ])('Force LightMode: %p', (opt: models.HighlightOptions | undefined) => {
        const result = models.enforceExplicityLightMode(opt);
        expect(models.isHighlightLight(result)).toEqual(true);
        if (opt !== undefined) {
            expect(models.isHighlightLight(opt)).toEqual(true);
        }
    });

    it.each([
        [undefined],
        [{fontColor: '#000000', backgroundColor: '#ffff01'}],
        [{fontColor: '#000000', backgroundColor: '#faff01'}],
        [{fontColor: '#000001', backgroundColor: '#faff01'}],
        [{fontColor: '#ffff01', backgroundColor: '#000000'}],
        [{backgroundColor: '#0008fa', fontColor: '#ffffff'}], 
    ])('Force DarkMode: %p', (opt: models.HighlightOptions | undefined) => {
        const result = models.enforceExplicityDarkMode(opt);
        expect(result.fontColor).toEqual('#ffffff');
        expect(result.backgroundColor).toEqual('#0008fa');
        if (opt !== undefined) {
            expect(opt.fontColor).toEqual('#ffffff');
            expect(opt.backgroundColor).toEqual('#0008fa');
        }
    });

    it.each([
        [{wordEntries: [], missingWords: []}, true],
        [{wordEntries: [], missingWords: ['foo']}, false],
        [{wordEntries: [{word: 'bar', startOffset: 13, endOffset: 16, nodePath: [[0, 1, 2,3, 4, 5]]}], missingWords: []}, false],
        [{wordEntries: [{word: 'bar', startOffset: 13, endOffset: 16, nodePath: [[0, 1, 2,3, 4, 5]]}], missingWords: ['foo']}, false],
    ])('Is %p empty', (data: models.SiteData, isEmpty: boolean) => {
        expect(models.isEmpty(data)).toEqual(isEmpty);
    });

    it.each([
        [null, false],
        [undefined, false],
        [{language: 'Español', index: 0}, true],
        [{index: 0}, false],
        [{language: 'Español'}, false],
        [{wordEntries: [], missingWords: ['foo', 'bar'] }, false],
        [{language: 45, index: 'I wish this would not work, but it does'}, true],
    ])('Is %p a DictionaryID', (object: any, isSiteData: boolean) => {
        expect(models.isDictionaryID(object)).toBe(isSiteData);
    });

    it.each([  
        [{language: 'Español', index: 0}, false],
        [{index: -1, language: 'E'}, false],
        [{index: 45, language: ''}, false],
        [{index: -2, language: ''}, false],
        [{index: -1, language: ''}, true],
    ])('Is %p a DictionaryID', (object: models.DictionaryIdentifier, isNull: boolean) => {
        expect(models.isNullDictionaryID(object)).toBe(isNull);
    });

    it.each([  
        [{languagesToResources: {}, currentDictionary: {index: -1, language: ''}}, []],
        [{languagesToResources: {'Español': []}, currentDictionary: {index: -1, language: ''}}, ['Español']],
        [{languagesToResources: {'Español': [{name: 'Google', url: 'https://www.google.com/{word}'}], 'Francois': [{name: 'GoogleFrance', url: 'https://www.google.com/french/{word}'}]}, currentDictionary: {index: -1, language: 'Español'}}, ['Español', 'Francois']],
        [{languagesToResources: {'Esp': [{name: 'SpanishDict', url: 'https://www.spanishdict.com/translate/{word}'}, {name: 'Google', url: 'https://www.google.com/{word}'}]}, currentDictionary: {index: 3, language: 'Esp'}}, ['Esp']],
        [{languagesToResources: {'Español': [{name: 'Google', url: 'https://www.google.com/{word}'}]}, currentDictionary: {index: -1, language: 'Español'}}, ['Español']],
    ])('%# Is %p a DictionaryID', (dictData: models.GlobalDictionaryData, expectedLanguages: string[]) => {
        let results = models.getLanguages(dictData);
        expect(results).toEqual(expect.arrayContaining(expectedLanguages));
        expect(results).toHaveLength(expectedLanguages.length);
        expect(new Set(results)).toHaveProperty('size', expectedLanguages.length);
    });
});
