/*!
 * Copyright (c) 2025 Brian Walczak
 * All rights reserved.
 *
 * This source code is licensed under the MIT License found in the
 * LICENSE file in the root directory of this source tree.
*/

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

// Look for duplicate coordinates in the data
function searchDuplicates(lng, lat) {
  let matchingEntries = [];

  window.duplicates.forEach(duplicate => {
    const { lng: dLng, lat: dLat, openDate } = duplicate.properties;

    if (openDate === 'Unknown' && !settings.get('showUnknownDate')) {
      return false;
    }

    if (Number(lng) == Number(dLng) && Number(lat) == Number(dLat)) {
      matchingEntries.push(duplicate);
    }
  });

  return matchingEntries;
}

// Get the store data from the API
async function getStoreData(storeId) {
  const req = await fetch("https://findaredbox.kbots.tech/search/?id=" + storeId);
  const res = await req.json();

  window.cache[storeId] = { status: ((res[0].status === 'Operational' && !res[0].notes) ? 'Unconfirmed' : res[0].status), notes: res[0].notes }; // updated cache to include latest data
  actions.propogateChanges(storeId); // update the marker on the map, and any active popup (if it exists)
  return res[0];
}

// Get the user's IP-based location
let ipCache = null;
async function getIPLocation() {
  if (ipCache) return ipCache;

  try {
    const req = await fetch("https://ipinfo.io/json");
    const res = await req.json();

    ipCache = res?.loc?.split(",");
    return ipCache;
  } catch (error) {
    return null;
  }
}

// Update status of a kiosk location
async function submitFeedback(storeId, status, notes = null) {
  if (notes == null) {
    const oldData = await getStoreData(storeId);
    notes = oldData.notes;
  }

  // cross compatibility with Rbmap :D
  if (status === "Operational" && (!notes || notes.trim() === "")) { // if operational with no notes (also means no tag)
    notes = "\n!!!RBConfirmedOperational!!!"; // add confirmed operational tag
  } else if (notes.replace("\n!!!RBConfirmedOperational!!!", "").trim().length > 0) { // if there are already other notes
    notes = notes.replace("\n!!!RBConfirmedOperational!!!", "").trim(); // remove confirmed operational tag if it exists
  }

  const req = await fetch("https://findaredbox.kbots.tech/update", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      id: storeId,
      notes,
      status
    })
  });
  const res = await req.json();

  if (res.message === "Store updated successfully.") {
    console.log("The user feedback for this location was sent successfully.");


    window.cache[storeId] = { status, notes }; // updated cache to include latest data
    actions.propogateChanges(storeId); // update the marker on the map, and any active popup (if it exists)
    return true;
  } else {
    console.error("The user feedback was not submitted successfully: ", res);
    return false;
  }
}

// -- Transitions (we have to use opacity for the map transitions, or else it will break) -- //

async function fadeInOpacity(selector, duration = 200) {
  // set values to default
  selector.css("visibility", "visible"); // obviously needs to be visible to see the fade in
  selector.css("opacity", "0"); // start at 0 opacity

  var oldTransition = selector.css("transition");
  selector.css("transition", `opacity ${duration}ms ease`);
  selector.css("opacity", "1");

  await sleep(200);
  selector.css("visibility", "visible");
  selector.css("transition", oldTransition);
}

async function fadeOutOpacity(selector, duration = 200) {
  // set values to default
  selector.css("visibility", "visible"); // obviously needs to be visible to see the fade out
  selector.css("opacity", "1"); // start at 1 opacity

  var oldTransition = selector.css("transition");
  selector.css("transition", `opacity ${duration}ms ease`);
  selector.css("opacity", "0");

  await sleep(200);
  selector.css("visibility", "hidden");
  selector.css("transition", oldTransition);
}

function viewSettings() {
  $('#settingsModal').show();
  $('#settingsModal').addClass('show');

  $('#showUnknownDate').prop('checked', !!settings.get('showUnknownDate'));
}

async function closeSettings() {
  $('#settingsModal').removeClass('show');
  await sleep(300); // wait for the transition to finish
  $('#settingsModal').hide();
}

$(document).on('change', '#showUnknownDate', function () {
  settings.set('showUnknownDate', this.checked);

  if (map) {
    map.setFilter('storeLayer', this.checked ? null : ['!=', ['get', 'openDate'], 'Unknown']);
  }
});