import { setUpMockBrowser } from "../__mocks__/webextension-polyfill";
import browser from "webextension-polyfill";
import { defineWord, getNodeFromNodePath, isTextNode, nodeToTreePath } from "./utils";
import { JSDOM } from "jsdom";
import { BSMessage, BSMessagePayload, BSMessageType, isBsMessage, isSearchRequest, SearchRequest } from "../utils/background-script-communication";

describe('Contextmenu Tests', () => {

    it.each([
            [null, false],
            ['', false],
            [' ', true],
            ['hola', true],
            ['नमस्ते', true],
            ['good day', true],
            ['좋은 아침이에요', true],
        ])('defineWord %s %', (word: string|null, 
                          shouldHaveSent: boolean) => {
            setUpMockBrowser();
            const messageQueue: any[] = (browser.runtime as any)
                .messagesSentToWorkerScript;
            const originalQueueSize = messageQueue.length;
            
            defineWord(word);

            if (shouldHaveSent) {
                expect(messageQueue).toHaveLength(originalQueueSize + 1);
                const rawMessage: any = messageQueue[originalQueueSize];
                expect(isBsMessage(rawMessage)).toBeTruthy();
                const mssg: BSMessage = rawMessage;
                expect(mssg.messageType).toBe(BSMessageType.SearchWordURL)
                const payload: BSMessagePayload = mssg.payload
                expect(isSearchRequest(payload)).toBeTruthy();
                expect((payload as SearchRequest).word).toBe(word);
            } else {
                expect(messageQueue).toHaveLength(originalQueueSize);
            }
        });

    it.each([
            [
                '<body><p>Hello World</p></body>', 
                [0],
                'P',
                'Hello World',
            ],
            [
                '<body><p>Hello World</p></body>', 
                [0,0],
                '#text',
                'Hello World',
            ],
            [
                '<body><p>Hello World</p><p>Hola Mundo</p></body>', 
                [1],
                'P',
                'Hola Mundo',
            ],
            [
                '<body><p>Hello World</p><div><p>Hola Mundo</p></div></body>', 
                [1],
                'DIV',
                'Hola Mundo',
            ],
            [
                '<body><p>Hello World</p><div><p>Hola Mundo</p></div></body>', 
                [1,0,0],
                '#text',
                'Hola Mundo',
            ],
            [
                '<body>'+
                    '<p>Hello World</p>' +
                    '<div>' +
                        '<p>Hola Mundo</p>' +
                        '<p>¿Como Estas?</p>'+
                        '<div>' +
                            '<p>¿Como Estas?</p>' +
                        '</div>'+
                        '<p>Estoy bien. ¿Y tu?</p>'+
                        '<ul>' +
                            '<li>Bien</li>' +
                        '</ul>'+
                    '</div>' +
                '</body>', 
                [1,4,0],
                'LI',
                'Bien',
            ],
            [
                '<body>'+
                    '<p>Hello World</p>' +
                    '<div>' +
                        '<p>Hola Mundo</p>' +
                        '<p>¿Como Estas?</p>'+
                        '<div>' +
                            '<p>¿Como Estas?</p>' +
                        '</div>'+
                        '<p>Estoy bien. ¿Y tu?</p>'+
                        '<ul>' +
                            '<li>Bien</li>' +
                        '</ul>'+
                    '</div>' +
                '</body>', 
                [1,4],
                'UL',
                'Bien',
            ],
        ])('nodePathToNode and derrivedNodePath {%p} %s', 
        (siteBody: string, nodePath: number[],expectedNodeName: string, 
         expectedText: string) => {
            jest.clearAllMocks();  // doing this beforeEach distorts setup test 
            const pageContent: string = `<head></head>${siteBody}`;
            const dom: JSDOM = new JSDOM(pageContent);
            global.document = dom.window.document;
            global.Node = dom.window.Node;

            const nodeGotten: Node = getNodeFromNodePath(nodePath);
            const nodeName = nodeGotten.nodeName;
            expect(nodeName).toBe(expectedNodeName);
            const text = nodeGotten.textContent;
            expect(text).toBe(expectedText);

            const derivedNodePath = nodeToTreePath(nodeGotten);
            expect(derivedNodePath).toEqual(nodePath);
        });
    it.each([
            [
                '<body><p>Hello World</p></body>', 
                [0],
                'P',
                false,
            ],
            [
                '<body><p>Hello World</p></body>', 
                [0,0],
                '#text',
                true,
            ],
    ])('isText {%p} %s', 
        (siteBody: string, nodePath: number[],expectedNodeName: string, 
         isText: boolean) => {
            jest.clearAllMocks();  // doing this beforeEach distorts setup test 
            const pageContent: string = `<head></head>${siteBody}`;
            const dom: JSDOM = new JSDOM(pageContent);
            global.document = dom.window.document;

            const nodeGotten: Node = getNodeFromNodePath(nodePath);
            const nodeName = nodeGotten.nodeName;
            expect(nodeName).toBe(expectedNodeName);
            expect(isTextNode(nodeGotten)).toBe(isText);
        });
});

