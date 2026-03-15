import React, { useState } from 'react';
import { Box, Typography, Grid, Paper, Tabs, Tab } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
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

const PortfolioMetrics = ({ metrics }) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Returns chart data
  const returnsData = {
    labels: ['1D', '1W', '1M', 'YTD', '1Y'],
    datasets: [
      {
        label: 'Returns (%)',
        data: [
          metrics?.returns?.daily || 0,
          metrics?.returns?.weekly || 0,
          metrics?.returns?.monthly || 0,
          metrics?.returns?.ytd || 0,
          metrics?.returns?.oneYear || 0
        ],
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.3,
        fill: true
      }
    ]
  };

  // Risk metrics data
  const riskData = {
    labels: ['Volatility', 'Beta', 'Sharpe Ratio'],
    datasets: [
      {
        label: 'Risk Metrics',
        data: [
          metrics?.risk?.volatility || 0,
          metrics?.risk?.beta || 0,
          metrics?.risk?.sharpeRatio || 0
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Sector allocation data
  const sectorData = {
    labels: metrics?.diversification?.sectors?.map(s => s.name) || [],
    datasets: [
      {
        data: metrics?.diversification?.sectors?.map(s => s.weight) || [],
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
          '#9966FF', '#FF9F40', '#8AC24A', '#FF5252'
        ],
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += `${context.parsed.y}%`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Portfolio Metrics
      </Typography>
      
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        <Tab label="Returns" />
        <Tab label="Risk" />
        <Tab label="Diversification" />
      </Tabs>

      <Box mt={2}>
        {tabValue === 0 && (
          <StyledPaper>
            <Typography variant="h6" gutterBottom>Performance Over Time</Typography>
            <Box height={400}>
              <Line data={returnsData} options={options} />
            </Box>
          </StyledPaper>
        )}

        {tabValue === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <StyledPaper>
                <Typography variant="h6" gutterBottom>Risk Metrics</Typography>
                <Box height={300}>
                  <Bar 
                    data={riskData} 
                    options={{
                      responsive: true,
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }} 
                  />
                </Box>
              </StyledPaper>
            </Grid>
            <Grid item xs={12} md={4}>
              <StyledPaper>
                <Typography variant="h6" gutterBottom>Volatility</Typography>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    py: 4
                  }}
                >
                  <Box
                    sx={{
                      width: 150,
                      height: 150,
                      borderRadius: '50%',
                      background: `conic-gradient(
                        #4caf50 0% ${100 - (metrics?.risk?.volatility || 0)}%,
                        #f44336 ${100 - (metrics?.risk?.volatility || 0)}% 100%
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
                        {metrics?.risk?.volatility?.toFixed(1) || '0.0'}%
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        30D Volatility
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="textSecondary" align="center">
                    {!metrics?.risk?.volatility ? 'No data' : 
                     metrics.risk.volatility < 10 ? 'Low Volatility' : 
                     metrics.risk.volatility < 20 ? 'Moderate Volatility' : 'High Volatility'}
                  </Typography>
                </Box>
              </StyledPaper>
            </Grid>
          </Grid>
        )}

        {tabValue === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <StyledPaper>
                <Typography variant="h6" gutterBottom>Sector Allocation</Typography>
                <Box height={400}>
                  {sectorData.labels.length > 0 ? (
                    <Pie 
                      data={sectorData} 
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
                                return `${label}: ${percentage}% (${value.toFixed(2)}%)`;
                              }
                            }
                          }
                        }
                      }} 
                    />
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography color="textSecondary">No sector data available</Typography>
                    </Box>
                  )}
                </Box>
              </StyledPaper>
            </Grid>
            <Grid item xs={12} md={6}>
              <StyledPaper>
                <Typography variant="h6" gutterBottom>Top Holdings</Typography>
                <Box mt={2}>
                  {metrics?.diversification?.topHoldings?.length > 0 ? (
                    metrics.diversification.topHoldings.map((holding, index) => (
                      <Box key={index} mb={2}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="subtitle2">{holding.name}</Typography>
                          <Typography variant="subtitle2">{holding.weight?.toFixed(2)}%</Typography>
                        </Box>
                        <Box 
                          sx={{ 
                            width: '100%', 
                            height: 8, 
                            bgcolor: 'grey.200',
                            borderRadius: 4,
                            overflow: 'hidden'
                          }}
                        >
                          <Box 
                            sx={{ 
                              width: `${holding.weight || 0}%`, 
                              height: '100%', 
                              bgcolor: 'primary.main'
                            }} 
                          />
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Typography color="textSecondary">No holdings data available</Typography>
                  )}
                </Box>
              </StyledPaper>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default PortfolioMetrics;
