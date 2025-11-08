/*!
 * Copyright (c) 2025 Brian Walczak
 * All rights reserved.
 *
 * This source code is licensed under the MIT License found in the
 * LICENSE file in the root directory of this source tree.
*/

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const stateCoordinates = {
    AL: { coordinates: [-86.79113, 32.806671], longName: "Alabama" },
    AK: { coordinates: [-152.404419, 61.370716], longName: "Alaska" },
    AZ: { coordinates: [-111.431221, 34.048927], longName: "Arizona" },
    AR: { coordinates: [-92.373123, 34.969704], longName: "Arkansas" },
    CA: { coordinates: [-119.681564, 36.116203], longName: "California" },
    CO: { coordinates: [-105.311104, 39.550051], longName: "Colorado" },
    CT: { coordinates: [-72.755371, 41.603221], longName: "Connecticut" },
    DE: { coordinates: [-75.507141, 38.910832], longName: "Delaware" },
    FL: { coordinates: [-81.515754, 27.994402], longName: "Florida" },
    GA: { coordinates: [-83.643074, 32.157435], longName: "Georgia" },
    HI: { coordinates: [-155.582782, 20.796667], longName: "Hawaii" },
    ID: { coordinates: [-114.742041, 44.068202], longName: "Idaho" },
    IL: { coordinates: [-89.398528, 40.633125], longName: "Illinois" },
    IN: { coordinates: [-86.134902, 40.267194], longName: "Indiana" },
    IA: { coordinates: [-93.581543, 41.878003], longName: "Iowa" },
    KS: { coordinates: [-98.484246, 39.011902], longName: "Kansas" },
    KY: { coordinates: [-84.270018, 37.839333], longName: "Kentucky" },
    LA: { coordinates: [-91.962333, 31.244823], longName: "Louisiana" },
    ME: { coordinates: [-69.445469, 45.253783], longName: "Maine" },
    MD: { coordinates: [-76.641271, 39.045753], longName: "Maryland" },
    MA: { coordinates: [-71.382437, 42.407211], longName: "Massachusetts" },
    MI: { coordinates: [-84.536095, 44.314844], longName: "Michigan" },
    MN: { coordinates: [-94.6859, 46.729553], longName: "Minnesota" },
    MS: { coordinates: [-89.398528, 32.354668], longName: "Mississippi" },
    MO: { coordinates: [-92.288368, 37.964253], longName: "Missouri" },
    MT: { coordinates: [-110.362566, 46.879682], longName: "Montana" },
    NE: { coordinates: [-99.901813, 41.492537], longName: "Nebraska" },
    NV: { coordinates: [-116.419389, 38.80261], longName: "Nevada" },
    NH: { coordinates: [-71.563896, 43.193852], longName: "New Hampshire" },
    NJ: { coordinates: [-74.405661, 40.058324], longName: "New Jersey" },
    NM: { coordinates: [-105.87009, 34.51994], longName: "New Mexico" },
    NY: { coordinates: [-74.217933, 43.299428], longName: "New York" },
    NC: { coordinates: [-79.0193, 35.759573], longName: "North Carolina" },
    ND: { coordinates: [-101.002012, 47.551493], longName: "North Dakota" },
    OH: { coordinates: [-82.907123, 40.417287], longName: "Ohio" },
    OK: { coordinates: [-97.092877, 35.007752], longName: "Oklahoma" },
    OR: { coordinates: [-120.554201, 43.804133], longName: "Oregon" },
    PA: { coordinates: [-77.194525, 41.203322], longName: "Pennsylvania" },
    RI: { coordinates: [-71.477429, 41.580095], longName: "Rhode Island" },
    SC: { coordinates: [-81.163725, 33.836081], longName: "South Carolina" },
    SD: { coordinates: [-99.901813, 43.969515], longName: "South Dakota" },
    TN: { coordinates: [-86.580447, 35.517491], longName: "Tennessee" },
    TX: { coordinates: [-99.901813, 31.968599], longName: "Texas" },
    UT: { coordinates: [-111.093731, 39.32098], longName: "Utah" },
    VT: { coordinates: [-72.577841, 44.558803], longName: "Vermont" },
    VA: { coordinates: [-78.656894, 37.431573], longName: "Virginia" },
    WA: { coordinates: [-120.740139, 47.751076], longName: "Washington" },
    WV: { coordinates: [-80.454903, 38.597626], longName: "West Virginia" },
    WI: { coordinates: [-89.616508, 43.78444], longName: "Wisconsin" },
    WY: { coordinates: [-107.290284, 43.075968], longName: "Wyoming" },
    PR: { coordinates: [-66.5901, 18.2208], longName: "Puerto Rico" } // added Puerto Rico cause it also has Redbox locations
};

// Add the states to the dropdown list
Object.entries(stateCoordinates).forEach(([key, state]) => {
    const $elem = $('<option></option>')
        .val(key)
        .text(state.longName);

    $('#stateList').append($elem);
});

// Checks for settings and starts the web app
async function initializeUser() {
    let mapReady = true;
    await sleep(500);

    if(settings.get('locate') === 'currentLocation') {
        actions.useCurrentLocation();
    } else if(stateCoordinates[settings.get('locate')]) {
        actions.zoomToState(settings.get('locate'));
    } else {
        mapReady = false;
    }

    if(!mapReady) {
        $("#start").fadeIn(200);
    }
}

// Updates settings if requested by the user
async function updateSettings() {
    if($("#start").is(":visible")) {
        $("#start").fadeOut(200);
        fadeInOpacity($("#map"), 200);

        $(".toggle#settings").html("settings");
    } else {
        fadeOutOpacity($("#map"), 200);
        $("#start").fadeIn(200);

        $(".toggle#settings").html("close");
        $("#start .title").text("Settings");
        $("#start button").removeAttr('disabled');
        if(settings.get('locate') === 'currentLocation') {
            $("#start .desc").text("You're currently searching using your precise location.");

            $("#start .locationBtn").attr('disabled', 'disabled');
        } else if(stateCoordinates[settings.get('locate')]) {
            const state = settings.get('locate');
            
            $("#start .desc").text(`You're currently searching in ${stateCoordinates[state].longName || 'an unknown state'}.`);
        } else {
            // switch to default UI if no settings are found, for any reason
            $("#start .title").text("Redbox Locator");
            $("#start .desc").text("");
        }
    }
}

// Checks for precise location user permissions
async function checkPermission() {
    if (!navigator.permissions) {
      return "unknown";
    }
  
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      
      switch (status.state) {
        case "granted":
          console.log("We have access to watch the location.");
          return "granted";
        case "denied":
          console.log("Access to watch location has been blocked.");
          return "denied";
        case "prompt":
          console.log("User hasn't decided yet. Need to request access.");
          return "prompt";
        default:
          console.error("Unexpected permission state:", status.state);
          return "unknown";
      }
    } catch (error) {
      console.error("Error checking permission:", error);
      return "error";
    }
}

const actions = {
    requestLocation: async function () {
        const permission = await checkPermission(); // check user permissions for location

        // if permission wasn't yet granted, show instructions
        if(permission === "prompt") {
            document.body.insertAdjacentHTML('afterbegin', '<div id=geoLocationLoading class=popup><div class=content><h1 style=margin-top:5px;margin-bottom:10px>One More Step!</h1><p style=margin-top:0;line-height:24px>Before you continue, please enable location permissions when prompted.<div style=margin-top:5px; class=option><p style="margin: 10px 0px; margin-bottom: 5px; color: grey;">Waiting for permission...</p></div></div></div>');
            document.getElementById('geoLocationLoading').offsetWidth
            $('#geoLocationLoading').addClass('show');
        } else if(permission === "denied") {
            return false; // return false if location access was already denied
        }

        await spawnMapInstance(); // create the map instance (if not already created)
        const location = await trackGeolocation(); // start geolocation tracking (requests location permissions if not granted)
        
        // remove instruction popup after location is granted
        if($('#geoLocationLoading')) {
            $('#geoLocationLoading').removeClass('show');
            await sleep(200);
            $('#geoLocationLoading').remove();
        }

        return location;
    },

    useCurrentLocation: async function () {
        const location = await actions.requestLocation();

        if(!location) {
            // show error popup if location access was denied
            document.body.insertAdjacentHTML('afterbegin', '<div id=geoLocationError class=popup><div class=content><h1 style=margin-top:5px;margin-bottom:15px>Location Error</h1><p style=margin-top:0;line-height:24px>Your precise location could not be found. Please allow access to location services before you continue.<div class=option><button class=close style=background:#333;margin-right:10px>Close</button><button class=retry>Try Again</button></div></div></div>');
            document.getElementById('geoLocationError').offsetWidth
            $('#geoLocationError').addClass('show');


            $('#geoLocationError .close').click(async function() {
                $('#geoLocationError').removeClass('show');
                await sleep(200);
                $('#geoLocationError').remove();

                // user already had the setting, reset it and refresh for fresh start
                if(settings.get('locate') == 'currentLocation') {
                    settings.del('locate');
                    window.location.reload();
                }
            });

            $('#geoLocationError .retry').click(async function() {
                $('#geoLocationError').removeClass('show');
                await sleep(200);
                $('#geoLocationError').remove();
                await sleep(500);

                return actions.useCurrentLocation();
            });
        } else {
            console.log('Location access has been granted successfully from user, initializing map...');
            
            settings.set('locate', 'currentLocation'); // save settings to local storage
            await initMap(); // start the map
        }
    },

    zoomToState: async function(state = $('#stateList').val()) {
        settings.set('locate', state); // save settings to local storage

        await initMap();
        await sleep(500);

        // move to the selected state
        map.flyTo({
            center: stateCoordinates[state].coordinates,
            zoom: 6
        });
    },

    createDirections: function(lng, lat) {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera; // get user agent

        if (/iPhone|iPad|iPod/i.test(userAgent)) {
            return `https://maps.apple.com/?daddr=${lat},${lng}`; // for apple devices
        } else {
            return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`; // for androids and other devices
        }
    },

    propogateChanges: function(storeId, updatedData = null) {
        if(!updatedData) updatedData = window.cache[storeId];

        try {
            const popupEl = $('.mapboxgl-popup');
            map.setFeatureState({ source: 'storeSource', id: storeId }, { color: settings.color(updatedData.status, 'marker') }); // update the marker color
                
            if(popupEl && popupEl.attr('data-id') === storeId) { // if the popup is open, update the status and notes
                $(popupEl).find('.status').text(updatedData.status);
                $(popupEl).find('.notes').html(updatedData.notes ? `<b>Notes: </b>${updatedData.notes}<br><br>` : '');

                $(popupEl).find('.status').css('color', settings.color(updatedData.status, 'text')); // change the text color to match the status color
            }

            return true;
        } catch(error) {
            console.log(error);
            return false;
        }
    },

    viewDuplicates: function(lng, lat, btn) {
        const popupDiv = $(btn).parent().find(".main");
        const dupeDiv = $(btn).parent().find(".duplicates");
        dupeDiv.css('width', popupDiv.outerWidth());
        
        if(dupeDiv.is(":visible")) { // if the duplicates are already visible, hide them
            dupeDiv.hide();
            popupDiv.show();

            $(btn).text('history');
            return;
        } else if(popupDiv.is(":visible")) { // if the popup is visible, hide it and show the duplicates
            popupDiv.hide();
            dupeDiv.show();
            $(btn).text('close');

            if(dupeDiv.attr('data-loaded') === 'true') {
                return;
            } else {
                const duplicates = searchDuplicates(lng, lat);

                if(duplicates.length === 0) {
                    dupeDiv.append("<i>No duplicate records found.</i>");
                } else {
                    // go through each duplicate and display the information
                    duplicates.forEach(async (dupe, index) => {
                        const { lng: dLng, lat: dLat } = dupe.properties;
                        const store = dupe.properties;

                        // we're just gonna use the original cached data cause it's not like they're gonna change by anyone else
                        dupeDiv.append(`
                            ${store.address}<br>
                            <b>Status: </b>${window.cache[store.id].status}<br>
                            <b>Opening Date: </b>${store.openDate}<br>
                            <b>Latitude: </b>${dLat}<br>
                            <b>Longitude: </b>${dLng}
                        `);

                        if ((index + 1) < duplicates.length) {
                            dupeDiv.append('<br><br>'); // add space between each duplicate
                        }
                    });
                }

                dupeDiv.attr('data-loaded', 'true'); // mark as loaded (so we don't keep scraping the data)
            }
        }
    },
    warnMerged: function() {
        document.body.insertAdjacentHTML('afterbegin', '<div id=mergedWarning class=popup><div class=content><h1 style=margin-top:5px;margin-bottom:15px>Location Merged</h1><p style=margin-top:0;line-height:24px>This location has been merged with duplicates to display up-to-date information. You can find duplicates by clicking the history button found on the popup.<div class=option><button class=agree>Understood.</button></div></div></div>');
        document.getElementById('mergedWarning').offsetWidth
        $('#mergedWarning').addClass('show'); // show popup which explains that the location has been merged with other duplicates for consistent info :)

        $('#mergedWarning .agree').click(async function() {
            $('#mergedWarning').removeClass('show');
            await sleep(200);
            $('#mergedWarning').remove();
        });
    },
    userFeedback: async function(storeId) {
        // the user will leave the page so wait until they come back
        console.log("User requested directions for store, waiting for them to return...");
    
        const onVisibilityChange = async () => {
            if (document.visibilityState === "visible") {
                console.log("User has returned to the page. Ready to request feedback about this location.");
                await sleep(1000);

                document.body.insertAdjacentHTML('afterbegin', "<div id=kioskFeedback class=popup><div class=content><h1 style=margin-top:5px;margin-bottom:15px>Confirm Status?</h1><p style=margin-top:0;line-height:24px>Would you like to take a moment to provide feedback on whether the machine is operational? Your input will help others locate functional machines in the area.<div class=option><button class=close style=background:#333;margin-right:10px>No thanks.</button><button class=continue>Continue</button></div><div class=timer-bar><div style='animation: fillBar 5s linear forwards;' class=timer-fill></div></div></div></div>");
                document.getElementById('kioskFeedback').offsetWidth
                $('#kioskFeedback').addClass('show');

                // close if they don't respond, or if they dismiss it
                $('#kioskFeedback .timer-fill, #kioskFeedback .close').on('animationend click', async function () {
                    $('#kioskFeedback').removeClass('show');
                    await sleep(200);
                    $('#kioskFeedback').remove();
                    return;
                });

                // if they come back, ask them about their feedback (of the location)
                $('#kioskFeedback .continue').click(async function() {
                    $('#kioskFeedback').html("<div style=display:none; class=content><h1 style=margin-top:5px;margin-bottom:15px>What Happened?</h1><p style=margin-top:0;line-height:24px>Does this kiosk still work as expected? Your feedback will help hundreds of others find a working Redbox!<div class=option><button class=disagree style=background:#333;margin-right:10px>Somethings up.</button><button class=agree>It works!</button></div><div class=timer-bar><div style='animation: fillBar 10s linear forwards;' class=timer-fill></div></div></div>");
                    
                    $('#kioskFeedback .content').fadeIn(200);
                    return actions.handleFeedback($('#kioskFeedback'), storeId); // handle the feedback
                });

                $(document).off("visibilitychange", onVisibilityChange); // remove the event listener so it doesn't keep looping
            }
        };
    
        $(document).on("visibilitychange", onVisibilityChange);
    },
    handleFeedback: function(popup, storeId) {
        // close the popup if they don't respond
        popup.find('.timer-fill').on('animationend', async function() {
            await sleep(500);
            console.log('User did not respond to feedback request, closing popup...');
            
            popup.removeClass('show');
            await sleep(200);
            popup.remove();
        });

        // submit the location as operational
        popup.find('.agree').click(async function() {
            await submitFeedback(storeId, "Operational"); // we don't need to include notes (it will use the pre-existing notes)
            return actions.successFeedback(popup); // show them success message
        });

        // ask them what happened if there's problems with the location
        popup.find('.disagree').click(async function() {
            // get up-to-date info on the notes so they can add to it
            const oldData = await getStoreData(storeId); // used so we can set the default status options to the previous status

            popup.html(`
                <div class="content">
                    <h1 style="margin-top:5px;margin-bottom:15px">What Happened?</h1>
                    <p style="margin-top:0;line-height:24px">Please select the issue you experienced with this kiosk below, and add an additional note if needed.</p>
                    <select class=status>
                        <option value="Turned Off">Turned Off</option>
                        <option value="Removed">Removed</option>
                        <option value="Error (See notes for error code)">Error (please clarify)</option>
                        <option value="Never Existed">Never Existed</option>
                    </select>
                    <textarea class=notes placeholder="Additional notes..." style="margin-top: 10px; width: 75%; resize: none;">${oldData.notes || ''}</textarea>
                    <div class="option">
                        <button class="cancel" style="background:#333;margin-right:10px">Cancel</button>
                        <button class="submit">Submit</button>
                    </div>
                </div>
            `);

            if(oldData.status !== "Operational") {
                popup.find('.status').val(oldData.status); // set the default option to the previous status
            }

            // submit the feedback when they fill out the form
            popup.find('.submit').click(async function() {
                await submitFeedback(storeId, popup.find('.status').val(), popup.find('.notes').val());
                return actions.successFeedback(popup); // show them success message
            });

            // close the popup if they choose to cancel it
            popup.find('.cancel').click(async function() {
                popup.removeClass('show');
                await sleep(200);
                popup.remove();

                return;
            });
        });
    },
    successFeedback: async function(popup) {
        popup.html(`<div class="content"><h1 style="margin-top:5px;margin-bottom:15px">Thanks!</h1><p style="margin-top:0;line-height:24px">Your report helps others hundreds of others find a working Redbox! 🎉</p><br><div class=timer-bar><div style='animation: fillBar 2s linear forwards;' class=timer-fill></div></div></div>`);
        // show them the success message and close the popup after 2 seconds
        confetti({ // wooo confetti!
            particleCount: 250,
            spread: 1000,
            origin: {
                x: 0.5,
                y: 0.4
            }
        });
        await sleep(2000);

        popup.removeClass('show');
        await sleep(200);
        popup.remove();
    }
};

settings.theme();
initializeUser();