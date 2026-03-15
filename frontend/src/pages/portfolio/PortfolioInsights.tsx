import React, { useState, useEffect } from 'react';
import { Box, Container, CircularProgress, Typography, Paper } from '@mui/material';
import { getPortfolioInsights } from '../../services/portfolioService';
import PortfolioSummary from '../../components/portfolio/PortfolioSummary';
import PortfolioMetrics from '../../components/portfolio/PortfolioMetrics';
import PortfolioSignals from '../../components/portfolio/PortfolioSignals';
import PortfolioPerformance from '../../components/portfolio/PortfolioPerformance';
import PortfolioTaxInsights from '../../components/portfolio/PortfolioTaxInsights';

interface PortfolioInsightsProps {
  portfolioId?: string;
}

const PortfolioInsights: React.FC<PortfolioInsightsProps> = ({ portfolioId = 'default' }) => {
    const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        const response = await getPortfolioInsights(portfolioId);
        setInsights(response.data);
      } catch (err) {
        setError('Failed to load portfolio insights. Please try again later.');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [portfolioId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      </Box>
    );
  }

  if (!insights) {
    return (
      <Box p={3}>
        <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No insights available for this portfolio.</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" className="py-8">
      {/* Summary Section */}
      <Box className="mb-8">
        <PortfolioSummary data={insights.summary} />
      </Box>

      {/* Metrics Section */}
      <Box className="mb-8">
        <PortfolioMetrics metrics={insights.metrics} />
      </Box>

      {/* Signals Section */}
      {insights.signals && insights.signals.length > 0 && (
        <Box className="mb-8">
          <PortfolioSignals signals={insights.signals} />
        </Box>
      )}

      {/* Performance Section */}
      <Box className="mb-8">
        <PortfolioPerformance performance={insights.performance} />
      </Box>

      {/* Tax Insights Section */}
      <Box className="mb-8">
        <PortfolioTaxInsights taxData={insights.tax} />
      </Box>
    </Container>
  );
};

export default PortfolioInsights;
