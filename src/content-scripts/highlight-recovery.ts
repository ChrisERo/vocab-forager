import { SiteData, Word } from "../utils/models";
import { isTextNode, isWhiteSpace, nodeToTreePath } from "./utils";

const END_OF_WORD = 'ED';
const SPACE_CHAR = ' ';

type WordConsumer = (w: Word) => void;

/**
 * Trie structure representing a collection of distinct texts. Eacch text consistes
 * of a "character" it represents and a map of characters to Trie children. The end
 * of a word is signified by a childless endOFWord Trie node.
 * 
 * For instance, the text 'Vocab is cool!' would be represented as
 * v->o->c->a->b-> ->i->s-> ->c->o->o->l->!->ED, lowercase is done on purpose
 */
class Trie {
    char: string;
    parent: Trie|null;
    children: Map<string, Trie>;

    constructor(parent: Trie|null, char: string) {
        this.char = char;
        this.parent = parent;
        this.children = new Map<string, Trie>();
    }

    /**
     * Adds string to Trie structure, making new nodes for each character, and an extra one 
     * signifying end of word. The text passed in is modified before adding to Trie such that
     * all characters are lowercase, there are no trailing line spaces, and all consecurtive
     * spaces are replaced by a single instance of SPACE_CHAR.
     * 
     * @param text string that should be added to Trie structure, if it is not already 
     * present
     */
    appendWord(text: string): void {
        text = text.trim();
        text = text.replace(/\s\s+/g, SPACE_CHAR);
        text = text.toLocaleLowerCase();
        if (text.length === 0) {
            return;
        }
        
        let currentTrie: Trie = this;
        for (let i = 0; i < text.length; i++) {
            let char: string = text.charAt(i);
            let nextTrie: Trie;
            if (currentTrie.children.has(char)) {
                nextTrie = currentTrie.children.get(char) as Trie;
            } else {
                nextTrie = new Trie(currentTrie, char);
                currentTrie.children.set(char, nextTrie); 
            }
            currentTrie = nextTrie;
        }

        currentTrie.children.set(END_OF_WORD, new Trie(currentTrie, END_OF_WORD));
    }

    /**
     * Gets the next node in Trie structure that corresponds to char, returning undefined
     * if not such Trie node exists.
     * 
     * Assumes only whitespace character in Trie is white space char SPACE_CHAR
     * 
     * @param char 
     * @returns 
     */
    getNodeWithChar(char: string): Trie|undefined {
        if (isWhiteSpace(char) && char !== SPACE_CHAR) {
            char = SPACE_CHAR;
        }
        return this.children.get(char);
    }

    /**
     * @returns true if this object has no parent node and false otherwise
     */
    isRoot(): boolean {
        return this.parent === null;
    }

    /**
     * 
     * @returns true if this trie node represents end of word, false otherwise.
     */
    isEndOfWord(): boolean {
        return this.char === END_OF_WORD;
    }

    /**
     * If this trie is the end of a word, removes word from trie structure, and all parent
     * nodes until we reach a node that has at least one child node after removal of a child
     * or we reach root node.
     * 
     * Throws exception if called on node that is not an end of a word.
     */
    removeWord(): void {
        if (!this.isEndOfWord()) {
            throw Error(`Node char ${this.char} is not end of word marker`)
        }

        let t: Trie = this;
        while (!t.isRoot()) {
            let parent = t.parent as Trie;
            if (t.children.size === 0) {
                parent.children.delete(t.char);
                t.parent = null;
            }

            t = parent;
        }
    }

    /**
     * @returns set of words represented by this.
     */
    setOfWords(): Set<string> {
        let wordSet = new Set<string>();
        this.setOfWordsHelper('', wordSet);
        return wordSet;
    }

    private setOfWordsHelper(wordInProgress: string, wordSet: Set<String>) {
        if (this.isEndOfWord()) {
            wordSet.add(wordInProgress);
        } else {
            wordInProgress = wordInProgress + this.char;
            this.children.forEach((value: Trie, key: string) => {
                value.setOfWordsHelper(wordInProgress, wordSet);
            });
        }
    }
}

class TextIndex {
    nodeIndex: number;
    charIndex: number;
    lastAdvanceIncreasedNode: boolean;

    constructor(nI: number, cI: number) {
        this.nodeIndex = nI;
        this.charIndex = cI;
        this.lastAdvanceIncreasedNode = false;
    }

    isBeforeOrIs(that: TextIndex): boolean {
        return that.nodeIndex >= this.nodeIndex || that.charIndex >= this.charIndex; 
    }

    /**
     * Gets character referenced by this object in textNodes array if it exists; otherwise
     * returns null.
     * 
     * @param textNodes list of unhighlighted Nodes of type TEXT with at least one character ordered in DFS order.
     * @returns character at location specified by TextIndex object if it exists, otherwise,
     * returns null
     */
    getCurrentChar(textNodes: Node[]): string|null {
        if (textNodes.length <= this.nodeIndex) {
            return null;
        }

        let n = textNodes[this.nodeIndex].textContent as string;
        if (n.length <= this.charIndex) {
            return null;
        }

        return n.charAt(this.charIndex);
    }

    /**
     * Attempts to make this TextIndex reference next character in Node array and to the
     * next non-space character if current TextIndex position references a "space character".
     * If and only if there is no valid character after current one does advance return false;
     * in this case, state of object is set to initial state.
     * 
     * Also tracks whether advance resulted in an increase in node index, if advance
     * succeeded, using lasAdvanceIncreasedNode instance variable.
     * 
     * Assumes that this references a character in textNodes
     * 
     * @param textNodes see getCurrentChar
     * @returns true if advance succeeded in increasing TextIndex's value and false otherwise
     */
    advance(textNodes: Node[]): boolean {
        return this.changeCursor(textNodes,  (x, y) => this.advanceByOne(x, y));
    }

     /**
     * Attempts to make this TextIndex reference previous character in Node array and to the
     * previous non-space character if current TextIndex position references a "space character".
     * If and only if there is no valid character before current one does goBack return false;
     * in this case, state of object is set to initial state.
     * 
     * Also tracks whether goBack resulted in a decrease in node index, if it
     * succeeded, using lasAdvanceIncreasedNode instance variable.
     * 
     * Assumes that this references a character in textNodes
     * 
     * @param textNodes see advance
     * @returns true if operation succeeded, otherwise false.
     */
    goBack(textNodes: Node[]): boolean {
        return this.changeCursor(textNodes, (x, y) => this.goBackByOne(x, y))
    }

    /**
     * Attempts to update this object to reference some other character in textNodes using
     * at least one call to updateCursor. If this succeedes, returns true, updating 
     * lastAdvacneIncreaseNode if nodeIndex changed. Otherwise, returns false and keeps
     * state the same as before function call.
     * 
     * TODO: review to ensure that new-nodes are more clearly treated as spaces
     * 
     * @param textNodes see advance
     * @param updateCursor function that changes the character cursor references by one if
     * possible, returning true on success; otherwise keeps index fields the same and returns 
     * false.
     * @returns 
     */
    private changeCursor(textNodes: Node[], updateCursor: (x: string, y: Node[]) => boolean) {
        let currentNodeText = (textNodes[this.nodeIndex].textContent as string);
        let currentChar = currentNodeText.charAt(this.charIndex);
        if (!isWhiteSpace(currentChar)) {
            return updateCursor(currentNodeText, textNodes); 
        }

        let oldNodeIndex = this.nodeIndex;
        let oldCharIndex = this.charIndex;
        let oldLastAdvanceIncreasedNode = this.lastAdvanceIncreasedNode;

        while(isWhiteSpace(currentChar)) {
            if (!updateCursor(currentNodeText, textNodes)) {
                this.lastAdvanceIncreasedNode = oldLastAdvanceIncreasedNode;
                this.nodeIndex = oldNodeIndex;
                this.charIndex = oldCharIndex;
                return false;
            }

            currentNodeText = (textNodes[this.nodeIndex].textContent as string);
            currentChar = currentNodeText.charAt(this.charIndex);
        }

        this.lastAdvanceIncreasedNode = this.nodeIndex !== oldNodeIndex;
        return true;
    }

    /**
     * Advances this to next character if possible. Returns false if not possible
     * 
     * @param currentText text of node that current values of TextInIndex references in 
     * textNodes
     * @param textNodes see advance()
     * @returns see advance()
     */
    private advanceByOne(currentText: string, textNodes: Node[]): boolean {
        this.charIndex++;
        if (currentText.length <= this.charIndex) {
            this.nodeIndex++;
            if (textNodes.length <= this.nodeIndex) {
                this.nodeIndex--;
                this.charIndex--;
                return false;
            }

            this.charIndex = 0;
            this.lastAdvanceIncreasedNode = true;
        } else {
            this.lastAdvanceIncreasedNode = false;
        }

        return true;
    }

    /**
     * Same as advanceByOne(), but changes this to point to a previous character instead of
     * the next character.
     * 
     * @param currentText see advanceByOne
     * @param textNodes see advanceByOne
     * @returns see advanceByOne
     */
    private goBackByOne(currentText: string, textNodes: Node[]): boolean {
        this.charIndex--;
        if (this.charIndex < 0) {
            this.nodeIndex--;
            if (this.nodeIndex < 0) {
                this.nodeIndex++;
                this.charIndex++;
                return false;
            }

            currentText = textNodes[this.nodeIndex].textContent as string;  // Assumes that all text nodes have at least one character present
            this.charIndex = currentText.length - 1;
            this.lastAdvanceIncreasedNode = true;
        } else {
            this.lastAdvanceIncreasedNode = false;
        }

        return true;
    }
}

/**
 * Attempts to find one instance of every string in set from within DOM and execute 
 * highlight function on the found text.
 * 
 * All resulting highlights have no intersection
 * 
 * @param words set of words that need to be found in webpage
 * @returns set fo words from words that were not found, or null if all were found
 */
export function highlightRecovery(words: Set<string>, highlight: WordConsumer): Set<string>|null {
    let trieStruct = makeTrieStructure(words);
    let textNodes: Node[] = getAllFilledTextNodesUnder(document.body);
    return findMissingWords(trieStruct, textNodes, highlight);
}

/**
 * Converts set of words into trie structure with root as '' and every
 * word included.
 * 
 * @param words set of words with which to create Trie
 * @returns Trie representation of words set
 */
function makeTrieStructure(words: Set<string>): Trie {
    const result = new Trie(null, '');
    for (const text of words) {
        result.appendWord(text);
    }
    return result;
}

/**
 * Looks for all descendant nodes of some node passed in and returns ordered list of 
 * text nodes that have at least one character
 * 
 * @param node root node in which to look for text nodes. Node itself is not included in
 * search
 * @returns array of Text Nodes in root node that have at least one character as content.
 * The array is ordered based on Depth-First-Search traversal.
 */
function getAllFilledTextNodesUnder(node: Node): Node[]{
    let textNodes: Node[] = [];
    for (let nodeCursor = node.firstChild; nodeCursor; nodeCursor = nodeCursor.nextSibling){
        if (nodeCursor.nodeType === Node.TEXT_NODE && nodeCursor.textContent !== null && nodeCursor.textContent.length !== 0)  {
            textNodes.push(nodeCursor);
        } else {
            let descendantTextNodes = getAllFilledTextNodesUnder(nodeCursor)
            for (let i = 0; i < descendantTextNodes.length; i++) {
                textNodes.push(descendantTextNodes[i])
            }
        }
    }
    return textNodes;
}


/**
 * 
 * @param root root of trie structure listing words to search for in site body
 * @param textNodes ordered list of non-null text-nodes 
 * @param highlight 
 * @returns 
 */
function findMissingWords(root: Trie, textNodes: Node[], highlight: WordConsumer): Set<string>|null {
    if (root.children.size === 0) {
        return null;
    }

    let currentPos = new TextIndex(0, 0);
    let wordEndPos = new TextIndex(0, 0);
    while (currentPos.nodeIndex < textNodes.length) {
        let endTrieNode: Trie = searchForString(currentPos, wordEndPos, textNodes, root);
        if (endTrieNode.isRoot()) {
            if (!currentPos.advance(textNodes)) {  // try to advance to next char, terminating if not possible.
                break;
            }
        } else {
            const endParent = textNodes[wordEndPos.nodeIndex].parentNode as Node;
        
            endTrieNode.removeWord();
            const startNodeIndex = currentPos.nodeIndex;
            const endNodeIndex = wordEndPos.nodeIndex;
            const nodePaths = textNodes
                .slice(startNodeIndex, endNodeIndex + 1)
                .map(nodeToTreePath);
            
            
            const startOffset = currentPos.charIndex;
            const endOffset = wordEndPos.charIndex + 1;
            const textRange = new Range();
            textRange.setStart(textNodes[currentPos.nodeIndex], startOffset);
            textRange.setEnd(textNodes[wordEndPos.nodeIndex], endOffset);
            const foundText = textRange.toString();
            
            // TODO: consider using range here to define foundText instead.
            const foundWordObj: Word = {
                startOffset: startOffset,
                endOffset: endOffset,
                word: foundText,
                nodePath: nodePaths,
            };

            highlight(foundWordObj);
            if (root.children.size === 0) {
                return null;
            }

            // Update textNodes assumes that highlight always results in 3 new nodes 
            // at parent level
            textNodes = textNodes.slice(endNodeIndex + 1);
            const lastNodeArray = nodePaths[nodePaths.length - 1]
            const domEndNodeIndex = lastNodeArray[lastNodeArray.length - 1];
            const firstTextNodeAfterNewHighlight = endParent.childNodes[domEndNodeIndex + 2];
            if (firstTextNodeAfterNewHighlight !== null &&
                firstTextNodeAfterNewHighlight.textContent !== null &&
                firstTextNodeAfterNewHighlight.textContent.trim().length !== 0) {
                    console.assert(isTextNode(firstTextNodeAfterNewHighlight));
                    textNodes.unshift(firstTextNodeAfterNewHighlight);
            }

            currentPos.charIndex = 0;
            currentPos.nodeIndex = 0;
            // TODO: consider advancing charIndex while points to empty space
        }

        // Ritual clearing of buffer values
        wordEndPos.charIndex = 0;
        wordEndPos.nodeIndex = 0;
        wordEndPos.lastAdvanceIncreasedNode = false;
    }

    return root.setOfWords();
}

/**
 * Starting from startPos in textNodes, attempts to find the longest word represented by
 * provided Trie structure that is represented by consecutive characters starting from
 * startPos (multiple spaces and new-nodes are treated as a single 'space'). 
 * 
 * @param startPos position from which to begin search. Must reference valid char in textNodes
 * @param wordEndPosBuffer buffer in which to store index of last character from startPos of word from trieRoot if it exists.
 * @param textNodes see findMissingWords()
 * @param trieRoot root node of Trie structure with words to look for.
 * @returns Trie node in trieRoot signifying word contained in between startPos and wordEndPosBuffer
 * inclusive if it exists, else returns trieRoot.
 */
function searchForString(startPos: TextIndex, wordEndPosBuffer: TextIndex, textNodes: Node[], trieRoot: Trie): Trie {
    wordEndPosBuffer.nodeIndex = startPos.nodeIndex;
    wordEndPosBuffer.charIndex = startPos.charIndex;
    wordEndPosBuffer.lastAdvanceIncreasedNode = false;
    
    let trieNode = trieRoot;
    let encounteredWrongChar = false;
    
    /**
     * Loop invariants:
     * wordEndPosBuffer is always a character in textNodes unless it references the space 
     *     after last character of last node in textNodes
     * trieNode is always updated on each non-terminating iteration to one of its children
     * wordEndPosBuffer is never updated to an index referencing a position in textNodes
     *     before the previous iteration.
     * 
     */
    while (true) {
        let currentChar = (wordEndPosBuffer.getCurrentChar(textNodes) as string).toLowerCase();
        let nextTrie = trieNode.getNodeWithChar(currentChar);
        
        if (nextTrie === undefined) {
            // Count new nodes as spaces
            if (wordEndPosBuffer.lastAdvanceIncreasedNode) {
                nextTrie = trieNode.getNodeWithChar(SPACE_CHAR);
                if (nextTrie !== undefined) {
                    trieNode = nextTrie;
                    continue;  // retry check now that trie has advanced
                }
            }

            encounteredWrongChar = true;
            break;
        } else {
            let advanceFailed: boolean = !wordEndPosBuffer.advance(textNodes);
            if (advanceFailed) {
                break;
            }
            trieNode = nextTrie;
        }
    }

    // Do backtrack now till longest possible word obtained.
    if (encounteredWrongChar) {
        wordEndPosBuffer.goBack(textNodes);
    }

    while (!trieNode.isRoot()) {
        let currentChar = (wordEndPosBuffer.getCurrentChar(textNodes) as string).toLocaleLowerCase();
        let goBackFailed = false;
        if (currentChar === trieNode.char || 
            (isWhiteSpace(currentChar) && isWhiteSpace(trieNode.char))) {
                if (trieNode.children.has(END_OF_WORD)) {
                    return trieNode.getNodeWithChar(END_OF_WORD) as Trie;
                } else {
                    trieNode = trieNode.parent as Trie;
                    goBackFailed = !wordEndPosBuffer.goBack(textNodes);
                }
        } else {
            if (isWhiteSpace(trieNode.char) && 
                wordEndPosBuffer.lastAdvanceIncreasedNode) {  
                    // Move trie to next non-space character and 
                    // get to next non-whitespace char in wordEndPosBuffer since new-nodes
                    // treated like whitespace and all whitespace is trunctated in trie.
                    trieNode = trieNode.parent as Trie;
                    if (isWhiteSpace(currentChar)) {
                        goBackFailed = !wordEndPosBuffer.goBack(textNodes);
                    }

            } else {
                throw new Error(`Unexpected character difference: Trie: ${trieNode.char}, 
                    Text: ${currentChar}`);
            }
        }

        if (goBackFailed) {
            throw new Error(`Failed to go back at index ${wordEndPosBuffer.charIndex} of text 
                ${textNodes[wordEndPosBuffer.nodeIndex].textContent}`);
        }
    }

    return trieRoot;
}
