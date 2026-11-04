// --- 1. INITIALIZATION ---
const allTimezones = Intl.supportedValuesOf('timeZone');

// Cache DOM Elements
const searchInput = document.getElementById('searchCity');
const searchDropdown = document.getElementById('searchDropdown');

// Birth Dropdowns
const birthContinent = document.getElementById('birthContinent');
const birthCountry = document.getElementById('birthCountry');
const birthState = document.getElementById('birthState');

// Target Dropdowns
const targetContinent = document.getElementById('targetContinent');
const targetCountry = document.getElementById('targetCountry');
const targetState = document.getElementById('targetState');

// App State
let globalCountries = [];
let birthStates = [];
let targetStates = [];
let activeTimezones = { local: Intl.DateTimeFormat().resolvedOptions().timeZone, global: null };
let searchTimeout = null;

// --- 2. CLOCK & TIMEZONE LOGIC ---

// Generate perfect clock ticks
function generateTicks(svgGroupId) {
    const group = document.getElementById(svgGroupId);
    if (!group) return;
    let ticksHTML = "";
    for (let i = 0; i < 60; i++) {
        const angle = (i * 6) * (Math.PI / 180);
        const isHour = i % 5 === 0;
        // Hour ticks are longer, minute ticks are shorter
        const length = isHour ? 8 : 4; 
        
        // Draw from the outside inward (radius 85)
        const x1 = 100 + (85 * Math.sin(angle));
        const y1 = 100 - (85 * Math.cos(angle));
        const x2 = 100 + ((85 - length) * Math.sin(angle));
        const y2 = 100 - ((85 - length) * Math.cos(angle));
        
        const color = isHour ? "var(--text-muted)" : "var(--border)";
        const width = isHour ? 2 : 1;
        ticksHTML += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/>`;
    }
    group.innerHTML = ticksHTML;
}

function updateSingleClock(now, tz, prefix) {
    try {
        // 1. Get Time
        const timeOptions = { timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false };
        const formatter = new Intl.DateTimeFormat('en-US', timeOptions);
        const parts = formatter.formatToParts(now);
        
        let hours = 0, minutes = 0, seconds = 0;
        parts.forEach(p => {
            if (p.type === 'hour') hours = parseInt(p.value);
            if (p.type === 'minute') minutes = parseInt(p.value);
            if (p.type === 'second') seconds = parseInt(p.value);
        });

        // 2. Set Digital Time
        const displayOptions = { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
        document.getElementById(prefix + 'Digital').innerText = new Intl.DateTimeFormat('en-US', displayOptions).format(now);

        // 3. Set Date Display
        const dateOptions = { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        document.getElementById(prefix + 'DateDisplay').innerText = new Intl.DateTimeFormat('en-US', dateOptions).format(now);

        // 4. Rotate Hands
        const secAngle = seconds * 6;
        const minAngle = minutes * 6 + seconds * 0.1;
        const hrAngle = (hours % 12) * 30 + minutes * 0.5;

        document.getElementById(prefix + 'Second').setAttribute('transform', `rotate(${secAngle} 100 100)`);
        document.getElementById(prefix + 'Minute').setAttribute('transform', `rotate(${minAngle} 100 100)`);
        document.getElementById(prefix + 'Hour').setAttribute('transform', `rotate(${hrAngle} 100 100)`);
    } catch (e) {
        // Silently fail if timezone is invalid
    }
}

function updateAllClocks() {
    const now = new Date();
    
    // Update Local
    if (activeTimezones.local) {
        updateSingleClock(now, activeTimezones.local, 'local');
        document.getElementById('localLabel').innerText = "Time Zone: " + activeTimezones.local.replace(/_/g, ' ');
    }
    
    // Update Global Search
    if (activeTimezones.global) {
        updateSingleClock(now, activeTimezones.global, 'global');
    }
}

// --- 3. DYNAMIC DROPDOWNS (Load Countries & States) ---
async function loadGeoDatabase() {
    try {
        const res = await fetch('https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries.json');
        const data = await res.json();
        globalCountries = data;

        // Populate Continents for both Birth and Target
        const continents = [...new Set(globalCountries.map(c => c.region))].filter(Boolean).sort();
        
        const populateContinents = (selectElem) => {
            selectElem.innerHTML = '<option value="">Select Continent...</option>';
            continents.forEach(continent => {
                let opt = document.createElement('option');
                opt.value = continent;
                opt.innerText = continent;
                selectElem.appendChild(opt);
            });
            selectElem.disabled = false;
        };

        populateContinents(birthContinent);
        populateContinents(targetContinent);

    } catch (error) {
        console.error("Database error:", error);
        birthContinent.innerHTML = '<option value="">Error loading database.</option>';
        targetContinent.innerHTML = '<option value="">Error loading database.</option>';
    }
}

// Generic function to populate countries based on continent
function populateCountries(continentVal, countrySelect, stateSelect) {
    countrySelect.innerHTML = '<option value="">Select Country...</option>';
    stateSelect.innerHTML = '<option value="">Select State...</option>';
    stateSelect.disabled = true;

    if (!continentVal) {
        countrySelect.disabled = true;
        return;
    }

    const filtered = globalCountries.filter(c => c.region === continentVal).sort((a, b) => a.name.localeCompare(b.name));
    
    filtered.forEach(country => {
        let opt = document.createElement('option');
        opt.value = country.iso2; 
        opt.innerText = country.name;
        countrySelect.appendChild(opt);
    });
    countrySelect.disabled = false;
}

// Generic function to populate states based on country
async function populateStates(countryCode, stateSelect) {
    stateSelect.innerHTML = '<option value="">Loading states...</option>';
    stateSelect.disabled = true;

    if (!countryCode) return;

    try {
        const res = await fetch('https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/states.json');
        const data = await res.json();
        
        const filteredStates = data.filter(s => s.country_code === countryCode);
        stateSelect.innerHTML = '<option value="">Select State...</option>';
        
        if (filteredStates && filteredStates.length > 0) {
            filteredStates.sort((a, b) => a.name.localeCompare(b.name)).forEach(state => {
                let opt = document.createElement('option');
                opt.value = state.name;
                opt.innerText = state.name; 
                // We store the timezone safely inside the option as a data attribute
                opt.dataset.timezone = state.timezone || "UTC"; 
                stateSelect.appendChild(opt);
            });
            stateSelect.disabled = false;
        } else {
            stateSelect.innerHTML = '<option value="">No states found</option>';
        }
        return filteredStates;
    } catch (error) {
        stateSelect.innerHTML = '<option value="">Error loading states</option>';
        return [];
    }
}

// --- 4. EVENT LISTENERS FOR DROPDOWNS ---

// Birth Location Events
birthContinent.addEventListener('change', (e) => populateCountries(e.target.value, birthCountry, birthState));
birthCountry.addEventListener('change', async (e) => {
    birthStates = await populateStates(e.target.value, birthState);
});

// Target Location Events
targetContinent.addEventListener('change', (e) => populateCountries(e.target.value, targetCountry, targetState));
targetCountry.addEventListener('change', async (e) => {
    targetStates = await populateStates(e.target.value, targetState);
});


// --- 5. SEARCH BAR LOGIC ---
searchInput.addEventListener('input', function() {
    const val = this.value.trim();
    document.getElementById('timeResult').style.display = 'none';
    activeTimezones.global = null; 

    if (searchTimeout) clearTimeout(searchTimeout);
    searchDropdown.innerHTML = '';

    if (val.length < 2) {
        searchDropdown.style.display = 'none';
        return;
    }

    searchTimeout = setTimeout(() => {
        searchDropdown.style.display = 'block';
        const tzMatches = allTimezones.filter(tz => tz.toLowerCase().includes(val.toLowerCase())).slice(0, 10);
        
        if (tzMatches.length > 0) {
            tzMatches.forEach(tz => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.innerText = tz.replace(/_/g, ' ') + " (Timezone)";
                div.onclick = function() {
                    searchInput.value = tz.replace(/_/g, ' ');
                    searchDropdown.style.display = 'none';
                    activeTimezones.global = tz;
                    document.getElementById('timeResult').style.display = 'block';
                    document.getElementById('clockLabel').innerText = "Time in " + tz.replace(/_/g, ' ');
                    updateAllClocks(); 
                };
                searchDropdown.appendChild(div);
            });
        } else {
            searchDropdown.style.display = 'none';
        }
    }, 300);
});

document.addEventListener('click', function(e) {
    if (e.target !== searchInput) searchDropdown.style.display = 'none';
});


// --- 6. CALCULATORS ---
function calculateDifference() {
    const startVal = document.getElementById('startDate').value;
    const endVal = document.getElementById('endDate').value;
    const resultDiv = document.getElementById('diffResult');

    if (!startVal || !endVal) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<span class="error">Please select both dates.</span>';
        return;
    }

    const start = new Date(startVal);
    const end = new Date(endVal);

    if (start > end) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<span class="error">Start date cannot be after end date.</span>';
        return;
    }

    const diffTime = Math.abs(end - start);
    const exactDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let monthDifference = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    let yearsPattern = Math.floor(monthDifference / 12);
    let monthsPattern = monthDifference % 12;

    let patternString = "";
    if (yearsPattern > 0) patternString += `${yearsPattern} year(s) `;
    if (monthsPattern > 0) patternString += `${monthsPattern} month(s)`;
    if (patternString === "") patternString = "Less than a month";

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <strong>Exact Days:</strong> <span class="highlight">${exactDays} days</span><br><br>
        <strong>Month Pattern:</strong> <span class="highlight">${patternString}</span>
    `;
}

function toggleTimeInput() {
    const isUnknown = document.getElementById('unknownTime').checked;
    const dobTime = document.getElementById('dobTime');
    const timeOfDayGroup = document.getElementById('timeOfDayGroup');

    if (isUnknown) {
        dobTime.disabled = true;
        timeOfDayGroup.style.display = 'block';
    } else {
        dobTime.disabled = false;
        timeOfDayGroup.style.display = 'none';
    }
}

// --- 7. THE BIRTH TRANSLATOR ---
function convertBirthTime() {
    const dobDate = document.getElementById('dobDate').value;
    const isUnknown = document.getElementById('unknownTime').checked;
    
    // Get Birth Location Info
    const bContinent = birthContinent.value;
    const bCountry = birthCountry.value;
    const bStateSelect = birthState;
    const bStateName = bStateSelect.value;
    
    // Get Target Location Info
    const tContinent = targetContinent.value;
    const tCountry = targetCountry.value;
    const tStateSelect = targetState;
    const tStateName = tStateSelect.value;

    let dobTimeVal;
    if (isUnknown) {
        dobTimeVal = document.getElementById('timeOfDay').value;
    } else {
        dobTimeVal = document.getElementById('dobTime').value;
    }

    const resultDiv = document.getElementById('birthResult');

    // Validate Inputs
    if (!dobDate || !dobTimeVal || !bContinent || !bCountry || !tContinent || !tCountry) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<span class="error">Please fill in the date, time, and select both birth and target locations.</span>';
        return;
    }

    // 1. Determine the timezone of the BIRTH location
    let birthTz = "UTC";
    if (bStateSelect.selectedIndex > 0) {
        birthTz = bStateSelect.options[bStateSelect.selectedIndex].dataset.timezone;
    } else {
        // Fallback if no state selected: use the first timezone of the country
        const countryData = globalCountries.find(c => c.iso2 === bCountry);
        if (countryData && countryData.timezones && countryData.timezones.length > 0) {
            birthTz = countryData.timezones[0];
        }
    }

    // 2. Determine the timezone of the TARGET location
    let targetTz = "UTC";
    if (tStateSelect.selectedIndex > 0) {
        targetTz = tStateSelect.options[tStateSelect.selectedIndex].dataset.timezone;
    } else {
        const countryData = globalCountries.find(c => c.iso2 === tCountry);
        if (countryData && countryData.timezones && countryData.timezones.length > 0) {
            targetTz = countryData.timezones[0];
        }
    }

    const birthDisplayName = bStateName ? `${bStateName}, ${birthCountry.options[birthCountry.selectedIndex].text}` : birthCountry.options[birthCountry.selectedIndex].text;
    const targetDisplayName = tStateName ? `${tStateName}, ${targetCountry.options[targetCountry.selectedIndex].text}` : targetCountry.options[targetCountry.selectedIndex].text;

    try {
        // THE MAGIC: We create a string representing the local time at the birth place
        // e.g., "2024-05-12T14:30:00"
        const localDate = new Date(`${dobDate}T${dobTimeVal}:00`);
        
        // We use Intl to figure out the exact offset of the birth timezone at that moment
        const birthFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: birthTz,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        });

        // To translate accurately, we have to find the exact UTC timestamp of the birth
        // We do this by parsing the local string as if it were UTC, then adjusting by the timezone offset
        const dateParts = birthFormatter.formatToParts(localDate);
        const partsObj = {};
        dateParts.forEach(p => partsObj[p.type] = p.value);
        
        // Create a date object in UTC based on the birth location's time
        let utcBirthTime = Date.UTC(
            parseInt(partsObj.year), parseInt(partsObj.month) - 1, parseInt(partsObj.day),
            parseInt(partsObj.hour), parseInt(partsObj.minute), parseInt(partsObj.second)
        );
        
        // Calculate the offset between the machine's local time and the birth timezone
        const timeZoneOffset = localDate.getTime() - utcBirthTime;
        
        // The true UTC moment of birth is the local input time + the offset
        const trueBirthMoment = new Date(localDate.getTime() + timeZoneOffset);

        // Now, format that exact UTC moment into the TARGET timezone
        const targetOptions = {
            timeZone: targetTz,
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        };
        
        const targetFormatter = new Intl.DateTimeFormat('en-US', targetOptions);
        const translatedTime = targetFormatter.format(trueBirthMoment);

        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <strong>You were born on ${dobDate} at ${dobTimeVal} in ${birthDisplayName}.</strong><br><br>
            At that exact moment, the local time in <strong>${targetDisplayName}</strong> was:<br>
            <span class="highlight">${translatedTime}</span>
        `;
    } catch (error) {
        console.error(error);
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `<span class="error">Could not translate time. Please check your inputs.</span>`;
    }
}

// --- 8. INIT ---
document.addEventListener('DOMContentLoaded', () => {
    generateTicks('localTicks');
    generateTicks('globalTicks');
    setInterval(updateAllClocks, 1000);
    updateAllClocks();

    loadGeoDatabase(); 
    
    document.getElementById('calcDateBtn').addEventListener('click', calculateDifference);
    document.getElementById('translateBtn').addEventListener('click', convertBirthTime);
    document.getElementById('unknownTime').addEventListener('change', toggleTimeInput);
});
