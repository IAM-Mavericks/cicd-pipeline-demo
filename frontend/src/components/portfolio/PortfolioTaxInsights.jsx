import React from 'react';
import { Box, Typography, Paper, Grid, Divider, Chip, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    boxShadow: theme.shadows[6],
  },
}));

const TaxEfficiencyMeter = ({ value, label }) => {
  const theme = useTheme();
  const normalizedValue = Math.min(Math.max(0, value), 100);
  
  return (
    <Box textAlign="center" mb={3}>
      <Box 
        sx={{
          width: '100%',
          height: 8,
          bgcolor: 'grey.200',
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative',
          mb: 1
        }}
      >
        <Box 
          sx={{
            width: `${normalizedValue}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
            transition: 'width 0.5s ease-in-out'
          }}
        />
      </Box>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
    </Box>
  );
};

const TaxInsightCard = ({ title, value, description, color = 'primary' }) => (
  <Paper 
    variant="outlined" 
    sx={{ 
      p: 2, 
      height: '100%',
      borderLeft: `4px solid ${color}`
    }}
  >
    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
      {title}
    </Typography>
    <Typography variant="h6" color={color} gutterBottom>
      {value}
    </Typography>
    {description && (
      <Typography variant="body2" color="textSecondary">
        {description}
      </Typography>
    )}
  </Paper>
);

const PortfolioTaxInsights = ({ taxData }) => {
  if (!taxData) {
    return null;
  }

  const { 
    taxEfficiencyScore = 0, 
    estimatedTaxLiability = 0, 
    taxLossHarvestingOpportunities = 0,
    taxLots = [],
    taxOptimizationSuggestions = []
  } = taxData;

  // Prepare tax allocation data for chart
  const taxAllocationData = {
    labels: ['Short-term Gains', 'Long-term Gains', 'Dividends', 'Interest', 'Other'],
    datasets: [
      {
        data: [
          taxData.shortTermGains || 0,
          taxData.longTermGains || 0,
          taxData.dividendIncome || 0,
          taxData.interestIncome || 0,
          taxData.otherTaxableIncome || 0
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Tax Insights
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <StyledPaper>
            <Typography variant="h6" gutterBottom>Tax Efficiency</Typography>
            <Box textAlign="center" py={3}>
              <Box
                sx={{
                  position: 'relative',
                  display: 'inline-flex',
                  mb: 2
                }}
              >
                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: `conic-gradient(
                      #4caf50 0% ${taxEfficiencyScore}%,
                      #e0e0e0 ${taxEfficiencyScore}% 100%
                    )`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2
                  }}
                >
                  <Box
                    sx={{
                      width: '80%',
                      height: '80%',
                      borderRadius: '50%',
                      bgcolor: 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column'
                    }}
                  >
                    <Typography variant="h5" color="textPrimary">
                      {taxEfficiencyScore}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      /100
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Typography variant="body2" color="textSecondary">
                {taxEfficiencyScore >= 75 ? 'Excellent' : 
                 taxEfficiencyScore >= 50 ? 'Good' : 
                 taxEfficiencyScore >= 25 ? 'Fair' : 'Needs Improvement'}
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Tax Efficiency</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {taxEfficiencyScore}/100
                </Typography>
              </Box>
              <TaxEfficiencyMeter value={taxEfficiencyScore} />
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Estimated Tax Liability</Typography>
                <Typography variant="body2" fontWeight="medium">
                  ₦{estimatedTaxLiability?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <TaxEfficiencyMeter 
                value={Math.min(estimatedTaxLiability / 10000, 100)} 
                label="Based on current holdings and tax rates"
              />
            </Box>
          </StyledPaper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <StyledPaper>
                <Typography variant="h6" gutterBottom>Tax Allocation</Typography>
                <Box height={300}>
                  {taxAllocationData.datasets[0].data.some(val => val > 0) ? (
                    <Pie 
                      data={taxAllocationData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'right',
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${percentage}% (₦${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <Box 
                      display="flex" 
                      justifyContent="center" 
                      alignItems="center" 
                      height="100%"
                    >
                      <Typography color="textSecondary">No tax allocation data available</Typography>
                    </Box>
                  )}
                </Box>
              </StyledPaper>
            </Grid>

            {taxLossHarvestingOpportunities > 0 && (
              <Grid item xs={12} sm={6}>
                <TaxInsightCard
                  title="Tax Loss Harvesting"
                  value={`${taxLossHarvestingOpportunities} Opportunities`}
                  description="Potential tax savings from realizing losses"
                  color="error"
                />
              </Grid>
            )}

            {taxLots.length > 0 && (
              <Grid item xs={12} sm={6}>
                <TaxInsightCard
                  title="Tax Lots"
                  value={`${taxLots.length} Active Lots`}
                  description="Consider tax-efficient lot selection when selling"
                  color="info"
                />
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>

      {taxOptimizationSuggestions && taxOptimizationSuggestions.length > 0 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Tax Optimization Suggestions
          </Typography>
          <Grid container spacing={2}>
            {taxOptimizationSuggestions.map((suggestion, index) => (
              <Grid item xs={12} key={index}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box display="flex" alignItems="flex-start">
                    <Box sx={{ color: 'primary.main', mr: 1 }}>•</Box>
                    <Typography variant="body2">
                      {suggestion}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default PortfolioTaxInsights;
