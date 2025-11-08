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
    const duplicates = [] // used to store duplicates for later use

    stores.forEach(kiosk => {
        const coordsKey = `${kiosk.lon},${kiosk.lat}`;

        const newFeature = {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [kiosk.lon, kiosk.lat],
            },
            properties: {
                id: kiosk.id,
                bannerName: kiosk.banner_name || 'Unknown',
                address: kiosk.address,
                openDate: kiosk.open_date ? new Date(kiosk.open_date).toLocaleDateString() : 'Unknown',
                color: settings.color(kiosk.status || 'Operational', 'marker'),

                // we need to make a deep copy since geometry changes over time based on map movement
                lng: parseFloat(kiosk.lon),
                lat: parseFloat(kiosk.lat)
            }
        };

        if (featuresMap.has(coordsKey)) {
            const existing = featuresMap.get(coordsKey); // get the already-existing one

            // Prefer the address with longer length (obv may not be good enough but it's the best we can do, we want the most detailed!)
            if (newFeature.properties.address.length > existing.properties.address.length) {
                // Merge the two items into one (merge values if one includes data the other doesn't)
                if (existing.properties.openDate !== 'Unknown') {
                    newFeature.properties.openDate = existing.properties.openDate;
                    newFeature.properties.isMerged = true;
                }

                if (existing.properties.bannerName !== 'Unknown') {
                    newFeature.properties.bannerName = existing.properties.bannerName;
                    newFeature.properties.isMerged = true;
                }

                featuresMap.set(coordsKey, newFeature); // update to the new, merged item
                duplicates.push(existing); // add the old one to duplicates
            } else {
                duplicates.push(newFeature); // add the new one to duplicates
            }
        } else {
            featuresMap.set(coordsKey, newFeature); // add if no duplicates
        }
    });

    // Convert the map values into an array
    return { result: Array.from(featuresMap.values()), duplicates };
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
                status: store.status,
                notes: store.notes
            };
        });

        self.postMessage({ stores: geoJSON.result, cached, duplicates: geoJSON.duplicates });
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};