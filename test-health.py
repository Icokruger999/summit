#!/usr/bin/env python3
import requests

try:
    response = requests.get('https://summit.api.codingeverest.com/health', timeout=5)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
