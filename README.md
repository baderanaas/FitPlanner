# FitPlanner 🧠💪

**AI-Powered Fitness Assistant**

> A smart fitness companion that helps users calculate BMI, body fat percentage, ideal weight, macros, and generate personalized meal plans — all through a friendly AI chat interface.

---

## 🚀 Features

### 🔢 Health Tools

* **BMI Calculator**
* **Body Fat % Estimation** (US Navy Method)
* **Ideal Weight Calculation** (Devine Formula)
* **Macronutrient Distribution** (TDEE + multiple macro profiles)

### 🥗 Meal Planning

* AI-generated **meal plans** based on:

  * Dietary preferences (e.g., vegan, keto)
  * Allergies (e.g., peanuts, shellfish)
  * Target calorie intake
* Recipes powered by **Spoonacular API**

### 🧬 Nutrition Insights

* Get **detailed nutrition facts** for any food item via the **USDA FoodData Central API**
* Calorie, protein, fat, carbs, vitamin & mineral breakdowns

### 🧠 Memory Integration

* **Short-Term Memory** via **Redis**
* **Long-Term Memory** via **Qdrant**
* Memory is scoped per user using hashed `user_id`

---

## 🧰 Tech Stack

### Backend – FastAPI

* **AI Agent:** GPT-4o-mini via OpenAI Function Calling
* **Memory:** Redis (short-term), Qdrant (long-term)
* **External APIs:**

  * [Spoonacular](https://spoonacular.com/food-api) (meal generation)
  * [USDA FoodData Central](https://fdc.nal.usda.gov/api-key-signup.html) (nutrition data)

### Frontend – React

* **Authentication & Billing:** [Clerk](https://clerk.com)

  * Supports Email, Google, GitHub login
* **UI:** Modern chat experience with dynamic AI interactions
* **Hosting:** Vercel-ready frontend

---

## 🛠️ Setup Instructions

### 🔗 Prerequisites

* Python 3.9+
* Node.js 16+
* Redis server
* Qdrant server
* API Keys:

  * OpenAI
  * Spoonacular
  * USDA FoodData Central
  * Clerk (publishable + secret key)

---

## ⚙️ Backend Setup (FastAPI)

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt
```

### 📄 Environment Variables (`.env`)

```
OPENAI_API_KEY=your_openai_key
SPOON_API_KEY=your_spoonacular_key
FOOD_API_KEY=your_usda_key
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
```

### ▶️ Run Backend

```bash
uvicorn main:app --port 8000
```

### 🌐 Deploy (via Ngrok)

```bash
ngrok http --domain=yourdomain.ngrok-free.app 8000
```

---

## 💻 Frontend Setup (React)

```bash
cd frontend
npm install
```

### 📄 Environment Variables (`.env`)

```
REACT_APP_CLERK_PUBLISHABLE_KEY=your_clerk_key
REACT_APP_BACKEND_URL=http://localhost:8000
```

### ▶️ Run Frontend

```bash
npm run dev
```

### 🚀 Deploy on Vercel

* Set **frontend** as the root directory
* Define environment variables:

  * `REACT_APP_BACKEND_URL`: Deployed backend URL
  * `REACT_APP_CLERK_PUBLISHABLE_KEY`: Clerk publishable key

---

## 📬 API Endpoints

### 🔧 Core

* `POST /chat` – AI Assistant Chat
* `GET /docs` – Interactive Swagger UI

### 🧮 Health Tools

* `POST /bmi` – Calculate BMI
* `POST /bodyfat` – Estimate body fat %
* `POST /idealweight` – Calculate ideal weight
* `POST /macros` – Get macro breakdown
* `POST /mealplan` – Generate daily meal plan
* `POST /nutrition` – Get nutrition facts

---

## 🧱 Architecture Overview

```
Frontend (React + Clerk)
        |
        v
Backend (FastAPI + OpenAI)
        |
   -------------
   |    |     |
 Redis Qdrant External APIs
```

---

## 🔐 Environment Variables Summary

| Variable                          | Description                      | Required |
| --------------------------------- | -------------------------------- | -------- |
| `OPENAI_API_KEY`                  | OpenAI Function Calling          | ✅        |
| `SPOON_API_KEY`                   | Spoonacular API key              | ✅        |
| `FOOD_API_KEY`                    | USDA API key                     | ✅        |
| `REDIS_URL`                       | Redis connection string          | ✅        |
| `QDRANT_URL`                      | Qdrant endpoint URL              | ✅        |
| `CLERK_SECRET_KEY`                | Clerk secret key (frontend only) | ✅        |
| `REACT_APP_BACKEND_URL`           | Backend base URL for frontend    | ✅        |
| `REACT_APP_CLERK_PUBLISHABLE_KEY` | Clerk publishable key            | ✅        |

## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.
