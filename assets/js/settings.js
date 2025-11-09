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
    color: function (status) {
        let markerColor;
        let textColor;
        let rank;

        switch (status) {
            case 'Operational':
                markerColor = 'green';
                textColor = 'green';
                rank = 6;
                break;
            case 'Turned Off':
                markerColor = 'rgb(255, 193, 7)';
                textColor = '#FFC107';
                rank = 5;
                break;
            case 'Removed':
                markerColor = 'rgb(227, 28, 35)';
                textColor = 'red';
                rank = 3;
                break;
            case 'Error (See notes for error code)':
                markerColor = 'rgb(255, 193, 7)';
                textColor = 'red';
                rank = 4;
                break;
            case 'Never Existed':
                markerColor = 'darkgrey';
                textColor = 'red';
                rank = 1;
                break;
            case 'Unconfirmed':
                markerColor = 'darkgrey';
                textColor = 'darkgrey';
                rank = 2;
                break;
        }

        return { marker: markerColor, text: textColor, rank: rank };
    },

    prioritize: function () {
        return [
            ['==', ['get', 'color'], this.color('Operational').marker], 6,
            ['==', ['get', 'color'], this.color('Turned Off').marker], 5,
            ['==', ['get', 'color'], this.color('Error (See notes for error code)').marker], 4,
            ['==', ['get', 'color'], this.color('Removed').marker], 3,
            ['==', ['get', 'color'], this.color('Unconfirmed').marker], 2,
            ['==', ['get', 'color'], this.color('Never Existed').marker], 1,
        ]
    }
};