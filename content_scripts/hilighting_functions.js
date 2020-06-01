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
        for (i = 0; i < parent_node.childNodes.length; i++) {
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
 * Assumes that startNode is ordered before endNode in document.body.
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

    nodes_to_hilight.push(get_first_text_node(endNode, explored_nodes));
    // Remove possible null values in nodes_to_hilight
    nodes_to_hilight = nodes_to_hilight.filter(n => n != null);
    return nodes_to_hilight;
}

/**
 * Given a Selection, determines all the #text nodes that will be hilighted
 * 
 * @param {Selection} selected 
 */
function get_nodes_to_hilight(selected) {
    let range = selected.getRangeAt(0);
    let startNode = range.startContainer;
    let endNode = range.endContainer;

    let nodes_to_hilight = get_nodes_to_hilight_buisness_logic(startNode, endNode);
    // Check to make sure that some element was selected and a hilight wasn't chosen
    if (nodes_to_hilight == null) {
        alert('There was an error, make sure that you are not rehilighting things');
        return;
    } else if (nodes_to_hilight.length === 0) {
        alert('There was an error, nothing was selected'); // TODO: consider removing alerts
        return;
    }

    return nodes_to_hilight;
}
