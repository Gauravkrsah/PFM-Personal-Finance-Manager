import sys
from unittest.mock import MagicMock

# Mock dependencies before importing nlp_service
sys.modules['dotenv'] = MagicMock()
sys.modules['google.generativeai'] = MagicMock()

from backend.services.nlp_service import ExpenseParser

parser = ExpenseParser()

test_cases = [
    "rice curry 300",
    "had lunch burger 400",
    "momo 100",
    "biryani rahul 500",
]

for text in test_cases:
    expenses, reply = parser.parse(text)
    print(f"Input: {text}")
    for exp in expenses:
        print(f"  Result: amount={exp['amount']}, item='{exp['item']}', category='{exp['category']}', remarks='{exp['remarks']}', paid_by={exp['paid_by']}")
    print(f"  Reply: {reply}")
    print("-" * 20)
