/*!
 * Copyright (c) 2025 Brian Walczak
 * All rights reserved.
 *
 * This source code is licensed under the MIT License found in the
 * LICENSE file in the root directory of this source tree.
*/

const settings = {
    // get the settings from local storage
    get: function (value = null) {
        const getSettings = localStorage.getItem('settings');
        let result = {};

        if (getSettings) {
            try {
                result = JSON.parse(getSettings);
            } catch (error) {
                result = {}; // keep empty
            }
        }

        if (value) {
            return result[value] || null;
        } else {
            return result;
        }
    },

    // set the settings in local storage
    set: function (key, value) {
        const getSettings = localStorage.getItem('settings');
        let result = {};

        if (getSettings) {
            try {
                result = JSON.parse(getSettings);
            } catch (error) {
                result = {}; // keep empty
            }
        }

        result[key] = value;
        localStorage.setItem('settings', JSON.stringify(result));
        return result;
    },

    // delete a setting from local storage
    del: function (key = null) {
        if (!key) {
            localStorage.removeItem('settings');
            return {};
        }

        let result = settings.get();
        try {
            delete result[key];
        } catch (error) {
            return result;
        }

        localStorage.setItem('settings', JSON.stringify(result));
        return result;
    },

    // get the correct color for a status
    color: {
        'Operational': { marker: 'green', text: 'green', rank: 6 },
        'Turned Off': { marker: 'rgb(255, 193, 7)', text: '#FFC107', rank: 5 },
        'Removed': { marker: 'rgb(227, 28, 35)', text: 'red', rank: 3 },
        'Error (See notes for error code)': { marker: 'rgb(255, 193, 7)', text: 'red', rank: 4 },
        'Never Existed': { marker: 'darkgrey', text: 'red', rank: 1 },
        'Unconfirmed': { marker: 'darkgrey', text: 'darkgrey', rank: 2 }
    }
};