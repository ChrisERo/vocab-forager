/* Utility functions and constants */
const HILIGHT_CLASS = 'vocabulario_hilighted'; // class of hilighted sections in html page

/**
 * Uses currently-selected (default) dictionary to lookup word(s) in selected
 *
 * @param {String} word - user-selected text in document
 * (assumed to be valid given current DOM)
 */
function lookup_word(word) {
    if (word != '') {
        console.log(`Looking up: ${word}`);
        let get_url = browser.runtime.sendMessage({type: 'search_word_url', word: word});
        get_url.then(function (response) {
            let url = response;
            window.open(url, '_blank');
        });
    }
}

/**
 * CompareTo function for numbers. Returns value > 0 if a > b, < 0 if a < b and 0 if
 * a == b. Both a and b must be numbers.
 *
 * @param {Number} a
 * @param {Number} b
 */
function numeric_compare_function(a, b) {
    let sanity_check = typeof a === 'number' && typeof b === 'number'
    console.assert(sanity_check, `${a} or ${b} is not a number`);
    return a - b;
}

/**
 * Returns true if node is a #text node and false otherwise
 *
 * @param {Node} node - Node in document.body
 */
function is_text_node(node) {
    return node.nodeName === '#text';
}

/**
 * Returns whether Node element is a hilight done by this addon
 *
 * @param {Node} element - Node in document.body
 */
function is_hilight_node(element) {
    return element.classList != null && element.classList.contains(HILIGHT_CLASS)
}

/**
 * Given a Node, returns a list of integers representing the path from the Body node
 * to node, see node_path_to_node() for more details
 *
 * @param {Node} node Node in document's DOM
 */
function storeNode(node) {
    let node_child_indecies = []; // indecies of elements in parents' child array,
                                  // with last element being child of root
    let current_node = node;
    let root_node = document.body;
    while (current_node != root_node) {
        let parent_node = current_node.parentNode;

        // Get index of current_node in list of parent
        let current_node_index = null;
        for (let i = 0; i < parent_node.childNodes.length; i++) {
            if (parent_node.childNodes[i] === current_node) {
                current_node_index = i;
                break;
            }
        }

        node_child_indecies.push(current_node_index);
        current_node = parent_node;
    }

   return node_child_indecies;
}

/**
 * Get ID (in localStorage) of given element (a HILIGHT_CLASS element)
 *
 * @param {Node} element - must be a HILIGHT_CLASS element
 */
function extract_id(element) {
    let element_id = element.id;
    element_id = parseInt(element_id.substr('word_'.length,
        element_id.lastIndexOf('_') - 'word_'.length));
    return element_id;
}

/**
 * Get index in nodePaths of given element (a HILIGHT_CLASS element)
 *
 * @param {Node} element - must be a HILIGHT_CLASS HTML element
 */
function extract_index(element) {
    let index = element.id;
    index = parseInt(index.substr(index.lastIndexOf('_')+1,
        index.length - (index.lastIndexOf('_') + 1)));
    return index;
}

/**
 * Gets node alluded to by node_path in html document
 * 
 * Assumes node_path represents a valid node in the document's DOM
 * 
 * @param {Array} node_path  - Array of integers where each element [i] represents the 
 * index of a node in the parent node [i+1], with the last element being a child node of
 * the body element.
 */
function node_path_to_node(node_path) {
    let node = document.body;
    for (i=node_path.length-1; i >= 0; i--) {
        node = node.childNodes[node_path[i]];
    }
    return node;
}

/**
 * Takes object representing hilighted section and returns all nodes of that selection.
 * 
 * Assumes store_data represents valid selection (has correct range data) in html page
 * 
 * @param {Object} store_data - object representing selection, seeselection_to_store_data
 * for object specifications
 */
function store_data_to_range(store_data) {
    return store_data['nodePaths'].map(node_path_to_node);
}

/**
 * Given a parent node and starting point, updates the metadata for all nodes to right of
 * start_index (inclusiove) that have root_node as ancestor.
 *
 * @param {Node} root_node - parent of all nodes to consider
 * @param {Number} depth - how deep we are down tree 
 *                         starting with first call being depth 0
 * @param {Number} nodes_to_add - number of nodes to add to all future hilights
 * @param {Number} offset_to_remove - number of offsets to remove by a hilights addtion
 * @param {Number} start_index - index of child of root_node from which to start algorithm
 * @param {boolean} should_modify_future_offsets - true whether the startOffset 
 *                                                 (and maybe endOffset of an encountered
 *                                                 hilight should be modified)
 * @param {Set} encountered_ids - Set of ids that have been encountered during traversal
 * @param {Object} vocabulario_data - current state of highlights in volatile memory
 */
function add_nodes_and_offsets(root_node, depth, nodes_to_add, 
    offset_to_remove, start_index, should_modify_future_offsets, 
    encountered_ids, vocabulario_data) {
        if (!root_node.hasChildNodes()) {
            return;
        }
        let parents_children = root_node.childNodes;
        for (let n_index = start_index; n_index < parents_children.length; n_index++) {
            let child = parents_children[n_index];
            if (is_hilight_node(child)) {
                let right_neighbor_id = extract_id(child);
                right_data = vocabulario_data[right_neighbor_id];
                encountered_ids.add(right_neighbor_id);

                // Update right's data based on new addition
                let right_node_index = extract_index(child);
                // Node offset changed because of additional nodes
                right_data['nodePaths'][right_node_index][depth] += nodes_to_add; 
                if (should_modify_future_offsets) {
                    // TODO: assert depth is 0
                    right_data['startOffset'] -= offset_to_remove;
                    // modify last offset iff start and end nodes for right_node 
                    // are the same
                    if (right_data['nodePaths'].length === 1) {
                        right_data['endOffset'] -= offset_to_remove;
                    }
                    should_modify_future_offsets = false;
                }
            } else {
                // don't do check once should_modify is false or current node is not text
                should_modify_future_offsets =  should_modify_future_offsets && 
                    is_text_node(child);
                add_nodes_and_offsets(child, depth+1, nodes_to_add, 
                    0, 0, false, encountered_ids, vocabulario_data);
            }
        }
    }
