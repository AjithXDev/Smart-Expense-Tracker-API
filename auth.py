from fastapi.security import HTTPAuthorizationCredentials,HTTPBearer
from jose import JWTError,jwt

from fastapi import Depends,HTTPException
import os
from dotenv import load_dotenv

load_dotenv()

secret_key = os.getenv("SECRET_KEY", "a_very_secret_fallback_key_for_development")
algorithm="HS256"
security=HTTPBearer()

def create_token(data:dict):
    token=jwt.encode(data,secret_key,algorithm=algorithm)
    return token

def verify_token(credentials :HTTPAuthorizationCredentials =Depends(security)):
    token=credentials.credentials
    try:
        payload=jwt.decode(token,secret_key,algorithms=[algorithm])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
