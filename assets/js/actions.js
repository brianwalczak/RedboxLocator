/*!
 * Copyright (c) 2025 Brian Walczak
 * All rights reserved.
 *
 * This source code is licensed under the MIT License found in the
 * LICENSE file in the root directory of this source tree.
*/

const actions = {
    createDirections: function (lng, lat) {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera; // get user agent

        if (/iPhone|iPad|iPod/i.test(userAgent)) {
            return `https://maps.apple.com/?daddr=${lat},${lng}`; // for apple devices
        } else {
            return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`; // for androids and other devices
        }
    },
    updateMarker: function (storeId) {
        const feature = map.getSource('storeSource')._data.features.find(feature => {
            return feature.properties.kiosks.find(kiosk => {
                return kiosk.id == storeId;
            });
        });

        const colors = [];

        // re-compute the color based on all kiosks at this location
        feature?.properties?.kiosks?.forEach(kiosk => {
            let cache = window.cache[kiosk.id];
            colors.push(settings.color[(cache.status === 'Operational' && !cache.notes) ? 'Unconfirmed' : cache.status]);
        });

        // get the highest priority color
        colors.sort((a, b) => b.rank - a.rank);

        if (colors[0]) {
            map.setFeatureState({ source: 'storeSource', id: feature.properties.id }, { color: colors[0].marker });
        }
    },
    propogateChanges: function (storeId) {
        const cache = window.cache[storeId];

        try {
            const popupEl = $('.mapboxgl-popup');
            const color = settings.color[cache.status];
            let notes = cache?.notes?.replace("\n!!!RBConfirmedOperational!!!", "") || null;

            actions.updateMarker(storeId); // update the marker color

            if (popupEl && popupEl.attr('data-id') === storeId) { // if the popup is open, update the status and notes
                $(popupEl).find('.status').text(cache.status);
                $(popupEl).find('.notes').html(notes ? `<b>Notes: </b>${notes}<br><br>` : '');

                $(popupEl).find('.status').css('color', color.text); // change the text color to match the status color
            }

            return true;
        } catch (error) {
            console.log(error);
            return false;
        }
    },
    userFeedback: async function (storeId) {
        // the user will leave the page so wait until they come back
        console.log("User requested directions for store, waiting for them to return...");

        const onVisibilityChange = async () => {
            if (document.visibilityState === "visible") {
                console.log("User has returned to the page. Ready to request feedback about this location.");
                await sleep(1000);

                document.body.insertAdjacentHTML('afterbegin', "<div id=kioskFeedback class=popup><div class=content><h1 style=margin-top:5px;margin-bottom:15px>Confirm Status?</h1><p style=margin-top:0;line-height:24px>Would you like to take a moment to provide feedback on whether the machine is operational? Your input will help others locate functional machines in the area.<div class=option><button class='close secondary' style=margin-right:10px>No thanks.</button><button class=continue>Continue</button></div><div class=timer-bar><div style='animation: fillBar 5s linear forwards;' class=timer-fill></div></div></div></div>");
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
                $('#kioskFeedback .continue').click(async function () {
                    $('#kioskFeedback').html("<div style=display:none; class=content><h1 style=margin-top:5px;margin-bottom:15px>What Happened?</h1><p style=margin-top:0;line-height:24px>Does this kiosk still work as expected? Your feedback will help hundreds of others find a working Redbox!<div class=option><button class='disagree secondary' style=margin-right:10px>Somethings up.</button><button class=agree>It works!</button></div><div class=timer-bar><div style='animation: fillBar 10s linear forwards;' class=timer-fill></div></div></div>");

                    $('#kioskFeedback .content').fadeIn(200);
                    return actions.handleFeedback(storeId, $('#kioskFeedback')); // handle the feedback
                });

                $(document).off("visibilitychange", onVisibilityChange); // remove the event listener so it doesn't keep looping
            }
        };

        $(document).on("visibilitychange", onVisibilityChange);
    },
    handleFeedback: async function (storeId, popup) {
        const getFeedback = async () => {
            // get up-to-date info on the notes so they can add to it
            const oldData = await getStoreData(storeId); // used so we can set the default status options to the previous status

            popup.html(`
                    <div class="content">
                        <h1 style="margin-top:5px;margin-bottom:15px">What Happened?</h1>
                        <p style="margin-top:0;line-height:24px">Please select the issue you experienced with this kiosk below, and add an additional note if needed.</p>
                        <select class=status>
                            <option value="Operational">Operational</option>
                            <option value="Turned Off">Turned Off</option>
                            <option value="Removed">Removed</option>
                            <option value="Error (See notes for error code)">Error (please clarify)</option>
                            <option value="Never Existed">Never Existed</option>
                        </select>
                        <textarea class=notes placeholder="Additional notes..." style="margin-top: 10px; width: 75%; resize: none;">${oldData?.notes?.replace("\n!!!RBConfirmedOperational!!!", "") || ''}</textarea>
                        <div class="option">
                            <button class="cancel secondary" style="margin-right:10px">Cancel</button>
                            <button class="submit">Submit</button>
                        </div>
                    </div>
                `);

            popup.find('.status').val(oldData.status === 'Unconfirmed' ? 'Operational' : oldData.status); // set the default option to the previous status

            // submit the feedback when they fill out the form
            popup.find('.submit').click(async function () {
                await submitFeedback(storeId, popup.find('.status').val(), popup.find('.notes').val());
                return actions.successFeedback(popup); // show them success message
            });

            // close the popup if they choose to cancel it
            popup.find('.cancel').click(async function () {
                popup.removeClass('show');
                await sleep(200);
                popup.remove();

                return;
            });
        };

        if (popup) {
            // close the popup if they don't respond
            popup.find('.timer-fill').on('animationend', async function () {
                await sleep(500);
                console.log('User did not respond to feedback request, closing popup...');

                popup.removeClass('show');
                await sleep(200);
                popup.remove();
            });

            // submit the location as operational
            popup.find('.agree').click(async function () {
                await submitFeedback(storeId, "Operational"); // we don't need to include notes (it will use the pre-existing notes)
                return actions.successFeedback(popup); // show them success message
            });

            // ask them what happened if there's problems with the location
            popup.find('.disagree').click(getFeedback);
        } else {
            document.body.insertAdjacentHTML('afterbegin', "<div id=kioskFeedback class=popup></div>");
            popup = $('#kioskFeedback');

            await getFeedback();
            document.getElementById('kioskFeedback').offsetWidth
            popup.addClass('show');
        }
    },
    successFeedback: async function (popup) {
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