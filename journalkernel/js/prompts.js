// journal kernel — journaling prompts.
// The 5 PAJ (Positive Affect Journaling) prompts, verbatim from the reference
// app (journal-mvp/static/experimental.js), plus the Open/Auto header line.
(function () {
    'use strict';
    window.JK = window.JK || {};

    var PROMPTS = {
        'three_good_things': {
            title: 'Three good things',
            text: 'Think about something good that happened to you recently - it doesn\'t have to be anything major. Describe what happened, what you did, and why you think it went well.'
        },
        'personal_strength': {
            title: 'Personal strength',
            text: 'Think about a personal quality or strength you have. Describe a recent time when you used this strength - what happened, how you felt, and what it meant to you.'
        },
        'meaningful_activity': {
            title: 'Meaningful activity',
            text: 'Think about an activity in your life that feels meaningful or fulfilling to you. Describe what makes it meaningful, how you came to value it, and what it adds to your life.'
        },
        'kind_act': {
            title: 'Kind act',
            text: 'Think about a recent time when someone did something kind for you, or when you did something kind for someone else. Describe what happened, why it mattered, and how it affected you.'
        },
        'gratitude': {
            title: 'Gratitude',
            text: 'Think about something or someone in your life right now that you feel genuinely grateful for. Write about why this matters to you, how it became important in your life, and what it reveals about what you value.'
        }
    };

    var OPEN_SUGGESTION_TEXT = "Write about whatever's on your mind today.";

    window.JK.prompts = {
        PROMPTS: PROMPTS,
        OPEN_SUGGESTION_TEXT: OPEN_SUGGESTION_TEXT
    };
})();
