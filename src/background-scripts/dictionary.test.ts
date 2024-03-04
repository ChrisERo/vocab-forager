import { SiteData, SeeSiteData, GlobalDictionaryData, Dictionary, DictionaryIdentifier, getLanguages } from "../utils/models";
import { DictionaryManager } from "./dictionary";
import { NonVolatileBrowserStorage } from "./non-volatile-browser-storage";

export class MockDataStorage implements NonVolatileBrowserStorage {

    dictData: GlobalDictionaryData;

    currentActivation: boolean;

    constructor(dictData: GlobalDictionaryData) {
        this.dictData = dictData;
        this.currentActivation = false;
    }

    getCurrentActivation(): Promise<boolean> {
        return new Promise<boolean>((resolve) => resolve(this.currentActivation));
    }
    setCurrentActivation(is_activated: boolean): Promise<void> {
        this.currentActivation = is_activated;
        return Promise.resolve();
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
    setDictionaryData(gdd: GlobalDictionaryData): Promise<void> {
        this.dictData = gdd;
        return Promise.resolve();
    }
    uploadExtensionData(data: any): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

}

function getDictCountByLanguage(dictData: GlobalDictionaryData, language: string): number {
    return dictData.languagesToResources[language].length;
}

function getTotalNumberOfDictionaries(globalDictData: GlobalDictionaryData): number {
    const newLanguagesPresent =  getLanguages(globalDictData);
    let dictAgregator = 0;
    newLanguagesPresent.forEach(lang => {
        let count = getDictCountByLanguage(globalDictData, lang);
        dictAgregator += count;
    });

    return dictAgregator;
}

const EMPTY_DICT_INDEX: DictionaryIdentifier = {language: '', index: -1};
const EMPTY_DICT: Dictionary = {name: '', url: ''};

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
            const ogLangCount = getLanguages(globalDictData).length;
            const ogDictCount = getTotalNumberOfDictionaries(globalDictData);

            const storage = new MockDataStorage(globalDictData);
            const dictManager = new DictionaryManager(storage);
            await dictManager.addDictionary(dict, language);

            expect(globalDictData.languagesToResources[language]).toContain(dict);
            expect(globalDictData.currentDictionary).toStrictEqual(expectedCurrentDict)
            expect(await dictManager.getCurrentDictionaryId()).toBe(globalDictData.currentDictionary);

            const newLangCount = getLanguages(globalDictData).length;
            const newDictCount = getTotalNumberOfDictionaries(globalDictData);
            expect(newLangCount).toBeGreaterThanOrEqual(ogLangCount)
            expect(newDictCount).toEqual(ogDictCount + (shouldAddNewDict ? 1 : 0));
    });

    it.each([
        [
            'Modify current dictionary, keeping language',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ]
                },
                currentDictionary: {index: 1, language: 'English'}
            },
            {language: 'English', index: 1},
            'English',
            {name: 'M&W Dict', url: 'https://www.meriamwebster.com/search/{word}'},
            {language: 'English', index: 1},
            {language: 'English', index: 1},
        ],
        [
            'Modify current dictionary, making new language',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ]
                },
                currentDictionary: {index: 1, language: 'English'}
            },
            {language: 'English', index: 1},
            'Klingon',
            {name: 'ST [Klingon]', url: 'https://www.st.com/klingon/search/{word}'},
            {language: 'Klingon', index: 0},
            {language: 'Klingon', index: 0},
        ],
        [
            'Modify existing, non-current dictionary, keeping language',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ]
                },
                currentDictionary: {index: 1, language: 'English'}
            },
            {language: 'English', index: 0},
            'English',
            {name: 'New Oxford Dictionary', url: 'https://www.noed.com/search/{word}'},
            {language: 'English', index: 0},
            {language: 'English', index: 1},
        ],
        [
            'Modify existing, non-current dictionary, making new language',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ]
                },
                currentDictionary: {index: 1, language: 'English'}
            },
            {language: 'English', index: 0},
            'Klingon',
            {name: 'KlingonDict', url: 'http://translator.startrech.com?lang=klingon&word={word}'},
            {language: 'Klingon', index: 0},
            {language: 'English', index: 0},
        ],
        [
            'Modify existing, non-current dictionary, making new language [2]',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ]
                },
                currentDictionary: {index: 0, language: 'English'}
            },
            {language: 'English', index: 1},
            'Klingon',
            {name: 'KlingonDict', url: 'http://translator.startrech.com?lang=klingon&word={word}'},
            {language: 'Klingon', index: 0},
            {language: 'English', index: 0},
        ],
        [
            'Modify existing, non-current dictionary, using existing language',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {index: 1, language: 'English'}
            },
            {language: 'English', index: 0},
            'Spanish',
            {name: 'Oxford (ESP)', url: 'https://www.oed.com/search/dictionary/esp/?scope=Entries&q={word}'},
            {language: 'Spanish', index: 2},
            {language: 'English', index: 0},
        ],
        [
            'Modify existing, non-current dictionary, using existing language',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {index: 1, language: 'English'}
            },
            {language: 'Spanish', index: 1},
            'English',
            {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'},
            {language: 'English', index: 2},
            {language: 'English', index: 1},
        ],
        [
            'Modify new, non-current dictionary, using fake language to fake language',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {index: 1, language: 'English'}
            },
            {language: 'Klingon', index: 1},
            'Klingon',
            {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'},
            EMPTY_DICT_INDEX,
            {language: 'English', index: 1},
        ],
        [
            'Modify new, non-current dictionary, using fake language to fake language 2',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {index: 1, language: 'English'}
            },
            {language: 'Klingon', index: 1},
            'Valerian',
            {name: 'ValeraianDict', url: 'https://spanishdict.com/translate/{word}'},
            EMPTY_DICT_INDEX,
            {language: 'English', index: 1},
        ],
        [
            'Modify new, non-current dictionary, using fake language to real language',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {index: 1, language: 'English'}
            },
            {language: 'Klingon', index: 1},
            'English',
            {name: 'ERROR_OUT_PLZ', url: 'https://spanishdict.com/translate/{word}'},
            EMPTY_DICT_INDEX,
            {language: 'English', index: 1},
        ],
        [
            'Modify new, non-current dictionary, using real language(s) impossible id',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {index: 1, language: 'English'}
            },
            {language: 'English', index: -1},
            'Spanish',
            {name: 'ERROR_OUT_PLZ', url: 'https://spanishdict.com/translate/{word}'},
            EMPTY_DICT_INDEX,
            {language: 'English', index: 1},
        ],
        [
            'Modify new, non-current dictionary, using real language(s) plausible id',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {index: 1, language: 'English'}
            },
            {language: 'English', index: 3},
            'Spanish',
            {name: 'ERROR_OUT_PLZ', url: 'https://spanishdict.com/translate/{word}'},
            EMPTY_DICT_INDEX,
            {language: 'English', index: 1},
        ],
    ])('%s', async (_testDescription: string, globalDictData: GlobalDictionaryData,
        id: DictionaryIdentifier, language: string, dict: Dictionary,
        newId: DictionaryIdentifier, newCurrentDict: DictionaryIdentifier) => {

            const storage = new MockDataStorage(globalDictData);
            const dictManager = new DictionaryManager(storage);
            const ogDictCount = getTotalNumberOfDictionaries(globalDictData);

            try {
                await dictManager.modifyExistingDictionary(id, language, dict);
                expect(newId).not.toEqual(EMPTY_DICT_INDEX);
                const newDict: Dictionary = await dictManager.getDictionaryFromIdentifier(newId);
                expect(newDict).toBe(dict);
            } catch (error) {
               expect(newId).toEqual(EMPTY_DICT_INDEX);
            }

            const newDictCount = getTotalNumberOfDictionaries(globalDictData);
            expect(newDictCount).toEqual(ogDictCount);
            expect(globalDictData.currentDictionary).toStrictEqual(newCurrentDict);
            expect(await dictManager.getCurrentDictionaryId()).toBe(globalDictData.currentDictionary);
    });

    it.each([
        [
            'List of Languages 1',
            'English',
            {languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                }, currentDictionary: {index: 1, language: 'English'}
            },
            [
                {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
            ]
        ],
        [
            'List of Languages 2',
            'Spanish',
            {languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                }, currentDictionary: {index: 1, language: 'English'}
            },
            [
                {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
            ]
        ],
        [
            'List of Languages FAKE',
            'Klingon',
            {languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                }, currentDictionary: {index: 1, language: 'English'}
            },
            []
        ],
        [
            'List of Languages Empty',
            'English',
            {languagesToResources: {
                    'English': [],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                }, currentDictionary: {index: 1, language: 'English'}
            },
            []
        ]
    ])('%s', async(_testDescription: string, language, globalDictData: GlobalDictionaryData, expectedDicts: Dictionary[]) => {
            const storage = new MockDataStorage(globalDictData);
            const dictManager = new DictionaryManager(storage);
            const dictList = await dictManager.getDictionariesOfLanguage(language);
            expect(dictList).toEqual(expectedDicts)
    });

    it.each([
        [
            'Set back to old value',
            {index: 1, language: 'English'},
            {index: 1, language: 'English'}
        ],
        [
            'Set to existing dictionary in same language',
            {index: 1, language: 'English'},
            {index: 0, language: 'English'}
        ],
        [
            'Set to existing dictionary in different language',
            {index: 1, language: 'English'},
            {index: 0, language: 'Spanish'}
        ],
        [
            'Set to existing dictionary in different language',
            {index: 0, language: 'Spanish'},
            {index: 1, language: 'English'}
        ],
        [
            'Set dictionary from scratch',
            {index: -1, language: ''},
            {index: 1, language: 'English'}
        ],
        [
            'Set to ficticious dictionary in ficticious language',
            {index: 0, language: 'Spanish'},
            {index: 1, language: 'Klingon'}
        ],
        [
            'Set to ficticious dictionary in normal language',
            {index: 0, language: 'Spanish'},
            {index: 10, language: 'Spanish'}
        ],
        [
            'Set to ficticious dictionary in normal language',
            {index: 0, language: 'Spanish'},
            {index: -1, language: 'Spanish'}
        ],
    ])( 'Get And Set Current Dictionary %s',
    async (_testDescription: string, currentDictStart, newCurrentDict: DictionaryIdentifier) => {
        const globalDictData = {
            languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: currentDictStart
            };
        const dataStore = new MockDataStorage(globalDictData);
        const dictManager = new DictionaryManager(dataStore);

        expect(await dictManager.getCurrentDictionaryId()).toBe(currentDictStart);
        await dictManager.setCurrentDictionary(newCurrentDict);
        expect(await dictManager.getCurrentDictionaryId()).toEqual(newCurrentDict);
    });

    it.each([
        [
            'Getting Current Dictionary',
            {language: 'English', index: 1},
            {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
        ],
        [
            'Getting Dictionary, Same language as current',
            {language: 'English', index: 0},
            {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
        ],
        [
            'Getting Dictionary, Different language as current',
            {language: 'Spanish', index: 0},
            {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
        ],
        [
            'Getting Dictionary, Fake Language',
            {language: 'Klingon', index: 0},
            EMPTY_DICT,
        ],
        [
            'Getting Dictionary, Fake Dictionary Index',
            {language: 'Spanish', index: 3},
            EMPTY_DICT,
        ],
        [
            'Getting Dictionary, Fake Dictionary Index [-1]',
            {language: 'Spanish', index: -1},
            EMPTY_DICT,
        ],

    ])('%s', async (_testDescription: string, dictID: DictionaryIdentifier, expectedDict: Dictionary) => {
        const globalDictData: GlobalDictionaryData = {
            languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {language: 'English', index: 1}
            };
        const dataStore = new MockDataStorage(globalDictData);
        const dictManager = new DictionaryManager(dataStore);

        const dictFetched: Dictionary = await dictManager.getDictionaryFromIdentifier(dictID);
        expect(dictFetched).toEqual(expectedDict);
    });

    it.each([
        [{language: 'English', index: 1}, 'perfidious', 'https://www.oed.com/search/dictionary/?scope=Entries&q=perfidious'],
        [{language: 'English', index: 0}, 'perfidious', 'https://www.merriam-webster.com/dictionary/perfidious'],
        [{language: 'Spanish', index: 0}, 'perfidious', 'https://dle.rae.es/perfidious'],
        [{language: 'Spanish', index: 0}, 'incredulo', 'https://dle.rae.es/incredulo'],
        [{language: 'Klingon', index: 0}, 'MyCoolWord', 'http://klingon.search?word=foobar'],
        [{language: 'Klingon', index: 1}, 'MyCoolWord', 'http://klingon.search?word=MyCoolWord&language=KLG&palabra=MyCoolWord']
    ])('%s', async (newCurrentDictId: DictionaryIdentifier, word: string, expectedUrl: string) => {
        const globalDictData: GlobalDictionaryData = {
            languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                    'Klingon': [
                        {name: 'No{word}', url: 'http://klingon.search?word=foobar'},
                        {name: 'Multiple{word}', url: 'http://klingon.search?word={word}&language=KLG&palabra={word}'}
                    ]
                },
                currentDictionary: {language: 'English', index: 1}
            };
        const dataStore = new MockDataStorage(globalDictData);
        const dictManager = new DictionaryManager(dataStore);
        await dictManager.setCurrentDictionary(newCurrentDictId);
        const serachURL = await dictManager.getWordSearchURL(word);
        expect(serachURL).toEqual(expectedUrl);
    });

    it.each([
        [
            'remove current dictionary',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {language: 'English', index: 1}
            },
            {language: 'English', index: 1},
            EMPTY_DICT_INDEX,
            true,
        ],
        [
            'remove non-current dictionary (different language))',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {language: 'English', index: 1}
            },
            {language: 'Spanish', index: 0},
            {language: 'English', index: 1},
            true,
        ],
        [
            'remove non-current dictionary (but same language b4)',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {language: 'English', index: 1}
            },
            {language: 'English', index: 0},
            {language: 'English', index: 0},
            true,
        ],
        [
            'remove non-current dictionary (but same language after)',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {language: 'English', index: 0}
            },
            {language: 'English', index: 1},
            {language: 'English', index: 0},
            true,
        ],
        [
            'remove last dictionary',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                    ],
                },
                currentDictionary: {language: 'English', index: 0}
            },
            {language: 'English', index: 0},
            EMPTY_DICT_INDEX,
            true,
        ],
        [
            'remove fake dictionary (fake language)',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {language: 'English', index: 0}
            },
            {language: 'Klingon', index: 0},
            {language: 'English', index: 0},
            false,
        ],
        [
            'remove fake dictionary (real language)',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {language: 'English', index: 0}
            },
            {language: 'Spanish', index: 3},
            {language: 'English', index: 0},
            false,
        ],
        [
            'remove fake dictionary (real language)',
            {
                languagesToResources: {
                    'English': [
                        {name: 'Merriam-Webster', url: 'https://www.merriam-webster.com/dictionary/{word}'},
                        {name: 'Oxford Dictionary', url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'}
                    ],
                    'Spanish': [
                        {name: 'DRAE', url: 'https://dle.rae.es/{word}'},
                        {name: 'SpanishDict', url: 'https://spanishdict.com/translate/{word}'}
                    ],
                },
                currentDictionary: {language: 'English', index: 0}
            },
            {language: 'Spanish', index: -1},
            {language: 'English', index: 0},
            false,
        ]
    ])('%s', async (_testDescription: string, globalDictData: GlobalDictionaryData, dictToRemove: DictionaryIdentifier, newCurrentDict: DictionaryIdentifier, shouldRemoveDict: boolean) => {
        const oldDictCount = getTotalNumberOfDictionaries(globalDictData);
        const dataStore = new MockDataStorage(globalDictData);
        const dictManager = new DictionaryManager(dataStore);

        await dictManager.removeDictionary(dictToRemove)
        expect(getTotalNumberOfDictionaries(globalDictData)).toBe(oldDictCount - (shouldRemoveDict ? 1 : 0));
    });
});
