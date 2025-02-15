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
                null
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
                const expectation: Word = expectedWordsFound[foundWords++];
                expect(w).toEqual(expectation);
            }
            const wordsAtLarge: Set<string> | null =
                highlightRecovery(wordsToFind, highlightOperation);

            if (expectedMissingWords === null) {
                expect(wordsAtLarge).toBeNull();
            } else {
                expect(wordsAtLarge)
                    .toEqual(new Set<string>(expectedMissingWords));
            }

        });
});

