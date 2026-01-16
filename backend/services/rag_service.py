import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    genai = None

load_dotenv()

class RAGService:
    """RAG (Retrieval Augmented Generation) service for intelligent expense queries"""
    
    def __init__(self):
        self._setup_gemini()
    
    def _setup_gemini(self):
        """Setup Gemini AI"""
        self.gemini_available = False
        self.model = None
        
        if not GENAI_AVAILABLE:
            print("[X] RAG Service: google-generativeai not installed")
            return
        
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if gemini_api_key and gemini_api_key.strip():
            try:
                genai.configure(api_key=gemini_api_key)
                self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
                self.gemini_available = True
                print("[OK] RAG Service: Gemini configured")
            except Exception as e:
                print(f"[X] RAG Service: Gemini setup failed: {e}")
    
    def _find_item_matches(self, query: str, expenses_data: List[Dict]) -> Dict[str, Any]:
        """Find expenses matching specific items mentioned in the query"""
        if not query:
            return None
            
        query_lower = query.lower()
        
        # Extract potential item keywords from query
        item_keywords = []
        words = query_lower.split()
        
        # Words that indicate aggregate queries, not specific items
        aggregate_keywords = ['total', 'all', 'everything', 'overall', 'sum', 'entire', 'whole', 'complete']
        # Comprehensive stop words - words that should never be item keywords
        stop_words = ['i', 'my', 'how', 'much', 'spend', 'spent', 'on', 'for', 'the', 'a', 'an', 
                     'did', 'do', 'have', 'has', 'what', 'is', 'are', 'was', 'were', 'money', 
                     'expenses', 'expense', 'to', 'from', 'with', 'at', 'in', 'of', 'and', 'or',
                     'this', 'that', 'it', 'me', 'you', 'we', 'they', 'he', 'she', 'am', 'be']
        
        # Look for "on [item]" or "for [item]" patterns - but skip if next word is also a stop word
        for i, word in enumerate(words):
            if word in ['on', 'for'] and i + 1 < len(words):
                next_word = words[i + 1]
                # Skip if next word is an aggregate keyword, stop word, or too short
                if (next_word not in aggregate_keywords and 
                    next_word not in stop_words and 
                    len(next_word) > 2):
                    item_keywords.append(next_word)
        
        # Also check for remaining content words that might be item names (if we didn't find any yet)
        if not item_keywords:
            for word in words:
                if word not in stop_words and word not in aggregate_keywords and len(word) > 2:
                    # Check if this word matches any item in the data
                    for expense in expenses_data:
                        item = expense.get('item')
                        if item and word in item.lower() and word not in item_keywords:
                            item_keywords.append(word)
                            break
        
        if not item_keywords:
            return None
        
        # Find matching expenses
        matching_expenses = []
        total_amount = 0
        
        for expense in expenses_data:
            item_name = expense.get('item') or ''
            remarks = expense.get('remarks') or ''
            
            # Check if any keyword matches item or remarks
            for keyword in item_keywords:
                if keyword in item_name.lower() or keyword in remarks.lower():
                    matching_expenses.append(expense)
                    total_amount += expense.get('amount', 0)
                    break
        
        if matching_expenses:
            return {
                'item_name': item_keywords[0],
                'keywords': item_keywords,
                'total_amount': total_amount,
                'count': len(matching_expenses),
                'expenses': matching_expenses
            }
        
        return None

    def _prepare_expense_context(self, expenses_data: List[Dict], query: str = None) -> str:
        """Prepare structured expense data for RAG"""
        if not expenses_data:
            return "No expense data available."
        
        # Check for item-specific query first
        item_match = None
        if query:
            item_match = self._find_item_matches(query, expenses_data)
        
        # Separate expenses, income, and loans
        expenses = [e for e in expenses_data if e.get('amount', 0) > 0 and (e.get('category') or '').lower() not in ['income', 'loan']]
        income = [e for e in expenses_data if (e.get('category') or '').lower() == 'income' or (e.get('amount', 0) < 0 and (e.get('category') or '').lower() != 'loan')]
        loans = [e for e in expenses_data if (e.get('category') or '').lower() == 'loan']
        
        # Build context
        context_parts = []
        
        # Summary stats (excluding loans from expenses/income)
        total_expense = sum(e.get('amount', 0) for e in expenses)
        total_income = sum(abs(e.get('amount', 0)) for e in income)
        net_balance = total_income - total_expense
        
        context_parts.append(f"Total Expenses (excluding loans): Rs.{total_expense}")
        context_parts.append(f"Total Income: Rs.{total_income}")
        context_parts.append(f"Net Balance (Income - Expenses): Rs.{net_balance}")
        context_parts.append(f"Savings Rate: {int((net_balance/total_income*100) if total_income > 0 else 0)}%")
        
        # Category breakdown
        categories = {}
        for exp in expenses:
            cat = exp.get('category', 'Other')
            categories[cat] = categories.get(cat, 0) + exp.get('amount', 0)
        
        if categories:
            context_parts.append("\nCategory Breakdown:")
            for cat, amt in sorted(categories.items(), key=lambda x: x[1], reverse=True):
                count = len([e for e in expenses if e.get('category') == cat])
                context_parts.append(f"  {cat}: Rs.{amt} ({count} transactions)")
        
        # Loan breakdown by person (already filtered above)
        if loans:
            context_parts.append("\nLoan Details by Person:")
            person_loans = {}
            for loan in loans:
                person = loan.get('paid_by', '').lower().strip()
                amt = loan.get('amount', 0)
                print(f"[RAG DEBUG] Loan: person={person}, amount={amt}, item={loan.get('item')}")
                
                if person:
                    # Normalize: remove common variations and use fuzzy matching
                    person_clean = person.replace('s', '').replace('n', '')[:3]
                    
                    # Find existing similar person
                    person_normalized = None
                    for existing_key in person_loans.keys():
                        existing_clean = existing_key.replace('s', '').replace('n', '')[:3]
                        if person_clean == existing_clean:
                            person_normalized = existing_key
                            break
                    
                    if not person_normalized:
                        person_normalized = person
                    
                    if person_normalized not in person_loans:
                        person_loans[person_normalized] = {'given': 0, 'taken': 0, 'original_name': person}
                    else:
                        # Update original name to most recent
                        person_loans[person_normalized]['original_name'] = person
                    
                    if amt > 0:
                        person_loans[person_normalized]['given'] += amt
                    else:
                        person_loans[person_normalized]['taken'] += abs(amt)
            
            for person_key, amounts in person_loans.items():
                person_name = amounts['original_name'].title()
                given = amounts['given']
                taken = amounts['taken']
                
                print(f"[RAG CALC] Person: {person_name} (key={person_key}), Given: {given}, Taken: {taken}, Net: {taken-given if taken>given else given-taken}")
                
                if taken > given:
                    # You took more than you gave back = You owe them
                    net_owed = taken - given
                    context_parts.append(f"  {person_name}: Borrowed Rs.{taken} from them, Repaid Rs.{given} = YOU OWE Rs.{net_owed}")
                elif given > taken:
                    # You gave more than you took = They owe you
                    net_owed = given - taken
                    context_parts.append(f"  {person_name}: Lent Rs.{given} to them, Received back Rs.{taken} = THEY OWE Rs.{net_owed}")
                else:
                    context_parts.append(f"  {person_name}: Settled (borrowed Rs.{taken}, repaid Rs.{given})")
        
        # ITEM-SPECIFIC MATCHING (Critical for accurate item queries)
        if item_match:
            item_name = item_match['item_name'].title()
            total_amt = item_match['total_amount']
            count = item_match['count']
            keywords = item_match.get('keywords', [item_match['item_name']])
            
            context_parts.append(f"\n*** ITEM-SPECIFIC MATCH (IMPORTANT - USE THIS FOR ITEM QUERIES) ***")
            context_parts.append(f"Query matches item keyword(s): {', '.join(keywords)}")
            context_parts.append(f"Total spent on '{item_name}': Rs.{total_amt} across {count} transactions")
            context_parts.append(f"\nAll matching transactions for '{item_name}':")
            
            for exp in item_match['expenses']:
                amt = exp.get('amount', 0)
                item = exp.get('item', 'item')
                cat = exp.get('category', 'Other')
                date = exp.get('date', 'N/A')
                context_parts.append(f"  - Rs.{amt} on {item} [{cat}] ({date})")
            
            context_parts.append(f"\n*** END ITEM-SPECIFIC MATCH ***")
        
        # Recent transactions (last 15)
        recent = expenses_data[:15]
        if recent:
            context_parts.append("\nRecent Transactions:")
            for exp in recent:
                amt = exp.get('amount', 0)
                item = exp.get('item', 'item')
                cat = exp.get('category', 'Other')
                date = exp.get('date', 'N/A')
                paid_by = exp.get('paid_by', '')
                
                paid_info = f" (paid by {paid_by})" if paid_by else ""
                context_parts.append(f"  Rs.{amt} - {item} [{cat}] on {date}{paid_info}")
        
        context_str = "\n".join(context_parts)
        return context_str
    
    async def query_expenses(self, query: str, expenses_data: List[Dict], user_name: str = "there") -> Optional[str]:
        """Query expenses using RAG with Gemini"""
        if not self.gemini_available or not self.model:
            return None
        
        try:
            # Prepare context from expense data (pass query for item-specific filtering)
            expense_context = self._prepare_expense_context(expenses_data, query)
            
            # Build RAG prompt
            prompt = f"""You are a personal finance assistant analyzing expense data.

USER: {user_name}
QUERY: "{query}"

EXPENSE DATA:
{expense_context}

INSTRUCTIONS:
1. Answer the user's question accurately using ONLY the data provided above
2. Be conversational and friendly - start with "Hi {user_name}!"
3. Use exact numbers from the data
4. **CRITICAL FOR ITEM QUERIES**: If you see a section marked "*** ITEM-SPECIFIC MATCH ***", 
   use ONLY that section to answer questions about that specific item. It contains:
   - The exact total amount spent on that item
   - The exact number of transactions
   - All matching transactions
   Report both the total amount AND the transaction count from this section.
5. If asked about multiple categories (e.g., "food and grocery"), combine totals
6. For LOAN queries:
   - Use ONLY the "Loan Details by Person" section - it has accurate net calculations
   - Look for "YOU OWE" or "THEY OWE" in the loan details
   - Person names may vary slightly - they refer to the same person
   - Answer with the exact amount from the loan details
7. For INCOME/BALANCE queries:
   - "Income remaining" = Net Balance = Total Income - Total Expenses
   - "How much money left" = Net Balance
   - "Available money" = Net Balance
   - Do NOT confuse with loans
8. If data is missing or unclear, say so politely
9. Format currency as Rs.X
10. Be concise but informative

Provide a helpful response:"""
            
            # Get Gemini response
            response = self.model.generate_content(prompt)
            if response and response.text:
                return response.text.strip()
            
            return None
            
        except Exception as e:
            print(f"[RAG] Query error: {e}")
            return None
    
    async def smart_categorize(self, item_description: str) -> Optional[str]:
        """Use Gemini to intelligently categorize an expense"""
        if not self.gemini_available or not self.model:
            return None
        
        try:
            prompt = f"""Categorize this expense item into ONE category:

Item: "{item_description}"

Categories: Food, Transport, Groceries, Shopping, Utilities, Entertainment, Rent, Loan, Income, Medical, Education, Travel, Electronics, Personal Care, Fitness, Other

Return ONLY the category name, nothing else."""
            
            response = self.model.generate_content(prompt)
            if response and response.text:
                category = response.text.strip()
                return category
            
            return None
            
        except Exception as e:
            print(f"[RAG] Categorize error: {e}")
            return None
