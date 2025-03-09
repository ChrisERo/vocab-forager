import {getNodeFromNodePath, isTextNode} from "./utils";
import {highlightRecovery} from "./highlight-recovery";
import { Word } from "../utils/models";
import { JSDOM } from "jsdom";


describe('Highlight Recovery Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it.each([
            [
                'Simple example with first word found',
                '<body><p>Hello World</p></body>', 
                ['Hello'],
                [
                    {
                        word: "Hello",
                        startOffset: 0,
                        endOffset: 5,
                        nodePath: [[0, 0]],
                    }
                ],
                null,
            ],
            [
                'Simple example with middle word found',
                '<body><p>Hello World X</p></body>', 
                ['World'],
                [
                    {
                        word: "World",
                        startOffset: 6,
                        endOffset: 11,
                        nodePath: [[0, 0]],
                    }
                ],
                null,
            ],
            [
                'Simple example with last word found (space at end)',
                '<body><p>Hello World </p></body>', 
                ['World'],
                [
                    {
                        word: "World",
                        startOffset: 6,
                        endOffset: 11,
                        nodePath: [[0, 0]],
                    }
                ],
                null,
            ],
            [
                'Simple example with word found at end of a node',
                '<body><p>Hello World</p><p>My name is Fred</p></body>', 
                ['World'],
                [
                    {
                        word: "World",
                        startOffset: 6,
                        endOffset: 11,
                        nodePath: [[0, 0]],
                    }
                ],
                null,
            ],
            [
                'Simple example with word found at end of everything',
                '<body><p>Hello World</p></body>', 
                ['World'],
                [
                    {
                        word: "World",
                        startOffset: 6,
                        endOffset: 11,
                        nodePath: [[0, 0]],
                    }
                ],
                null,
            ],
            [
                'Simple example with first word caps-diff',
                '<body><p>hElLo World</p></body>', 
                ['Hello'],
                [
                    {
                        word: "hElLo",
                        startOffset: 0,
                        endOffset: 5,
                        nodePath: [[0, 0]],
                    }
                ],
                null,
            ],
            [
                'Simple example where no word found',
                '<body><p>Hola Mundo</p></body>', 
                ['Pie'],
                [],
                ['pie'],
            ],
            [
                'Multiple Words found in same node',
                '<body><p>Hola Mundo</p></body>', 
                ['Hola', 'Mundo'],
                [
                    {
                        word: "Hola",
                        startOffset: 0,
                        endOffset: 4,
                        nodePath: [[0, 0]],
                    },
                    {
                        word: "Mundo",
                        startOffset: 1,
                        endOffset: 6,
                        nodePath: [[0, 2]],
                    }
                ],
                null,
            ],
            [
                'Multiple Words found in same node (1 missing)',
                '<body><p>Hola Mundo</p></body>', 
                ['Hola', 'Mundo', 'Pie'],
                [
                    {
                        word: "Hola",
                        startOffset: 0,
                        endOffset: 4,
                        nodePath: [[0, 0]],
                    },
                    {
                        word: "Mundo",
                        startOffset: 1,
                        endOffset: 6,
                        nodePath: [[0, 2]],
                    }
                ],
                ['pie'],
            ],
            [
                'Multiple Words found in different nodes',
                '<body><p>Hola Mundo!</p><p>Estoy en Miami.</p></body>', 
                ['Hola', 'Miami'],
                [
                    {
                        word: "Hola",
                        startOffset: 0,
                        endOffset: 4,
                        nodePath: [[0, 0]],
                    },
                    {
                        word: "Miami",
                        startOffset: 9,
                        endOffset: 14,
                        nodePath: [[1, 0]],
                    }
                ],
                null,
            ],
            [
                'Multiple Words found in same node (1 close word missing)',
                '<body><p>Hola Mundo</p></body>', 
                ['Hola', 'Mundo', 'Hole'],
                [
                    {
                        word: "Hola",
                        startOffset: 0,
                        endOffset: 4,
                        nodePath: [[0, 0]],
                    },
                    {
                        word: "Mundo",
                        startOffset: 1,
                        endOffset: 6,
                        nodePath: [[0, 2]],
                    }
                ],
                ['hole'],
            ],
            [
                '1 highlight for multi-word string',
                '<body><p>Hola Mundo</p></body>', 
                ['Hola Mundo'],
                [
                    {
                        word: "Hola Mundo",
                        startOffset: 0,
                        endOffset: 10,
                        nodePath: [[0, 0]],
                    },
                ],
                null,
            ],
            [
                '1 highlight extra spaces added',
                '<body><p>Hola   Mundo</p></body>', 
                ['Hola Mundo'],
                [
                    {
                        word: "Hola   Mundo",
                        startOffset: 0,
                        endOffset: 12,
                        nodePath: [[0, 0]],
                    },
                ],
                null,
            ],
            [
                '2 Highlights, where one is sub-word of another',
                '<body><p>Helloooo there</p></body>', 
                ['Helloooo', 'Hellooo'],
                [
                    {
                        word: "Helloooo",
                        startOffset: 0,
                        endOffset: 8,
                        nodePath: [[0, 0]],
                    },
                ],
                ['hellooo'],
            ],
            [
                '2 Highlights, where one is sub-word of another (both found)',
                '<body><p>Helloooo there</p><p>I said Hellooo</p>></body>', 
                ['Helloooo', 'Hellooo'],
                [
                    {
                        word: "Helloooo",
                        startOffset: 0,
                        endOffset: 8,
                        nodePath: [[0, 0]],
                    },
                    {
                        word: "Hellooo",
                        startOffset: 7,
                        endOffset: 14,
                        nodePath: [[1, 0]],
                    },

                ],
                null,
            ],
            [
                '1 highlight split into tags',
                '<body><p>Hola</p><p>Mundo</p></body>', 
                ['Hola Mundo'],
                [
                    {
                        word: "HolaMundo",
                        startOffset: 0,
                        endOffset: 5,
                        nodePath: [[0, 0],[1, 0]],
                    },
                ],
                null,
            ],
            [
                '1 highlight split into tags 2',
                '<body><p>Hola</p><p></p><p>Mundo</p></body>', 
                ['Hola Mundo'],
                [
                    {
                        word: "HolaMundo",
                        startOffset: 0,
                        endOffset: 5,
                        nodePath: [[0, 0],[2, 0]],
                    },
                ],
                null,
            ],
        ])('highlightRecovery %s', 
        (ignoreDescription: string, siteBody: string, wordsToFindArr: string[],
        expectedWordsFound: Word[], expectedMissingWords: null | string[]) => {
            const pageContent: string = `<head></head>${siteBody}`;
            const dom: JSDOM = new JSDOM(pageContent);
            global.document = dom.window.document;
            global.Node = dom.window.Node;
            global.Range = dom.window.Range;

            const wordsToFind: Set<string> = new Set(wordsToFindArr);
            let foundWords = 0;
            const highlightOperation: ((_: Word) => void) = w => {
                // Ensure stats match expectations
                const expectation: Word = expectedWordsFound[foundWords++];
                expect(w).toEqual(expectation);

                // tag node
                const nodesOfWord: Node[] = w.nodePath.map(getNodeFromNodePath);
                for (let i = 0; i < nodesOfWord.length; ++i) {
                    const node = nodesOfWord[i];
                    expect(isTextNode(node)).toBeTruthy();

                    const originalContent: string = node.textContent as string;
                    const startIndex = i === 0
                        ? w.startOffset
                        : 0;
                    const endIndex = i === (nodesOfWord.length - 1)
                        ? w.endOffset 
                        : originalContent.length;

                    const highlightNode = document.createElement('div');
                    highlightNode.setAttribute("class", "TST");
                    const range = new Range();
                    range.setStart(node, startIndex);
                    range.setEnd(node, endIndex);
                    range.surroundContents(highlightNode);
                }
            };
            const wordsAtLarge: Set<string> | null =
                highlightRecovery(wordsToFind, highlightOperation);

            if (expectedMissingWords === null) {
                expect(wordsAtLarge).toBeNull();
            } else {
                expect(wordsAtLarge)
                    .toEqual(new Set<string>(expectedMissingWords));
            }
            expect(foundWords).toBe(expectedWordsFound.length);
        });
});

