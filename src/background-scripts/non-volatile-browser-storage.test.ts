import { GlobalDictionaryData } from "../utils/models";
import { setUpMockBrowser } from "./mocks/chrome";
import { LocalStorage, getLocalStorage } from "./non-volatile-browser-storage";


describe('Test LocalStorage', () => {

    beforeEach(() => {
        setUpMockBrowser();
    });

    it.each( [
        [false, false],
        [false, true],
        [true, false],
        [true, true],
        [null, false],
        [null, true],
        [undefined, true],
        [undefined, false],
    ])('Test activation [from %s to %s]', async (isActivatedOG: boolean | undefined | null, newCurrentActivation: boolean) => {
        if (isActivatedOG !== undefined) {
            await chrome.storage.local.set({'is_activated': isActivatedOG});
        }
        const storage: LocalStorage =  getLocalStorage();

        const ogActivationResult = await storage.getCurrentActivation();
        expect(ogActivationResult).toBe(isActivatedOG === null || isActivatedOG === undefined ? false : isActivatedOG);

        const foo: void = await storage.setCurrentActivation(newCurrentActivation);
        const newActivationResult = await storage.getCurrentActivation();
        expect(newActivationResult).toBe(newCurrentActivation);
        return;
    });

    test.each([
        [
            undefined,
            {
                languagesToResources: {
                    'ESP': [
                        {
                            name: 'Dict1',
                            url: 'http://www.dict1.com/{word}'
                        },
                        {
                            name: 'DRAE',
                            url: 'https://dle.rae.es/{word}'
                        },
                    ],
                    'FRA': [
                        {
                            name: 'WordReference',
                            url: 'https://www.wordreference.com/fren/{word}',
                        }
                    ]
                },
                currentDictionary: {language: 'ESP', index: 1}
            }
        ],
        [
            null,
            {
                languagesToResources: {
                    'ESP': [
                        {
                            name: 'Dict1',
                            url: 'http://www.dict1.com/{word}'
                        },
                        {
                            name: 'DRAE',
                            url: 'https://dle.rae.es/{word}'
                        },
                    ],
                    'FRA': [
                        {
                            name: 'WordReference',
                            url: 'https://www.wordreference.com/fren/{word}',
                        }
                    ]
                },
                currentDictionary: {language: 'ESP', index: 1}
            }
        ],
        [
            {
                languagesToResources: {
                    'ESP': [
                        {
                            name: 'DRAE',
                            url: 'https://dle.rae.es/{word}'
                        },
                    ],
                },
                currentDictionary: {language: 'ESP', index: 1}
            },
            {
                languagesToResources: {
                    'ESP': [
                        {
                            name: 'Dict1',
                            url: 'http://www.dict1.com/{word}'
                        },
                        {
                            name: 'DRAE',
                            url: 'https://dle.rae.es/{word}'
                        },
                    ],
                    'FRA': [
                        {
                            name: 'WordReference',
                            url: 'https://www.wordreference.com/fren/{word}',
                        }
                    ]
                },
                currentDictionary: {language: 'ESP', index: 1}
            }
        ],
        [
            {
                languagesToResources: {
                    'ESP': [
                        {
                            name: 'Dict1',
                            url: 'http://www.dict1.com/{word}'
                        },
                        {
                            name: 'DRAE',
                            url: 'https://dle.rae.es/{word}'
                        },
                    ],
                    'FRA': [
                        {
                            name: 'WordReference',
                            url: 'https://www.wordreference.com/fren/{word}',
                        }
                    ]
                },
                currentDictionary: {language: 'ESP', index: 1}
            },
            {
                languagesToResources: {
                    'ESP': [
                        {
                            name: 'DRAE',
                            url: 'https://dle.rae.es/{word}'
                        },
                    ],
                },
                currentDictionary: {language: 'ESP', index: 1}
            },
        ],
        [
            {languagesToResources: {}, currentDictionary: {language: '', index: -1}},
            {
                languagesToResources: {
                    'ESP': [
                        {
                            name: 'Dict1',
                            url: 'http://www.dict1.com/{word}'
                        },
                        {
                            name: 'DRAE',
                            url: 'https://dle.rae.es/{word}'
                        },
                    ],
                    'FRA': [
                        {
                            name: 'WordReference',
                            url: 'https://www.wordreference.com/fren/{word}',
                        }
                    ]
                },
                currentDictionary: {language: 'ESP', index: 1}
            }
        ],
        [
            {
                languagesToResources: {
                    'ESP': [
                        {
                            name: 'Dict1',
                            url: 'http://www.dict1.com/{word}'
                        },
                        {
                            name: 'DRAE',
                            url: 'https://dle.rae.es/{word}'
                        },
                    ],
                    'FRA': [
                        {
                            name: 'WordReference',
                            url: 'https://www.wordreference.com/fren/{word}',
                        }
                    ]
                },
                currentDictionary: {language: 'ESP', index: 1}
            },
            {languagesToResources: {}, currentDictionary: {language: '', index: -1}},
        ],
        [
            {languagesToResources: {}, currentDictionary: {language: '', index: -1}},
            {languagesToResources: {}, currentDictionary: {language: '', index: -1}},
        ]
    ])('Dictionary data', async (ogDictData: GlobalDictionaryData | null | undefined, newDictData: GlobalDictionaryData) => {
        if (ogDictData !== undefined) {
            await chrome.storage.local.set({'dicts': ogDictData});
        }
        const dao: LocalStorage= getLocalStorage();
        const storedDataOG = await dao.getDictionaryData();
        expect(storedDataOG).toEqual(ogDictData === undefined || ogDictData === null ?
            {languagesToResources: {}, currentDictionary: {language: '', index: -1}}
            : ogDictData);

        await dao.setDictionaryData(newDictData);
        const storedData = await dao.getDictionaryData();
        expect(storedData).toEqual(newDictData);
    });
});