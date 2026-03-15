const axios = require('axios')

class FlutterwaveService {
  constructor() {
    this.baseURL = 'https://api.flutterwave.com/v3'
    this.secretKey = process.env.FLW_SECRET_KEY || process.env.FLW_SECRET
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json'
    }
  }

  async listTransactions({ page = 1, from, to, status }) {
    try {
      const params = {}
      if (from) params.from = from
      if (to) params.to = to
      if (status) params.status = status
      params.page = page
      const url = `${this.baseURL}/transactions`
      const res = await axios.get(url, { headers: this.getHeaders(), params })
      const data = res.data?.data || []
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch transactions' }
    }
  }
}

module.exports = new FlutterwaveService()
