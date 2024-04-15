import "fake-indexeddb/auto";
import { HandlerType, backgroundWorkerPromise, browserStorage, contextMenuManager, dictionaryManager, makeHandler} from "./background";
import "./contextmenu";
import "./dictionary";
import { IndexedDBStorage } from "./indexed-db-nv-storage";
import { setUpMockBrowser } from "./mocks/chrome";
import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { Dictionary, DictionaryIdentifier } from "../utils/models";

jest.mock("./contextmenu");
jest.mock("./dictionary");


describe('Testing Service Worker', () => {

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

    test('initial setup is correct', async () => {
        expect(contextMenuManager.setUpContextMenus).toHaveBeenCalledTimes(1);

        // Test that listener was indeed registered
        await backgroundWorkerPromise;
        const message: BSMessage = {
            messageType: BSMessageType.GetCurrentDictionary,
            payload: null
        };
        const sendResponse: (response?: any) => void = (_?: any) => {};
        await (chrome.runtime.onMessage as any).testExecute(
            message,
            null,
            sendResponse
        );
        expect(dictionaryManager.getCurrentDictionaryId)
            .toHaveBeenCalledTimes(1);
    });

    type AssertFunction = Function;

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
            async (response: any) => {
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
            async (result) => {
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
            async (result) => {
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
            async (result) => {
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
                const myTab: chrome.tabs.Tab = await chrome.tabs.get(1);
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
                const myTab: chrome.tabs.Tab = await chrome.tabs.get(4);
                expect(myTab.url).toBe('https://spanishdict.com/uva')
            }
        ],
        [
            'Search Word Invalid Payload',
            {
                messageType: BSMessageType.SearchWordURL,
                payload: null,
            },
            async () => {
                expect(dictionaryManager.getWordSearchURL)
                    .toHaveBeenCalledTimes(0);
            }
        ],

    ])('%s makeHandler for valid requests', async (_name: string,
                                                   message: BSMessage,
                                                   test: AssertFunction) => {
        jest.clearAllMocks();  // doing this beforeEach distorts setup test
        if ((message as any)['clearCurrentTab'] !== undefined
           && (message as any)['clearCurrentTab']) {
               browserStorage.setTabId((null as unknown as number));  // gets passed type check
        }
        const db: IndexedDBStorage = new IndexedDBStorage();
        const handler: HandlerType = makeHandler(db);
        let respuesta: any;
        const sendResponse: (response?: any) => void = (resp?: any) => {
            respuesta = resp
        };
        const result: boolean = await handler(message, null, sendResponse);

        expect(result).toBeTruthy();
        await test(respuesta);
    });
        // TODO: add test making sure that non-bsmessages wouldn't work
});

