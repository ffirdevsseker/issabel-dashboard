# backend/generate_hash.py
from passlib.context import CryptContext
import sys

pwd = sys.argv[1] if len(sys.argv) > 1 else "admin123"
print(CryptContext(schemes=["bcrypt"]).hash(pwd))