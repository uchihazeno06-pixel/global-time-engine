# 🌍 Global Time & Date Engine

A sleek, modern web application that provides accurate, DST-aware time zones, date calculations, and birth time translations. 

**Live Demo:** [https://global-time-engine.netlify.app/](https://global-time-engine.netlify.app/)

## ✨ Features

*   **📍 My Local Time:** Instantly detects the user's timezone and displays a live, meticulously crafted analog clock alongside the digital time and full date.
*   **🌍 Time Anywhere:** Search for any global timezone to see the exact time and date in that region, updated every second.
*   **📅 Date Difference Calculator:** Calculate the exact number of days between two dates. It also provides a "Month Pattern" calculation (treating every month as structurally equal, regardless of 28 or 31 days).
*   **👶 Birth Time Translator:** Find out what the exact time and date were in a foreign country at the moment you were born. 
    *   *Solves the relocation issue:* Users can specifically select **where they were born** (Continent → Country → State) to set the starting timezone, rather than relying on their current device location.
    *   *Unknown Time Support:* If the exact birth time is unknown, users can select a general time of day (Morning, Afternoon, Evening, Night).

## 🛠️ Tech Stack

*   **HTML5:** Semantic structure.
*   **CSS3:** Custom properties (variables) for a premium dark theme, CSS Grid/Flexbox for responsive layouts.
*   **Vanilla JavaScript (ES6+):**
    *   `Intl.DateTimeFormat` for highly accurate, DST-aware timezone conversions.
    *   `Math` and `SVG` manipulation to generate custom, perfectly proportioned analog clock faces.
    *   Dynamic DOM manipulation for cascading dropdowns.
*   **Data Source:** Powered by the open-source [Countries-States-Cities Database](https://github.com/dr5hn/countries-states-cities-database), fetched dynamically via the GitHub API.
*   **Deployment:** Hosted on Netlify.

## 🚀 How to Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/uchihazeno06-pixel/global-time-engine.git
