# Yasindu's Component Updates & Backend Dockerization

This document outlines the recent changes made to the repository to clean up the codebase and ensure smooth sailing for all teammates running the backend on their local machines.

## 1. Project Cleanup
* Removed obsolete text files and accidental folders (e.g., `ABC/`, `yasinduCodes/`, old `.md` and log files).
* Retained `CLAUDE.md` as the primary repository reference.

## 2. Graceful ASD Model Loading
* Previously, the backend would crash for teammates if they didn't have the 500+ MB `fold_5_best.h5` VGG-Face model locally.
* **Update:** Added a `try/except` block to `backEnd/routers/asd_router.py`. Now, if the models are missing, the backend will still boot successfully, but it will safely disable the ASD facial prediction functionality. Other endpoints (like Cry, Growth, Postpartum) will continue to work perfectly for the rest of the team.

## 3. Dockerization (No More Dependency Hell!)
* Since our backend requires specific versions of heavy libraries (TensorFlow 2.20, XGBoost, OpenCV, Python 3.9), we have Dockerized it!
* **Files Added:**
  * `backEnd/Dockerfile`: Setting up `python:3.9-slim`, installing OS dependencies (like `libgl1` for OpenCV), and pip dependencies.
  * `docker-compose.yml`: Easily spin up the backend along with environment variable support.
* **How Teammates Can Run the Backend Now:**
  Just open a terminal in the root folder and run:
  ```bash
  docker-compose up --build
  ```
  *(Make sure you have a `.env` file in the root directory if needed!)*

## 4. `app.py` Teammate Imports
* Reverted local `try/except` wrappers for teammate routers in `app.py`. With Docker, everyone starts with a clean environment containing all team modules!
