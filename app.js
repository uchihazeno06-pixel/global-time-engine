// --- 1. INITIALIZATION ---
const allTimezones = Intl.supportedValuesOf('timeZone');

const selContinent = document.getElementById('selContinent');
const selCountry = document.getElementById('selCountry');
const selState = document.getElementById('selState');
const timeOfDayGroup = document.getElementById('timeOfDayGroup');
const dobTime = document.getElementById('dobTime');
const searchInput = document.getElementById('searchCity');
const searchDropdown = document.getElementById('searchDropdown');

let globalCountries = [];
let currentCountryStates = [];
let activeTimezones = { local: Intl.DateTimeFormat().resolvedOptions().timeZone, global: null };
let searchTimeout = null;

// --- 2. CLOCK FUNCTIONS ---
function generateTicks(svgGroupId) {
    const group = document.getElementById(svgGroupId);
    if (!group) return;
    let ticksHTML = "";
    for (let i = 0; i < 60; i++) {
        const angle = (i * 6) * (Math.PI / 180);
        const isHour = i % 5 === 0;
        const length = isHour ? 8 : 4;
        const x1 = 100 + (80 * Math.sin(angle));
        const y1 = 100 - (80 * Math.cos(angle));
        const x2 = 100 + ((80 - length) * Math.sin(angle));
        const y2 = 100 - ((80 - length) * Math.cos(angle));
        const color = isHour ? "var(--text-muted)" : "var(--border)";
        const width = isHour ? 2 : 1;
        ticksHTML += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/>`;
    }
    group.innerHTML = ticksHTML;
}

function updateSingleClock(now, tz, prefix) {
    try {
        const options = { timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false };
        const formatter = new Intl.DateTimeFormat('en-US', options);
        const parts = formatter.formatToParts(now);
        
        let hours = 0, minutes = 0, seconds = 0;
        parts.forEach(p => {
            if (p.type === 'hour') hours = parseInt(p.value);
            if (p.type === 'minute') minutes = parseInt(p.value);
            if (p.type === 'second') seconds = parseInt(p.value);
        });

        const displayOptions = { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
        document.getElementById(prefix + 'Digital').innerText = new Intl.DateTimeFormat('en-US', displayOptions).format(now);

        const secAngle = seconds * 6;
        const minAngle = minutes * 6 + seconds * 0.1;
        const hrAngle = (hours % 12) * 30 + minutes * 0.5;

        document.getElementById(prefix + 'Second').setAttribute('transform', `rotate(${secAngle} 100 100)`);
        document.getElementById(prefix + 'Minute').setAttribute('transform', `rotate(${minAngle} 100 100)`);
        document.getElementById(prefix + 'Hour').setAttribute('transform', `rotate(${hrAngle} 100 100)`);
    } catch (e) {}
}

function updateAllClocks() {
    const now = new Date();
    if (activeTimezones.local) {
        updateSingleClock(now, activeTimezones.local, 'local');
        document.getElementById('localLabel').innerText = "Time Zone: " + activeTimezones.local.replace(/_/g, ' ');
    }
    if (activeTimezones.global) {
        updateSingleClock(now, activeTimezones.global, 'global');
    }
}

// --- 3. DYNAMIC DROPDOWNS (Bulletproof Fetch) ---
async function loadGeoDatabase() {
    try {
        // Using a reliable open-source database hosted on GitHub that allows direct browser fetching
        const res = await fetch('https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries.json');
        const data = await res.json();
        
        // Save the full list
        globalCountries = data;

        // Extract unique regions (continents)
        const continents = [...new Set(globalCountries.map(c => c.region))].filter(Boolean).sort();
        
        selContinent.innerHTML = '<option value="">Select Continent...</option>';
        continents.forEach(continent => {
            let opt = document.createElement('option');
            opt.value = continent;
            opt.innerText = continent;
            selContinent.appendChild(opt);
        });
        
        selContinent.disabled = false;
    } catch (error) {
        console.error("Database error:", error);
        selContinent.innerHTML = '<option value="">Error loading database. Check connection.</option>';
    }
}

async function updateCountries() {
    const continent = selContinent.value;
    selCountry.innerHTML = '<option value="">Select Country...</option>';
    selState.innerHTML = '<option value="">Select State...</option>';
    selState.disabled = true;

    if (!continent) {
        selCountry.disabled = true;
        return;
    }

    // Filter the global list by the selected continent
    const filtered = globalCountries.filter(c => c.region === continent).sort((a, b) => a.name.localeCompare(b.name));
    
    filtered.forEach(country => {
        let opt = document.createElement('option');
        // The database uses 'iso2' for country codes (e.g., NG, US)
        opt.value = country.iso2; 
        opt.innerText = country.name;
        selCountry.appendChild(opt);
    });
    selCountry.disabled = false;
}

async function updateStates() {
    const countryCode = selCountry.value;
    selState.innerHTML = '<option value="">Loading states...</option>';
    selState.disabled = true;

    if (!countryCode) return;

    try {
        // Fetch the states file globally (it's about 3MB, but loads fast)
        const res = await fetch('https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/states.json');
        const data = await res.json();
        
        // Filter the states to only show the ones matching the selected country
        currentCountryStates = data.filter(s => s.country_code === countryCode);

        selState.innerHTML = '<option value="">Select State...</option>';
        
        if (currentCountryStates && currentCountryStates.length > 0) {
            currentCountryStates.sort((a, b) => a.name.localeCompare(b.name)).forEach(state => {
                let opt = document.createElement('option');
                opt.value = state.name;
                opt.innerText = state.name; 
                selState.appendChild(opt);
            });
            selState.disabled = false;
        } else {
            selState.innerHTML = '<option value="">No states found</option>';
        }
    } catch (error) {
        console.error("State error:", error);
        selState.innerHTML = '<option value="">Error loading states</option>';
    }
}

// --- 4. SEARCH BAR ---
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

// --- 5. CALCULATORS ---
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
    if (isUnknown) {
        dobTime.disabled = true;
        timeOfDayGroup.style.display = 'block';
    } else {
        dobTime.disabled = false;
        timeOfDayGroup.style.display = 'none';
    }
}

function convertBirthTime() {
    const dobDate = document.getElementById('dobDate').value;
    const isUnknown = document.getElementById('unknownTime').checked;
    const countryCode = selCountry.value;
    const stateName = selState.value;
    
    let dobTimeVal;
    if (isUnknown) {
        dobTimeVal = document.getElementById('timeOfDay').value;
    } else {
        dobTimeVal = dobTime.value;
    }

    const resultDiv = document.getElementById('birthResult');

    if (!dobDate || !dobTimeVal || !countryCode) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<span class="error">Please fill in date, time, and select a Country.</span>';
        return;
    }

    // Find timezone from state data
    let targetTz = "UTC";
    const stateData = currentCountryStates.find(s => s.name === stateName);
    
    if (stateData && stateData.timezone) {
        targetTz = stateData.timezone;
    }

    const displayName = stateName ? `${stateName}` : selCountry.options[selCountry.selectedIndex].text;

    try {
        const localDate = new Date(`${dobDate}T${dobTimeVal}`);
        if (isNaN(localDate.getTime())) throw new Error("Invalid date");

        const options = {
            timeZone: targetTz,
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        };
        
        const formatter = new Intl.DateTimeFormat('en-US', options);
        const translatedTime = formatter.format(localDate);

        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <strong>You were born around ${dobTimeVal} (your local time):</strong><br><br>
            The local time in <strong>${displayName}</strong> was:<br>
            <span class="highlight">${translatedTime}</span>
        `;
    } catch (error) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `<span class="error">Could not translate time. Please check your inputs.</span>`;
    }
}

// --- 6. INIT ---
document.addEventListener('DOMContentLoaded', () => {
    generateTicks('localTicks');
    generateTicks('globalTicks');
    setInterval(updateAllClocks, 1000);
    updateAllClocks();

    loadGeoDatabase(); // Triggers the bulletproof fetch
    
    selContinent.addEventListener('change', updateCountries);
    selCountry.addEventListener('change', updateStates);
    document.getElementById('calcDateBtn').addEventListener('click', calculateDifference);
    document.getElementById('translateBtn').addEventListener('click', convertBirthTime);
    document.getElementById('unknownTime').addEventListener('change', toggleTimeInput);
});
