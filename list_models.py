
import os
import sys
import google.generativeai as genai
from dotenv import load_dotenv

sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv('backend/.env')

api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    print("No API Key")
    sys.exit(1)

genai.configure(api_key=api_key)

print("Listing models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"Error: {e}")
