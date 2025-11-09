/*!
 * Copyright (c) 2025 Brian Walczak
 * All rights reserved.
 *
 * This source code is licensed under the MIT License found in the
 * LICENSE file in the root directory of this source tree.
*/

const settings = {
    color: {
        'Operational': { marker: 'green', text: 'green', rank: 6 },
        'Turned Off': { marker: 'rgb(255, 193, 7)', text: '#FFC107', rank: 5 },
        'Removed': { marker: 'rgb(227, 28, 35)', text: 'red', rank: 3 },
        'Error (See notes for error code)': { marker: 'rgb(255, 193, 7)', text: 'red', rank: 4 },
        'Never Existed': { marker: 'darkgrey', text: 'red', rank: 1 },
        'Unconfirmed': { marker: 'darkgrey', text: 'darkgrey', rank: 2 }
    }
};