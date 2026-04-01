import crud
import database
import schemas
import auth
import models
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

# Lifespan - Startup Logic
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        models.create_table()
        print("✅ Database tables confirmed/created")
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
    yield

# Initialize App once with lifespan
app = FastAPI(lifespan=lifespan)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mounting Statics & Templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# --- Routes ---

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

@app.post("/register")
def register(x: schemas.UserRegister, conn=Depends(database.get_db)):
    return crud.register(x, conn)

@app.post("/login")
def login(x: schemas.UserLogin, conn=Depends(database.get_db)):
    return crud.login(x, conn)

@app.post("/add-expense")
def add_expenses(x:schemas.Expenses,payload:dict=Depends(auth.verify_token),conn=Depends(database.get_db)):
    return crud.add_expense(x,payload,conn)

@app.get("/expenses",response_model=schemas.ExpenseListResponse)
def get_expense(payload:dict=Depends(auth.verify_token),conn=Depends(database.get_db),search :Optional[str]=None,sort :Optional[str]="ASC",page:int=1,limit :int=5):
    return crud.get_expenses(payload,conn,search,sort,page,limit)

@app.put("/update/{id}")
def update_expense(id:int,x:schemas.Expenses,payload:dict=Depends(auth.verify_token),conn=Depends(database.get_db)):
    return crud.update_expense(id,x,payload,conn)

@app.delete("/delete/{id}")
def delete_expenses(id:int, payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    return crud.delete_expense(id,payload,conn)

@app.get("/total_expense")
def get_total_expense(payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    return crud.total_expense(payload, conn)

@app.get("/category_expense")
def get_category_expense(payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    return crud.category_expense(payload, conn)

@app.get("/daily_expense/{date}")
def get_daily_expense(date: str, payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    return crud.daily_expense(date, payload, conn)

@app.get("/monthly_expense/{startdate}/{enddate}")
def get_monthly_expense(startdate: str, enddate: str, payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    return crud.monthly_expense(startdate,enddate,payload,conn)

@app.get("/profile", response_model=schemas.UserProfileResponse)
def get_profile(payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    return crud.get_user_profile(payload, conn)

@app.post("/add-recurring-expense")
def add_recurring_expense(x:schemas.RecurringExpenseAdd, payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    return crud.add_recurring_expense(x, payload, conn)

@app.get("/recurring-expenses", response_model=schemas.RecurringExpenseListResponse)
def get_recurring_expenses(payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    return crud.get_recurring_expenses(payload, conn)

@app.delete("/delete-recurring/{id}")
def delete_recurring_expense(id:int, payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    return crud.delete_recurring_expense(id, payload, conn)
