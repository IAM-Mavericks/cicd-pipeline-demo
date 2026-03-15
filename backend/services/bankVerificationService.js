const axios = require('axios')

// Verify account number with selected provider
// provider: 'paystack' | 'flutterwave'
// inputs: { accountNumber: string, bankCode: string }
// returns: normalized result { valid: boolean, account_name?: string, account_number?: string, bank_code?: string, provider: string, raw?: unknown }
async function verifyAccount(provider, { accountNumber, bankCode }) {
  if (!accountNumber || !bankCode) {
    throw new Error('Missing required fields: accountNumber and bankCode')
  }

  const timeoutMs = Number(process.env.BANK_VERIFICATION_TIMEOUT_MS || 8000)

  if (provider === 'paystack') {
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not set')
    const url = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${secret}` },
      timeout: timeoutMs,
    })
    // Paystack: { status, message, data: { account_number, account_name, bank_id } }
    const result = data?.data || {}
    return {
      valid: Boolean(result?.account_number && result?.account_name),
      account_name: result?.account_name,
      account_number: result?.account_number,
      bank_code: bankCode,
      provider: 'paystack',
      raw: data,
    }
  }

  if (provider === 'flutterwave') {
    const secret = process.env.FLW_SECRET_KEY || process.env.FLW_SECRET
    if (!secret) throw new Error('FLW_SECRET_KEY is not set')
    const url = 'https://api.flutterwave.com/v3/accounts/resolve'
    const { data } = await axios.post(
      url,
      {
        account_number: accountNumber,
        account_bank: bankCode,
      },
      {
        headers: { Authorization: `Bearer ${secret}` },
        timeout: timeoutMs,
      }
    )
    // Flutterwave: { status: 'success', message, data: { account_number, account_name } }
    const result = data?.data || {}
    return {
      valid: data?.status === 'success' && Boolean(result?.account_number && result?.account_name),
      account_name: result?.account_name,
      account_number: result?.account_number,
      bank_code: bankCode,
      provider: 'flutterwave',
      raw: data,
    }
  }

  throw new Error(`Unsupported provider: ${provider}`)
}

module.exports = { verifyAccount }

