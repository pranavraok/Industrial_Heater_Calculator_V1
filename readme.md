# 🔥 Industrial Heater Coil Calculator

A rule-based, transparent **Nichrome heater coil calculator** designed for ELECTRO GROUP OF INDUSTRIES.  
The tool allows engineers and fabricators to calculate coil parameters and **safely edit the wire database** through an admin-protected interface.

---

## 🚀 Features

- ✅ Calculate heater coil parameters using real electrical and mechanical rules
- ✅ Transparent calculations (no black-box logic)
- ✅ Admin-protected Nichrome wire database editor
- ✅ Persistent database using browser localStorage
- ✅ Mobile & desktop responsive UI
- ✅ Primary recommended wire highlighted automatically
- ✅ Pass/Fail validation for each wire gauge

---

## 🧮 Calculations Performed

The calculator performs the following computations:

1. **Base Resistance**: R = V² / W
2. **Final Resistance**: Adjusted with extra percentage margin
3. **Wire Length**: Calculated in millimeters based on resistance per meter
4. **Number of Turns**: Based on wire length and core diameter
5. **Coil Pitch**: Spacing between turns (L / turns)
6. **Ideal Pitch**: 2 × wire thickness
7. **Pass/Fail Logic**:
   - For SWG ≤ 36: `pitch ≥ ideal pitch` AND `difference ≤ 50%`
   - For SWG > 36: `pitch ≥ ideal pitch`

---

## 📋 Required Inputs

| Parameter | Description | Unit |
|-----------|-------------|------|
| **Wattage** | Power rating of the heater | W |
| **Voltage** | Operating voltage | V |
| **Core OD** | Outer diameter of the core | mm |
| **Core Length** | Length of the heating element | mm |
| **Extra Resistance** | Safety margin (optional) | % |


## 🖥️ How to Run Locally

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/pranavraok/Industrial_Heater_Calculator.git
   ```

2. **Open the project folder**
   ```bash
   cd Industrial_Heater_Calculator
   ```

3. **Open `index.html` in a browser**
   - Double-click the file, or
   - Right-click → Open with → Browser
   - **No server required!**

### File Structure

```
Industrial_Heater_Calculator/
│
├── index.html       # Main HTML structure
├── styles.css       # Styling and design
├── script.js        # Core calculation logic
└── README.md        # Documentation
```

---

## 📚 Usage Example

### Example Calculation

**Input:**
- Wattage: 1000W
- Voltage: 230V
- Core OD: 50mm
- Core Length: 300mm
- Extra Resistance: 5%

**Output:**
- Recommended wire gauge highlighted in green
- Alternative options shown in blue
- Failed options shown dimmed
- Pitch calculations for each gauge

---

## 👨‍💻 Author

**Pranav Rao K**  
B.Tech CSE | Full-Stack & Systems Builder

[![GitHub](https://img.shields.io/badge/GitHub-pranavraok-181717?logo=github)](https://github.com/pranavraok)  
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?logo=linkedin)](https://www.linkedin.com/in/pranavraok)

---

<div align="center">

**Made with 🔥 for the Industrial Engineering Community**

⭐ Star this repo if you find it useful!

</div>

