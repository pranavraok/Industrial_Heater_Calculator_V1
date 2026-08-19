# Industrial Heater Coil Calculator

A browser-based Nichrome and Kanthal D heater-coil calculator for ELECTRO GROUP OF INDUSTRIES. Wire-gauge data is stored in Google Sheets and can be edited through the app's admin-protected database editor.

## Features

- Electrical and mechanical heater-coil calculations
- Nichrome and Kanthal D wire databases
- Google Sheets-backed persistent storage
- Admin password validation on the Google Apps Script backend
- Automatic pipe, insulation, core, pitch, and SWG selection
- Responsive desktop and mobile interface

## Run the app

1. Complete [google-sheets/README.md](google-sheets/README.md).
2. Paste the deployed Google Apps Script `/exec` URL into `GOOGLE_SHEETS_WEB_APP_URL` in `script.js`.
3. Open `index.html` in a browser or publish these static files with any web host.

No Supabase account, SDK, or database is used.

## Project files

```text
index.html                 App interface
styles.css                App styling
script.js                 Calculator and Google Sheets client
google-sheets/Code.gs     Google Apps Script backend
google-sheets/README.md   One-time Google setup guide
```

## Google Sheet columns

Both wire tabs use the same columns:

| id | swg | thickness | ohm | minw | maxw |
|---:|---:|---:|---:|---:|---:|

Do not rename the tabs or column headers. The webpage editor updates complete rows and the backend validates all numeric values before saving.
