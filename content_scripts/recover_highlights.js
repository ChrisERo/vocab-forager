class Trie {
    /**
     * 
     * @param {Trie|null} parent node that contains this as a child
     * @param {boolean} isEnd true if node represents end of a word and false otherwise
     * @param {string} value either character corresponding to trie or the entire text 
     * that a leaf node represents (isEnd is true)
     */
    constructor(parent, isEnd, value) {
        this.parent = parent;
        this.isEnd = isEnd;
        this.children = {};
        this.value = value;
    }

    /**
     * True if character is direct decendent of this: if it's present in this.children.
     * False otherwise
     * 
     * @param {string} character 
     * @returns true if Trie has this character and false otherwise.
     */
    characterPresent(character) {
        return this.children.hasOwnProperty(character);
    }

    isRoot() {
        return this.parent === null;
    }

    /**
     * @returns parent {@link Trie} of this, even if it is null
     */
     getParent() {
        return this.parent;
    }

    /**
     * @returns true iff this {@link Trie} has no child nodes and false otherwise.
     */
     isEmpty() {
        return Object.keys(this.children).length === 0;
    }

    /**
     * 
     * Adds one character or Null to trie structure if this is not an end {@link Trie}.
     * 
     * Assumes this is not an end {@link Trie}. Throws exception if so
     * 
     * @param {string} value character to append to trie, or null to signify 
     * complete element in trie
     * @param {boolean} isEnd true if character if node represents last character of some
     * element of {@link Trie} structure and false otherwisesss
     * @returns Either the newly created {@link Trie} or a child corresponding to
     * this.children[value]
     */
    append(value, isEnd) {
        let isNotPresentAlready = !this.characterPresent(value);
        if (isNotPresentAlready) {
            this.children[value] = new Trie(this, isEnd, value);
        } else {
            this.children[value].isEnd = this.children[value] || isEnd;
        }
        return this.children[value];
    }

    /**
     * 
     * Adds entire string to {@link Trie} structure if not new. Appending a string
     * that has already been appended should result in no change in this nor its 
     * decendants.
     * 
     * @param {string} str character to append to trie, or null to signify 
     */
    appendString(str) {
        str = str.trim();
        let currentTrieAt = this;
        let lastIndex = str.length - 1;  // Mark last character to label as 
        for (let i = 0; i <= lastIndex; i++) {
            let character = str.charAt(i);
            currentTrieAt = currentTrieAt.append(character, i === lastIndex);
        }
    }

    /**
     * Deletes word represented by this trie node from overall trie strucutre and returns
     * the trie root node
     * 
     * Assumes that node is the end of an existing word
     * 
     * @returns root of Trie structure this belongs to
     */
    removeCurrentWord() {
        console.assert(this.isEnd);  // Sanity check for assumptions

        // Label node as not a word so that in case not treated as such in future. 
        // in case node not deleted
        this.isEnd = false;  

        let result = this;  // Store root node of trie structure to return

        // Delete child-less nodes from trie structure belonging to word
        while (!result.isRoot() && result.isEmpty()) {
            let father = result.parent;
            let key = result.value;
            delete father.children[key];
            result = father;
        }
        // Just get to the root
        while (!result.isRoot()) {
            result = result.parent;
        }

        return result;
    }

    /**
     * If character corresponds to a child node of this {@link Trie}, returns that
     * node, else returns null.
     * 
     * @param {string} keyToNextTrie 
     * @returns null if no child node in this corresponds to keyToNextTrie, else, the 
     * aforementioned child node
     */
    goToCharacter(keyToNextTrie) {
        let node = this.children[keyToNextTrie]
        return node === undefined ? null : this.children[keyToNextTrie]; 
    }
}

/**
 * Extracts words of vocabulario_data and creates a {@link Trie} with these words
 * 
 * @param {Object} vocabulario_data vocabulary of current webpage
 */
function convert_vocab_to_trie(vocabulario_data) {
    let trie = new Trie(null, false, '');
    let ids = Object.getOwnPropertyNames(vocabulario_data);
    for (let i = 0; i < ids.length; i++) {
        let wordIndex = ids[i];
        let vocab_word_object = vocabulario_data[wordIndex];
        let word = vocab_word_object['word'];
        trie.appendString(word);
    }
    return trie;
}

/**
 * Support traversal of DOM character by character in Text node by Text node
 */
class DomCharCursor {
    constructor() {
        this.currentNodeIndex = 0;
        this.currentIndex = 0;
        this._textNodesDfsOrder = [];
        this._getTextNodesDfsOrder(document.body);
    }

    getCurrentNode() {
        return this._textNodesDfsOrder[this.currentNodeIndex];
    }

    getCurrentIndex() {
        return this.currentIndex;
    }

   /**
    * Assuems currentNodeIndex points to a real node/element in _textNodesDfsOrder
    */
    getCurrentChar() {
        let stringContent = this._textNodesDfsOrder[this.currentNodeIndex].textContent;
        if (stringContent === '' || stringContent === null) {
            return '';
        } else {
            return stringContent[this.currentIndex];
        }
    }

    _clearTextNodesDfsCache() {
        this._textNodesDfsOrder = [];
    }

    /**
     * Takes every text node underneath currentNodeAt, including itself, and adds
     * it to currentNodesAt in depth-first-search order, left-to-right
     * 
     * Assumes function initially called on body element
     * 
     * @param {Node} currentNodeAt 
     */
    _getTextNodesDfsOrder(currentNodeAt, target_highlight_counter_value=null) {
     
        if (is_text_node(currentNodeAt)) {
            this._textNodesDfsOrder.push(currentNodeAt);
        } else if (is_hilight_node(currentNodeAt)) { 
            if (target_highlight_counter_value !== null && 
                extract_id(currentNodeAt) === target_highlight_counter_value) {
                this._textNodesDfsOrder.push(null);
            }  
        } else {
            let children = currentNodeAt.childNodes;
            for (let i = 0; i < children.length; i++) {
                this._getTextNodesDfsOrder(children[i], target_highlight_counter_value);
            }
        }
    }

    /**
     * _getTextNodesDfsOrder may initialize text node DFS-ordered cache to have nulls
     * whenever a highlight for specific word id is encountered. This removes those 
     * null entreis and returns index in cache of first text node in cache after last
     * of these entries.
     * 
     * Assumes that only single contiguous section of nulls exists.
     * 
     * @returns index of first text node inside cache after last null entry (taking into
     * account their removal of course). Or null if none every found
     */
    _removeTextNodeCacheNulls() {
        let returnNodeIndex = null;
        for (let i = 0; i < this._textNodesDfsOrder.length; i++) {
            // TODO: Fix implementation of null removals
            while (i < this._textNodesDfsOrder.length &&
                this._textNodesDfsOrder[i] === null) {
                    this._textNodesDfsOrder.splice(i, 1);
                    if (i < this._textNodesDfsOrder.length && 
                        this._textNodesDfsOrder[i] != null) {  // TODO: See if this wanted
                        returnNodeIndex = i;
                    }
            }
        }
        return returnNodeIndex;
    }

    adjustTextNodes(word_counter) {
        // Recreate text node "cache" and get new index of current text node
        this._clearTextNodesDfsCache();
        this._getTextNodesDfsOrder(document.body, word_counter);
        let lastNodeIndex = this._removeTextNodeCacheNulls();
        console.assert(lastNodeIndex !== null);

        // Set index values apprpriately
        this.currentNodeIndex = lastNodeIndex;
        this.currentIndex = 0
    }

    /**
     * If possible, moves counters to point to next character in current node or 0th index of next
     * text node if currently pointing to last character of a text Node's text content.
     * 
     * @returns true if was able to advance and false otherwise.
     */
    advanceToNextChar() {
        let currentNode = this._textNodesDfsOrder[this.currentNodeIndex];
        this.currentIndex++;
        if (this.currentIndex >= currentNode.textContent.length) {
            this.currentIndex = 0;
            this.currentNodeIndex++;
            if (this.currentNodeIndex === this._textNodesDfsOrder.length) {
                this.currentNodeIndex--;
                this.currentIndex = currentNode[this.currentNodeIndex].textContent.length;
                this.currentIndex--;
                return false;
            }
        }
        return true;
    }


    /**
     * If possible, moves counters to point to previous character in current node or last character
     * of next text node if currently pointing to last character of a text Node's text content.
     * 
     * @returns true if was able to advance and false otherwise.
     */
    backtrackToPreviousChar() {
        this.currentIndex--;
        if (this.currentIndex < 0) {
            this.currentNodeIndex--;
            if (this.currentNodeIndex < 0) {
                this.currentNodeIndex++;
                this.currentIndex = 0;
                return false;
            } else {
                this.currentIndex = this._textNodesDfsOrder[this.currentNodeIndex].textContent.length - 1;
            }
        }
        return true;
    }
}

class Highlighter {
    /**
     * 
     * @param {Trie} trie 
     */
    constructor(trie) {
        this.trie = trie;
        this.rootTrie = trie
        this.startNode = null;
        this.startOffset = -1;
        this.new_vocab_dictionary = {};
    }

    constructWordTrieAt() {
        let text = '';
        let trie = this.trie;
        console.assert(trie.isEnd);
        while (!trie.isRoot()) {
            text = trie.value + text;
            trie = trie.parent;
        }
        return text;
    }
    
    /**
     * Create a JSON representation of text that should be (supposedly re-)highlighted.
     * 
     * @param {DomCharCursor} domCharCursor 
     */
    getData(domCharCursor) {
        let endingNode = domCharCursor.getCurrentNode();
        let nodes_in_highlight = get_nodes_to_hilight_buisness_logic(this.startNode, 
            endingNode);
        return {
            'word': this.constructWordTrieAt(), // Useless for now, but will be good for quiz implementation
            'startOffset': this.startOffset,
            'endOffset': domCharCursor.getCurrentIndex(),
            'nodePaths': nodes_in_highlight.map(storeNode)
        };
    }
    
    performHighlight(domCharCursor, word_counter_value) {
        // Acquire data and highlight
        let data = this.getData(domCharCursor);
        hilight_json_data(data, word_counter_value);
        // Modify DomCharCursor pointers and caches
        domCharCursor.adjustTextNodes(word_counter_value);
        // Clear stored start and end nodes of highlight to make
        this.startNode = null;
        this.startOffset = -1;
        return data;
    }

    _backtrack(domCharCursor) {
        let words_discovered = Object.keys(this.new_vocab_dictionary).length;
        while (!this.trie.isRoot() && !this.trie.isEnd) {
            // Move word we're looking for and text looking at back a character
            this.trie = this.trie.parent;
            domCharCursor.backtrackToPreviousChar();
        }
        if (this.trie.isEnd) {
            let data = this.performHighlight(domCharCursor, words_discovered);
            this.new_vocab_dictionary[words_discovered] = data;
            this.trie.removeCurrentWord();

        } 
        
        this.startNode = null;
        this.startOffset = -1;
        return domCharCursor.advanceToNextChar();
    }

    noWordPartiallyFound() {
        return this.startNode === null && this.startOffset === -1;
    }

    /**
     * 
     * @param {DomCharCursor} domCharCursor 
     */
    highlightMissingWords(domCharCursor) {
        let canAdvance = true;
        while(canAdvance && !this.rootTrie.isEmpty()) {  // while I have words to look for
            let character = domCharCursor.getCurrentChar();
            if (this.trie.characterPresent(character))  {
                if (this.noWordPartiallyFound()) {
                    this.startNode = domCharCursor.getCurrentNode();
                    this.startOffset = domCharCursor.getCurrentIndex();
                }
                this.trie = this.trie.goToCharacter(character);
                if (!domCharCursor.advanceToNextChar()) {
                    canAdvance = this._backtrack(domCharCursor);
                }
            } 
            // TODO: Add special handling for space characters?
            else {
                canAdvance = this._backtrack(domCharCursor);

            }
        }
        return this.new_vocab_dictionary;
    }

}

/**
 * 
 * @param {Object} vocabulario_data 
 */
function recover_highlights(vocabulario_data) {
    let words_to_find = convert_vocab_to_trie(vocabulario_data);
    let highlighter = new Highlighter(words_to_find);
    let charCursor = new DomCharCursor()
    
    let new_vocab_data = highlighter.highlightMissingWords(charCursor)
    return new_vocab_data
}