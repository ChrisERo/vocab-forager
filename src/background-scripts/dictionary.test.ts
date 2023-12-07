import { SiteData, SeeSiteData, GlobalDictionaryData, Dictionary, DictionaryIdentifier, getLanguages } from "../utils/models";
import { DictionaryManager } from "./dictionary";
import { NonVolatileBrowserStorage } from "./non-volatile-browser-storage";

class MockDataStorage implements NonVolatileBrowserStorage {

    dictData: GlobalDictionaryData;

    constructor(dictData: GlobalDictionaryData) {
        this.dictData = dictData;
    }

    getCurrentActivation(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    setCurrentActivation(is_activated: boolean): void {
        throw new Error("Method not implemented.");
    }
    getPageData(site: string): Promise<SiteData> {
        throw new Error("Method not implemented.");
    }
    getAllPageUrls(): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    getAllDomains(): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    getSeeSiteDataOfDomain(schemeAndHost: string): Promise<SeeSiteData[]> {
        throw new Error("Method not implemented.");
    }
    getAllStorageData(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    storePageData(siteData: SiteData, page: string): void {
        throw new Error("Method not implemented.");
    }
    removePageData(url: string): void {
        throw new Error("Method not implemented.");
    }
    async getDictionaryData(): Promise<GlobalDictionaryData> {
       return this.dictData
    }
    setDictionaryData(gdd: GlobalDictionaryData): void {
        this.dictData = gdd;
    }
    uploadExtensionData(data: any): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

}

describe('Type Checks', () => {
    it.each([
        [
            'Add New Dict to empty data',
            {languagesToResources: {}, currentDictionary: {index: -1, language: ''}},
            {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
            'English',
            {language: 'English', index: 0},
            true
        ],
        [
            'Add New Dict to empty data Different Language',
            {languagesToResources: {}, currentDictionary: {index: -1, language: ''}},
            {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
            'American English',
            {language: 'American English', index: 0},
            true
        ],
        [
            'Add New Dict to non-empty data, but new language',
            {
                languagesToResources: {
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ]
                },
                currentDictionary: {index: 1, language: 'Spanish'}
            },
            {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
            'English',
            {language: 'Spanish', index: 1},
            true
        ],
        [
            'Add New Dict to non-empty data, existing language',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ]
                },
                currentDictionary: {index: 1, language: 'Spanish'}
            },
            {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
            'English',
            {language: 'Spanish', index: 1},
            true
        ],
        [
            'Add Existing Dict to same language',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ]
                },
                currentDictionary: {index: 1, language: 'Spanish'}
            },
            {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
            'English',
            {language: 'Spanish', index: 1},
            true
        ],
        [
            'Add Existing Dict to different language',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ]
                },
                currentDictionary: {index: 1, language: 'Spanish'}
            },
            {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
            'Spanish',
            {language: 'Spanish', index: 1},
            true
        ]
    ])('addDictionary: %s ', async (_testDescription: string,
        globalDictData: GlobalDictionaryData, dict: Dictionary, language: string, expectedCurrentDict: DictionaryIdentifier,
        shouldAddNewDict: boolean) => {
            const languagesPresentOg =  getLanguages(globalDictData);
            const ogLangCount = languagesPresentOg.length;
            let ogDictCount = 0;
            languagesPresentOg.forEach(lang => {
                let count = globalDictData.languagesToResources[lang].length;
                ogDictCount+= count;
            });

            const storage = new MockDataStorage(globalDictData);
            const dictManager = new DictionaryManager(storage);
            await dictManager.addDictionary(dict, language);

            expect(globalDictData.languagesToResources[language]).toContain(dict);
            expect(globalDictData.currentDictionary).toStrictEqual(expectedCurrentDict)

            const newLanguagesPresent =  getLanguages(globalDictData);
            const newLangCount = languagesPresentOg.length;
            let newDictCount = 0;
            newLanguagesPresent.forEach(lang => {
                let count = globalDictData.languagesToResources[lang].length;
                newDictCount += count;
            });
            expect(newLangCount).toBeGreaterThanOrEqual(ogLangCount)
            expect(newDictCount).toEqual(ogDictCount + (shouldAddNewDict ? 1 : 0));
    });
});