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
    color: function (status, type) {
        let markerColor;
        let textColor;

        switch (status) {
            case 'Operational':
                markerColor = 'green';
                textColor = 'green';
                break;
            case 'Turned Off':
                markerColor = 'rgb(255, 193, 7)';
                textColor = '#FFC107';
                break;
            case 'Removed':
                markerColor = 'rgb(227, 28, 35)';
                textColor = 'red';
                break;
            case 'Error (See notes for error code)':
                markerColor = 'rgb(255, 193, 7)';
                textColor = 'red';
                break;
            case 'Never Existed':
                markerColor = 'darkgrey';
                textColor = 'red';
                break;
        }

        return type == 'marker' ? markerColor : type == 'text' ? textColor : { marker: markerColor, text: textColor };
    }
};