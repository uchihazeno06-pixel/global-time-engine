# Global Time & Date Engine 🌍⏱️

A fully responsive, DST-aware web application designed to calculate exact time differences, translate birth times across global time zones, and display real-time analog/digital clocks. 

## 🚀 Live Demo
[Insert your Netlify Link Here]

## ✨ Features

* **Live Local & Global Clocks:** Accurate analog SVG clocks with digital time and full date displays.
* **Timezone Translation:** Convert the exact moment of your birth from your birth location to any target country/state, handling Daylight Saving Time (DST) automatically.
* **Date Difference Calculator:** Calculate the exact days between two dates, alongside a custom "Month Pattern" logic that treats variable-length months equally.
* **Dynamic Global Database:** Fetches live data for 250+ countries and 5,000+ states/provinces without any hardcoded lists.
* **City Search:** Real-time autocomplete search for global cities and timezones.

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **API / Data:** [Countries-States-Cities Database](https://github.com/dr5hn/countries-states-cities-database) (Fetched via raw JSON)
* **Deployment:** Netlify

## 🧠 Technical Highlights

* **No Hardcoded Data:** The dropdowns are completely dynamic, pulling from a live global JSON database to ensure accuracy.
* **DST-Aware Mathematics:** Uses the native `Intl.DateTimeFormat` API to calculate precise historical timezone offsets, ensuring birth times are accurate even across daylight saving shifts.
* **SVG Mathematics:** The analog clock ticks and hands are generated using trigonometric math (`Math.sin` and `Math.cos`) for perfect precision across all screen sizes.

## 💻 Local Setup

To run this project locally, you don't need any build tools or package managers.

1. Clone the repository:
   ```bash
   git clone https://github.com/uchihazeno06-pixel/global-time-engine.git
