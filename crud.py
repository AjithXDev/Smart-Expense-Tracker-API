import schemas
from fastapi import Depends,HTTPException
import database
from passlib.hash import bcrypt
import auth
from typing import Optional

def register(x:schemas.Users,conn=Depends(database.get_db)):
    cursor=conn.cursor()
    hashed_password=bcrypt.hash(x.password)

    cursor.execute("SELECT * FROM users WHERE username=?", (x.username,))
    existing = cursor.fetchone()

    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    cursor.execute(
        "INSERT INTO users(username,password) values(?,?)",(x.username,hashed_password)
    )
    conn.commit()
    conn.close()
    return({"message":"User registered successfully"})

def login(x:schemas.Users,conn=Depends(database.get_db)):
    cursor=conn.cursor()
    cursor.execute(
        "SELECT * FROM users where username=?",(x.username,)
    )

    user=cursor.fetchone()

    if user is None:
        raise HTTPException(status_code=400,detail="Invalid username ")

    hashed_password=user[2]
    if not bcrypt.verify(x.password,hashed_password):
        raise HTTPException(status_code=400,detail="Incorrect password ")
    
    token=auth.create_token(
        {
            "user_id":user[0],
            "username":user[1]
        }
    )
    return {
    "access_token": token,
    "token_type": "bearer"
}


def add_expense(x:schemas.Expenses,payload:dict=Depends(auth.verify_token),conn=Depends(database.get_db)):
    cursor=conn.cursor()
    user_id=payload["user_id"]
    
    cursor.execute(
        "INSERT INTO expenses(title,category,amount,date,payment_method,user_id) values(?,?,?,?,?,?)",(x.title,x.category,x.amount,x.date,x.payment_method,user_id)
    )
    conn.commit()
    conn.close()

    return({"message":"Expense added successfully"})


def get_expenses(payload:dict=Depends(auth.verify_token),conn=Depends(database.get_db),search :Optional[str]=None,sort :Optional[str]="ASC",page:int=1,limit :int=5):
    cursor=conn.cursor()
    query = "SELECT id,title,category,amount,date,payment_method FROM expenses WHERE user_id=?"
    params = [payload["user_id"]]
    offset = (page - 1) * limit
  

    if search:
        query += " AND title LIKE ?"
        params.append(f"%{search}%")

    if sort.lower() == "desc":
        query += " ORDER BY id DESC"
    else:
        query += " ORDER BY id ASC"
    
    query += " LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query,params)
    row=cursor.fetchall()

    res=[]

    for i in row:
        res.append({
            "id":i[0],
            "title":i[1],
            "category":i[2],
            "amount":i[3],
            "date":i[4],
            "payment_method":i[5]

        })

    conn.close()
    return {
    "data": res,
    "page": page,
    "limit": limit
}

def update_expense(id:int,x:schemas.Expenses,payload:dict=Depends(auth.verify_token),conn=Depends(database.get_db)):
    cursor=conn.cursor()
    userid=payload["user_id"]
    cursor.execute(
        "update expenses set title=?,category=?,amount=?,date=?,payment_method=? where id=? and user_id=?",
        (x.title,x.category,x.amount,x.date,x.payment_method,id,userid)
    )
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Expense not found")
    
    conn.commit()
    conn.close()
    return{"message":"Updated successfully "}


def delete_expense(id:int, payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    cursor=conn.cursor()
    userid=payload["user_id"]
    cursor.execute(
        "DELETE FROM expenses WHERE id=? AND user_id=?",
        (id, userid)
    )
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Expense not found")
    
    conn.commit()
    conn.close()
    return{"message":"Deleted successfully "}


def total_expense(payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    cursor=conn.cursor()
    userid=payload["user_id"]
    cursor.execute(
        "SELECT SUM(amount) as total from expenses where user_id=?",(userid,)
    )
    result=cursor.fetchone()
    total=result[0] if result[0] else 0
    conn.close()
    return{"Total Expenses": f"${total:.2f}"}


def category_expense(payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    cursor=conn.cursor()
    userid=payload["user_id"]
    cursor.execute(
       "SELECT category,SUM(amount) as total from expenses where user_id=? group by category",(userid,)
    )
    rows = cursor.fetchall()
    conn.close()

    result = []

    for row in rows:
        result.append({
            "category": row[0],
            "total": row[1]
        })

    return result

def daily_expense(date: str, payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    cursor=conn.cursor()
    userid=payload["user_id"]
    cursor.execute(
       "SELECT SUM(amount) as total from expenses where user_id=? AND date=?", (userid, date)
    )
    res=cursor.fetchone()
    conn.close()
    total = res[0] if res[0] else 0

    return {
        "date": date,
        "total_expense": total
    }


def monthly_expense(startdate: str, enddate: str, payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    cursor=conn.cursor()
    userid=payload["user_id"]
    cursor.execute(
       "SELECT SUM(amount) as total from expenses where user_id=? AND date BETWEEN ? AND ?", (userid, startdate, enddate)
    )
    res=cursor.fetchone()
    conn.close()
    total = res[0] if res[0] else 0

    return {
        "startdate": startdate,
        "enddate": enddate,
        "total_expense": total
    }

