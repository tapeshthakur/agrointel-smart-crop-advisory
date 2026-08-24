# Smart Crop Advisory System

Final-year AI and Data Science project for crop decision support. The system helps farmers recommend a crop, estimate irrigation requirement, review fertilizer and season guidance, detect crop leaf disease symptoms, and view market support information from a browser dashboard.

Built for: Daiwik Shetty, Shivam Singh, Tapeshkumar Thakur, Swaleha Deshmukh  
Department: AI & Data Science, Thakur College of Engineering & Technology, Mumbai

## Problem Statement

Small and marginal farmers often rely on experience-based decisions for crop selection, irrigation planning, fertilizer use, and disease triage. This project turns soil nutrients, weather values, season, location, and leaf images into practical recommendations using machine learning, computer vision, and simple dashboard workflows.

## Key Features

- JWT authentication with farmer and admin roles.
- Crop recommendation using a Random Forest classifier for 5 crops: chickpea, coffee, maize, rice, and wheat.
- Irrigation requirement prediction using a Random Forest regressor.
- Farmer-friendly advisory report with fertilizer guidance, season fit, input comparison, and explanation cards.
- Browser geolocation based weather auto-fill using Open-Meteo.
- Leaf disease detection through a trained MobileNetV2 CNN when available, with upload-quality checks, next steps, and a lightweight image-analysis fallback.
- Market support view with live Agmarknet mandi prices from data.gov.in when `DATA_GOV_API_KEY` is configured, plus reference MSP data, government schemes, KVK contacts, and seasonal tips.
- Groq-powered Ask AI assistant for farmer follow-up questions about crop, irrigation, disease, and market guidance.
- Farmer dashboard with crop prediction, disease detection, market insights, Ask AI, merged prediction history, and browser Print / Save PDF report generation.
- Admin dashboard with user count, total predictions, model metrics, feature importance, active model artifacts, crop distribution, and merged recent activity.
- Separate Streamlit analytics dashboard for model performance, confusion matrix, feature importance, and prediction analytics.
- Language selector for English, Hindi, and Marathi UI text.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router, Axios, Tailwind CSS |
| Charts and Reports | Chart.js, react-chartjs-2, browser print-to-PDF |
| Backend | Flask, Flask-CORS, Flask-JWT-Extended |
| Database | SQLite |
| ML Training and Inference | scikit-learn, pandas, numpy, joblib |
| Disease Detection | TensorFlow MobileNetV2, Pillow, NumPy fallback |
| AI Assistant | Groq API, `llama-3.3-70b-versatile` |
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
        |-- AI route: Groq-powered farmer assistant
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
|   |   |-- ai_routes.py
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
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
DB_PATH=database/predictions.db
ML_DIR=../ml
JWT_SECRET_KEY=change-this-for-production
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TIMEOUT_SECONDS=25
DATA_GOV_API_KEY=
MANDI_API_TIMEOUT_SECONDS=12
MANDI_CACHE_TTL_SECONDS=1800
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
9. Use Print / Save PDF to export the advisory report through the browser print dialog.
10. Upload a clear JPG or PNG single-leaf image in the disease detection module.
11. Open Market & Schemes for MSP, scheme links, KVK contact, and seasonal tips based on the latest recommended crop.
12. Ask follow-up questions in the Groq Ask AI module.
13. Login as admin to view platform stats, model metrics, feature importance, active model artifacts, crop distribution, and recent activity.

## ML Models

### Crop Recommendation and Irrigation

The Random Forest training script can train both the classifier and regressor from `ml/crop_data.csv`.
The current trained classifier predicts 5 crop labels:

```text
chickpea, coffee, maize, rice, wheat
```

The farmer advisory card includes crop images for all 5 supported labels from `frontend/src/assets/crops/`.

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

The disease response includes:

- Predicted plant and condition.
- Confidence score and confidence level.
- Severity, treatment, prevention, and next steps.
- Upload-quality checks such as leaf area and brightness.
- Top model matches for transparent review.

The current saved CNN artifact is demo-ready but not production-grade; its recorded validation accuracy is about `48.84%`, so a clean retraining run with a curated PlantVillage dataset is recommended before claiming high disease accuracy.

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
python backend\leaf_disease\train_model.py --dataset-dir data\PlantVillage --epochs 12 --fine-tune-epochs 8 --batch-size 32
```

The trainer writes:

```text
ml/models/leaf_disease_mobilenetv2.keras
ml/models/labels.json
ml/models/leaf_disease_training_report.json
```

The new trainer uses MobileNetV2 transfer learning on the PlantVillage folder structure, with rotation, flip, zoom, and brightness augmentation. It trains in two phases: frozen ImageNet base first, then fine-tunes the upper MobileNetV2 layers. At the end it prints per-class validation accuracy and records weak classes below 0.75 accuracy in `leaf_disease_training_report.json`.

Current checked-in disease artifact note: `ml/models/disease_cnn.keras` is a legacy 16-class PlantVillage-style model with recorded validation accuracy `0.4884`, so it is not the final full PlantVillage (~38 class) model. For the final-year project report, train with the complete PlantVillage dataset and copy the real `validation_accuracy`, `per_class_validation_accuracy`, and `weak_classes_below_0_75` from `ml/models/leaf_disease_training_report.json`.

Restart the backend after training so `/api/detect-leaf-disease` can load the new model once at startup.

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
| POST | `/api/ai/chat` | Farmer/Admin | Ask Groq-powered farmer assistant follow-up questions |
| POST | `/api/disease/detect` | Farmer/Admin | Detect disease from uploaded JPG/PNG leaf image |
| POST | `/api/detect-leaf-disease` | Public API | Real MobileNetV2 leaf disease detection, top-3 predictions, and treatment guidance |
| GET | `/api/market/overview` | Farmer/Admin | Load MSP, schemes, KVK, and market tip |
| GET | `/api/predictions` | Farmer/Admin | Fetch recent prediction history |
| GET | `/api/model-info` | Admin | Fetch model metrics, feature importance, and active artifact metadata |
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
POST /api/detect-leaf-disease
Content-Type: multipart/form-data
file=<leaf-image.jpg>
```

Allowed image types: JPG, JPEG, PNG. Maximum size: 5 MB. The backend validates decoded image content, not only the extension.

The response shape used by the frontend is:

```json
{
  "predictions": [
    {
      "class_name": "Tomato_healthy",
      "label": "Tomato healthy",
      "confidence": 0.91,
      "confidence_percent": 91.0,
      "description": "No major disease symptoms detected.",
      "severity": "low",
      "treatment": "No chemical treatment required.",
      "is_healthy": true
    }
  ],
  "is_healthy": true
}
```

If top confidence is below `LEAF_DISEASE_CONFIDENCE_THRESHOLD` (default `0.40`), the API returns `couldn't confidently identify` instead of guessing. Prediction logs store only image hash, top class, confidence, and latency, never the image.

### Market Overview

```text
GET /api/market/overview?state=Maharashtra&season=Rabi&crop=wheat
```

When `DATA_GOV_API_KEY` is set in `backend/.env`, the market response includes a `mandi` object with recent live mandi records from the data.gov.in Agmarknet resource:

```json
{
  "mandi": {
    "is_live": true,
    "source": "data.gov.in Agmarknet mandi API",
    "summary": {
      "average_modal_price": 2350,
      "display_price": "Rs. 2,350 / quintal",
      "latest_arrival_date": "18/07/2026",
      "record_count": 20
    },
    "records": []
  }
}
```

If the API key is missing, the backend returns `mandi.is_live=false` and keeps the static MSP/scheme fallback so the demo still works.

## Model Metrics and Dashboards

The admin dashboard reads model metrics from `ml/models/` through `/api/model-info` and displays:

- Classifier accuracy and weighted F1.
- Regressor MAE and R2.
- Total users and total prediction records.
- Feature importance for crop and irrigation models.
- Active model artifact names, update time, and size.
- Crop recommendation distribution.
- Recent crop and irrigation activity, merged into one card per prediction run.

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
- Live mandi prices use the data.gov.in Agmarknet resource when `DATA_GOV_API_KEY` is configured; otherwise, market and scheme cards use reference/demo fallback data from `backend/services/market_service.py`.
- Market & Schemes uses selected state, resolved season, and the latest recommended crop when available.
- Prediction logging is best-effort; database errors are logged without breaking model responses.
- Crop and irrigation predictions are logged as separate rows in the API flow, then merged in the farmer/admin history UI for a cleaner display.
- The Groq API key must stay in `backend/.env` only. Rotate any key that has been shared publicly.
- The Hindi and Marathi translation objects are present in the frontend, but some source text may still benefit from final human review before a polished multilingual demo.

## Troubleshooting

- If `/api/predict/crop` fails at backend startup, confirm `ml/models/` contains at least one `rf_classifier_*_v*.pkl` and one `rf_regressor_*_v*.pkl`.
- If admin model metrics fail, confirm the classifier and regressor metrics JSON files exist in `ml/models/`.
- If the frontend cannot reach the backend, check `REACT_APP_API_BASE_URL`, CORS settings, and whether Flask is running on port `5000`.
- If disease detection returns fallback-style results, confirm TensorFlow is installed and both `disease_cnn.keras` and `disease_class_names.json` exist.
- If Ask AI fails, confirm `GROQ_API_KEY` is set in `backend/.env` and the backend was restarted.
- If Print / Save PDF looks pale, enable background graphics in the browser print dialog.
- If Streamlit cannot draw the confusion matrix, confirm `ml/crop_data.csv` and the latest classifier model are present.

## Future Scope

- Clean up Hindi and Marathi text encoding for production-ready multilingual screens.
- Add deeper live MSP circular parsing, mandi price history, and weather forecast integrations.
- Add per-class disease CNN precision, recall, confusion matrix, and sample predictions.
- Add SMS or WhatsApp irrigation reminders.
- Add SHAP or LIME explanations for deeper model interpretability.
- Move from SQLite to PostgreSQL for multi-user deployment.
- Deploy the backend, frontend, and dashboard on cloud infrastructure.
