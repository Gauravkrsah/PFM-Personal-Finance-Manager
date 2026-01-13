from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import random
import time

router = APIRouter()

# In-memory OTP storage with expiry (use Redis in production)
# File-based OTP storage for persistence across reloads
import json
import os

OTP_FILE = "otp_store.json"

def load_otp_store():
    if os.path.exists(OTP_FILE):
        try:
            with open(OTP_FILE, "r") as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_otp_store(store):
    try:
        with open(OTP_FILE, "w") as f:
            json.dump(store, f)
    except:
        pass

class SendOTPRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

@router.post("/send-reset-otp")
async def send_reset_otp(request: SendOTPRequest):
    """Generate and return OTP for password reset"""
    try:
        store = load_otp_store()
        
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Store OTP with 10 minute expiry
        store[request.email] = {
            "otp": otp,
            "expires": time.time() + 600  # 10 minutes
        }
        
        save_otp_store(store)
        
        # In production, send OTP via email service (SendGrid, AWS SES, etc.)
        # For now, return it in response for testing
        return {
            "message": "OTP generated successfully",
            "otp": otp,  # Remove in production
            "note": "In production, this will be sent via email"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-reset-otp")
async def verify_reset_otp(request: VerifyOTPRequest):
    """Verify OTP - returns success if valid"""
    try:
        store = load_otp_store()
        
        # Check if OTP exists
        stored = store.get(request.email)
        if not stored:
            raise HTTPException(status_code=400, detail="No OTP found for this email")
        
        # Check expiry
        if time.time() > stored["expires"]:
            del store[request.email]
            save_otp_store(store)
            raise HTTPException(status_code=400, detail="OTP has expired")
        
        # Verify OTP
        if stored["otp"] != request.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        # Clear OTP after successful verification
        del store[request.email]
        save_otp_store(store)
        
        return {"message": "OTP verified successfully", "verified": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
