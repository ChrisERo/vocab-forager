import "fake-indexeddb/auto";  // needs to come after indexed-db-nv-storage import
import { DB_NAME, IndexedDBStorage } from "./indexed-db-nv-storage";
import "./contextmenu";
import "./dictionary";
import { setUpMockBrowser } from "../__mocks__/webextension-polyfill";
import browser from "webextension-polyfill";
import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { Dictionary, DictionaryIdentifier, SiteData } from "../utils/models";
import { HandlerType, backgroundWorkerPromise, browserStorage, contextMenuManager, dictionaryManager, indexedDBStorage, listenerSetupPromise, makeHandler} from "./background";

jest.mock("./contextmenu");
jest.mock("./dictionary");


describe('Testing Service Worker', () => {

    type AssertFunction = Function;

    beforeEach(() => {
        setUpMockBrowser();

        // set up browser storage
        browserStorage.setTabId(1);

        // Mocks for dictionaryManager
        let currentDictionaryId: DictionaryIdentifier = {
            language: "Castellano",
            index: 1,
        };
        const langsToDicts: {[k: string]: Dictionary[]} = {
            Castellano: [
                {name: "DRAE", url: 'https://dle.rae.es/{word}?m=form'},
                {name: "spanishdict", url: 'https://spanishdict.com/{word}'},
            ],
            English: [
                {name: "Webster", url: 'https://webster.com/{word}'},
                {name: "Oxford", url: 'https://oxford.uk/{word}'},
                {name: "Dictionary.com", url: 'https://dictionary.com/{word}'},
            ],
            हिन्दी: [
                {name: "shabdok", url: 'https://shabdock.io/{word}'},
            ]
        }
        dictionaryManager.getDictionariesOfLanguage =
            jest.fn().mockImplementation(async (lang: string) => {
            return langsToDicts[lang];
        });
        dictionaryManager.getCurrentDictionaryId =
            jest.fn().mockImplementation(async () => {
            return currentDictionaryId;
        });
        dictionaryManager.getLanguages =
            jest.fn().mockImplementation(async () => {
            return ['Castellano', 'English', 'हिन्दी'];
        });
        dictionaryManager.setCurrentDictionary =
            jest.fn().mockImplementation(async (dictId: DictionaryIdentifier) => {
            currentDictionaryId = dictId;
            return;
        });
        dictionaryManager.getDictionaryFromIdentifier =
            jest.fn().mockImplementation(async (dictId: DictionaryIdentifier) => {
            const dicts = await dictionaryManager.getDictionariesOfLanguage(dictId.language)
            return dicts[dictId.index];
        });
        dictionaryManager.modifyExistingDictionary =
            jest.fn().mockImplementation(async (
            index: DictionaryIdentifier,
            language: string,
            data: Dictionary) => {
                if (language = index.language) {
                    langsToDicts[index.language][index.index] = data;
                } else {
                    throw 'Need to code up this portion if testing'
                }
            return;
        });
        dictionaryManager.addDictionary =
            jest.fn().mockImplementation(async (dict: Dictionary, lang: string) => {
            if (!langsToDicts.hasOwnProperty(lang)) {
                langsToDicts[lang] = [];
            }
            langsToDicts[lang].push(dict);
            return;
        });
        dictionaryManager.removeDictionary =
            jest.fn().mockImplementation(async (dictId: DictionaryIdentifier) => {
            if (langsToDicts.hasOwnProperty(dictId.language)
                && langsToDicts[dictId.language].length >= dictId.index) {
                langsToDicts[dictId.language].splice(dictId.index, 1);
                return true;
            }
            return false;
        });
        dictionaryManager.getWordSearchURL =
            jest.fn().mockImplementation(async (word: string) => {
            const dictId = await dictionaryManager.getCurrentDictionaryId();
            const dict = await dictionaryManager.getDictionaryFromIdentifier(dictId);
            return dict.url.replace('{word}', word);
        });
    });

    afterEach(() => {  // relies on ordering of tests to be right
        indexedDBStorage.getDB()?.close();  // needed for deleteDatabase to take effect
        indexedDB.deleteDatabase(DB_NAME);
    });

    test('initial setup is correct', async () => {
        await listenerSetupPromise;
        expect(contextMenuManager.setUpContextMenus).toHaveBeenCalledTimes(1);

        // Test that listener was indeed registered
        await backgroundWorkerPromise;
        let message: any = {
            messageType: BSMessageType.GetCurrentDictionary,
            payload: null
        };
        const sendResponse: (response?: any) => void = (_?: any) => {};
        (browser.runtime.onMessage as any).testExecute(
            message,
            null,
            sendResponse
        );
        expect(dictionaryManager.getCurrentDictionaryId)
            .toHaveBeenCalledTimes(1);

        message = {
            messageType: BSMessageType.SetCurrentDictionary,
            payload: {
                langauge: 'हिन्द',
                index: 0, 
            } 
        };
        (browser.runtime.onMessage as any).testExecute(
            message,
            null,
            sendResponse
        ); 
    });

    it.each([
        [
            'GetCurrentDictionary',
            {
                messageType: BSMessageType.GetCurrentDictionary,
                payload: null
            },
            (response: any) => {
                expect(dictionaryManager.getCurrentDictionaryId)
                    .toHaveBeenCalledTimes(1);
                expect(response).toEqual({language: 'Castellano', index: 1});
            },
        ],
        [
            'DictsOfLang compliant request',
            {
                messageType: BSMessageType.DictsOfLang,
                payload: {language: 'Castellano'}
            },
            (response: any) => {
                expect(dictionaryManager.getDictionariesOfLanguage)
                    .toHaveBeenCalledTimes(1);
                    const expectedResult = [
                        {
                            name: "DRAE",
                            url: 'https://dle.rae.es/{word}?m=form'
                        },
                        {
                            name: "spanishdict",
                            url: 'https://spanishdict.com/{word}'
                        }
                    ];
                    expect(response).toEqual(expectedResult);
            },
        ],
        [
            'GetLanguages request',
            {
                messageType: BSMessageType.GetLanguages,
                payload: null
            },
            (response: any) => {
                expect(dictionaryManager.getLanguages)
                    .toHaveBeenCalledTimes(1);
                expect(response).toEqual(['Castellano', 'English', 'हिन्दी'])
            },
        ],
        [
            'Set Current Dictionary Legit',
            {
                messageType: BSMessageType.SetCurrentDictionary,
                payload: {language: 'English', index: 3}
            },
            async () => {
                expect(dictionaryManager.setCurrentDictionary)
                    .toHaveBeenCalledTimes(1);
                const currentDictId: DictionaryIdentifier =
                    await dictionaryManager.getCurrentDictionaryId();
                const expectedDictId: DictionaryIdentifier = {
                    language: 'English',
                    index: 3
                };
                expect(currentDictId).toEqual(expectedDictId);
            },
        ],
        [
            'Set Current Dictionary NOT Legit Payload',
            {
                messageType: BSMessageType.SetCurrentDictionary,
                payload: null,
            },
            async () => {
                expect(dictionaryManager.setCurrentDictionary).toHaveBeenCalledTimes(0);
            }
        ],
        [
            'Get Dictionary From Legit Payload 1',
            {
                messageType: BSMessageType.GetExistingDictionary,
                payload: {language: 'English', index: 2},
            },
            async (response: any) => {
                expect(dictionaryManager.getDictionaryFromIdentifier).toHaveBeenCalledTimes(1);
                expect(response).toEqual({
                    name: "Dictionary.com",
                    url: 'https://dictionary.com/{word}',
                });
            }
        ],
        [
            'Get Dictionary From Legit Payload 2',
            {
                messageType: BSMessageType.GetExistingDictionary,
                payload: {language: 'Castellano', index: 0},
            },
            async (response: any) => {
                expect(dictionaryManager.getDictionaryFromIdentifier).toHaveBeenCalledTimes(1);
                expect(response).toEqual({
                    name: "DRAE",
                    url: 'https://dle.rae.es/{word}?m=form',
                });
            }
        ],
        [
            'Get Dictionary From Invalid Payload',
            {
                messageType: BSMessageType.GetExistingDictionary,
                payload: null,
            },
            async () => {
                expect(dictionaryManager.getDictionaryFromIdentifier).toHaveBeenCalledTimes(0);
            }
        ],
        [
            'Update Existing Dictionary Valid Payload',
            {
                messageType: BSMessageType.UpdateExistingDictionary,
                payload: {
                    index: {language: 'English', index: 1},
                    language: 'English',
                    content: {
                        name: 'Oxford English Dictionary',
                        url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'
                    }
                },
            },
            async () => {
                expect(dictionaryManager.modifyExistingDictionary)
                    .toHaveBeenCalledTimes(1);
                const dict = await dictionaryManager.getDictionaryFromIdentifier({
                        index: 1,
                        language: 'English'
                });
                const expectedDict: Dictionary = {
                    name: 'Oxford English Dictionary',
                    url: 'https://www.oed.com/search/dictionary/?scope=Entries&q={word}'
                };
                expect(dict).toEqual(expectedDict);
            }
        ],
        [
            'Update Existing Dictionary Valid Payload 2',
            {
                messageType: BSMessageType.UpdateExistingDictionary,
                payload: {
                    index: {language: 'Castellano', index: 1},
                    language: 'Castellano',
                    content: {
                        name: "SpanishDict",
                        url: 'https://spanishdict.com/{word}'
                    }
                },
            },
            async () => {
                expect(dictionaryManager.modifyExistingDictionary)
                    .toHaveBeenCalledTimes(1);
                const dict = await dictionaryManager.getDictionaryFromIdentifier({
                    language: 'Castellano',
                    index: 1,
                });
                const expectedDict: Dictionary = {
                    name: "SpanishDict",
                    url: 'https://spanishdict.com/{word}'
                };
                expect(dict).toEqual(expectedDict);
            }
        ],
        [
            'Update Existing Dictionary Invalid param',
            {
                messageType: BSMessageType.UpdateExistingDictionary,
                payload: null,
            },
            async () => {
                expect(dictionaryManager.modifyExistingDictionary)
                    .toHaveBeenCalledTimes(0);
            }
        ],
        [
            'Add new Dictionary Valid Payload (existing language)',
            {
                messageType: BSMessageType.AddNewDictionary,
                payload: {
                    lang: 'Castellano',
                    dict: {
                        name: "WordReference",
                        url: 'https://www.wordreference.com/definicion/{word}'
                    }
                },
            },
            async () => {
                expect(dictionaryManager.addDictionary).toHaveBeenCalledTimes(1);
                const dict = await dictionaryManager.getDictionaryFromIdentifier({
                    language: 'Castellano',
                    index: 2,
                });
                const expectedDict: Dictionary = {
                        name: "WordReference",
                        url: 'https://www.wordreference.com/definicion/{word}'
                };
                expect(dict).toEqual(expectedDict);
            }
        ],
        [
            'Add new Dictionary Valid Payload (new language)',
            {
                messageType: BSMessageType.AddNewDictionary,
                payload: {
                    lang: 'Telugu',
                    dict: {
                        name: "GoogleTranslate",
                        url: 'https://translate.google.com/?sl=te&tl=en&text={word}&op=translate'
                    }
                },
            },
            async () => {
                expect(dictionaryManager.addDictionary).toHaveBeenCalledTimes(1);
                const dict = await dictionaryManager.getDictionaryFromIdentifier({
                    language: 'Telugu',
                    index: 0,
                });
                const expectedDict: Dictionary = {
                        name: "GoogleTranslate",
                        url: 'https://translate.google.com/?sl=te&tl=en&text={word}&op=translate'
                };
                expect(dict).toEqual(expectedDict);
            }
        ],
        [
            'Add New Dictionary Invalid Payload',
            {
                messageType: BSMessageType.AddNewDictionary,
                payload: null,
            },
            async () => {
                expect(dictionaryManager.addDictionary).toHaveBeenCalledTimes(0);
            }
        ],
        [
            'Remove Real Dictionary',
            {
                messageType: BSMessageType.DeleteExitingDictionary,
                payload: {
                    language: 'Castellano',
                    index: 0
                },
            },
            async (result: any) => {
                expect(dictionaryManager.removeDictionary).toHaveBeenCalledTimes(1);
                expect(result).toBe(true);
                const dict = await dictionaryManager.getDictionaryFromIdentifier({
                    language: 'Castellano',
                    index: 0
                });
                expect(dict).toEqual({
                    name: "spanishdict",
                    url: 'https://spanishdict.com/{word}'
                });
            }
        ],
        [
            'Remove Fake Dictionary',
            {
                messageType: BSMessageType.DeleteExitingDictionary,
                payload: {
                    language: 'Klingon',
                    index: 3
                },
            },
            async (result: any) => {
                expect(dictionaryManager.removeDictionary).toHaveBeenCalledTimes(1);
                expect(result).toBe(false);
            }
        ],
        [
            'Remove Dictionary, bad payload',
            {
                messageType: BSMessageType.DeleteExitingDictionary,
                payload: null,
            },
            async () => {
                expect(dictionaryManager.removeDictionary).toHaveBeenCalledTimes(0);
            }
        ],
        [
            'Search Word In Current Tab',
            {
                messageType: BSMessageType.SearchWordURL,
                payload: {word: 'palabra'},
            },
            async () => {
                expect(dictionaryManager.getWordSearchURL)
                    .toHaveBeenCalledTimes(1);
                const myTab: browser.Tabs.Tab = await browser.tabs.get(1);
                expect(myTab.url).toBe('https://spanishdict.com/palabra')
            }
        ],
        [
            'Search Word In New Tab',
            {
                messageType: BSMessageType.SearchWordURL,
                payload: {word: 'uva'},
                clearCurrentTab: true,
            },
            async () => {
                expect(dictionaryManager.getWordSearchURL)
                    .toHaveBeenCalledTimes(1);
                const myTab: browser.Tabs.Tab = await browser.tabs.get(5);
                expect(myTab.url).toBe('https://spanishdict.com/uva')
            }
        ],
        [
            'StorePageData Valid Payload',
            {
                messageType: BSMessageType.StorePageData,
                payload: {
                    data: {
                        wordEntries: [],
                        missingWords: ['pizza'],
                        title: 'Fake News 1'
                    },
                    url: 'https://www.cnn.com/fake-news-article'
                },
            },
            async (_: any, db: IndexedDBStorage) => {
                const data0= await db.getPageData('https://www.fakeSitecom/fake-news-article');
                expect(data0.missingWords).toHaveLength(0);
                expect(data0.title).toBeUndefined();
                const data = await db.getPageData('https://www.cnn.com/fake-news-article');
                expect(data.missingWords).toEqual(['pizza']);
                expect(data.title).toBe('Fake News 1');
            }
        ],
        [
            'StorePageData Invalid',
            {
                messageType: BSMessageType.StorePageData,
                payload: {
                    foobar: 0,
                    url: 'https://www.cnn.com/fake-news-article'
                },
            },
            async (_: any, db: IndexedDBStorage) => {
                const data = await db.getPageData('https://www.cnn.com/fake-news-article');
                expect(data.missingWords).toHaveLength(0);
                expect(data.title).toBeUndefined();
            }
        ],
        [
            'GetPageData Invalid',
            {
                messageType: BSMessageType.GetPageData,
                payload: null,
            },
            async (response: SiteData, _: IndexedDBStorage) => {
                expect(response).toBeUndefined();
            }
        ],
        [
            'GetPageData Valid payload 1',
            {
                messageType: BSMessageType.GetPageData,
                payload: {
                    url: 'https://www.fake-site.com/fake-article-non-existant'
                },
            },
            async (response: SiteData, _: IndexedDBStorage) => {
                expect(response.wordEntries).toHaveLength(0);
                expect(response.missingWords).toHaveLength(0);
            }
        ],
        [
            'GetPageData Valid payload 2',
            {
                messageType: BSMessageType.GetPageData,
                payload: {
                    url: 'https://darknetdiaries.com/episode/110/'
                },
            },
            async (response: SiteData, _: IndexedDBStorage) => {
                expect(response.wordEntries).toHaveLength(1);
                expect(response.wordEntries[0].word).toBe('botnets');
                expect(response.missingWords).toHaveLength(3);
                expect(response.missingWords).toEqual(['word','not','here']);
            }
        ],
        [
            'DeletePageData Invalid',
            {
                messageType: BSMessageType.DeletePageData,
                payload: null,
            },
            async (_: any, db: IndexedDBStorage) => {
                const data: SiteData = await db.getPageData(
                    'https://darknetdiaries.com/episode/110/'
                );
                expect(data.missingWords).toEqual(['word','not','here']);
            }
        ],
        [
            'DeletePageData Valid Payload',
            {
                messageType: BSMessageType.DeletePageData,
                payload: {
                    url: 'https://darknetdiaries.com/episode/110/'
                },
            },
            async (_: any, db: IndexedDBStorage) => {
                const data: SiteData = await db.getPageData(
                    'https://darknetdiaries.com/episode/110/'
                );
                expect(data.missingWords).toHaveLength(0);
            }
        ],
        [
            'GetCurrentActivation Valid Payload',
            {
                messageType: BSMessageType.GetCurrentActivation,
                payload: null,
            },
            async (result: any,) => {
                expect(result).toBeTruthy();
            }
        ],
        [
            'SetCurrentActivation Valid Payload',
            {
                messageType: BSMessageType.SetCurrentActivation,
                payload: {isActivated: true},
            },
            async () => {
                const currentActivation =
                    await browserStorage.getCurrentActivation();
                expect(currentActivation).toBeTruthy();
                expect(contextMenuManager.updateContextMenuBasedOnActivation)
                    .toHaveBeenCalledTimes(1);
            }
        ],
        [
            'SetCurrentActivation Valid Payload 2',
            {
                messageType: BSMessageType.SetCurrentActivation,
                payload: {isActivated: false},
            },
            async () => {
                const currentActivation =
                    await browserStorage.getCurrentActivation();
                expect(currentActivation).toBeFalsy();
                expect(contextMenuManager.updateContextMenuBasedOnActivation)
                    .toHaveBeenCalledTimes(1);
            }
        ],
        [
            'SetCurrentActivation Invalid Payload',
            {
                messageType: BSMessageType.SetCurrentActivation,
                payload: null,
            },
            async () => {
                expect(contextMenuManager.updateContextMenuBasedOnActivation)
                    .toHaveBeenCalledTimes(0);
            }
        ],
        [
            'ShowDeleteHilightsCM',
            {
                messageType: BSMessageType.ShowDeleteHighlightsCM,
                payload: null,
            },
            async () => {
                expect(contextMenuManager.exposeDeleteContextMenu)
                    .toHaveBeenCalledTimes(1);
            }
        ],
        [
            'HideDeleteHighlightsCM',
            {
                messageType: BSMessageType.HideDeleteHighlightsCM,
                payload: null,
            },
            async () => {
                expect(contextMenuManager.hideDeleteContextMenu)
                    .toHaveBeenCalledTimes(1);
            }
        ],
        [
            'GetAllDomains',
            {
                messageType: BSMessageType.GetAllDomains,
                payload: null,
            },
            async (result: any) => {
                expect(result).toEqual([
                    'https://darknetdiaries.com',
                    'https://foobar.io',
                ]);
            }
        ],
        [
            'GetLabelsForSite Valid Payload',
            {
                messageType: BSMessageType.GetLabelsForSite,
                payload: {url: 'https://darknetdiaries.com/episode/110/'},
            },
            async (result: any) => {
                expect(result).toEqual([
                    'botnet',
                    'cybercrime',
                ]);
            }
        ],
        [
            'GetLabelsForSite Valid Payload 2',
            {
                messageType: BSMessageType.GetLabelsForSite,
                payload: {url: 'https://darknetdiaries.com/episode/fakeVid/'},
            },
            async (result: any) => {
                expect(result).toHaveLength(0);
                expect(result).toEqual([]);
            }
        ],
        [
            'GetLabelsForSite Invalid',
            {messageType: BSMessageType.GetLabelsForSite, payload: null,},
            async (result: any) => {
                expect(result).not.toEqual([]);
                expect(result).toBeUndefined();
            }
        ],
        [
            'GetURLsForLabel multi-sites',
            {
                messageType: BSMessageType.GetURLsForLabel,
                payload: {label: 'botnet'},
            },
            async (result: any) => {
                expect(result).toEqual([
                    {url: 'https://darknetdiaries.com/episode/110',},
                    {url: 'https://foobar.io', title: 'Fake Website'},
                ]);
            }
        ],
        [
            'GetURLsForLabel single-site-1',
            {
                messageType: BSMessageType.GetURLsForLabel,
                payload: {label: 'cybercrime'},
            },
            async (result: any) => {
                expect(result).toEqual([
                    {url: 'https://darknetdiaries.com/episode/110'},
                ]);
            }
        ],
        [
            'GetURLsForLabel single-site-2',
            {
                messageType: BSMessageType.GetURLsForLabel,
                payload: {label: 'alternative-facts'},
            },
            async (result: any) => {
                expect(result).toEqual([
                    {url: 'https://foobar.io', title: 'Fake Website'},
                ]);
            }
        ],
        [
            'GetURLsForLabel no-labels',
            {
                messageType: BSMessageType.GetURLsForLabel,
                payload: {label: 'hello-nobondy'},
            },
            async (result: any) => {
                expect(result).toHaveLength(0);
            }
        ],
        [
            'GetURLsForLabel Invalid Payload',
            {
                messageType: BSMessageType.GetURLsForLabel,
                payload: null,
            },
            async (result: any) => {
                expect(result).toBeUndefined();
            }
        ],
        [
            'AddLabelEntry',
            {
                messageType: BSMessageType.AddLabelEntry,
                payload: {
                    url: "https://darknetdiaries.com/episode/110/",
                    label: "russia",
                },
            },
            async (_: any, db: IndexedDBStorage) => {
                const urls: string[] = await db.getURLsOfSpecificLabels('russia');
                expect(urls).toEqual([
                    "https://darknetdiaries.com/episode/110",
                ]);
            }
        ],
        [
            'AddLabelEntry 2',
            {
                messageType: BSMessageType.AddLabelEntry,
                payload: {
                    url: "https://darknetdiaries.com/episode/110/",
                    label: "alternative-facts",
                },
            },
            async (_: any, db: IndexedDBStorage) => {
                const urls: string[] =
                    await db.getURLsOfSpecificLabels('alternative-facts');
                expect(urls).toEqual([
                    "https://darknetdiaries.com/episode/110",
                    'https://foobar.io',
                ]);
            }
        ],
        [
            'AddLabelEntry 3',
            {
                messageType: BSMessageType.AddLabelEntry,
                payload: {
                    url: "https://darknetdiaries.com/episode/110/",
                    label: "cybercrime",
                },
            },
            async (_: any, db: IndexedDBStorage) => {
                const urls: string[] = await db.getURLsOfSpecificLabels('cybercrime');
                expect(urls).toEqual([
                    "https://darknetdiaries.com/episode/110",
                ]);
            }
        ],
        [
            'AddLabelEntry Invalid Payload',
            {
                messageType: BSMessageType.AddLabelEntry,
                payload: {
                    url: "https://darknetdiaries.com/episode/110/",
                    index: 1,
                },
            },
            async (_: any, db: IndexedDBStorage) => {
                const urls: string[] = await db.getURLsOfSpecificLabels('1');
                expect(urls).toHaveLength(0);
                const allLabels = await db.getAllLabels();
                expect(allLabels).toEqual([
                    'alternative-facts',
                    'botnet',
                    'cybercrime',
                ]);
            }
        ],
        [
            'RemoveLabelEntry',
            {
                messageType: BSMessageType.RemoveLabelEntry,
                payload: {
                    url: "https://darknetdiaries.com/episode/110/",
                    label: 'botnet'
                }
            },
            async (_: any, db: IndexedDBStorage) => {
                const urls =
                    await db.getURLsOfSpecificLabels('botnet');
                expect(urls).toEqual([
                    'https://foobar.io',
                ]);
            }
        ],
        [
            'RemoveLabelEntry 2',
            {
                messageType: BSMessageType.RemoveLabelEntry,
                payload: {
                    url: "https://darknetdiaries.com/episode/110/",
                    label: 'alternative-facts'
                }
            },
            async (_: any, db: IndexedDBStorage) => {
                const urls =
                    await db.getURLsOfSpecificLabels('alternative-facts');
                expect(urls).toEqual([
                    'https://foobar.io',
                ]);
            }
        ],
        [
            'RemoveLabelEntry 3',
            {
                messageType: BSMessageType.RemoveLabelEntry,
                payload: {
                    url: "https://darknetdiaries.com/episode/110/",
                    label: 'cybercrime'
                }
            },
            async (_: any, db: IndexedDBStorage) => {
                const urls =
                    await db.getURLsOfSpecificLabels('cybercrime');
                expect(urls).toHaveLength(0);
            }
        ],
        [
            'RemoveLabelEntry Invalid Payload',
            {
                messageType: BSMessageType.RemoveLabelEntry,
                payload: null
            },
            async (_: any, db: IndexedDBStorage) => {
                const allLabels = await db.getAllLabels();
                expect(allLabels).toEqual([
                    'alternative-facts',
                    'botnet',
                    'cybercrime',
                ]);
            }
        ],
        [
            'GetAllLabels',
            {
                messageType: BSMessageType.GetAllLabels,
                payload: null,
            },
            async (result: any) => {
                expect(result).toEqual([
                    'alternative-facts',
                    'botnet',
                    'cybercrime',
                ]);
            }
        ],
        [
            'GetSeeSiteData',
            {
                messageType: BSMessageType.GetSeeSiteData,
                payload: {schemeAndHost: 'https://darknetdiaries.com'},
            },
            async (result: any) => {
                expect(result).toEqual([
                    {
                        url: 'https://darknetdiaries.com/episode/110'
                    }
                ]);
            }
        ],
        [
            'GetSeeSiteData 2',
            {
                messageType: BSMessageType.GetSeeSiteData,
                payload: {schemeAndHost: 'https://foobar.io'},
            },
            async (result: any) => {
                expect(result).toEqual([
                    {
                        url: 'https://foobar.io',
                        title: 'Fake Website'
                    }
                ]);
            }
        ],
        [
            'GetSeeSiteData 3',
            {
                messageType: BSMessageType.GetSeeSiteData,
                payload: {schemeAndHost: 'https://hello.world.net'},
            },
            async (result: any) => {
                expect(result).toHaveLength(0);
            }
        ],
        [
            'GetSeeSiteData Invalid Payload',
            {
                messageType: BSMessageType.GetSeeSiteData,
                payload: null,
            },
            async (result: any) => {
                expect(result).toBeUndefined();
            }
        ],
        [
            'GetAllExtensionData Invalid Payload',
            {
                messageType: BSMessageType.GetAllExtensionData,
                payload: null,
            },
            async (result: any) => {
                expect(result).toEqual(
                    {
                        'https://foobar.io': {
                            labels: ['alternative-facts', 'botnet'],
                            missingWords: ['word','not','here'],
                            wordEntries: [
                                {
                                    word: 'botnets',
                                    startOffset: 5,
                                    endOffset: 12,
                                    nodePath: [[0,2,3,4,5]]
                                }
                            ],
                            title: "Fake Website",
                            schemeAndHost: 'https://foobar.io',
                            urlPath: '',
                        },
                        'https://darknetdiaries.com/episode/110': {
                            labels: ['botnet', 'cybercrime'],
                            missingWords: ['word','not','here'],
                            wordEntries: [
                                {
                                    word: 'botnets',
                                    startOffset: 5,
                                    endOffset: 12,
                                    nodePath: [[0,2,3,4,5]]
                                }
                            ],
                            schemeAndHost: 'https://darknetdiaries.com',
                            urlPath: '/episode/110',
                        },
                        is_activated: true,
                        tab_id: 1,
                    }
                );
            }
        ],
        [
            'LoadExtensionData Invalid Payload',
            {
                messageType: BSMessageType.LoadExtensionData,
                payload: null
            },
            async (_: any, db: IndexedDBStorage) => {
                const labels: string[] = await db.getAllLabels();
                expect(labels).toEqual([
                    'alternative-facts',
                    'botnet',
                    'cybercrime',

                ]);
            }
        ],
        [
            'LoadExtensionData',
            {
                messageType: BSMessageType.LoadExtensionData,
                payload: {
                    data: {
                        'https://store.gamersnexus.net/products/cobalt-blue-tear-down-logo-pint-glass-libbey-17-oz': {
                            labels: ['drinkware', 'donations', 'tech'],
                            missingWords: ['chugg'],
                            wordEntries: [
                                {
                                    word: 'cobalt',
                                    startOffset: 4,
                                    endOffset: 10,
                                    nodePath: [[0,2,3,4,5]]
                                }
                            ],
                            schemeAndHost: 'https://store.gamersnexus.net',
                            urlPath: '/products/cobalt-blue-tear-down-logo-pint-glass-libbey-17-oz',
                        },
                        'https://store.gamersnexus.net/products/gn-wireframe-mouse-mat': {
                            labels: ['donations', 'mats', 'tech'],
                            missingWords: ['electronics'],
                            wordEntries: [
                                {
                                    word: 'microfiber',
                                    startOffset: 17,
                                    endOffset: 27,
                                    nodePath: [[0,0,1,3,0]]
                                }
                            ],
                            schemeAndHost: 'https://store.gamersnexus.net',
                            urlPath: '/products/gn-wireframe-mouse-mat',
                        },
                        'https://www.justandsinner.org/donate.html': {
                            labels: ['donations', 'christianity', 'lutheranism'],
                            missingWords: [],
                            wordEntries: [
                                {
                                    word: 'Gospel',
                                    startOffset: 25,
                                    endOffset: 31,
                                    nodePath: [[0,3]]
                                }
                            ],
                            schemeAndHost: 'https://www.justandsinner.org',
                            urlPath: '/donate.html',
                        },
                        is_activated: false,
                    }
                },
            },
            async (_: any, db: IndexedDBStorage) => {
                const labels: string[] = await db.getAllLabels();
                expect(labels).toEqual([
                    'christianity',
                    'donations',
                    'drinkware',
                    'lutheranism',
                    'mats',
                    'tech',
                ]);
                const urls: string[] = await db.getAllPageUrls();
                expect(urls).toEqual([
                    'https://store.gamersnexus.net/products/cobalt-blue-tear-down-logo-pint-glass-libbey-17-oz',
                    'https://store.gamersnexus.net/products/gn-wireframe-mouse-mat',
                    'https://www.justandsinner.org/donate.html'
                ]);
            }
        ],
        [
            'Basic Get Page Data by PK with Fake PK',
            {
                messageType: BSMessageType.GetPageDataByPK,
                payload: {id: 5},
            },
            (result: any) => {
                expect(result).toBeNull();
                return;
            }
        ],
        [
            'Basic Get Page Data by PK',
            {
                messageType: BSMessageType.GetPageDataByPK,
                payload: {id: 1},
            },
            (result: any) => {
                expect(result).not.toBeNull();
                const url = result.schemeAndHost + result.urlPath;
                expect(url).toBe('https://foobar.io');
                return;
            }
        ],
        [
            'Basic Get Page Data by PK 2',
            {
                messageType: BSMessageType.GetPageDataByPK,
                payload: {id: 2},
            },
            (result: any) => {
                expect(result).not.toBeNull();
                const url = result.schemeAndHost + result.urlPath;
                expect(url).toBe('https://darknetdiaries.com/episode/110');
                return;
            }
        ],
        [
            'Get PK for Fake Page',
            {
                messageType: BSMessageType.GetPagePrimaryKey,
                payload: {url: 'https://un.registered.page.com/should-not-exist'},
            },
            (result: any) => {
                expect(result).toBeNull();
                return;
            }
        ],
        [
            'Get Primary Key for Page 1',
            {
                messageType: BSMessageType.GetPagePrimaryKey,
                payload: {url: 'https://foobar.io'},
            },
            (result: any) => {
                expect(result).not.toBeNull();
                expect(result).toBe(1);
                return;
            }
        ],
        [
            'Basic Get Page Data by PK 2',
            {
                messageType: BSMessageType.GetPagePrimaryKey,
                payload: {url: 'https://darknetdiaries.com/episode/110'},
            },
            (result: any) => {
                expect(result).not.toBeNull();
                expect(result).toBe(2);
                return;
            }
        ],

    ])('makeHandler: [%s]', async (_name: string, message: BSMessage,
                                   test: AssertFunction) => {
        jest.clearAllMocks();  // doing this beforeEach distorts setup test
        browserStorage.setCurrentActivation(true);
        if ((message as any)['clearCurrentTab'] !== undefined
           && (message as any)['clearCurrentTab']) {
               // indirection needed to get passed type check
               browserStorage.setTabId((null as unknown as number));
        }
        const db: IndexedDBStorage = new IndexedDBStorage();
        try {
            await db.setUp();
            await db.storePageData(
                {
                    missingWords: ['word','not','here'],
                    wordEntries: [
                        {
                            word: 'botnets',
                            startOffset: 5,
                            endOffset: 12,
                            nodePath: [[0,2,3,4,5]]
                        }
                    ],
                    title: "Fake Website"
                },
                'https://foobar.io'
            );
            await db.addLabelEntry(
                'https://foobar.io',
                'botnet'
            );
            await db.addLabelEntry(
                'https://foobar.io',
                'alternative-facts'
            );
            await db.storePageData(
                {
                    missingWords: ['word','not','here'],
                    wordEntries: [
                        {
                            word: 'botnets',
                            startOffset: 5,
                            endOffset: 12,
                            nodePath: [[0,2,3,4,5]]
                        }
                    ]
                },
                'https://darknetdiaries.com/episode/110/'
            );
            await db.addLabelEntry(
                'https://darknetdiaries.com/episode/110/',
                'botnet'
            );
            await db.addLabelEntry(
                'https://darknetdiaries.com/episode/110/',
                'cybercrime'
            );
            const handler: HandlerType = makeHandler(db);
            let respuesta: any;
            const sendResponse: (response?: any) => void = (resp?: any) => {
                respuesta = resp
            };
            const result: boolean = await handler(message, null, sendResponse);

            expect(result).toBeTruthy();
            await test(respuesta, db);
        } finally {
            db.getDB()?.close();
        }
    });

    test('makeHandler with non-BSMessage', async () => {
        jest.clearAllMocks();  // doing this beforeEach distorts setup test
        browserStorage.setCurrentActivation(true);
        const db: IndexedDBStorage = new IndexedDBStorage();
        try {
            await db.setUp();
            await db.storePageData(
                {
                    missingWords: ['word','not','here'],
                    wordEntries: [],
                },
                'https://foobar.io'
            );
            await db.addLabelEntry(
                'https://foobar.io',
                'foobar'
            );
            const handler: HandlerType = makeHandler(db);
            const sendResponse: (response?: any) => void = (resp?: any) => {
                expect(false).toBeTruthy();
            };
            const message: any = {
                name: 'mario',
                typeOfMessage: 'mistake'
            };
            const result: boolean = await handler(message, null, sendResponse);
            expect(result).toBeFalsy();
        } finally {
            db.getDB()?.close()
        }
    });
});

