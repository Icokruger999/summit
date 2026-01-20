import requests
import json

# Test the chats endpoint to verify other_user_id is returned
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZhYTllYWU5LWM3NWEtNDdmZC1iOGI4LTEyN2U1ZTY5ZTc0MiIsImVtYWlsIjoiaWNvQGFzdHV0ZXRlY2guY28uemEiLCJpYXQiOjE3Njg5MjU5NTIsImV4cCI6MTc2OTUzMDc1Mn0.prZlTOb5_eukwajBV08e8_8hH_TNHV1FvUt_qL85q-A"

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

response = requests.get(
    "https://summit.api.codingeverest.com/api/chats",
    headers=headers
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    chats = response.json()
    print(f"Found {len(chats)} chats")
    for chat in chats:
        print(f"\nChat: {chat.get('name')}")
        print(f"  type: {chat.get('type')}")
        print(f"  other_user_id: {chat.get('other_user_id')}")
        print(f"  other_user_name: {chat.get('other_user_name')}")
        print(f"  other_user: {chat.get('other_user')}")
else:
    print(f"Error: {response.text}")
