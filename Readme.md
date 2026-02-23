# CSCE 679 — Assignment 1: Matrix View (Hong Kong Monthly Temperature)

This project implements a **Year × Month matrix view** to visualize Hong Kong temperature data from `temperature_daily.csv` (daily records).  
Each matrix cell represents **one month of a specific year**, where the **cell background color encodes temperature**.  
A **mouse click** toggles between **monthly MAX** and **monthly MIN** temperature modes.  
Each cell also contains a **mini line chart (sparkline)** showing **daily temperature changes** within that month.

---

## Dataset
**File:** `data/temperature_daily.csv`  

The visualization automatically filters and displays **only the last 10 years** available in the dataset.

---

## Features (Requirement Checklist)
- **Matrix layout:**  
  - X-axis = **Year**  
  - Y-axis = **Month**  
  - Each cell = (Year, Month)
- **Toggle Max/Min (Mouse click):**  
  Click the button (or the UI click action) to switch between:
  - **MAX mode:** monthly maximum temperature (computed from daily max)
  - **MIN mode:** monthly minimum temperature (computed from daily min)
- **Tooltip on hover:**  
  Hover on a cell to see:
  - Month + year
  - Date range for that month
  - Temperature value for current mode (MAX or MIN)
- **Mini line chart in each cell:**  
  A sparkline displays **daily temperatures** across the month
  - X-axis = day of month
  - Y-axis = temperature
- **Legend:**  
  A continuous color legend shows temperature-to-color mapping (updates when mode changes)

---

## How to Run (Local Server Required)
## How to Run (Using VS Code Live Server)

1. Open the project folder in **Visual Studio Code**
2. Install the extension **Live Server (by Ritwick Dey)** if not already installed
3. Right-click `index.html`
4. Click **Open with Live Server**
5. The browser will open automatically (usually at http://127.0.0.1:5500)

The visualization should load automatically.