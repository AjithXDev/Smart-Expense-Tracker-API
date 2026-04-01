from pydantic import BaseModel
from typing import List


class UserRegister(BaseModel):
    username: str
    password: str
    mail: str
    name: str

class UserLogin(BaseModel):
    username: str
    password: str


class Expenses(BaseModel):
    title: str
    category:str
    amount:float
    date:str
    payment_method:str


# responsemodel
class ExpenseResponse(BaseModel):
    id:int
    title: str
    category:str
    amount:float
    date:str
    payment_method:str


class ExpenseListResponse(BaseModel):
    data: List[ExpenseResponse]
    page: int
    limit: int

class UserProfileResponse(BaseModel):
    id: int
    username: str
    mail: str
    name: str

class RecurringExpenseAdd(BaseModel):
    title: str
    category: str
    amount: float
    next_date: str
    frequency: str
    payment_method: str

class RecurringExpenseResponse(BaseModel):
    id: int
    title: str
    category: str
    amount: float
    next_date: str
    frequency: str
    payment_method: str

class RecurringExpenseListResponse(BaseModel):
    data: List[RecurringExpenseResponse]

