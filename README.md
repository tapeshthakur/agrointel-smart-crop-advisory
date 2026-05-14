# Smart Crop Advisory System

Final-year AI and Data Science project for crop decision support. The system helps farmers recommend a crop, estimate irrigation requirement, review fertilizer and season guidance, detect crop leaf disease symptoms, and view market support information from a browser dashboard.

Built for: Daiwik Shetty, Shivam Singh, Tapeshkumar Thakur, Swaleha Deshmukh  
Department: AI & Data Science, Thakur College of Engineering & Technology, Mumbai

## Problem Statement

Small and marginal farmers often rely on experience-based decisions for crop selection, irrigation planning, fertilizer use, and disease triage. This project turns soil nutrients, weather values, season, location, and leaf images into practical recommendations using machine learning, computer vision, and simple dashboard workflows.

## Key Features

- JWT authentication with farmer and admin roles.
- Crop recommendation using a Random Forest classifier.
- Irrigation requirement prediction using a Random Forest regressor.
- Farmer-friendly advisory report with fertilizer guidance, season fit, input comparison, and explanation cards.
- Browser geolocation based weather auto-fill using Open-Meteo.
- Leaf disease detection through a trained MobileNetV2 CNN when available, with a lightweight image-analysis fallback.
- Market support view with demo MSP data, government schemes, KVK contacts, and seasonal tips.
- Farmer dashboard with crop prediction, disease detection, market insights, history, print, and PDF download.
- Admin dashboard with user count, total predictions, model metrics, crop distribution, and recent activity.
- Separate Streamlit analytics dashboard for model performance, confusion matrix, feature importance, and prediction analytics.
- Language selector scaffolding for English, Hindi, and Marathi UI text.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router, Axios, Tailwind CSS |
| Charts and Reports | Chart.js, react-chartjs-2, html2canvas, jsPDF, browser print-to-PDF |
| Backend | Flask, Flask-CORS, Flask-JWT-Extended |
| Database | SQLite |
| ML Training and Inference | scikit-learn, pandas, numpy, joblib |
| Disease Detection | TensorFlow MobileNetV2, Pillow, NumPy fallback |
| Analytics Dashboard | Streamlit, matplotlib, scikit-learn |

## System Architecture

```text
React Browser App
        |
        | Axios + JWT bearer token
        v
Flask REST API
        |
        |-- Auth routes: signup, login, current user
        |-- Crop and irrigation routes: Random Forest inference
        |-- Advisory route: fertilizer, season, comparison, explanation
        |-- Disease route: leaf image analysis
        |-- Market route: MSP, schemes, KVK, seasonal tips
        |-- System routes: metrics, history, admin stats
        |
        v
SQLite Database + ML Artifacts
        |
        |-- users
        |-- prediction logs
        |-- trained Random Forest models
        |-- disease CNN model and class names
        |-- metrics and feature importance files
```

## Project Structure

```text
smart-crop-advisory-system/
|-- backend/
|   |-- app.py
|   |-- config.py
|   |-- requirements.txt
|   |-- database/
|   |   |-- db.py
|   |   `-- predictions.db
|   |-- models/
|   |   `-- model_loader.py
|   |-- routes/
|   |   |-- auth_routes.py
|   |   |-- crop_routes.py
|   |   |-- irrigation_routes.py
|   |   |-- advisory_routes.py
|   |   |-- disease_routes.py
|   |   |-- market_routes.py
|   |   `-- system_routes.py
|   |-- services/
|   `-- utils/
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- api/
|   |   |-- assets/
|   |   |-- auth/
|   |   |-- components/
|   |   |-- i18n/
|   |   `-- pages/
|   `-- package.json
|-- ml/
|   |-- crop_data.csv
|   |-- generate_dataset.py
|   |-- train_pipeline.py
|   |-- train_disease_cnn.py
|   |-- requirements-cnn.txt
|   `-- models/
|-- dashboard/
|   |-- dashboard.py
|   `-- requirements.txt
`-- README.md
```

Generated or heavy local folders may also exist, including `backend/venv/`, `dashboard/venv/`, `ml/venv/`, `frontend/node_modules/`, `frontend/build/`, and `backend/data/PlantVillage/`.

## Prerequisites

- Python 3.10 or newer, tested locally with Python 3.12.
- Node.js and npm for the React frontend.
- Optional: TensorFlow-compatible environment for CNN training.
- Optional: Kaggle CLI for downloading the PlantVillage dataset.

## Environment Variables

The backend loads optional variables from `backend/.env`.

```env
APP_ENV=development
FLASK_DEBUG=true
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
CORS_ORIGINS=*
LOG_LEVEL=INFO
DB_PATH=database/predictions.db
ML_DIR=../ml
JWT_SECRET_KEY=change-this-for-production
```

The frontend can point to another API host with `frontend/.env`.

```env
REACT_APP_API_BASE_URL=http://localhost:5000
```

For production or public demos, replace `JWT_SECRET_KEY` and avoid committing `.env` files.

## How To Run

Open separate terminals from the project folder.

### 1. Backend API

```powershell
cd D:\Project\smart-crop-advisory-system\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Backend URL:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

### 2. React Frontend

```powershell
cd D:\Project\smart-crop-advisory-system\frontend
npm install
npm start
```

Frontend URL:

```text
http://localhost:3000
```

Build command:

```powershell
npm run build
```

### 3. Streamlit Analytics Dashboard

```powershell
cd D:\Project\smart-crop-advisory-system\dashboard
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
streamlit run dashboard.py
```

Dashboard URL:

```text
http://localhost:8501
```

## Default Demo Flow

1. Start the Flask backend.
2. Start the React frontend.
3. Register a farmer account or an admin account.
4. Login and open the dashboard.
5. In the farmer dashboard, choose a crop preset or enter N, P, K, temperature, humidity, pH, and rainfall.
6. Optionally select state and season, then use Auto-fill Weather to fetch temperature, humidity, and rainfall from Open-Meteo.
7. Click Quick Predict.
8. Review recommended crop, confidence, irrigation requirement, fertilizer advice, explanation, season adjustment, crop comparison, and report actions.
9. Download or print the advisory report.
10. Upload a JPG or PNG leaf image in the disease detection module.
11. Open Market & Schemes for MSP, scheme links, KVK contact, and seasonal tips.
12. Login as admin to view platform stats, model metrics, crop distribution, and recent activity.

## ML Models

### Crop Recommendation and Irrigation

The Random Forest training script can train both the classifier and regressor from `ml/crop_data.csv`.

```powershell
cd D:\Project\smart-crop-advisory-system
python ml\train_pipeline.py `
  --csv-path ml\crop_data.csv `
  --classification-target label `
  --regression-target irrigation_requirement `
  --output-dir ml\models
```

The script writes versioned models and metrics:

```text
ml/models/rf_classifier_label_v<timestamp>.pkl
ml/models/rf_classifier_label_metrics.json
ml/models/rf_classifier_label_feature_importance.csv
ml/models/rf_regressor_irrigation_requirement_v<timestamp>.pkl
ml/models/rf_regressor_irrigation_requirement_metrics.json
ml/models/rf_regressor_irrigation_requirement_feature_importance.csv
```

The backend automatically loads the latest versioned classifier and regressor from `ml/models/`.

### Disease CNN

The disease detector uses `ml/models/disease_cnn.keras` and `ml/models/disease_class_names.json` when they exist. If TensorFlow or the model files are missing, the API keeps working through a lightweight Pillow and NumPy fallback.

Install CNN dependencies:

```powershell
cd D:\Project\smart-crop-advisory-system
python -m pip install -r ml\requirements-cnn.txt
```

Expected dataset structure:

```text
data/PlantVillage/
|-- Apple___Apple_scab/
|-- Apple___healthy/
|-- Corn_(maize)___Common_rust_/
|-- Tomato___Late_blight/
`-- ...
```

Example Kaggle download:

```powershell
cd D:\Project\smart-crop-advisory-system
mkdir data
kaggle datasets download -d emmarex/plantdisease -p data --unzip
```

Train the CNN:

```powershell
cd D:\Project\smart-crop-advisory-system
python ml\train_disease_cnn.py --dataset-dir data\PlantVillage --epochs 12 --fine-tune-epochs 5 --batch-size 32
```

The trainer writes:

```text
ml/models/disease_cnn.keras
ml/models/disease_class_names.json
ml/models/disease_cnn_metrics.json
ml/models/disease_cnn_history_<timestamp>.png
```

Restart the backend after training so the API can load the new CNN artifacts.

## API Endpoints

Most endpoints except signup, login, and health require a JWT bearer token.

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Backend health check |
| POST | `/api/auth/signup` | Public | Register farmer or admin |
| POST | `/api/auth/login` | Public | Login and receive access token |
| GET | `/api/auth/me` | Authenticated | Fetch current user |
| POST | `/api/predict/crop` | Farmer/Admin | Predict crop and confidence |
| POST | `/api/predict/irrigation` | Farmer/Admin | Predict irrigation requirement |
| POST | `/api/advisory` | Farmer/Admin | Build advisory report details |
| POST | `/api/disease/detect` | Farmer/Admin | Detect disease from uploaded JPG/PNG leaf image |
| GET | `/api/market/overview` | Farmer/Admin | Load MSP, schemes, KVK, and market tip |
| GET | `/api/predictions` | Farmer/Admin | Fetch recent prediction history |
| GET | `/api/model-info` | Admin | Fetch classifier and regressor metrics |
| GET | `/api/admin/stats` | Admin | Fetch total predictions and user count |

## Example Requests

### Signup

```json
{
  "name": "Demo Farmer",
  "email": "farmer@example.com",
  "password": "secret123",
  "role": "farmer"
}
```

### Crop or Irrigation Prediction

```json
{
  "N": 52,
  "P": 50,
  "K": 52,
  "temperature": 20,
  "humidity": 68,
  "ph": 6.7,
  "rainfall": 140
}
```

Input validation ranges:

| Field | Range |
|---|---|
| `N` | 0 to 200 |
| `P` | 0 to 200 |
| `K` | 0 to 200 |
| `temperature` | -10 to 60 |
| `humidity` | 0 to 100 |
| `ph` | 0 to 14 |
| `rainfall` | 0 to 500 |

### Advisory

```json
{
  "crop": "wheat",
  "confidence": 0.92,
  "irrigation": 2.4,
  "state": "Maharashtra",
  "season": "Rabi",
  "inputs": {
    "N": 52,
    "P": 50,
    "K": 52,
    "temperature": 20,
    "humidity": 68,
    "ph": 6.7,
    "rainfall": 140
  },
  "top_crops": [
    { "crop": "wheat", "confidence": 0.92 },
    { "crop": "maize", "confidence": 0.05 }
  ]
}
```

### Disease Detection

Send a multipart form request with a file field named `file`.

```text
POST /api/disease/detect
Content-Type: multipart/form-data
file=<leaf-image.jpg>
```

Allowed image types: JPG, JPEG, PNG. Maximum size: 5 MB.

### Market Overview

```text
GET /api/market/overview?state=Maharashtra&season=Rabi&crop=wheat
```

## Model Metrics and Dashboards

The admin dashboard reads model metrics from `ml/models/` through `/api/model-info` and displays:

- Classifier accuracy and weighted F1.
- Regressor MAE and R2.
- Total users and total prediction records.
- Crop recommendation distribution.
- Recent crop and irrigation activity.

The Streamlit dashboard additionally displays:

- Classifier confusion matrix.
- Classifier feature importance.
- Crop prediction distribution.
- Irrigation prediction trend.
- Raw recent prediction records.

## Important Notes

- The frontend stores JWT and user details in browser local storage.
- The backend initializes and migrates SQLite tables automatically at startup.
- The backend loads models from `ML_DIR`, which defaults to the root `ml/` folder.
- Weather auto-fill uses browser geolocation, so the browser must allow location access.
- Market and scheme data is static demo data in `backend/services/market_service.py`, not a live government API.
- Prediction logging is best-effort; database errors are logged without breaking model responses.
- Crop and irrigation predictions are logged as separate rows in the current API flow.
- The Hindi and Marathi translation objects are present in the frontend, but some source text may need encoding cleanup before a polished multilingual demo.

## Troubleshooting

- If `/api/predict/crop` fails at backend startup, confirm `ml/models/` contains at least one `rf_classifier_*_v*.pkl` and one `rf_regressor_*_v*.pkl`.
- If admin model metrics fail, confirm the classifier and regressor metrics JSON files exist in `ml/models/`.
- If the frontend cannot reach the backend, check `REACT_APP_API_BASE_URL`, CORS settings, and whether Flask is running on port `5000`.
- If disease detection returns fallback-style results, confirm TensorFlow is installed and both `disease_cnn.keras` and `disease_class_names.json` exist.
- If Streamlit cannot draw the confusion matrix, confirm `ml/crop_data.csv` and the latest classifier model are present.

## Future Scope

- Clean up Hindi and Marathi text encoding for production-ready multilingual screens.
- Add live market, MSP, mandi price, and weather forecast integrations.
- Add per-class disease CNN precision, recall, confusion matrix, and sample predictions.
- Add SMS or WhatsApp irrigation reminders.
- Add SHAP or LIME explanations for deeper model interpretability.
- Move from SQLite to PostgreSQL for multi-user deployment.
- Deploy the backend, frontend, and dashboard on cloud infrastructure.
