import crud
import database
from fastapi import FastAPI,Depends
import schemas
from typing import List,Optional
import auth
import models


app=FastAPI()
@app.on_event("startup")
def startup():
    models.create_table()
    
@app.post("/register")
def register(x:schemas.Users,conn=Depends(database.get_db)):
    return crud.register(x,conn)


@app.post("/login")
def login(x:schemas.Users,conn=Depends(database.get_db)):
    return crud.login(x,conn)

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