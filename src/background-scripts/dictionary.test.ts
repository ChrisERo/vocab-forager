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

const EMPTY_DICT = {language: '', index: -1};

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
            EMPTY_DICT,
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
            EMPTY_DICT,
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
            EMPTY_DICT,
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
            EMPTY_DICT,
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
            EMPTY_DICT,
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
                expect(newId).not.toEqual(EMPTY_DICT);
                const newDict: Dictionary = await dictManager.getDictionaryFromIdentifier(newId);
                expect(newDict).toBe(dict);
            } catch (error) {
               expect(newId).toEqual(EMPTY_DICT);
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
});