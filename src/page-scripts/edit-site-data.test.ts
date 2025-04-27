import { readFileSync } from 'fs';
import { JSDOM } from "jsdom";
import { SiteData } from '../utils/models';

// Assumes npm test ran from repo root
// Set up DOM before edite-site-data is imported so that constants point to real
//   HTML elements
const HTML_PAGE = './public/web_pages/see-sites.html'; 
const PAGE_CONTENT: string = readFileSync(HTML_PAGE , 'utf-8');
const MOCK_DOM: JSDOM = new JSDOM(PAGE_CONTENT);
global.document = MOCK_DOM.window.document;
global.Node = MOCK_DOM.window.Node;
global.Range = MOCK_DOM.window.Range;
global.DOMParser = MOCK_DOM.window.DOMParser;


import { BACKGROUND_COLOR_INPUT, clearEditPageComponents, FONT_COLOR_INPUT, LABELS_LIST_SECTION, LABELS_SECTION, MISSING_WORDS_LIST_SECTION, PRESENT_WORDS_LIST_SECTION, setUpEditPage, SITE_NAME_HEADER } from './edit-site-data';

describe('Scripts for Editting Site Data from Settings Page', () => {
    test('test clearEditPageComponents', async () => {
        const url = 'https://test0.com?test=standard-content';
        const labels = ['platos-argentinos']
        const sd: SiteData = {
            title: 'Basic Test Everything Filled',
            wordEntries: [
                {
                    word: 'vacio',
                    startOffset: 0,
                    endOffset: 5,
                    nodePath: [[0,0,0]],
                },
            ],
            missingWords: ['chimichurri'],
            highlightOptions: {
                fontColor: '#00FF00',
                backgroundColor: '#FF00FF',
            } 

        };
        const sdp = Promise.resolve(sd);
        const ldp = Promise.resolve(labels);
        await setUpEditPage(url, sdp, ldp);
        expect(LABELS_SECTION.style.display).toBe('inline-block');
        expect(LABELS_LIST_SECTION.childElementCount).toBe(1 + labels.length);
        expect(MISSING_WORDS_LIST_SECTION.childElementCount)
            .toBe(sd.missingWords.length);
        expect(PRESENT_WORDS_LIST_SECTION.childElementCount)
            .toBe(sd.wordEntries.length);

        clearEditPageComponents();
        expect(LABELS_SECTION.style.display).toBe('none');
        expect(LABELS_LIST_SECTION.childElementCount).toBe(0);
        expect(MISSING_WORDS_LIST_SECTION.childElementCount).toBe(0);
        expect(PRESENT_WORDS_LIST_SECTION.childElementCount).toBe(0);
    });
    it.each([
        [
            'https://test0.com?test=standard-content',
            {
                title: 'Basic Test Everything Filled',
                wordEntries: [
                    {
                        word: 'vacio',
                        startOffset: 0,
                        endOffset: 5,
                        nodePath: [[0,0,0]],
                    },
                ],
                missingWords: ['chimichurri'],
                highlightOptions: {
                    fontColor: '#000000',
                    backgroundColor: '#FFFF00',
                } 

            },
            ['platos-argentinos']
        ],
        [
            'https://test0.com?test=standard-content',
            {
                title: 'Basic Test Everything Filled 2',
                wordEntries: [
                    {
                        word: 'vacio',
                        startOffset: 0,
                        endOffset: 5,
                        nodePath: [[0,0,0]],
                    },
                    {
                        word: 'bife de chorizo',
                        startOffset: 23,
                        endOffset: 23+15,
                        nodePath: [[0,0,0]],
                    },
                    {
                        word: 'chorizo',
                        startOffset: 30,
                        endOffset: 30+7,
                        nodePath: [[0,0,0]],
                    },
                    {
                        word: 'mate',
                        startOffset: 40,
                        endOffset: 40+4,
                        nodePath: [[0,0,0]],
                    },

                ],
                missingWords: ['che', 'sangria', 'sal', 'pepinillo'],
                highlightOptions: {
                    fontColor: '#FF00FF',
                    backgroundColor: '#00FF00',
                } 
            },
            ['platos-argentinos', 'castellano', 'español', 'gol']
        ],
        [
            'https://test0.com?test=totaly-empty',
            {
                wordEntries: [],
                missingWords: [],
            },
            []
        ],
        [
            'https://test1.com',
            {
                title: 'No Highlight options present at start',
                wordEntries: [
                    {
                        word: 'vacio',
                        startOffset: 0,
                        endOffset: 5,
                        nodePath: [[0,0,0]],
                    },
                ],
                missingWords: ['chimichurri'],
            },
            ['platos-argentinos']
        ],
    ])('setUpEditPage', async (url: string, siteData: SiteData, labels: string[]) => {
        const sdp = Promise.resolve(siteData);
        const ldp = Promise.resolve(labels);
        clearEditPageComponents();
        await setUpEditPage(url, sdp, ldp)

        if (siteData.highlightOptions === undefined) {
            siteData.highlightOptions = {
                backgroundColor: '#ffff01',
                fontColor: '#000000',
            };
        }
        expect(BACKGROUND_COLOR_INPUT.value.toLowerCase())
            .toBe(siteData.highlightOptions.backgroundColor.toLowerCase());
        expect(FONT_COLOR_INPUT.value.toLowerCase())
            .toBe(siteData.highlightOptions.fontColor.toLowerCase());
        expect(SITE_NAME_HEADER.textContent)
            .toBe(siteData.title !== undefined ? siteData.title : url);
        // 1 accounts for the input element
        expect(LABELS_LIST_SECTION.childElementCount).toBe(1 + labels.length);
        expect(MISSING_WORDS_LIST_SECTION.childElementCount)
            .toBe(siteData.missingWords.length);
        expect(PRESENT_WORDS_LIST_SECTION.childElementCount)
            .toBe(siteData.wordEntries.length);

        expect(LABELS_SECTION.style.display).toBe('inline-block');
   });
});

