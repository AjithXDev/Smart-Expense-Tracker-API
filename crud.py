import schemas
from fastapi import Depends,HTTPException
import database
from passlib.hash import bcrypt
import auth
from typing import Optional
import datetime
import calendar

def get_next_date(current_date_str: str, frequency: str) -> str:
    d = datetime.datetime.strptime(current_date_str, "%Y-%m-%d").date()
    freq = frequency.lower()
    if freq == "daily":
        d += datetime.timedelta(days=1)
    elif freq == "weekly":
        d += datetime.timedelta(days=7)
    elif freq == "yearly":
        try:
            d = d.replace(year=d.year + 1)
        except ValueError:
            d = d.replace(year=d.year + 1, month=2, day=28)
    else:
        month = d.month + 1
        year = d.year
        if month > 12:
            month = 1
            year += 1
        day = min(d.day, calendar.monthrange(year, month)[1])
        d = d.replace(year=year, month=month, day=day)
    return d.strftime("%Y-%m-%d")

def process_recurring_sync(payload: dict, conn):
    user_id = payload["user_id"]
    cursor = conn.cursor()
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    cursor.execute("SELECT id, title, category, amount, next_date, frequency, payment_method FROM recurring_expenses WHERE user_id=%s", (user_id,))
    recurm = cursor.fetchall()
    
    updated = False
    for r in recurm:
        rec_id, title, category, amount, n_date, freq, p_method = r
        while n_date <= today_str:
            cursor.execute(
                "INSERT INTO expenses(title, category, amount, date, payment_method, user_id) VALUES (%s,%s,%s,%s,%s,%s)",
                (title, category, amount, n_date, p_method, user_id)
            )
            n_date = get_next_date(n_date, freq)
            cursor.execute(
                "UPDATE recurring_expenses SET next_date=%s WHERE id=%s",
                (n_date, rec_id)
            )
            updated = True
            
    if updated:
        conn.commit()


def register(x:schemas.UserRegister,conn=Depends(database.get_db)):
    cursor=conn.cursor()
    hashed_password=bcrypt.hash(x.password)

    username_lower = x.username.lower()
    cursor.execute("SELECT * FROM users WHERE LOWER(username)=%s OR LOWER(mail)=%s", (username_lower, x.mail.lower()))
    existing = cursor.fetchone()

    if existing:
        raise HTTPException(status_code=400, detail="Username or Email already exists")
    
    cursor.execute(
        "INSERT INTO users(username,password,mail,name) values(%s,%s,%s,%s)",(x.username,hashed_password,x.mail,x.name)
    )
    conn.commit()
    return({"message":"User registered successfully"})

def login(x:schemas.UserLogin,conn=Depends(database.get_db)):
    cursor=conn.cursor()
    login_id = x.username.lower()
    cursor.execute(
        "SELECT * FROM users WHERE LOWER(username)=%s OR LOWER(mail)=%s", (login_id, login_id)
    )

    user = cursor.fetchone()

    if user is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    hashed_password=user[2]
    if not bcrypt.verify(x.password, hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
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
        "INSERT INTO expenses(title,category,amount,date,payment_method,user_id) values(%s,%s,%s,%s,%s,%s)",(x.title,x.category,x.amount,x.date,x.payment_method,user_id)
    )
    conn.commit()
    return({"message":"Expense added successfully"})


def get_expenses(payload:dict=Depends(auth.verify_token),conn=Depends(database.get_db),search :Optional[str]=None,sort :Optional[str]="ASC",page:int=1,limit :int=5):
    process_recurring_sync(payload, conn)
    cursor=conn.cursor()
    query = "SELECT id,title,category,amount,date,payment_method FROM expenses WHERE user_id=%s"
    params = [payload["user_id"]]
    offset = (page - 1) * limit
  

    if search:
        query += " AND title LIKE %s"
        params.append(f"%{search}%")

    if sort.lower() == "desc":
        query += " ORDER BY id DESC"
    else:
        query += " ORDER BY id ASC"
    
    query += " LIMIT %s OFFSET %s"
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

    return {
    "data": res,
    "page": page,
    "limit": limit
}

def update_expense(id:int,x:schemas.Expenses,payload:dict=Depends(auth.verify_token),conn=Depends(database.get_db)):
    cursor=conn.cursor()
    userid=payload["user_id"]
    cursor.execute(
        "update expenses set title=%s,category=%s,amount=%s,date=%s,payment_method=%s where id=%s and user_id=%s",
        (x.title,x.category,x.amount,x.date,x.payment_method,id,userid)
    )
    
    conn.commit()
    return{"message":"Updated successfully "}


def delete_expense(id:int, payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    cursor=conn.cursor()
    userid=payload["user_id"]
    cursor.execute(
        "DELETE FROM expenses WHERE id=%s AND user_id=%s",
        (id, userid)
    )
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    conn.commit()
    return{"message":"Deleted successfully "}


def total_expense(payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    process_recurring_sync(payload, conn)
    cursor=conn.cursor()
    userid=payload["user_id"]
    cursor.execute(
        "SELECT SUM(amount) as total from expenses where user_id=%s",(userid,)
    )
    result=cursor.fetchone()
    total=result[0] if result[0] else 0
    return{"Total Expenses": f"${total:.2f}"}


def category_expense(payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    cursor=conn.cursor()
    userid=payload["user_id"]
    cursor.execute(
       "SELECT category,SUM(amount) as total from expenses where user_id=%s group by category",(userid,)
    )
    rows = cursor.fetchall()
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
       "SELECT SUM(amount) as total from expenses where user_id=%s AND date=%s", (userid, date)
    )
    res=cursor.fetchone()
    total = res[0] if res[0] else 0

    return {
        "date": date,
        "total_expense": total
    }


def monthly_expense(startdate: str, enddate: str, payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    cursor=conn.cursor()
    userid=payload["user_id"]
    cursor.execute(
       "SELECT SUM(amount) as total from expenses where user_id=%s AND date BETWEEN %s AND %s", (userid, startdate, enddate)
    )
    res=cursor.fetchone()
    total = res[0] if res[0] else 0

    return {
        "startdate": startdate,
        "enddate": enddate,
        "total_expense": total
    }

def get_user_profile(payload:dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    cursor=conn.cursor()
    userid=payload["user_id"]
    cursor.execute("SELECT id, username, mail, name FROM users WHERE id=%s",(userid,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user[0],
        "username": user[1],
        "mail": user[2],
        "name": user[3]
    }

def add_recurring_expense(x: schemas.RecurringExpenseAdd, payload: dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    cursor=conn.cursor()
    user_id = payload["user_id"]
    cursor.execute(
        "INSERT INTO recurring_expenses(title, category, amount, next_date, frequency, payment_method, user_id) VALUES (%s,%s,%s,%s,%s,%s,%s)",
        (x.title, x.category, x.amount, x.next_date, x.frequency, x.payment_method, user_id)
    )
    conn.commit()
    process_recurring_sync(payload, conn)
    return {"message": "Recurring expense added successfully"}

def get_recurring_expenses(payload: dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    cursor=conn.cursor()
    user_id = payload["user_id"]
    cursor.execute("SELECT id, title, category, amount, next_date, frequency, payment_method FROM recurring_expenses WHERE user_id=%s ORDER BY id DESC", (user_id,))
    rows = cursor.fetchall()
    res = []
    for r in rows:
        res.append({
            "id": r[0],
            "title": r[1],
            "category": r[2],
            "amount": r[3],
            "next_date": r[4],
            "frequency": r[5],
            "payment_method": r[6]
        })
    return {"data": res}

def delete_recurring_expense(id: int, payload: dict=Depends(auth.verify_token), conn=Depends(database.get_db)):
    cursor=conn.cursor()
    user_id = payload["user_id"]
    cursor.execute("DELETE FROM recurring_expenses WHERE id=%s AND user_id=%s", (id, user_id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    conn.commit()
    return {"message": "Recurring expense deleted successfully"}
