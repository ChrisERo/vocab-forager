import path from 'path';
import { readFileSync } from 'fs';
import { JSDOM } from "jsdom";
import { BSMessage, BSMessageType } from '../utils/background-script-communication';

describe('Script for see-sites.html page', () => {
    function setUpDOM(url: string): Promise<JSDOM> {
        return new Promise((resolve, reject) => {
            global.fetch = jest.fn((url: string) => {
                    // Assuming url uses file:// protocol as in getURL
                    const filePath: string = url.replace('file://', '');
                    const content = readFileSync(filePath, 'utf-8');
                    return Promise.resolve({
                        json: () => Promise.resolve({}),
                        text: () => Promise.resolve(content),
                    })
            }) as jest.Mock;
            const htmlPage = './public/web_pages/see-sites.html'; 
            const pageContent: string = readFileSync(htmlPage , 'utf-8');
            const mockDOM: JSDOM = new JSDOM(
                pageContent, 
                {
                    url,
                    runScripts: 'outside-only',
                }
            );
            mockDOM.window.document.addEventListener('DOMContentLoaded', () => {
                global.window = mockDOM.window as any;
                global.document = mockDOM.window.document;
                global.Node = mockDOM.window.Node;
                global.Range = mockDOM.window.Range;
                global.DOMParser = mockDOM.window.DOMParser;
                resolve(mockDOM);
            });
        });
    }

    it.each([
        ['https://vocabforager/web_pages/see-sites.html', false],
        ['https://vocabforager/web_pages/see-sites.html?foobar=1', false],
        ['https://vocabforager/web_pages/see-sites.html?pageId=1', true],
        ['https://vocabforager/web_pages/see-sites.html?pageId=10345', false],
        ['https://vocabforager/web_pages/see-sites.html?pageId=2', true],
    ])('test setup %p', async (url: string, shouldLoadId: boolean) => {
        const siteDataPKMap: any = {
            1: {
                id: 1,
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
                },
            },
            2: {
                id: 1,
                title: 'Basic Test No Missing words',
                wordEntries: [
                    {
                        word: 'vacio',
                        startOffset: 1,
                        endOffset: 6,
                        nodePath: [[0,0,0]],
                    },
                ],
                missingWords: [],
                highlightOptions: {
                    fontColor: '#FFFFFF',
                    backgroundColor: '#000000',
                },
            }
        };

        // Need to set mock this way so that see-sites import bellow uses same state for browser.
        const wp = await import('webextension-polyfill');
        (wp as any)['overrideBrowserState']({
            runtime: {
                getURL: (pathFromPublic: string) => {
                    const relativePath = '../../public/' + pathFromPublic;
                    const absolutePath = path.resolve(__dirname, relativePath);
                    return `file://${absolutePath}`;
                },
                sendMessage(message:any): Promise<any> {
                    const request = message as BSMessage;
                    switch (request.messageType) {
                        case BSMessageType.GetAllDomains: {
                            const domains = ['https://fake.test.com'];
                            return Promise.resolve(domains);
                        }
                        case BSMessageType.GetAllLabels: {
                            const labels = ['platos', 'Argentina', 'comida', 'historia', 'España'];
                            return Promise.resolve(labels);
                        }
                        case BSMessageType.GetLabelsForSite: {
                            const labels = ['platos', 'comida', 'Argentina'];
                            return Promise.resolve(labels);
                        }
                        case BSMessageType.GetPageDataByPK: {
                            const id = (request.payload as any)['id']
                            let data: any;
                            if (siteDataPKMap.hasOwnProperty(id)) {
                                data = siteDataPKMap[id];
                                data['labels'] = ['platos', 'comida', 'Argentina'];
                            } else {
                                data = null;
                            }
                            return Promise.resolve(data);
                        }
                        default: {
                            return Promise.reject('Unknown message type '
                                                  + BSMessageType[request.messageType]);
                        }
                    }
                }
            }
        } as any);
        const dom: JSDOM = await setUpDOM(url);
        expect(dom.window.location.href).toBe(url);
        expect(window.location.href).toBe(url);
        
        const mod = await import('./see-sites'); 
        try {
            await mod.setupDone;
            const mockDocument: Document = dom.window.document;
            const domainInputSection: HTMLButtonElement = mockDocument.getElementById('domains-div') as HTMLButtonElement;
            const labelsSection: HTMLDivElement = mockDocument.getElementById('labels-section') as HTMLDivElement;
            const presentWordsSection: HTMLDivElement = mockDocument.getElementById('present-words-section') as HTMLDivElement

            if (shouldLoadId) {
                expect(labelsSection.style.display).toBe('inline-block');
                expect(presentWordsSection.style.display).toBe('inline-block');
                const listOfSiteElement = mockDocument
                    .getElementById('labels-list-section') as HTMLDivElement;
                expect(listOfSiteElement.children).toHaveLength(3 + 1);
                expect(domainInputSection.style.display).toBe('none');
            } else {
                expect(domainInputSection.style.display).toBe('inline-block');
                expect(labelsSection.style.display).toBe('none');
                expect(presentWordsSection.style.display).toBe('none');
                const listOfSiteElement = mockDocument
                    .getElementById('labels') as HTMLDivElement;
                expect(listOfSiteElement.children).toHaveLength(4 + 1);
            }
        } finally {
            jest.resetModules();
        }
    });
});
