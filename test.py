# Test vulnerabilities
os.getenv("SECRET_VARNAME")
os.getenv("SECRET_VARNAME")

import os
import sqlite3

user_id = "123"
db = sqlite3.connect("test.db")
db.execute(f"SELECT * FROM users WHERE id = {user_id}")

os.system("ls -la")

# Rule 5: Path Traversal
filename = "user_data.txt"
with open(filename, "r") as f:
    print(f.read())

# Rule 6: Weak Crypto
import hashlib
h = hashlib.md5(b"password").hexdigest()

# Rule 9: Broken Authentication
jwt_secret = "mysecret123"

# Rule 10: Insecure Deserialization
import pickle
data = pickle.loads(user_input)
