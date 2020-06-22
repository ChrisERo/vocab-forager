let quiz_set = false; // true if quiz displayed in current page, else false
let quiz_word_list = null; // words not yet been tested in current quiz
/**
 * Creates empty div for page's vocab quiz and places it at end of body
 */
function add_quiz_div() {
    let quiz_container = document.createElement('div');
    quiz_container.id = 'quiz_container_box';
    quiz_container.setAttribute('class', 'dark_screen');
    document.body.appendChild(quiz_container);
    return quiz_container;
}

/**
 * Modern Fisher–Yates shuffle algorithm for Javascript arrays
 *
 * From https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
 *
 * @param {Array} a
 */
function shuffle(a) {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
}

/**
 * Sets quiz_word_list into a list of all words from vocabulario_data object with order of
 * words randomized
 *
 * @param {Object} vocabulario_data
 */
function set_up_word_list(vocabulario_data) {
    quiz_word_list = [];
    for (let prop in vocabulario_data) {
        if (Object.prototype.hasOwnProperty.call(vocabulario_data, prop)) {
           let word = vocabulario_data[prop]['word'];
           quiz_word_list.push(word);
        }
    }
    shuffle(quiz_word_list);

}

/**
 * Initalises quiz_word_list and sets actions for elemetns inside quiz_container_box
 *
 * @param {Object} vocabulario_data - vocabulary data pertaining to current web page
 */
function set_up_actions(vocabulario_data) {
    set_up_word_list(vocabulario_data);

    let close = document.getElementById('close_the_quiz');
    close.addEventListener('click', function () {
        let quiz_container = document.getElementById('quiz_container_box');
        // TODO: add transition upwards
        quiz_container.parentNode.removeChild(quiz_container);
        quiz_set = false;
    });

    let word = document.getElementById('word_questioning');
    word.textContent = quiz_word_list[quiz_word_list.length - 1];
    word.addEventListener('click', function () {
        let text = this.textContent;
        lookup_word(text);
    });

    let next_button = document.getElementById('next');
    next_button.addEventListener('click', function () {
        quiz_word_list.pop();
        if (quiz_word_list.length === 0) {
            set_up_word_list(vocabulario_data);
        }
        word.textContent = quiz_word_list[quiz_word_list.length - 1];
    });
}

/**
 * Fetches html for quiz elements and inserts them into current web page, then adds
 * actions and appropriate metadata
 *
 * @param {Object} vocabulario_data
 */
function load_quiz_html(vocabulario_data) {
    // TODO: Do not use fetch, It is unstable.Use ajax call
    fetch(browser.runtime.getURL("cross-page-assets/quiz.html"))
        .then(function(response) {
            return response.text();
        })
        .then(function(html) {
            let quiz_container = add_quiz_div();
            quiz_container.innerHTML += html;
            set_up_actions(vocabulario_data);
    });
}
