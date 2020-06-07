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
 * Returns the first #text node that is a decendent of node, including node itself
 *
 * @param {Node} node - Node in document.body
 */
function get_first_text_node(node) {
    if (is_text_node(node)) {
        return node;
    } else if (!node.hasChildNodes()) {
       return null;
   } else {
        let nodes_children = node.childNodes;
        for (let child of nodes_children) {
            let t = get_first_text_node(child);
            if (t != null) {
                return child;
            }
        }
        return null;
    }
}

/**
 * Given node, returns a Map whose keys are all ancestors of node (excluding node)
 * and whose values are the index of either node itself, or another one of its
 * ancestors in key's childNodes array
 *
 * Returns null if any ancestor of node is a HILIGHT_CLASS node
 *
 * @param {Node} node - Node that is a decendant of document.body element
 */
function initialize_explored_nodes(node) {
    let result = new Map();
    let node_path = storeNode(node);
    let current_node = node.parentNode;
    for (let i = 0; i < node_path.length; i++) {
        if (is_hilight_node(current_node)) {
            return null;
        }
        let index_in_parent = node_path[i];
        result.set(current_node, index_in_parent);
        current_node = current_node.parentNode;
    }
    return result;
}

/**
 * Returns an ordered array of all text nodes in between startNode and endNode inclusive.
 * Returns null if a hilight node is discovered to be inbetween these two nodes.
 *
 * Assumes that startNode is ordered before endNode in document.body and that both
 * startNode and endNode are text nodes
 *
 * @param {Node} startNode 
 * @param {Node} endNode 
 */
function get_nodes_to_hilight_buisness_logic(startNode, endNode) {
    let current_node = startNode;
    let nodes_to_hilight = [];
    let explored_nodes = initialize_explored_nodes(startNode);
    if (explored_nodes == null) {
        return null;
    }

    while (current_node !== endNode) {
        // If already "seen" current_node, go to next node or parent node if all seen
        // NOTE: assume that text nodes would never have children nodes
        if (explored_nodes.has(current_node)) {
            if (explored_nodes.get(current_node) >= current_node.childNodes.length) {
                let neighbor = current_node.nextSibling;
                current_node = neighbor == null ? current_node.parentNode : neighbor;
            } else {
                let my_new_index = explored_nodes.get(current_node) + 1;
                explored_nodes.set(current_node, my_new_index); // Update state
                // Change current_node if current_index has an unexplored child node
                if (my_new_index < current_node.childNodes.length) {
                    current_node = current_node.childNodes[my_new_index];
                }
            }
        } else {
            explored_nodes.set(current_node, 0);
            if (!is_text_node(current_node)) {
                if (is_hilight_node(current_node)) {
                    return null;
                } else if (current_node.hasChildNodes()) { // Go down first child node
                    current_node = current_node.childNodes[0];
                }
            } else { // Add text nodes to list of nodes to hilight
                nodes_to_hilight.push(current_node);
            }
        }
    }

    nodes_to_hilight.push(endNode);
    if (nodes_to_hilight[nodes_to_hilight.length-1] == null) {
        return null;
    }
    return nodes_to_hilight;
}

/**
 * Gets either the first or the last node under the root Node (including root itself) that
 * is a text node (or None if none exists). Whether to look for first first or last node
 * depends on look_for_last parameter. By first or last, we assume Depth-first traversal
 * order of page's DOM tree
 *
 * @param {Node} root - node under which to look for first or last text node
 * @param {boolean} look_for_last - if true, look for last text node, else look for first
 */
function find_first_or_last_text(root, look_for_last) {
    if (is_text_node(root)) {
        return root;
    } else if (root.hasChildNodes()) {
        if (look_for_last) {
            for (let i = root.childNodes.length - 1; i >= 0; i--) {
                let child = root.childNodes[i];
                let result = find_first_or_last_text(child, look_for_last);
                if (is_text_node(result)) {
                    return result;
                }
            }
        } else {
            for (let i = 0; i < root.childNodes.length; i++) {
                let child = root.childNodes[i];
                let result = find_first_or_last_text(child, look_for_last);
                if (is_text_node(result)) {
                    return result;
                }
            }
        }
        // Nothing found, return null
        return null;
    } else {
        return null;
    }
}

/**
 * Given a range, modifies parameter so that startContainer is the first text node under
 * startContainer and endContainer is the last text node under endContainer
 * (including container's themselves in both cases). Offsets are modified if corresponding
 * container is modified to include all contents of the container.
 *
 * Returns false if either startContainer or endContainer have no text nodes underneath
 * them in DOM tree and true otherwise
 *
 * @param {Range} range - range of selection
 */
function modify_range(range) {
    if (!is_text_node(range.startContainer)) {
        if (range.startContainer.hasChildNodes()) {
            range.setStart(range.startContainer.childNodes[range.startOffset], 0);
        }
        let new_start_node = find_first_or_last_text(range.startContainer, false);
        if (new_start_node == null) {
            return false;
        }
        range.setStart(new_start_node, 0);
    }
    if (!is_text_node(range.endContainer)) {
        if (range.endContainer.hasChildNodes()) {
            // Offset does not matter here
            range.setEnd(range.endContainer.childNodes[range.endOffset-1], 0);
        }
        let new_end = find_first_or_last_text(range.endContainer, true);
        if (new_end == null) {
            return false;
        }
        range.setEnd(new_end, new_end.textContent.length);
    }

    return true;
}

/**
 * Given a Selection, determines all the #text nodes that will be hilighted
 * 
 * @param {Selection} selected 
 */
function get_nodes_to_hilight(selected) {
    let range = selected.getRangeAt(0);
    let text_nodes_found = modify_range(range);
    if (!text_nodes_found) {
        throw 'Invalid initial range'
    }
    let startNode = range.startContainer;
    let endNode = range.endContainer;

    let nodes_to_hilight = get_nodes_to_hilight_buisness_logic(startNode, endNode);
    // Check to make sure that some element was selected and a hilight wasn't chosen
    if (nodes_to_hilight == null) {
        throw 'There was an error, make sure that you are not rehilighting things';
    } else if (nodes_to_hilight.length === 0) {
        throw 'There was an error, nothing was selected';
    }

    return nodes_to_hilight;
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
