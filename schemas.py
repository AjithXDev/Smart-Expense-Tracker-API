from pydantic import BaseModel
from typing import List


class Users(BaseModel):
    username :str
    password : str


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

