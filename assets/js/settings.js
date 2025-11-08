/*!
 * Copyright (c) 2025 Brian Walczak
 * All rights reserved.
 *
 * This source code is licensed under the MIT License found in the
 * LICENSE file in the root directory of this source tree.
*/

const settings = {
    // get the settings from local storage
    get: function(value = null) {
        const getSettings = localStorage.getItem('settings');
        let result = {};

        if(getSettings) {
            try {
                result = JSON.parse(getSettings);
            } catch(error) {
                result = {}; // keep empty
            }
        }

        if(value) {
            return result[value] || null;
        } else {
            return result;
        }
    },

    // set the settings in local storage
    set: function(key, value) {
        const getSettings = localStorage.getItem('settings');
        let result = {};

        if(getSettings) {
            try {
                result = JSON.parse(getSettings);
            } catch(error) {
                result = {}; // keep empty
            }
        }

        result[key] = value;
        localStorage.setItem('settings', JSON.stringify(result));
        return result;
    },

    // delete a setting from local storage
    del: function(key = null) {
        if(!key) {
            localStorage.removeItem('settings');
            return {};
        }

        let result = settings.get();
        try {
            delete result[key];
        } catch(error) {
            return result;
        }

        localStorage.setItem('settings', JSON.stringify(result));
        return result;
    },
    theme: function(value) {
        let theme = settings.get('theme');
        if(!theme && !value) {
            settings.set('theme', 'dark'); // default to dark theme
            theme = 'dark';
        } else if(value) {
            settings.set('theme', value);
            theme = value;
        }

        $('body').removeClass('lightMode darkMode').addClass(theme == 'light' ? 'lightMode' : 'darkMode');
        return theme;
    },
    color: function(status, type) {
        let theme = settings.theme();
        let markerColor;
        let textColor;

        switch (status) {
            case 'Operational':
                markerColor = 'rgb(227, 28, 35)';
                textColor = 'green';
                break;
            case 'Turned Off':
                markerColor = 'rgba(255, 193, 7, 0.6)';
                textColor = '#FFC107';
                break;
            case 'Removed':
                markerColor = settings.theme() == 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
                textColor = 'red';
                break;
            case 'Error (See notes for error code)':
                markerColor = 'rgba(255, 193, 7, 0.6)';
                textColor = 'red';
                break;
            case 'Never Existed':
                markerColor = settings.theme() == 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
                textColor = 'red';
                break;
        }

        return type == 'marker' ? markerColor : type == 'text' ? textColor : { marker: markerColor, text: textColor };
    }
};

// swap the themes to the opposite (used for the theme toggle)
settings.theme.swap = function() {
    if ($('body').hasClass('lightMode')) {
        settings.theme('dark');
        return location.reload();
    } else if($('body').hasClass('darkMode')) {
        settings.theme('light');
        return location.reload();
    }
};