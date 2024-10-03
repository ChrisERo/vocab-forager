import { BSMessage, BSMessageType } from '../utils/background-script-communication';
import { HighlightOptions, SiteData, Word } from '../utils/models'
import { highlightRecovery } from './highlight-recovery';
import { defineWord, HILIGHT_CLASS, HILIGHT_CLASS_HOVER, isHighlightElement, isHighlightNode, isTextNode, nodeToTreePath, getNodeFromNodePath } from './utils';


/**
 * Get ID (in localStorage) of given element (a HILIGHT_CLASS element)
 *
 * @param element - must be a HILIGHT_CLASS element
 */
 function extractIdOfHighlight(element: Element): number {
   return parseInt(element.id.substring('word_'.length, element.id.lastIndexOf('_')));
}

/**
 * Get index in Highlight.highlightNodes. of given element (a HILIGHT_CLASS element)
 *
 * @param element - must be a HILIGHT_CLASS HTML element
 */
function extractIndex(element: Element) {
    let id = element.id;
    return parseInt(id.substring(id.lastIndexOf('_')+1, id.length));
}

/**
 * Updates all metadata for Highlights managed by HighlightManager that are decendants 
 * of root node that come after some start index in root node's children list. If encounteredIds
 * is not null, that means that the function should make recursive calls in the case where
 * it encounters a non-highlight node, and no modifications are moade to traversed nodes.
 *
 * If firstEncounteredElement is not null, sets firstEncounteredElement's first element
 * to the smalest id encountered, which should be the very first one.
 *
 * @param rootNode - parent of all nodes to consider
 * @param depth - how deep does node change occur
 * @param numberOfNodesToAdd - number of nodes to add to all future hilights
 * @param offsetToAdd - number of offsets to add by a hilights addtion
 * @param traversalStartIndex - index of child of root_node from which to start algorithm
 * @param shouldModifyOffset - true if the startOffset (and maybe endOffset of an encountered
 *                             hilight) should be modified)
 * @param shouldGoDownDepth - true if should go down nodes to edit highlight node's offsets/node paths
 * @param highlightManager - current state of highlights in volatile memory
 * @param firstEncounteredElement - either null if not tracking highlight id of first encountered
 *                                  highlight or an array with a single number containing
 *                                  smallest highlight id encountered so far.
 */
 function addNodesAndOffsets(rootNode: Node, depth: number, numberOfNodesToAdd: number, 
    offsetToAdd: number, traversalStartIndex: number, shouldModifyOffset: boolean, 
    shouldGoDownDepth: boolean, highlightManager: HighlightsManager, firstEncounteredElement: number[]|null): void {
        if (!rootNode.hasChildNodes()) {
            // isTextNode(rootNode) ---> function call ends here
            return;
        }
        let parents_children = rootNode.childNodes;
        for (let i = traversalStartIndex; i < parents_children.length; i++) {
            // If child node is a highlight node, modify its indecies as well as its 
            // text offset(s)
            // Otherwise, 
            let child = parents_children[i];
            if (isTextNode(child)) {
                continue;  // TODO: delete in future
            } else if (isHighlightNode(child)) {
                const highlightId = extractIdOfHighlight(child as Element);
                let highlight = highlightManager.highlights[highlightId];
                let highlightIndex = extractIndex(child as Element);
                highlight.word.nodePath[highlightIndex][depth] += numberOfNodesToAdd; 
                if (shouldModifyOffset) {
                    highlight.word.startOffset += offsetToAdd;
                    // modify last offset iff start and end nodes for right_node 
                    // are the same
                    if (highlight.word.nodePath.length === 1) {
                        highlight.word.endOffset += offsetToAdd;
                    }
                    shouldModifyOffset = false;
                }
                if (firstEncounteredElement !== null && firstEncounteredElement[0] > highlightId) {
                    firstEncounteredElement[0] = highlightId;
                    firstEncounteredElement = null;  // found old highlight, so no need to carry it
                }
            } else {
                // current node != text --> future offsets should not be modified.
                shouldModifyOffset =  shouldModifyOffset && isTextNode(child);
                if (shouldGoDownDepth) {
                    addNodesAndOffsets(child, depth, numberOfNodesToAdd, 0, 0, false, 
                        shouldGoDownDepth, highlightManager, firstEncounteredElement);
                }
            }
        }
    }

/**
 * Class taht represents section of a web page that has been highlighted for extension
 */
class Highlight {
    word: Word;
    id : number;
    manager: HighlightsManager
    highlightNodes: Node[];

    constructor(data: Word, id: number, manager: HighlightsManager) {
        this.word = data;
        this.id = id;
        this.manager = manager;
        this.highlightNodes = [];
    }

    /**
     * Wraps the selection refered to by word in an HTML element (e.g. div) so that it 
     * appears hilighted in the website.
     * 
     * Throws an exceptoin if after highlighting nodes, the highlighted text does not match
     * what this.word expects
     */
    highlightWord(): void {
        let nodesToHighlight: Node[] = this.word.nodePath.map(getNodeFromNodePath);
        let textCoveredByHighlightNodes = '';  // what text is actually covered
        for (let index = 0; index < nodesToHighlight.length; index++) {            
            // Define offset as start and end of text in new highlight node. 
            // If node is first node in list or the last one, use this.word to define value
            let node = nodesToHighlight[index];
            let startOffset = 0;
            let endOffset: number;
            if (node.textContent === null) {
                endOffset = 0;
            } else {
                endOffset = node.textContent.length;
            }

            if (node === nodesToHighlight[0]) {
                startOffset = this.word.startOffset;
            }
            if (node === nodesToHighlight[nodesToHighlight.length-1]) {
                endOffset = this.word.endOffset;
            }

            // Create new highlight node and suround current node with it
            let highlightNode = this.constructHighlightNode(index);
            let range = new Range();
            range.setStart(node, startOffset);
            range.setEnd(node, endOffset);
            range.surroundContents(highlightNode);
            textCoveredByHighlightNodes += range.toString();
        }

        // Make sure that correct text without space is highlighted, throwing exception otherwise
        if (textCoveredByHighlightNodes.replace(/\s+/g, '').toLowerCase() !== this.word.word.replace(/\s+/g, '').toLowerCase()) {
            this.unHighlightWord();
            throw `${this.word.word} does not match ${textCoveredByHighlightNodes}`;
        }


    }

    /**
     * Removes every highlight node corresponding to this object and sets the text nodes 
     * of the web page DOM to be the same as if no highlight were ever made.
     */
    unHighlightWord() {
        let parentToHilightNodes = new Map<Node, Node[]>();
        for(let i = 0; i < this.highlightNodes.length; i++) {
            let hNode = this.highlightNodes[i];
            let parentNode = hNode.parentNode as Node;
            let childNodes = parentToHilightNodes.get(parentNode);
            if (childNodes === undefined) {
                parentToHilightNodes.set(parentNode, []);
                childNodes = parentToHilightNodes.get(parentNode) as Node[]
            }
            childNodes.push(hNode);
        }

        parentToHilightNodes.forEach((highlightedChildren: Node[], parent: Node) => {
            this.unHighlightNodes(parent, highlightedChildren);
        });

        this.highlightNodes = [];  // quickly removes all highlight nodes since they're gone
    }

    /**
     * Iterates over list of highlight nodes and makes their id match the id of this.
     */
    syncIdsOfHighlightNodes() {
        for (let i = 0; i < this.highlightNodes.length; i++) {
            const node = this.highlightNodes[i] as Element;
            node.setAttribute("id", `word_${this.id}_${i}`);
        }
    }

    /**
     * Change styling of DOM nodes covered by this highlight element.
     * 
     * @param highlightStyleOptions CSS styling to apply to highlight DOM element.
     */
    applyStyle(highlightStyleOptions: HighlightOptions): void {
        const fontColor = highlightStyleOptions.fontColor;
        const bgColor = highlightStyleOptions.backgroundColor;
        for (let i = 0; i < this.highlightNodes.length; i++) {
            const node = this.highlightNodes[i] as HTMLElement;
            node.style.color = fontColor;
            node.style.backgroundColor = bgColor;
        }
    }

    private unHighlightNodes(parent: Node, highlightedChildren: Node[]) {
        for (let element of highlightedChildren) {
            // Find location of highlight node to remove
            let indexOfHighlightNode;
            for (indexOfHighlightNode = 0; indexOfHighlightNode < parent.childNodes.length; indexOfHighlightNode++) {
                if (parent.childNodes[indexOfHighlightNode] === element) {
                    break;
                }
            }
            // Check assumption that the node directly to left and right of a highlight node
            // will always be a #text node
            console.assert(indexOfHighlightNode > 0 && 
                isTextNode(parent.childNodes[indexOfHighlightNode-1]),
                'Node before not text');
            console.assert(indexOfHighlightNode < parent.childNodes.length - 1 &&
                isTextNode(parent.childNodes[indexOfHighlightNode+1]),
                'Node after is not text');
            // Perform deletion with preservation of highlight's text content
            let indexBefore = indexOfHighlightNode - 1;
            let nodeBefore = parent.childNodes[indexBefore];
            if (nodeBefore.textContent === null) {
                nodeBefore.textContent = '';
            }
            nodeBefore.textContent += element.textContent;
            parent.removeChild(element);
            // Combine before #text element with #text elements to left and right of it
            // Assumes that all extra #text nodes were made only after the highlighting.
            while (indexBefore > 0 && isTextNode(parent.childNodes[indexBefore - 1])) {
                if (nodeBefore.textContent === null) {
                    nodeBefore.textContent = '';
                }
                parent.childNodes[indexBefore - 1].textContent += nodeBefore.textContent;
                parent.removeChild(nodeBefore);
                indexBefore--;
                nodeBefore = parent.childNodes[indexBefore];
            }
            while (indexBefore < parent.childNodes.length-1 && 
                isTextNode(parent.childNodes[indexBefore + 1])) {
                let nodeAfter = parent.childNodes[indexBefore + 1];
                if (nodeBefore.textContent === null) {
                    nodeBefore.textContent = '';
                }
                nodeBefore.textContent += nodeAfter.textContent;
                parent.removeChild(nodeAfter);
            }
        }
    }

    /**
     * Creates a new node with CSS class HIGHLIGHT_CLASS containing a portion of 
     * this.word and appends it to this.highlightNodes array. Node should have 
     * appropriate listeners and css applied.
     * 
     * @param subId identifies specific node in list of highlight nodes making up a single
     * connected highlighted text.
     */
     private constructHighlightNode(subId: number): Node {
        let highlightNode = document.createElement('div');
        highlightNode.setAttribute("id", `word_${this.id}_${subId}`);
        highlightNode.setAttribute('class', HILIGHT_CLASS);
        
        // Set event listeners for this node
        // Lookup hilighted word if highlight clicked on
        highlightNode.addEventListener('click', () => {
            defineWord(this.word.word);
        });
        // Store id of element to delete
        highlightNode.addEventListener('contextmenu', () => {
            this.manager.indexToDelete = this.id;
        });
        // Add context menu for deleteing hilight and add css for onhover
        highlightNode.addEventListener('mouseover', () => {
            let message: BSMessage = {
                messageType: BSMessageType.ShowDeleteHighlightsCM,
                payload: null
            }
            chrome.runtime.sendMessage(message);

            let elements = document.querySelectorAll(`[id^=word_${this.id}_]`);
            for (let el of elements) {
                el.classList.add(HILIGHT_CLASS_HOVER);
            }
        });
        // Remove delete context menu and onhover, hilighted class
        highlightNode.addEventListener('mouseout', () => {
            let message: BSMessage = {
                messageType: BSMessageType.HideDeleteHighlightsCM,
                payload: null
            }
            chrome.runtime.sendMessage(message);

            let elements = document.querySelectorAll(
                `[id^=word_${this.id}_]`);
            for (let el of elements) {
                el.classList.remove(HILIGHT_CLASS_HOVER);
            }
        });

        this.highlightNodes.push(highlightNode);
        return highlightNode;
    }
}

/**
 * Class used for highlighting and unhighlighting text in a webpage. Contains state for 
 * all highlighted (by this extension) text of a web page.
 * 
 */
export class HighlightsManager {
    // List of highlighted elements managed by this.
    // Assumptions:
    //    * no 2 highlights ever instersect
    //    * all highlights consist of a contiguous list of Text nodes.
    // Class Invariants:
    //    * highlights[i].id === i
    //    * at any point in time, if the nodes of two ore more highlights have the same
    //      parent node, then for the highlight with the right most node(s) will appaear
    //      somewhere to the right of the other highlight
    highlights: Highlight[];
    // Number whose ID is the last highlight node to have been hovered over
    indexToDelete: number;
    // styling options for highlighting
    highlightStyleOptions?: HighlightOptions;

    constructor() {
        this.highlights = [];
        this.indexToDelete = -1;
    }

    /**
     * Sets the style options of highlights based on SiteData
     *
     * @param siteData Site data for current website
     */
     setStyleOptionsFromSiteData(siteData: SiteData): void {
        this.highlightStyleOptions = siteData.highlightOptions;
    }

    /**
     * Sets the style options of highlights
     *
     * @param opts Highlight styling optoins to use
     */
     setStyleOptions(opts: HighlightOptions): void {
        this.highlightStyleOptions = opts;
    }

    /**
     * Gets the style options of highlights based on SiteData
     */
    getStyleOptions(): HighlightOptions | undefined {
        return this.highlightStyleOptions;
    }

    /**
     * If highlight style is defined, changes highlight class style to provided operation.
     */
    applyHighlightStyle() {
        if (this.highlightStyleOptions) {
            for (let i = 0; i < this.highlights.length; i++) {
                const highlight = this.highlights[i];
                highlight.applyStyle(this.highlightStyleOptions);
            }
        }
    }

    /**
     * Highlights word specified by parameters and updates internal state so that future
     * refreshes of site do not trigger a fresh rehighlighting of entire webpage if there
     * are no website DOM changes.
     * 
     * @param word: text not currently managed or partially managed by this.
     */
    highlight(word: Word): void {
        let highlightForWord = new Highlight(word, this.highlights.length, this);
        this.insertHighlightData(highlightForWord);
        highlightForWord.highlightWord();
        if (this.highlightStyleOptions) {
            highlightForWord.applyStyle(this.highlightStyleOptions);
        }
    }

    /**
     * Attempts to highlight all the words in SiteData if there are no missing words in 
     * are recorded. If there are any missing words, or if the highlighting fails, then 
     * a recovery script is run. All words initially in SiteData's wordEntries or missingWords
     * that did not get highlighted after successful recovery run will be stored in 
     * data.missingWords.
     * 
     * Assumes that SiteData has data ordered in increasing order, where order is DFS
     * tree traversal of DOM, starting from left.
     * @param data 
     * @returns true if highightAllData completed without a a rehighlight and false otherwise
     */
    highlightAllData(data: SiteData): boolean {
        try {
            if (data.missingWords.length > 0) {
                throw 'SiteData has missing words, attempting to find them';
            }

            for(let i = 0; i < data.wordEntries.length; i++) {
                let newHighlight = new Highlight(data.wordEntries[i], i, this);
                newHighlight.highlightWord();
                this.highlights.push(newHighlight);
           }

           return true;
        } catch {
            let missingText = this.freshRehighlight(data);
            if (missingText !== null) {
                data.missingWords = Array.from(missingText);
            } else {
                data.missingWords = [];
            }

            data.wordEntries = this.getWordEntries();
            return false;
        } finally {
            this.applyHighlightStyle();
        }
    }
    
    /**
     * @returns list of Words corresponding to text controled by HighlightManager
     */
    getWordEntries(): Word[] {
        return this.highlights.map(x  => x.word);
    }

    /**
     * Deletes the highligh specified by indexToDelete from DOM as well as from HighlightManager
     * Word model. Updates any highlights whose position may have changed due to deletion.
     */
    deleteHighlight() {
        let word: Highlight =  this.highlights[this.indexToDelete];
        this.updateDataBeforeDelete(word);
        word.unHighlightWord();
        this.highlights.splice(this.indexToDelete, 1);
        for (let i = this.indexToDelete; i < this.highlights.length; i++) {
            this.highlights[i].id--;
            this.highlights[i].syncIdsOfHighlightNodes();
        }
        this.indexToDelete = -1;
    }

    /**
     * Removes highlight specified by id, the index of the highlight in 
     * HighlightManager's structure
     * 
     * @param id id of highlight to remove from DOM
     */
    unHighlightWord(id: number) {
        if (id >= 0 && id < this.highlights.length)
            this.highlights[id].unHighlightWord();
    }

    /**
     * Figures out where to place highlight in this.highlights to obey class invariants
     * and places Highlight element in there while correcting ids for highlght and all
     * Highlights in this.highlights
     * 
     * @param highlight Highlight that is not iside this.highlights and has not been 
     * added to DOM yet either.
     */
    private insertHighlightData(highlight: Highlight): void {
        let parentsToHighlightNodeIndex = new Map<Node, number[]>();
        for (let i = 0; i < highlight.word.nodePath.length; i++) {
            let nodePath = highlight.word.nodePath[i];
            let hNode = getNodeFromNodePath(nodePath);
            let parent = hNode.parentNode as Node;
            if (!parentsToHighlightNodeIndex.has(parent)) {
                parentsToHighlightNodeIndex.set(parent, []);
            }

            parentsToHighlightNodeIndex.get(parent)?.push(nodePath[nodePath.length-1]);
        }

        let idOfNewHighlight: number[] = [this.highlights.length];
        parentsToHighlightNodeIndex.forEach((orderedHChildren, parent) => {
            const lastNodeIndex = orderedHChildren[orderedHChildren.length - 1];
            const depth = nodeToTreePath(parent).length;
            const offsetToAdd = -highlight.word.endOffset;
            // TODO: consider changining number of elements to add to be more complex
            addNodesAndOffsets(parent, depth, 2 * orderedHChildren.length, offsetToAdd, lastNodeIndex+1, true, true, this, idOfNewHighlight);
        });

        highlight.id = idOfNewHighlight[0];
        this.highlights.splice(highlight.id, 0, highlight);
        for (let i = highlight.id + 1; i < this.highlights.length; i++) {
            let h = this.highlights[i];
            h.id = h.id + 1;
            h.syncIdsOfHighlightNodes();
        }
    }

    /**
     * Organises nodes specified by Highlight element by their parent node and proceedes
     * to use this information to update any of the still-remaining highlights' position 
     * info.
     * 
     * @param word Highlight that should be removed
     */
    private updateDataBeforeDelete(word: Highlight) {
        let parentToHighlightedChildren: Map<Node, Node[]>  = new Map<Node, Node[]>();
        for (let i = 0; i < word.highlightNodes.length; i++) {
            let hNode = word.highlightNodes[i];
            let parent = hNode.parentNode as Node;
            let nodeList = parentToHighlightedChildren.get(parent);
            if (nodeList === undefined) {
                parentToHighlightedChildren.set(parent, [hNode]);
                nodeList = parentToHighlightedChildren.get(parent);
            } else {
                nodeList.push(hNode);
            }
        }

       parentToHighlightedChildren.forEach((hNodes: Node[], p: Node) => {
           this.updateDeletesForSameRow(word, hNodes, p);
       });
    }

    /**
     * Calculates number of nodes and offsetsto add and subtract from any highlights present
     * in parent.childNodes. that are not in hNodes.
     * 
     * Assumes that all nodes in word whose are children of parent are listed in hNodes
     * 
     * @param word Highlight element that contains nodes referenced in hNodes
     * @param hNodes ordered list of nodes (left to right) that make up part of a highlight
     * @param parent parent node of all nodes in hNodes.
     */
    private updateDeletesForSameRow(word: Highlight, hNodes: Node[], parent: Node): void {
            // Find index where last element to delete is at in DOM tree
            // Don't use data in HighlightManager since this stores position of nodes before
            // nodes highlighted
            let lastHighlightNode = hNodes[hNodes.length-1];
            let parentChildren = parent.childNodes;
            let lastNodeIndex;  // index of last element in highlighted nodes list
            for (lastNodeIndex = 0; lastNodeIndex < parentChildren.length; lastNodeIndex++) {
                if (parentChildren[lastNodeIndex] === lastHighlightNode) {
                    break;
                }
            }
            console.assert(lastNodeIndex < parentChildren.length, 'ERROR, end node not found');
        

            // Number of nodes removed by highlight is the highlight node and 1 text node
            // Since text nodes are combined.
            // TODO: make more complex?
            let numberOfNodesToMake = -2 * word.highlightNodes.length;
        
            // Modify future offsets of other words only if this call contains last
            // highlight node of word
            // because if this node is not last node in highligt, there must be some node
            // seperating highlighted one from rest of children, making offset changing incorrect.
            // as no offset would need to be changed
            let shouldModifyFutureOffsets = lastHighlightNode === word.highlightNodes[word.highlightNodes.length - 1];
        
            let addOffset = 0;
            if (shouldModifyFutureOffsets) {
                addOffset = lastHighlightNode.textContent === null ? 0 : 
                    lastHighlightNode.textContent.length;
                // Uses assumption that h1.id < h2.id && h1.parent == h2.parent <-->
                // h1 is before h2 in DOM traversal relative to parent
                console.assert(lastNodeIndex != 0, 'Assumption on how hilights made broken');
                // Calcualte new offset based on #texts before and after el
                let counter = lastNodeIndex - 1;
                const highlightId = extractIdOfHighlight(hNodes[0] as Element);
                // TODO: reexamine second part of or condition
                while (counter >= 0 && isTextNode(parentChildren[counter]) || (isHighlightNode(parentChildren[counter]) && extractIdOfHighlight(parentChildren[counter] as Element) === highlightId)) {
                    let txt = parentChildren[counter].textContent;
                    addOffset += txt === null ? 0 : txt.length;
                    counter--;
                }
            }

            let depth = nodeToTreePath(parent).length;
            addNodesAndOffsets(parent, depth, numberOfNodesToMake, addOffset, lastNodeIndex + 1,
                shouldModifyFutureOffsets, true, this, null);  // TODO: update depth
    }

    private freshRehighlight(data: SiteData): Set<string>|null {
        for (let i = 0; i < this.highlights.length; i++) {
            this.highlights[i].unHighlightWord();
        }
        while (this.highlights.length > 0) {
            this.highlights.pop();
        }

        let wordsToFind = new Set<string>();
        for (let i = 0; i < data.wordEntries.length; i++) {
            wordsToFind.add(data.wordEntries[i].word.trim());
        }
        for (let i = 0; i < data.missingWords.length; i++) {
            wordsToFind.add(data.missingWords[i].trim());
        }

        return highlightRecovery(wordsToFind, (w) => this.highlight(w));
    }
}
