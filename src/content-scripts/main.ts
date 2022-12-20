import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { CSMessageType, isCsMessage, isNewActivatedState } from "../utils/content-script-communication";
import { enforceExplicityDarkMode, enforceExplicityLightMode, isHighlightLight, SiteData, Word } from "../utils/models";
import { HighlightsManager } from "./highlight-manager";
import { QuizManager } from "./quiz";
import { isHighlightElement, isHighlightNode, isTextNode, nodeToTreePath } from "./utils";

/**
 * Gets either the first or the last node under the root Node (including root itself) that
 * is a text node in DFS order. Returns null if none is found. Whether to look for first 
 * first or last such node (left or right DFS) depends on look_for_last parameter. 
 *
 * @param root - node under which to look for first or last text node
 * @param isLookingForLast - if true, look for last text node, else look for first
 */
 function findTextNode(root: Node, isLookingForLast: boolean): Node|null {
    if (isTextNode(root)) {
        return root;
    }

    if (!root.hasChildNodes()) {
        return null
    }

    let i: number;
    let condition: (x: number) => boolean;
    let action: (x: number) => number;
    if (isLookingForLast) {
        i = root.childNodes.length - 1;
        condition = (x) => x >= 0;
        action = (x) => {
            return x - 1;
        }
    } else {
        i = 0;
        condition = (x: number) => x < root.childNodes.length
        action = (x) => {
            return x + 1;
        }
    }

    for (; condition(i); i = action(i)) {
        let child = root.childNodes[i];
        let result = findTextNode(child, isLookingForLast);
        if (result !== null && isTextNode(result)) {
            return result;
        }
    }
    
    // Nothing found, return null
    return null;
}

/**
 * 
 * @param node node from which to make bookmarks
 * @returns map of node and parent nodes up to and including document.body  to the index of
 * their direct child node in node's TreePath, or null if one or more nodes in this path are
 * highlights.
 */
function makeBookMarksMap(node: Node): Map<Node, number> | null {
    let posInParentList: number[] = nodeToTreePath(node);
    let result: Map<Node, number> = new Map<Node, number>();
    let currentNode = node;
    for (let i = posInParentList.length - 1; i >= 0; i--) {
        if (isHighlightNode(currentNode)) {  // TODO: verify that this works in the real world
            return null;
        }

        let parent = currentNode.parentNode as Node;
        result.set(parent, posInParentList[i]);
        currentNode = parent;
    }

    return result;
}


/**
 * Returns index of some node within parent's childNodes array 
 * 
 * @param node node of DOM of web page
 * @returns index of node in parent, and -1 if either parent is null or it is somehow not
 * in parent, which is impossible.
 */
function getIndexOfNodeInParent(node: Node): number {
    let parent = node.parentElement;
    if (parent === null) {
        return -1;
    }

    for (let i = 0; i < parent.childNodes.length; i++) {
        if (node.isEqualNode(parent.childNodes[i])) {
            return i;
        }
    }

    return -1;
}

/**
 * Populates accumulator so that it becomes an DFS ordered list of text nodes in between
 * startN and endN, with both included and both assumed to be text nodes. If endN could 
 * not be found, resturns false.
 * 
 * Throws exception if a hilight node is discovered to be inbetween these two nodes.
 *
 * Assumes that startNode is ordered before endNode in document.body and that both
 * neither startNode nor endNode have higlight nodes as ancestors.
 *
 * Also assumes that for non-recursive calls, startN.isEqualNode(currentN) holds and that
 * startN and endN are both text nodes.
 * 
 * @param currentN node to consider adding to accumulator
 * @param startN the first node to consider (in DFS order). Assumed to be a Text node
 * @param endN the last node to add (in DFS order). Assumed to be a Text node
 * @param accumulator DFS-ordered list of Text nodes in between startN and endN inclusive
 * @param bookMarks mapping of non-text nodes to position in parents list of children
 * @returns 
 */
function getNodesToHighlight(currentN: Node, startN: Node, endN: Node, accumulator: Node[], bookMarks: Map<Node, number>): boolean {
    const parentN = currentN.parentNode;
    const parentOfParent = parentN?.parentNode;
    let parendNodeIndex = -1;
    
    if (isTextNode(currentN)) {
        accumulator.push(currentN);
        if (currentN.isEqualNode(endN)) {
            return true;
        } else if (currentN.isEqualNode(startN)) {
            if (parentN === null) {  // no more elements to explore somehow, return start === end
                return startN.isEqualNode(endN);
            }

            return getNodesToHighlight(parentN, startN, endN, accumulator, bookMarks);
        } else {
            return false;
        }
    } else {
        if (isHighlightNode(currentN)) {
            throw new Error("Cannot have highlight node in highlight node");
        }

        let children = currentN.childNodes;
        if (children.length > 0) {
            let startIndex = bookMarks.get(currentN);
            if (startIndex === undefined) {
                startIndex = 0;
                bookMarks.set(currentN, 0);
            }

            for (let i = startIndex; i < children.length; i++) {
                let childN = children.item(i);
                if (accumulator.includes(childN)) {  // ignore nodes already observed
                    continue;
                }

                bookMarks.set(currentN, i+1);  // TODO:F fix this s
                if (getNodesToHighlight(childN, startN, endN, accumulator, bookMarks)) {
                    return true;
                }
            }
        }

        if (currentN.isEqualNode(document.body) || parentN === null) {
            return false;
        }

        return getNodesToHighlight(parentN, startN, endN, accumulator, bookMarks);
    }
}

/**
 * Converts Selection object for highlighted text into a Word object for that text whose
 * offset and node data represents where this text is in the website.
 * 
 * @param select Selection object representing text user has highlighted
 * @returns Word representation of specific text in Selection
 */
function convertSelectionToWord(select: Selection): Word | null {

    const selectedText: string = select.toString().trim();
    if (selectedText.length === 0) {
        return null;
    }

    const range: Range = select.getRangeAt(0);
    let startNode = findTextNode(range.startContainer, false);
    if (startNode === null) {
        return null;
    }
    let startIndex = startNode.isEqualNode(range.startContainer) ? range.startOffset : 0;
    let endNode = findTextNode(range.endContainer, true);
    if (endNode === null) {
        return null;
    }
    let endIndex = endNode.isEqualNode(range.endContainer) ? range.endOffset : (endNode.textContent === null) ? 0 : endNode.textContent.length;
    let bookMarks = makeBookMarksMap(startNode);
    if (bookMarks === null) {
        return null;
    }
    
    let validTextNodes: Node[] = [];
    if (!getNodesToHighlight(startNode, startNode, endNode, validTextNodes, bookMarks)) {
        return null;
    }

    if (validTextNodes.length === 1 && startIndex === endIndex) {
        return null;
    }

    return {
        'word': selectedText,
        'startOffset': startIndex,
        'endOffset': endIndex,
        'nodePath': validTextNodes.map(nodeToTreePath)
    };
}

/**
 * Creates a SiteData based on words in a HighlightManager and a list of missing words and
 * saves the content result into non-volatile storage record for this webpage.
 * 
 * @param hm contains list of highlighted elements to consider
 * @param missingWords contains list of words that should be in hm, but are not
 */
function saveData(hm: HighlightsManager, missingWords: string[]): void {
    let wordsHighlighted: Word[] = hm.getWordEntries();
    let data: SiteData = {
        wordEntries: wordsHighlighted,
        missingWords: missingWords
    }
    const styleOpt = hm.getStyleOptions();
    if (styleOpt) {
        data.highlightOptions = styleOpt;
    }

    const title = document.title;
    if (title !== '') {
        data.title = title;
    }

    let saveMessage: BSMessage = {
        messageType: BSMessageType.StorePageData,
        payload: {
            url: window.location.href,
            data: data
        }
    } 
    chrome.runtime.sendMessage(saveMessage);
}

const MAIN_BUTTON = 0;  // see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
const highlightManager: HighlightsManager = new HighlightsManager();  // Manage highilights for page
const quizManager: QuizManager = new QuizManager();
const missingWords: string[] = [];
let isActivated: boolean = false;
const previousOnMouseUp = document.onmouseup; // on mouse up value before extension took effect

/**
 * Querries data regarding vocabulary stored for current page and hilights specified
 * vocabulary. Also sets onmouseup listener to conduct highlights.
 */
 function setUp() {
    let getSDRequest: BSMessage = {
        messageType: BSMessageType.GetPageData,
        payload: {
            url: window.location.href
        }
    };
    chrome.runtime.sendMessage(getSDRequest, 
        (data: SiteData) => { 
            highlightManager.setStyleOptionsFromSiteData(data);
            const neededRehighlight = !highlightManager.highlightAllData(data);
            for (let i = 0; i < data.missingWords.length; i++) {
                missingWords.push(data.missingWords[i]);
            }
            if (neededRehighlight || (
                (data.missingWords.length !== 0 || data.wordEntries.length !== 0) && 
                data.title === undefined && 
                document.title !== '')
                ) {
                    saveData(highlightManager, missingWords);
            }

            document.onmouseup = (event: MouseEvent) => {
                let selected = window.getSelection();
                if (event.button === MAIN_BUTTON && selected !== null) {
                    let word = convertSelectionToWord(selected);
                    if (word !== null) {
                        highlightManager.highlight(word);
                        saveData(highlightManager, missingWords);
                    } 
                }
            };
        }
    );
}


function logUnexpected(key: string, value: any) {
    console.error(`unexpected ${key}: ${JSON.stringify(value)}`);
}

/**
 * Function for instantiating listener in content script
 * @param request
 */
function handler(request: any): void {
    console.log(`REQUEST MADE TO CONTENT SCRIPT: ${request.messageType}`);

    if (!isCsMessage(request)) {
        logUnexpected("request structure", request);
        return;
     }

     switch (request.messageType) {
        case CSMessageType.DeleteChosenHighlight: {
            highlightManager.deleteHighlight();
            saveData(highlightManager, missingWords);
            break;
        }
        case CSMessageType.ActivationStateChange: {
            if (isNewActivatedState(request.payload)) {
                if (request.payload.newActivatedState && !isActivated) {
                    setUp();
                } else if (!request.payload.newActivatedState && isActivated) {
                    for (let i = 0; i < highlightManager.highlights.length; i++) {
                        highlightManager.unHighlightWord(i);
                    }
                    highlightManager.highlights = [];
                    highlightManager.indexToDelete = -1;

                    document.onmouseup = previousOnMouseUp;
                }

                isActivated = request.payload.newActivatedState
            }
            break;
        }
        case CSMessageType.StartQuiz: {
            const data: SiteData = {
                wordEntries: highlightManager.getWordEntries(),
                missingWords: missingWords
            };
            quizManager.loadQuizHTML(data);
            break;
        }
        case CSMessageType.ChangeHighlightStyle: {
            let highlightOptions  = highlightManager.getStyleOptions();
            if (isHighlightLight(highlightOptions)) {
                highlightOptions = enforceExplicityDarkMode(highlightOptions);
            } else {
                highlightOptions = enforceExplicityLightMode(highlightOptions);
            }
            highlightManager.setStyleOptions(highlightOptions);
            highlightManager.applyHighlightStyle();
            saveData(highlightManager, missingWords);
            break;
        }
        default: {
            console.log(`CONTENT_REQUEST UNKNOWN: ${request.messageType}`);
        }
     }
}

// Load data from local storage and, if configured to have highlight nodes, query for
// stored text of this node and attempt to highlight them
// TODO: shorten delay or remove once have watcher for DOM update.
setTimeout(() => {
    let getActivationMssg: BSMessage = {
        messageType: BSMessageType.GetCurrentActivation,
        payload: null
    };
    
    chrome.runtime.sendMessage(getActivationMssg,
        (result: boolean) =>  {
            isActivated = result;
            if (isActivated) {
                setUp();
            }

            chrome.runtime.onMessage.addListener(handler);
        });
}, 800);
