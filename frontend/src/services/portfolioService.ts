import api from './api';

export const getPortfolioInsights = async (portfolioId: string) => {
  try {
    const response = await api.get(`/api/investments/portfolio/${portfolioId}/insights`);
    return response.data;
  } catch (error) {
    console.error('Error fetching portfolio insights:', error);
    throw error;
  }
};

export const getPortfolioHoldings = async (portfolioId: string) => {
  try {
    const response = await api.get(`/api/investments/portfolio/${portfolioId}/holdings`);
    return response.data;
  } catch (error) {
    console.error('Error fetching portfolio holdings:', error);
    throw error;
  }
};
