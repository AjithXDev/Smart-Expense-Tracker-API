#  Smart Expense Tracker API

A backend API built using FastAPI to manage personal expenses with authentication, filtering, pagination, and analytics.


## 🚀 Features

* 🔐 JWT Authentication (Register & Login)
* 📦 CRUD Operations (Add, Update, Delete Expenses)
* 🔍 Search & Filtering
* 📄 Pagination
* 📊 Analytics:

  * Total Expenses
  * Category-wise Expenses
  * Daily Expense
  * Monthly Expense


## 🛠️ Tech Stack

* FastAPI
* SQLite
* JWT (python-jose)
* Passlib (bcrypt)
* Uvicorn


## 📂 Project Structure

.
├── main.py
├── crud.py
├── auth.py
├── database.py
├── models.py
├── schemas.py
├── requirements.txt
└── .gitignore


## ⚙️ Setup Instructions

### 1. Clone the repo

cd smart-expense-tracker-api

### 2. Create virtual environment

python -m venv venv
venv\Scripts\activate   # Windows

### 3. Install dependencies

pip install -r requirements.txt

### 4. Create `.env` file

SECRET_KEY=your_secret_key

### 5. Run the app


uvicorn main:app --reload



## 📌 API Documentation

Once the server is running:

👉 Swagger UI:

http://127.0.0.1:8000/docs



## 🌐 Deployment

This API can be deployed using platforms like Render.




## ⭐ Future Improvements

* PostgreSQL integration
* Budget tracking
* Export to CSV
* Frontend integration

