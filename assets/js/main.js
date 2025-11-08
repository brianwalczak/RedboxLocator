/*!
 * Copyright (c) 2025 Brian Walczak
 * All rights reserved.
 *
 * This source code is licensed under the MIT License found in the
 * LICENSE file in the root directory of this source tree.
*/

// Reserve variables for the map and geolocation control
var map;
var geolocateControl;
window.alreadyLocated = false;
window.duplicates = [];
window.cache = [];

const ACCESS_TOKEN = 'pk.eyJ1IjoiYnJpYW53YWxjemFrIiwiYSI6ImNtNXE2ZXJzZzA4emIyanExdmI0MGZhYW4ifQ.58j41e6A78-4Md1B0EJ5FQ';
const ZOOM_THRESHOLD = 11;
// Warning: if anybody is planning to use this, you literally can't do anything with this token... it's meant to be public lol
// You won't be able to use it on any other site, so don't even try it.
// If you want to use Mapbox, you need to get your own token from their website.
// Oh... and I also update this token every time I commit, so it's useless to you anyway. :P

// Creates the map and all of its features
function spawnMapInstance() {
    return new Promise((resolve, reject) => {
        let mapTheme = settings.theme(); // get theme color
        if (map && geolocateControl) {
            return resolve(true);
        }

        console.warn('A map request has been called, creating a new map instance with Mapbox GL JS.\nWarning: You WILL be charged for Mapbox API requests!');
        mapboxgl.accessToken = ACCESS_TOKEN;
        
        if(mapTheme == 'light') {
            mapTheme = 'mapbox://styles/mapbox/light-v11'
        } else if(mapTheme == 'dark') {
            mapTheme = 'mapbox://styles/mapbox/dark-v11'
        }

        map = new mapboxgl.Map({
            container: 'map',
            style: mapTheme,
            center: [-98.5795, 39.8283],
            zoom: 2,
            failIfMajorPerformanceCaveat: false
        });

        geolocateControl = new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true
        });

        map.addControl(geolocateControl);
        const btn = document.createElement('button');
        btn.className = 'geolocate-btn';
        btn.innerHTML = '';
        btn.onclick = async () => {
            geolocateControl.trigger();
            
            if (typeof(DeviceMotionEvent) !== "undefined" && typeof(DeviceMotionEvent.requestPermission) === "function") { // if they're on an iOS device
                try {
                    await DeviceMotionEvent.requestPermission(); // request permission for orientation tracking
                } catch (error) {}
            }
        };
        document.body.appendChild(btn);

        geolocateControl.on('trackuserlocationstart', () => {
            $('.geolocate-btn').addClass('active');
        });
          
        geolocateControl.on('trackuserlocationend', () => {
            $('.geolocate-btn').removeClass('active');
        });      

        map.on('load', function() {
            map.resize();
            console.log('The map has been loaded successfully, user can now access.');

            resolve(true);
        });

        map.on('error', function(err) {
            console.error('Error loading the map:', err);
            reject(err);
        });

        geolocateControl.once('geolocate', (event) => {
            window.alreadyLocated = true;
        });
    });
}

// Updates the clusters on the map
let zoomedInStores = new Set();

function updateClusters() {
    const zoom = map.getZoom();

    if (zoom < ZOOM_THRESHOLD) {
        // Remove all stores if zoomed out too far
        zoomedInStores.forEach(storeId => {
            map.setFeatureState({ source: 'storeSource', id: storeId }, { color: null });
        });
        zoomedInStores.clear();
        return;
    }

    const features = map.queryRenderedFeatures({ layers: ['storeLayer'] });
    const storeIds = new Set(features.map(feature => feature.id));

    // Add any stores that are in view
    features.forEach(store => {
        try {
            const cache = window.cache[store.id];
            
            map.setFeatureState({ source: 'storeSource', id: store.id }, { color: settings.color(cache.status, 'marker') });
            zoomedInStores.add(store.id);
        } catch (error) {}
    });

    // Remove any stores that are no longer in view
    zoomedInStores.forEach(storeId => {
        if (!storeIds.has(storeId)) {
            map.setFeatureState({ source: 'storeSource', id: storeId }, { color: null });
            zoomedInStores.delete(storeId);
        }
    });
}

// Serves the popup for a store location (creates it)
async function servePopup(e) {
    const feature = e.features[0];
    const store = feature.properties;
    const { lng, lat } = feature.properties;

    const popup = new mapboxgl.Popup({ offset: [0, -15], closeButton: false, closeOnMove: true })
        .setLngLat(e.lngLat) // set lng, lat of the popup itself
        .setHTML(`
            <span class="view_duplicates" onclick="actions.viewDuplicates(${lng}, ${lat}, this)">history</span>
            <div class=main>
                <h3 style='margin: 0px; margin-top: 5px; margin-bottom: 10px'>${store.bannerName}${store.isMerged ? '<span onclick=actions.warnMerged() style="color:grey;cursor:help;"> (Modified)</span>' : ''}</h3>
                ${store.address}<br>
                <b>Status: </b><span class=status>Loading...</span><br>
                <b>Opening Date: </b>${store.openDate}<br>
                <b>Latitude: </b>${lat}<br>
                <b>Longitude: </b>${lng}<br><br>
                <span class=notes></span>
                <a href="${actions.createDirections(lng, lat)}" onclick="actions.userFeedback('${store.id}')" target="_blank">Get Directions</a>
            </div>
            <div class=duplicates style="color: grey; display: none; data-loaded: false; width: 100%;">
                <h3 style='margin: 0px; margin-top: 5px; margin-bottom: 10px'>Duplicate Records</h3>
            </div>
        `)
        .addTo(map);
    $(popup._container).attr('data-id', store.id); // set the store id of the popup container
    actions.propogateChanges(store.id); // preload the status and notes (as they wait for the new updated one)
    await getStoreData(store.id); // get the store data from the API (this already runs propogateChanges so we don't need to do anything with the response body)
}

// Downloads the store data and creates the clusters
async function downloadClusters() {
    try {
        const worker = new Worker('./static/js/worker.js'); // start downloading the store data in a worker thread
        worker.postMessage({}); // we're just sending a dummy message to trigger the worker

        // wait for the worker to return the store data (finished yayy)
        worker.onmessage = function(event) {
            const { stores, cached, duplicates, error } = event.data;

            if (error) {
                console.error(error);
                alert("An error occurred while loading the store data. Please check the console for more information.");
                return false;
            }

            window.cache = cached; // cache the store data for status updates
            window.duplicates = duplicates; // cache the duplicates for viewing

            map.addSource('storeSource', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: stores },
                promoteId: 'id' // set to the store id
            });
            
            // Add a marker for each store (far distance)
            map.addLayer({
                id: 'storeLayer',
                type: 'circle',
                source: 'storeSource',
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['linear'], ['zoom'],
                        5,  3,  // At zoom level 5, radius is 3
                        10, 6,  // At zoom level 10, radius is 6
                        15, 12, // At zoom level 15, radius is 12
                        20, 24  // At zoom level 20, radius is 24
                    ],
                    'circle-color': ['coalesce', ['feature-state', 'color'], settings.color('Operational', 'marker')] // default color is for operational
                }
            });

            map.on('mouseenter', 'storeLayer', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            
            map.on('mouseleave', 'storeLayer', () => {
                map.getCanvas().style.cursor = '';
            });

            map.on('click', 'storeLayer', (e) => {
                if(e.features.length == 0) return;
                if(map.getZoom() < ZOOM_THRESHOLD) {
                    return map.easeTo({
                        center: e.features[0].geometry.coordinates,
                        zoom: Math.floor(map.getZoom()) + 2,
                        duration: 500,
                        easing: function(t) {
                            return t * (2 - t);
                        }
                    });
                };

                return servePopup(e); // show popup if zoomed in enough
            });

            map.on('move', updateClusters);
            map.on('zoom', updateClusters);
            map.on('zoomend', updateClusters);
            map.on('moveend', updateClusters);
            updateClusters();

            worker.terminate(); // clean up the worker after we're done with it
        };

    } catch (err) {
        console.error(err);
        alert("An error occurred while loading the store data. Please check the console for more information.");
    }
}

// Initializes the map and starts processing the clusters
async function initMap() {
    await sleep(200);
    await spawnMapInstance(); // create the map instance (if not already created)

    $("#start").fadeOut(200); // fade out the start screen (if not already hidden)
    $(".toggle#settings").html("settings"); // set the settings toggle to the settings icon
    await fadeInOpacity($("#map"), 200); // fade in the map
    $(".toggle#settings").show(); // show the settings toggle

    window.addEventListener('resize', () => {
        map.resize(); // only resize map to adjust for display sizes/changes
    });

    downloadClusters(); // start downloading the clusters
    return true;
}