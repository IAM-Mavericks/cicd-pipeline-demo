# Bank ID Verification Feature

## Overview
MavenPay now includes automatic bank ID verification that detects and verifies recipient bank details when sending money both locally (Nigerian banks) and internationally.

## 🚀 **Features Implemented**

### **Auto Bank Verification for Nigerian Banks**
- ✅ **Automatic Detection**: Verifies account details when both bank code and account number are entered
- ✅ **Real-time Validation**: Uses debounced input to avoid excessive API calls
- ✅ **Account Name Resolution**: Automatically fills recipient name after verification
- ✅ **BVN Status Check**: Shows if account is BVN-linked for enhanced security
- ✅ **Account Type Display**: Shows whether it's Savings or Current account

### **Manual Verification for International Banks**
- ✅ **IBAN Support**: Validates European IBAN format accounts
- ✅ **US Account Support**: Validates US bank account formats
- ✅ **Multi-country Support**: Supports UK, Canada, Australia, and other countries
- ✅ **Manual Trigger**: Click "Verify" button to check international accounts
- ✅ **SWIFT Code Validation**: Validates SWIFT code format

### **User Experience**
- ✅ **Visual Indicators**: Loading, success, and error states with clear icons
- ✅ **Detailed Status Cards**: Comprehensive verification information display
- ✅ **Error Handling**: Clear error messages with retry options
- ✅ **Auto-clear on Changes**: Verification resets when switching tabs or changing inputs

## 🧪 **Testing the Feature**

### **Nigerian Bank Verification Testing**

1. **Navigate to Payments Page**
   - Log into MavenPay
   - Go to "Send Money" section
   - Ensure "Local (NGN)" tab is selected
   - Select "Bank Account" as recipient type

2. **Test Auto-Verification**
   - Select any Nigerian bank (e.g., GTBank - code 058)
   - Enter a 10-digit account number: `1234567890`
   - **Wait 2-3 seconds** - verification should start automatically
   - Watch for:
     - ✅ Loading spinner next to "Account Number" label
     - ✅ "Verifying bank account..." message
     - ✅ Account name auto-fills (e.g., "ADEBAYO JOHNSON MICHAEL")
     - ✅ Green success card with account details

3. **Test Different Banks**
   ```
   GTBank (058): 1234567890 → ADEBAYO JOHNSON MICHAEL
   Access Bank (044): 2345678901 → FATIMA HASSAN IBRAHIM  
   UBA (033): 3456789012 → CHINEDU PAUL OKAFOR
   Zenith Bank (057): 4567890123 → AISHA BELLO MOHAMMED
   ```

4. **Test Error Scenarios**
   - Enter invalid account number (not 10 digits)
   - Try account number ending in `0` (10% fail rate built-in for testing)
   - Switch banks mid-entry to see verification clear

### **International Bank Verification Testing**

1. **Switch to International Tab**
   - Click "International" tab
   - Select currency (USD, EUR, GBP, etc.)

2. **Test IBAN Verification (European)**
   ```
   Sample IBANs to test:
   DE89 3704 0044 0532 0130 00 (German format)
   FR14 2004 1010 0505 0001 3M02 606 (French format)
   GB29 NWBK 6016 1331 9268 19 (UK format)
   ```

3. **Test US Account Verification**
   ```
   Sample US Account Numbers:
   123456789012 (Wells Fargo)
   987654321098 (Chase Bank)
   456789123456 (Bank of America)
   ```

4. **Manual Verification Process**
   - Enter account number/IBAN
   - Click "Verify" button
   - Wait for verification result
   - Check bank name and account details

## 🔍 **Verification Details Displayed**

### **Nigerian Banks - Success Response**
```
✅ Account Verified Successfully!

👤 ADEBAYO JOHNSON MICHAEL
   Account Holder

🏦 Guaranty Trust Bank (GTBank)  
   Savings Account • 1234567890

🛡️ BVN Verified (if applicable)
   Identity Confirmed

✅ Active Account
   Ready to receive payments
```

### **International Banks - Success Response**
```
✅ Account Verified Successfully!

👤 [Account Holder Name]
   Account Holder  

🏦 JPMorgan Chase Bank
   Checking Account • 123456789012

✅ Active Account
   Ready to receive payments
```

## 🛠️ **Developer Testing**

### **Console Debug Messages**
Open browser console to see detailed logs:
```
🏦 Starting bank verification: {accountNumber, bankCode, isInternational, countryCode}
✅ Bank verification result: {success, data, error}
🎯 Auto-triggering verification
🔄 Using cached verification result
```

### **Mock Data Responses**
The verification service uses realistic mock data:
- **90% Success Rate**: Most verifications succeed
- **10% Failure Rate**: Some accounts return "not found" for testing
- **Consistent Names**: Same account number always returns same name
- **Realistic Bank Names**: Uses actual Nigerian and international banks

### **Timing & Performance**
- **Nigerian Banks**: 2-3 second verification time
- **International Banks**: 3-5 second verification time
- **Auto-trigger Debounce**: 1 second delay after typing stops
- **Caching**: Previously verified accounts use cached results

## 🔧 **Customization Options**

### **Timeout Adjustment**
Edit debounce timing in hook usage:
```typescript
const localBankVerification = useAutoBankVerification(
  paymentData.accountNumber,
  paymentData.bankCode,
  false,
  'NG',
  { debounceMs: 2000 } // Custom 2 second delay
);
```

### **Production Integration**
Replace mock services with real APIs:

1. **Nigerian Banks**: Integrate with Paystack, Flutterwave, or direct bank APIs
2. **International**: Use IBAN validation services or banking partners
3. **Update API endpoints** in `src/lib/bank-verification.ts`

## 🐛 **Troubleshooting**

### **Common Issues**
1. **Verification not triggering**: Ensure both bank code and 10-digit account number are entered
2. **Stuck in loading**: Check browser console for errors
3. **Account name not updating**: Verification may have failed - check status card
4. **International verification not working**: Ensure account number is 8+ characters

### **Reset Verification**
- Click the "X" button in verification status card
- Switch between tabs to clear all verification
- Change bank selection to reset verification

## 📝 **Future Enhancements**
- Real-time API integration with actual banking partners
- Support for more international banking systems
- Enhanced error handling and retry mechanisms
- Account balance verification (with proper permissions)
- Transaction limit validation
- Multi-language support for international banks

The bank verification feature provides a seamless and secure way to validate recipient details before sending money, reducing errors and enhancing user confidence in the payment process.