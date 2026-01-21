#!/usr/bin/env python3
import requests

API_URL = "https://summit.api.codingeverest.com"

print("Testing login...")
try:
    response = requests.post(
        f"{API_URL}/api/auth/login",
        json={
            "email": "ico@astutetech.co.za",
            "password": "Stacey@1122"
        },
        timeout=10
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")
    
    if response.status_code == 200:
        print("\n✅ Login successful!")
    else:
        print(f"\n❌ Login failed with status {response.status_code}")
        
except Exception as e:
    print(f"❌ Error: {e}")
