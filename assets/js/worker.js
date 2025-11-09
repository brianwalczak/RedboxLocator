/*!
 * Copyright (c) 2025 Brian Walczak
 * All rights reserved.
 *
 * This source code is licensed under the MIT License found in the
 * LICENSE file in the root directory of this source tree.
*/

importScripts('/assets/js/settings.js');

// Creates GeoJSON features from store data
function createGeoJSON(stores) {
    const featuresMap = new Map(); // used to prevent duplicate coordinates

    stores.forEach(kiosk => {
        const coordsKey = `${kiosk.lon},${kiosk.lat}`;
        const color = settings.color[(kiosk.status === 'Operational' && !kiosk.notes) ? 'Unconfirmed' : kiosk.status];

        const data = {
            id: kiosk.id,
            bannerName: kiosk.banner_name,
            address: kiosk.address,
            openDate: kiosk.open_date ? new Date(kiosk.open_date).toLocaleDateString() : null
        };

        if (featuresMap.has(coordsKey)) {
            const existing = featuresMap.get(coordsKey); // get the already-existing one

            if (existing.properties.kiosks) {
                existing.properties.kiosks.push(data);
            }

            if (existing.properties.initColorRank < color.rank) {
                existing.properties.initColor = color.marker; // update to higher priority color
                existing.properties.initColorRank = color.rank;
            }

            if (existing.properties.unknownDates && kiosk.open_date) {
                existing.properties.unknownDates = false;
            }
        } else {
            // add if no duplicates
            featuresMap.set(coordsKey, {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [kiosk.lon, kiosk.lat],
                },
                properties: {
                    initColor: color.marker,
                    initColorRank: color.rank,
                    unknownDates: !kiosk.open_date,
                    kiosks: [data],

                    // we need to make a deep copy since geometry changes over time based on map movement
                    id: coordsKey,
                    lng: parseFloat(kiosk.lon),
                    lat: parseFloat(kiosk.lat)
                }
            });
        }
    });

    // Convert the map values into an array
    return Array.from(featuresMap.values());
}

self.onmessage = async function (event) {
    try {
        const response = await fetch('https://findaredbox.kbots.tech/search');

        if (!response.ok) {
            return self.postMessage({ error: response.statusText });
        }

        const stores = await response.json();
        const geoJSON = createGeoJSON(stores);

        // Cache the store data (status and notes)
        const cached = {};

        stores.forEach(store => {
            cached[store.id] = {
                status: (store.status === 'Operational' && !store.notes) ? 'Unconfirmed' : store.status,
                notes: store.notes
            };
        });

        self.postMessage({ stores: geoJSON, cached: cached });
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};