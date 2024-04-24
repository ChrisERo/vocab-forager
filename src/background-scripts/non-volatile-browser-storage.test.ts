import { GlobalDictionaryData, SeeSiteData, SiteData } from "../utils/models";
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

    it.each( [
        [
            {
                'https://www.learncpp.com/cpp-tutorial/introduction-to-these-tutorials/':
                    {
                    wordEntries: [
                        {
                            word: 'incidental', startOffset: 25, endOffset: 34, 
                            nodePath: [[0, 2, 3, 4]]
                        }
                    ],
                    missingWords: [],
                    title: '0.1 — Introduction to these tutorials'
                },
                is_activated: false,
                dicts:  {
                    wordEntries: [
                        {
                            word: 'incidental', startOffset: 25, endOffset: 34, 
                            nodePath: [[0, 2, 3, 4]]
                        }
                    ],
                    missingWords: [],
                    title: '0.1 — Introduction to these tutorials'
                },
            },
            ['https://www.learncpp.com']
        ],
        [
            {
                'https://www.learncpp.com/cpp-tutorial/introduction-to-programming-langua':
                    {
                    wordEntries: [],
                    missingWords: [],
                    title: '0.2 — Introduction to programming languages'
                },
                'https://www.learncpp.com/cpp-tutorial/introduction-to-these-tutorials/':
                    {
                    wordEntries: [
                        {
                            word: 'incidental', startOffset: 25, endOffset: 34, 
                            nodePath: [[0, 2, 3, 4]]
                        }
                    ],
                    missingWords: [],
                    title: '0.1 — Introduction to these tutorials'
                },
                is_activated: false,
                dicts:  null,
            },
            ['https://www.learncpp.com']
        ],
        [
            {
                'https://www.learncpp.com/cpp-tutorial/introduction-to-programming-langua':
                    {
                    wordEntries: [],
                    missingWords: [],
                    title: '0.2 — Introduction to programming languages'
                },
                'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html':
                    {
                    wordEntries: [],
                    missingWords: [],
                },
                'https://www.learncpp.com/cpp-tutorial/introduction-to-these-tutorials/':
                    {
                    wordEntries: [
                        {
                            word: 'incidental', startOffset: 25, endOffset: 34, 
                            nodePath: [[0, 2, 3, 4]]
                        }
                    ],
                    missingWords: [],
                    title: '0.1 — Introduction to these tutorials'
                },
                is_activated: false,
                dicts:  null,
            },
            ['https://www.learncpp.com', 'https://www.typescriptlang.org']
        ],
    ])('Test ', async (originalData: any, domainsListExpected: string[]) => {
        await chrome.storage.local.set(originalData);
        const storage: LocalStorage =  getLocalStorage();

        const domainList = await storage.getAllDomains();
        expect(domainList).toEqual(domainsListExpected)
        return;
    });

    test('test page getter functions', async () => {
        const storage: LocalStorage =  getLocalStorage();
        const url1: string = 'https://www.learncpp.com/cpp-tutorial/introduction-to-these-tutorials/';
        const siteData: SiteData = {
            wordEntries: [
                {
                    word: 'incidental', startOffset: 25, endOffset: 34, 
                    nodePath: [[0, 2, 3, 4]]
                }
            ],
            missingWords: [],
            title: '0.1 — Introduction to these tutorials'
        };
        storage.storePageData(siteData, url1);
        let sites: SeeSiteData[] = await storage.getSeeSiteDataOfDomain('https://www.learncpp.com');
        expect(sites).toHaveLength(1);
        expect(sites[0].title).toBe('0.1 — Introduction to these tutorials')
        const realSiteData: SiteData = await storage.getPageData(url1);
        expect(realSiteData.wordEntries).toHaveLength(1);
        expect(realSiteData.missingWords).toHaveLength(0);

        storage.storePageData({wordEntries: [], missingWords: []}, url1);
        sites = await storage.getSeeSiteDataOfDomain('https://www.learncpp.com');
        expect(sites).toHaveLength(0);

        const fakeSiteData: SiteData = await storage.getPageData('https://www.fake.site.com/phony');
        expect(fakeSiteData.wordEntries).toHaveLength(0);
        expect(fakeSiteData.missingWords).toHaveLength(0);

        return;
    });
});
