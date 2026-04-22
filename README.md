# TinySteps: Infant Growth Monitoring System

TinySteps is a comprehensive, multi-modal infant care application developed as an SLIIT final-year research project. It leverages various Machine Learning models to assist parents in monitoring infant development, translating cries, detecting early signs of Autism Spectrum Disorder (ASD), and predicting postpartum recovery for mothers.

---

## Technology Stack
- **Frontend:** React Native, Expo 54, TypeScript
- **Backend:** FastAPI (Python)
- **Machine Learning:** TensorFlow 2.20, XGBoost, scikit-learn, OpenCV, MediaPipe
- **Database / Auth:** Supabase (PostgreSQL), MongoDB
- **Infrastructure:** Docker, Docker Compose

---

## Core Intelligent Modules

### 1. ASD Detection (Autism Spectrum Disorder)
A hybrid screening tool combining computer vision and behavioral analysis:
*   **Facial Image Pipeline:** Uses a fine-tuned VGG-Face CNN and Logistic Regression probe to analyze facial features. *Note: The core `.h5` model is excluded from Git due to size, but the backend gracefully handles its absence.*
*   **Q-CHAT-10 Pipeline:** Analyzes behavioral questionnaire responses using an XGBoost classifier (96%+ accuracy).
*   **Fusion System:** A late-fusion model that combines both visual and behavioral signals for high-accuracy risk assessment.

### 2. Smart Cry Translator
Translates infant cries to identify underlying needs:
*   **Audio Analysis:** GradientBoosting models to classify pain vs. no-pain, and hunger vs. normal.
*   **Facial Pain Detection:** Random Forest model analyzing facial landmarks (MediaPipe) to detect distress.
*   **Multi-Factor Fusion:** Integrates audio and visual cues using an XGBoost classifier for comprehensive cry categorization.

### 3. Growth Forecaster
Predicts physical development trajectories:
*   **Forecasting:** LSTM networks utilizing a 21-feature window.
*   **Risk Assessment:** RF/XGBoost models cross-referenced against WHO Weight-for-Age (WAZ) charts.

### 4. Maternal Postpartum Recovery
Monitors and predicts maternal health recovery:
*   Random Forest and Ridge Regression models predict perineal, C-section, back, and pelvic pain, providing actionable insights with SHAP explainability.

---

## Repository Structure

```text
infant-growth-monitoring-system/
├── backEnd/                 # FastAPI server, API routers, and ML inference logic
│   ├── routers/             # Endpoint definitions (asd, cry, growth, feedback, postpartum)
│   ├── Dockerfile           # Backend containerization configuration
│   └── requirements.txt     # Python dependencies
├── frontEnd/                # React Native / Expo mobile application
│   ├── app/                 # UI Screens and tabs (Home, ASD, Cry, Growth, Mom)
│   ├── components/          # Reusable React components
│   └── services/            # API integration clients
├── mlModels/                # Machine learning research notebooks, artifacts, and weights (.pkl)
├── supabase/                # Database migrations and security schemas
├── docker-compose.yml       # Orchestration for the backend
└── CLAUDE.md                # Master reference: architecture, env, Docker, Supabase, known issues
```

---

## Getting Started

### Prerequisites
*   **Docker** & **Docker Compose** (for running the Backend easily)
*   **Node.js** (v18+) & **npm**
*   **Expo CLI** (`npm install -g expo-cli`)

### Environment Variables
Create a `.env` file in the root directory (for the Docker backend) and/or configure the frontend `.env` with the following credentials:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
MONGODB_URI=your_mongodb_uri
```

### 1. Running the Backend (Dockerized)
We use Docker to ensure consistent Python environments and avoid complicated ML dependency issues (TensorFlow, OpenCV, XGBoost).

Open a terminal in the project root and run:
```bash
docker-compose up --build
```
*The backend will start at `http://localhost:8000`. API documentation is available at `http://localhost:8000/docs`.*

*(Note: If large model files like `fold_5_best.h5` are missing from your local `mlModels/` directory, the backend will still boot successfully and gracefully disable the dependent endpoints without crashing.)*

### 2. Running the Frontend
Open a new terminal, navigate to the `frontEnd` directory, and start the Expo development server:
```bash
cd frontEnd
npm install
npx expo start
```
Use the Expo Go app on your iOS/Android device to scan the QR code, or press `a` / `i` in the terminal to open an Android Emulator or iOS Simulator.

---

## License & Academic Disclosure
This repository contains research artifacts and production code for a university final-year project. Models, embeddings, and architectures (particularly within the ASD and Cry translation modules) represent novel research and evaluations against public datasets. 

For a deep dive into the research methodology, refer to `CLAUDE.md`.
