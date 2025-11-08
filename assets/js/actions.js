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
    propogateChanges: function (storeId, updatedData = null) {
        if (!updatedData) updatedData = window.cache[storeId];

        try {
            const popupEl = $('.mapboxgl-popup');
            map.setFeatureState({ source: 'storeSource', id: storeId }, { color: settings.color(updatedData.status, 'marker') }); // update the marker color

            if (popupEl && popupEl.attr('data-id') === storeId) { // if the popup is open, update the status and notes
                $(popupEl).find('.status').text(updatedData.status);
                $(popupEl).find('.notes').html(updatedData.notes ? `<b>Notes: </b>${updatedData.notes}<br><br>` : '');

                $(popupEl).find('.status').css('color', settings.color(updatedData.status, 'text')); // change the text color to match the status color
            }

            return true;
        } catch (error) {
            console.log(error);
            return false;
        }
    },
    viewDuplicates: function (lng, lat, btn) {
        const popupDiv = $(btn).parent().find(".main");
        const dupeDiv = $(btn).parent().find(".duplicates");
        dupeDiv.css('width', popupDiv.outerWidth());

        if (dupeDiv.is(":visible")) { // if the duplicates are already visible, hide them
            dupeDiv.hide();
            popupDiv.show();

            $(btn).text('history');
            return;
        } else if (popupDiv.is(":visible")) { // if the popup is visible, hide it and show the duplicates
            popupDiv.hide();
            dupeDiv.show();
            $(btn).text('close');

            if (dupeDiv.attr('data-loaded') === 'true') {
                return;
            } else {
                const duplicates = searchDuplicates(lng, lat);

                if (duplicates.length === 0) {
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
    warnMerged: function () {
        document.body.insertAdjacentHTML('afterbegin', '<div id=mergedWarning class=popup><div class=content><h1 style=margin-top:5px;margin-bottom:15px>Location Merged</h1><p style=margin-top:0;line-height:24px>This location has been merged with duplicates to display up-to-date information. You can find duplicates by clicking the history button found on the popup.<div class=option><button class=agree>Understood.</button></div></div></div>');
        document.getElementById('mergedWarning').offsetWidth
        $('#mergedWarning').addClass('show'); // show popup which explains that the location has been merged with other duplicates for consistent info :)

        $('#mergedWarning .agree').click(async function () {
            $('#mergedWarning').removeClass('show');
            await sleep(200);
            $('#mergedWarning').remove();
        });
    },
    userFeedback: async function (storeId) {
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
                $('#kioskFeedback .continue').click(async function () {
                    $('#kioskFeedback').html("<div style=display:none; class=content><h1 style=margin-top:5px;margin-bottom:15px>What Happened?</h1><p style=margin-top:0;line-height:24px>Does this kiosk still work as expected? Your feedback will help hundreds of others find a working Redbox!<div class=option><button class=disagree style=background:#333;margin-right:10px>Somethings up.</button><button class=agree>It works!</button></div><div class=timer-bar><div style='animation: fillBar 10s linear forwards;' class=timer-fill></div></div></div>");

                    $('#kioskFeedback .content').fadeIn(200);
                    return actions.handleFeedback($('#kioskFeedback'), storeId); // handle the feedback
                });

                $(document).off("visibilitychange", onVisibilityChange); // remove the event listener so it doesn't keep looping
            }
        };

        $(document).on("visibilitychange", onVisibilityChange);
    },
    handleFeedback: function (popup, storeId) {
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
        popup.find('.disagree').click(async function () {
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

            if (oldData.status !== "Operational") {
                popup.find('.status').val(oldData.status); // set the default option to the previous status
            }

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
        });
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