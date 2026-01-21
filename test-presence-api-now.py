#!/usr/bin/env python3
import requests
import json

# Test credentials
email = "ico@astutetech.co.za"
password = "Stacey@1122"
API_URL = "https://summit.api.codingeverest.com"

print("🔍 Testing Presence API")
print("="*60)

# Login first
print("\n1. Logging in...")
login_response = requests.post(
    f"{API_URL}/api/auth/login",
    json={"email": email, "password": password},
    timeout=10
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

login_data = login_response.json()
token = login_data.get("token")
user_id = login_data["user"]["id"]
print(f"✅ Logged in as: {login_data['user']['name']} (ID: {user_id})")

# Hardcode user IDs from database
print("\n2. Using known user IDs...")
other_users = [
    {"id": "30748e1e-e2db-4997-8e65-b2f1710fc7d9", "name": "Stacey Kruger", "email": "thechihuahua01@gmail.com"},
    {"id": "06124a57-26c7-4fbf-addc-36efd9aa1ec3", "name": "Rob", "email": "robert.nicol@astutetech.co.za"},
    {"id": "3958a577-dbe3-4d61-9966-49a1c10c0f79", "name": "Leonie Kruger", "email": "chappiedesigns@outlook.com"},
]
user_ids = [u["id"] for u in other_users]

print("\nUsers to check presence for:")
for u in other_users:
    print(f"  - {u['name']} ({u['email']}) - ID: {u['id']}")

# Test batch presence API
print("\n3. Testing batch presence API...")
print(f"Request: POST {API_URL}/api/presence/batch")
print(f"Body: {json.dumps({'userIds': user_ids}, indent=2)}")

presence_response = requests.post(
    f"{API_URL}/api/presence/batch",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    },
    json={"userIds": user_ids},
    timeout=10
)

print(f"\nResponse Status: {presence_response.status_code}")
print(f"\nResponse Body:")
try:
    presence_data = presence_response.json()
    print(json.dumps(presence_data, indent=2))
    
    # Analyze the structure
    print("\n4. Analyzing response structure...")
    if isinstance(presence_data, dict):
        print("✅ Response is a dictionary")
        for key, value in presence_data.items():
            print(f"\n  User ID: {key}")
            if isinstance(value, dict):
                print(f"    Status: {value.get('status', 'N/A')}")
                print(f"    Last Seen: {value.get('last_seen', 'N/A')}")
            else:
                print(f"    Value: {value}")
    else:
        print(f"❌ Unexpected response type: {type(presence_data)}")
        
except Exception as e:
    print(f"❌ Error parsing JSON: {e}")
    print(f"Raw response: {presence_response.text}")
