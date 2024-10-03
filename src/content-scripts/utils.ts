import { BSMessage, BSMessageType, SearchRequest } from "../utils/background-script-communication";

export const HILIGHT_CLASS = 'vf-highlighted'; // class of hilighted sections in html page
export const HILIGHT_CLASS_HOVER = 'vf-highlighted-hover'; // class of hilighted sections when hovered over

/**
 * Uses extension's service worker to open up a website asociated with a
 * particular word. The current dictionary is used to perform this lookup
 * 
 * @param {string} word - user-selected text in document
 */
export function defineWord(word: string|null) {
    if (word !== null && word !== '') {
        console.log(`Looking up: ${word}`);
        let mssg: BSMessage = {
            messageType: BSMessageType.SearchWordURL,
            payload: {
                word: word
            } as SearchRequest
        };
        
        chrome.runtime.sendMessage(mssg);
    }
}

/**
 * Gets node represented by nodePath in html document
 * 
 * Assumes nodePath represents a valid node in the document's DOM
 * 
 * @param nodePath  - array of integers the previous element reffers to the the index of the
 * (nodePath.length - i)th node in the previous nodes list of children.
 * @returns node reprsented by nodePath
 */
export function getNodeFromNodePath(nodePath: number[]): Node {
    let node: Node = document.body;
    for (let i = 0; i < nodePath.length; i++) {
        node = node.childNodes[nodePath[i]];
    }

    return node;
}

/**
 * Given a Node, returns a list of integers representing the path from the Body node
 * to node, see node_path_to_node() for more details
 *
 * @param node Node in document's DOM
 * @returns list of integers where ith element is the index of that node in its parent, 
 * represented by i-1th element. node is the last element in the array and the parent of
 * the first element should be the document.body element.
 */
export function nodeToTreePath(node: Node): number[] {
    let nodeIndecies = [];
    let currentNode = node;
    const rootNode = document.body;
    while (currentNode !== rootNode) {
        let parent = currentNode.parentNode as Node;
        let currentNodeIndex = -1;
        for (let i = 0; i < parent.childNodes.length; i++) {
            if (parent.childNodes[i] === currentNode) {
                currentNodeIndex = i;
                break;
            }
        }

        nodeIndecies.push(currentNodeIndex);
        currentNode = parent;
    }

    nodeIndecies.reverse();
    return nodeIndecies;
}

/**
 * Returns true if node is a #text node and false otherwise
 *
 * @param node - Node in document.body
 */
export function isTextNode(node: Node): boolean {
    return node.nodeType === Node.TEXT_NODE;
}

/**
 * Returns whether Node element is a hilight done by this addon
 *
 * @param currentNode - Node in document.body
 */
export function isHighlightNode(currentNode: Node): boolean {
    return currentNode instanceof Element && isHighlightElement(currentNode)
}

/**
 * Returns whether Node element is a hilight done by this addon
 *
 * @param element - Node in document.body
 */
export function isHighlightElement(element: Element) {
    return element.classList != null && element.classList.contains(HILIGHT_CLASS)
}

/**
 * @param char character to test for whitespace
 * @returns true if char is a whitespace character and false othrwise.
 */
export function isWhiteSpace(char: string): boolean{
    return /\s/.test(char)
}
