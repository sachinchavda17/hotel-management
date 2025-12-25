import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from passlib.context import CryptContext

# Load env vars
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# DB Connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    admin_email = "admin@hotel.com"
    existing = await db.users.find_one({"email": admin_email})
    
    if existing:
        print(f"Admin user {admin_email} already exists.")
        # Ensure role is admin
        if existing.get('role') != 'admin':
            await db.users.update_one({"email": admin_email}, {"$set": {"role": "admin"}})
            print("Updated role to admin.")
        return

    admin_user = {
        "id": "admin-uuid",
        "name": "Admin User",
        "email": admin_email,
        "password_hash": pwd_context.hash("admin123"),
        "role": "admin",
        "created_at": "2024-01-01T00:00:00"
    }
    
    await db.users.insert_one(admin_user)
    print(f"Created admin user: {admin_email} / admin123")

async def promote_user(email):
    user = await db.users.find_one({"email": email})
    if not user:
        print(f"User {email} not found.")
        return
    
    await db.users.update_one({"email": email}, {"$set": {"role": "admin"}})
    print(f"User {email} promoted to admin.")

async def list_users():
    users = await db.users.find({}, {"_id": 0, "name": 1, "email": 1, "role": 1}).to_list(100)
    print("\nExisting Users:")
    for u in users:
        print(f"- {u['name']} ({u['email']}) - Role: {u.get('role', 'user')}")
    print("")

if __name__ == "__main__":
    import sys
    
    async def main():
        await list_users()
        
        if len(sys.argv) > 1:
            cmd = sys.argv[1]
            if cmd == "create_default":
                await create_admin()
            elif cmd == "promote" and len(sys.argv) > 2:
                await promote_user(sys.argv[2])
            else:
                print("Usage:")
                print("  python admin_tools.py create_default")
                print("  python admin_tools.py promote <email>")
        else:
            print("Usage:")
            print("  python admin_tools.py create_default")
            print("  python admin_tools.py promote <email>")

    asyncio.run(main())
